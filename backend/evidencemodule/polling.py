import datetime
import json
import os
import threading
import time

from django.conf import settings
import requests

def scan_file_with_virustotal(file_path: str) -> dict:
    API_KEY = getattr(settings, "VIRUSTOTAL_API_KEY", None)
    if not API_KEY:
        return {"error": "VirusTotal API key not configured"}

    try:
        file_size = os.path.getsize(file_path)
        if file_size > 650_000_000:  
            return {"error": "File too large (>650MB) for free VirusTotal API"}

        url = "https://www.virustotal.com/api/v3/files"
        headers = {"x-apikey": API_KEY}

        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            resp = requests.post(url, files=files, headers=headers, timeout=120)

        if resp.status_code != 200:
            return {"error": f"Upload failed ({resp.status_code})", "details": resp.text}

        analysis_id = resp.json()["data"]["id"]
        report_url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"

       
        for _ in range(45):
            time.sleep(20)
            r = requests.get(report_url, headers=headers, timeout=60)
            if r.status_code != 200:
                time.sleep(20)
                continue

            data = r.json()
            status = data["data"]["attributes"]["status"]

            if status == "completed":
                stats = data["data"]["attributes"]["stats"]
                sha256 = data["meta"]["file_info"]["sha256"]
                return {
                    "malicious": stats["malicious"],
                    "suspicious": stats["suspicious"],
                    "undetected": stats["undetected"],
                    "harmless": stats["harmless"],
                    "total_engines": sum(stats.values()),
                    "detection_ratio": f"{stats['malicious'] + stats['suspicious']}/{sum(stats.values())}",
                    "permalink": f"https://www.virustotal.com/gui/file/{sha256}",
                    "sha256": sha256
                }

        return {"error": "Timeout after 15 minutes"}

    except Exception as e:
        return {"error": str(e)}


def run_virustotal_in_background(task_id: str, file_path: str):
    """Runs VirusTotal in a background thread and saves result"""
    def task():
        print(f"[VT] Starting background scan for task_id={task_id}")

      
        time.sleep(8)

        vt_folder = os.path.join(settings.FORENSIC_ROOT, 'vt_files')
        vt_file = os.path.join(vt_folder, f"{task_id}.json")

       
        with open(vt_file, 'r+') as f:
            data = json.load(f)
            data["vt_status"] = "scanning"
            data["vt_started_at"] = datetime.datetime.now().isoformat()
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()

       
        result = scan_file_with_virustotal(file_path)

       
        with open(vt_file, 'r+') as f:
            data = json.load(f)
            data["vt_status"] = "completed"
            data["vt_result"] = result
            data["vt_completed_at"] = datetime.datetime.now().isoformat()
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()

        print(f"[VT] Scan completed for {task_id}")

   
    thread = threading.Thread(target=task, daemon=True)
    thread.start()