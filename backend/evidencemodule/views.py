#####################################################################################
#Imports, modules and API

import logging
import subprocess
import uuid
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import check_password, make_password
from django.db import IntegrityError
import datetime
import time
import os
import json
import sys
import numpy as np
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

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


#########################################################################################


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
                start_time = datetime.datetime.now()
                start_msg = f"Analysis started at: {start_time.strftime('%H:%M:%S')}"
                yield f'data: {json.dumps({"progress": 1, "message": start_msg})}\n\n'
                sys.stdout.flush()
                time.sleep(0.3)

                yield 'data: {"progress": 5, "message": "Uploading file..."}\n\n'
                time.sleep(0.5)

                yield 'data: {"progress": 15, "message": "Initializing analysis..."}\n\n'
                result = {}
                result["task_data"] = task_data  # Corrected key to "task_data" (not "taskdata")
                print("Task Data:", task_data)

                file_ext = os.path.splitext(file_path)[1].lower()
                is_image = file_type.startswith("image/")
                is_doc = file_ext in ['.pdf', '.docx', '.txt', '.doc']
                is_memdump = file_ext in ['.dmp', '.raw', '.mem']

                
                if is_image:
                    yield 'data: {"progress": 20, "message": "Running deepfake detection..."}\n\n'
                    deepfake_result = analyze_deepfake(file_path)
                    result["deepfake"] = deepfake_result
                    time.sleep(0.5)
                    yield 'data:{"progress":45, "message":"Running Steganographic detection"}\n\n'
                    steg_detector= detect_steganography(file_path)
                    result["steganographic_detection"]= steg_detector

                    yield 'data: {"progress": 70, "message": "Running full forensic image analysis..."}\n\n'
                    stream_list = []

                    def collector(update):
                        stream_list.append(f'data: {json.dumps(update)}\n\n')
                        time.sleep(0.2)

                    forensic_result = full_image_forensic_analysis(file_path, streamer=collector)
                    for line in stream_list:
                        yield line
                    
                    result.update(forensic_result)

                
                elif is_doc:
                    yield 'data: {"progress": 60, "message": "Running document authenticity check..."}\n\n'
                    doc_result = full_document_analysis(file_path)
                    result["text_detection"] = doc_result.get("detection_result")
                    result["report"] = doc_result.get("report")

                
                elif is_memdump:
                    yield 'data: {"progress": 40, "message": "Running memory forensics with Volatility3..."}\n\n'

                    # Pick available volatility command
                    vol_cmds = [
                        ["vol"],  # if installed globally
                        ["vol.py"],  # if script
                        [sys.executable, "-m", "volatility3"],  # python -m fallback
                    ]
                    vol_cmd = None
                    for candidate in vol_cmds:
                        try:
                            subprocess.run(candidate + ["--help"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                            vol_cmd = candidate
                            break
                        except Exception:
                            continue

                    if not vol_cmd:
                        yield 'data: {"progress": 100, "message": "Volatility3 not found on server.", "error": true}\n\n'
                        return

                    
                    plugins = ["windows.pslist", "windows.modules"]
                    total = len(plugins)
                    results = {}

                    for i, plugin in enumerate(plugins, start=1):
                        yield f'data: {json.dumps({"progress": 40 + i*20, "message": f"Running {plugin}..."})}\n\n'

                        out_file = os.path.join(settings.MEDIA_ROOT, f"{uuid.uuid4()}_{plugin.replace('.', '_')}.txt")
                        with open(out_file, "w", encoding="utf-8") as f:
                            process = subprocess.Popen(
                                vol_cmd + ["-f", file_path, plugin],
                                stdout=f,
                                stderr=subprocess.PIPE,
                                text=True,
                            )
                            _, stderr = process.communicate()

                        if process.returncode == 0:
                            results[plugin] = {
                                "output_url": settings.MEDIA_URL + os.path.basename(out_file),
                                "summary": f"Completed {plugin}, output saved.",
                            }
                        else:
                            results[plugin] = {
                                "error": stderr.strip() or "Unknown error"
                            }

                    result["memdump"] = {
                        "file": settings.MEDIA_URL + os.path.basename(file_path),
                        "plugins": results,
                    }

                
                yield 'data: {"progress": 90, "message": "Computing file hashes..."}\n\n'
                hash_result = compute_file_hashes(file_path)
                result.update(json.loads(hash_result))

                end_time = datetime.datetime.now()
                end_msg = f"Analysis ended at: {end_time.strftime('%H:%M:%S')}"
                yield f'data: {json.dumps({"progress": 99, "message": end_msg})}\n\n'
                yield f'data: {json.dumps({"progress": 100, "message": "Analysis complete", "result": result})}\n\n'

                

                

            except Exception as e:
                yield f'data: {json.dumps({"progress": 100, "message": "Error: " + str(e), "error": True})}\n\n'

        return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

    return HttpResponse(json.dumps({"error": "No file or invalid request."}), content_type="application/json")







# def get_process(request):
#     """
#     Endpoint to analyze running processes and return JSON
#     """
#     try:
#         process_data = get_all_processes()
#         return JsonResponse(process_data)
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500)

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
