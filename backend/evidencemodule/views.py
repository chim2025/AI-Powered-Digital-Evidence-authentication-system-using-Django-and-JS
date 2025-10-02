import logging, subprocess, uuid, datetime, time, os, json, sys
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password, make_password
from django.db import IntegrityError
import numpy as np
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import FileResponse, Http404, JsonResponse
from .utils.file_utils import save_uploaded_file

from .process_folder.process_metrics import get_process_metrics
from .process_folder.processes import get_enriched_results, get_local_processes

from .ai_models.analysis_layer import image
from .ai_models.deepfake_detector import analyze_deepfake
from .ai_models.stegonagraphydetector import detect_steganography
from .ai_models.utils import full_image_forensic_analysis
from .ai_models.filehash import compute_file_hashes
from .document_authentication.run_pipeline import full_document_analysis
from .models import User
from .sysinfo import system_info
from .processes import get_all_processes


def safe_serialize(obj):
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    return str(obj)


def save_analysis_json(result_obj, prefix="analysis"):
    """
    Save a Python-serializable result_obj to disk as JSON and return relative URL/path.
    Uses safe_serialize for numpy types etc.
    """
    out_dir = getattr(settings, "ANALYSIS_RESULTS_DIR", os.path.join(settings.BASE_DIR, "analysis_results"))
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    filename = f"{prefix}_{ts}_{uuid.uuid4().hex}.json"
    filepath = os.path.join(out_dir, filename)

    # Recursive conversion
    def _convert(obj):
        if isinstance(obj, dict):
            return {k: _convert(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [_convert(v) for v in obj]
        else:
            return safe_serialize(obj)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(_convert(result_obj), f, indent=2, ensure_ascii=False)

    media_root = getattr(settings, "MEDIA_ROOT", None)
    if media_root and os.path.commonpath([media_root, out_dir]) == media_root:
        rel = os.path.relpath(filepath, media_root).replace("\\", "/")
        return settings.MEDIA_URL.rstrip("/") + "/" + rel
    return filepath

#Index Page
def index(request):
    return render(request, 'index.html')

# User Registration
def register_user(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirmpassword')
        country = request.POST.get('country')
        phone_number = request.POST.get('phone_number')
        first_name = request.POST.get('firstname')
        last_name = request.POST.get('surname')
        middle_name = request.POST.get('middlename')
        level = request.POST.get('profession')
        enterprise = request.POST.get('enterprise')
        software = request.POST.get('software_use')
        address = request.POST.get('address')

        errors = []
        if User.objects.filter(username=username).exists():
            errors.append("Username")
        if User.objects.filter(email=email).exists():
            errors.append("Email")
        if User.objects.filter(phone_number=phone_number).exists():
            errors.append("Phone number")

        try:
            hashed_password = make_password(password)
            user = User.objects.create(
                username=username,
                last_name=last_name,
                first_name=first_name,
                phone_number=phone_number,
                middle_name=middle_name,
                level=level,
                software=software,
                address=address,
                enterprise=enterprise,
                email=email,
                password=hashed_password,
                country=country
            )
            messages.success(request, "Registration successful!")
            return redirect('login')

        except Exception as e:
            if errors:
                messages.error(request, f"{', '.join(errors)} already exists.")
                return redirect('register')

    return render(request, 'register.html')


def login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        try:
            user = User.objects.get(username=username)
            if check_password(password, user.password):
                request.session['user_id'] = user.id
                return redirect('dashboard')
            else:
                messages.error(request, "Incorrect password.")
        except User.DoesNotExist:
            messages.error(request, "Username not found.")

        return render(request, 'login.html', {'username': username})

    return render(request, "login.html")


def logout_view(request):
    auth_logout(request)
    messages.success(request, "You have successfully logged out...")
    return redirect('login')


def submit_reg(request):
    pass


def validate_field(request):
    field = request.GET.get('field')
    value = request.GET.get('value')

    exists = False
    if field == 'email':
        exists = User.objects.filter(email=value).exists()
    elif field == 'username':
        exists = User.objects.filter(username=value).exists()
    elif field == 'phone_number':
        exists = User.objects.filter(phone_number=value).exists()

    return JsonResponse({'exists': exists})


def custom_login_required(view_func):
    def wrapper(request, *args, **kwargs):
        if 'user_id' not in request.session:
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


def dashboard(request):
    user_id = request.session.get('user_id')
    if not user_id:
        messages.error(request, "Please login to continue.")
        return redirect('login')

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        request.session.flush()
        messages.error(request, "Session expired. Please login again.")
        return redirect('login')
    messages.success(request, f"You have successfully logged in as {user.first_name}")

    return render(request, 'dashboard.html', {'user': user, 'system_info':system_info})


RECEIVED_DIR = os.path.join(settings.BASE_DIR, "received_files", "files")
os.makedirs(RECEIVED_DIR, exist_ok=True)


def safe_serialize(obj):
    if isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    return str(obj)


@csrf_exempt
def analyze_evidence(request):
    if request.method == "POST":
        form_data = request.POST
        evidence_file = request.FILES["file"]
        file_path = save_uploaded_file(evidence_file)
        file_type = evidence_file.content_type
        file_name = evidence_file.name  # e.g., "IMG_20250902_150719_764.jpg"
        file_size = evidence_file.size
        task_data = {
            'task_name': form_data.get('task_task_name', ''),
            'task_description': form_data.get('task_task_description', ''),
            'file_type': file_type,
            'file_name': file_name,
            'file_size': file_size
        }

        def event_stream():
            try:
                def sse(data):
                    return f"data: {json.dumps(data)}\n\n"

                start_time = datetime.datetime.now()
                yield sse({"progress": 1, "message": f"Analysis started at {start_time.isoformat()}"})

<<<<<<< HEAD
                result = {
                    "meta": {
                        "original_filename": evidence_file.name,
                        "upload_time": start_time.isoformat(),
                        "file_path": file_path,
                        "file_type": file_type
                    },
                    "plugins": {},
                    "summary": {}
                }
=======
                yield 'data: {"progress": 5, "message": "Uploading file..."}\n\n'
                time.sleep(0.5)

                yield 'data: {"progress": 15, "message": "Initializing analysis..."}\n\n'
                result = {}
                result["task_data"] = task_data  # Corrected key to "task_data" (not "taskdata")
                print("Task Data:", task_data)
>>>>>>> 50f3def3ffbe7ea0a92495596e971010644d655a

                file_ext = os.path.splitext(file_path)[1].lower()
                is_image = file_type.startswith("image/")
                is_doc = file_ext in ['.pdf', '.docx', '.txt', '.doc']
                is_memdump = file_ext in ['.dmp', '.raw', '.mem']

                # === Image ===
                if is_image:
                    yield sse({"progress": 20, "message": "Running deepfake detection..."})
                    deepfake_result = analyze_deepfake(file_path)
<<<<<<< HEAD
                    deepfake_url = save_analysis_json(deepfake_result, prefix="deepfake")
                    result["plugins"]["deepfake"] = {"summary": "Deepfake detection done", "url": deepfake_url}
=======
                    result["deepfake"] = deepfake_result
                    time.sleep(0.5)
                    yield 'data:{"progress":45, "message":"Running Steganographic detection"}\n\n'
                    steg_detector= detect_steganography(file_path)
                    result["steganographic_detection"]= steg_detector
>>>>>>> 50f3def3ffbe7ea0a92495596e971010644d655a

                    yield sse({"progress": 40, "message": "Running steganography detection..."})
                    steg_result = detect_steganography(file_path)
                    steg_url = save_analysis_json(steg_result, prefix="steg")
                    result["plugins"]["steg"] = {"summary": "Steg detection done", "url": steg_url}

                    yield sse({"progress": 60, "message": "Running forensic image analysis..."})
                    forensic_result = full_image_forensic_analysis(file_path, streamer=None)
                    forensic_url = save_analysis_json(forensic_result, prefix="forensic")
                    result["plugins"]["forensic"] = {"summary": "Forensic analysis done", "url": forensic_url}

                # === Document ===
                elif is_doc:
                    yield sse({"progress": 50, "message": "Running document authenticity check..."})
                    doc_result = full_document_analysis(file_path)
                    doc_url = save_analysis_json(doc_result, prefix="doc")
                    result["plugins"]["document_analysis"] = {"summary": "Document analysis done", "url": doc_url}

                # === Memory Dump ===
                elif is_memdump:
                    yield sse({"progress": 40, "message": "Running memory forensics (Volatility3)..."})

                    vol_cmds = [["vol"], ["vol.py"], [sys.executable, "-m", "volatility3"]]
                    vol_cmd = None
                    for candidate in vol_cmds:
                        try:
                            subprocess.run(candidate + ["--help"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                            vol_cmd = candidate
                            break
                        except Exception:
                            continue
                    if not vol_cmd:
                        yield sse({"progress": 100, "message": "Volatility3 not found", "error": True})
                        return

                    plugins = ["windows.pslist", "windows.pstree", "windows.hashdump"]
                    for plugin in plugins:
                        yield sse({"progress": 60, "message": f"Running {plugin}..."})
                        out_file = os.path.join(settings.MEDIA_ROOT, f"{uuid.uuid4().hex}_{plugin.replace('.', '_')}.txt")
                        with open(out_file, "w", encoding="utf-8", errors="replace") as f:
                            process = subprocess.Popen(vol_cmd + ["-f", file_path, plugin],
                                                       stdout=f, stderr=subprocess.PIPE, text=True)
                            _, stderr = process.communicate()

                        if process.returncode == 0:
                            rel = os.path.relpath(out_file, settings.MEDIA_ROOT).replace("\\", "/")
                            url = settings.MEDIA_URL.rstrip("/") + "/" + rel
                            result["plugins"][plugin] = {"output_url": url, "status": "ok"}
                        else:
                            result["plugins"][plugin] = {"error": stderr.strip() or "Unknown error"}

                # === File hashes ===
                yield sse({"progress": 90, "message": "Computing file hashes..."})
                hash_json = json.loads(compute_file_hashes(file_path))
                result["summary"]["hashes"] = hash_json

                # === Save final aggregated JSON ===
                final_url = save_analysis_json(result, prefix="analysis")
                yield sse({"progress": 99, "message": "Saved analysis results", "result_url": final_url})
                yield sse({"progress": 100, "message": "Analysis complete", "result_url": final_url})

            except Exception as e:
                yield sse({"progress": 100, "message": "Error: " + str(e), "error": True})

        return StreamingHttpResponse(event_stream(), content_type="text/event-stream")

    return HttpResponse(json.dumps({"error": "No file or invalid request."}), content_type="application/json")

def get_process(request):
    """
    Endpoint to analyze running processes and return JSON
    """
    try:
        process_data = get_local_processes()
        return JsonResponse(process_data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
def get_enriched(request):
    try:
        return JsonResponse(get_enriched_results(), safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    
def process_metrics_view(request):
    try:
        metrics = get_process_metrics()
        return JsonResponse(metrics)
    except Exception as e:
        
        return JsonResponse({
            "error": str(e)
        }, status=200) 
def list_analysis_results(request):
    """Return a list of all saved analysis JSON results."""
    out_dir = getattr(settings, "ANALYSIS_RESULTS_DIR", os.path.join(settings.BASE_DIR, "analysis_results"))
    if not os.path.exists(out_dir):
        return JsonResponse([], safe=False)

    entries = []
    for fn in sorted(os.listdir(out_dir), reverse=True):
        if fn.endswith(".json"):
            full = os.path.join(out_dir, fn)
            entries.append({
                "filename": fn,
                "size": os.path.getsize(full),
                "modified": datetime.datetime.utcfromtimestamp(os.path.getmtime(full)).isoformat() + "Z",
                "url": request.build_absolute_uri(f"/analysis_results/get/{fn}")  # point to your view
            })
    return JsonResponse(entries, safe=False)


def get_analysis_result(request, filename):
    """Stream a single saved analysis JSON file back to the client."""
    out_dir = getattr(settings, "ANALYSIS_RESULTS_DIR", os.path.join(settings.BASE_DIR, "analysis_results"))
    full = os.path.join(out_dir, filename)
    if not os.path.exists(full) or not filename.endswith(".json"):
        raise Http404("Analysis result not found")
    return FileResponse(open(full, "rb"), content_type="application/json")