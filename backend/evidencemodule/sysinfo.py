
import psutil
import socket
import platform
from datetime import datetime
import speedtest
import subprocess
import sys
import uuid
cpu_model = platform.processor()
ram = round(psutil.virtual_memory().total / (1024 ** 3), 2)
disk = round(psutil.disk_usage('/').total / (1024 ** 3), 2)
ip_address = socket.gethostbyname(socket.gethostname())
cores = psutil.cpu_count(logical=False)
threads = psutil.cpu_count()
try:
   mac=":".join(['{:02x}'.format((uuid.getnode() >> ele) &0xff) for ele in range(0, 8*6, 8)][::1])
except Exception as e: 

    mac = "Unknown"
uptime_seconds = (datetime.now() - datetime.fromtimestamp(psutil.boot_time())).total_seconds()
boot_time = datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S')
cpu_usage = psutil.cpu_percent(interval=1)
processes = len(psutil.pids())
hostname = socket.gethostname()
os_version = f"{platform.system()} {platform.release()}"
system_time = datetime.now().strftime("%I:%M %p")
system_date = datetime.now().strftime("%B %d, %Y")
battery = psutil.sensors_battery()
battery_percent = f"{battery.percent}%" if battery else "N/A"
power_plugged = "AC Power" if battery and battery.power_plugged else "Battery"
try:
    st = speedtest.Speedtest()
    download_speed = round(st.download() / 1_000_000, 2)  
    upload_speed = round(st.upload() / 1_000_000, 2)      
except Exception:
    download_speed = upload_speed = "N/A"


def get_firewall_status():
    try:
        result = subprocess.check_output(
            ['powershell', '-Command', 'Get-NetFirewallProfile | Select-Object -Property Name, Enabled'],
            stderr=subprocess.DEVNULL
        ).decode()
        return "Enabled" if "True" in result else "Disabled"
    except Exception:
        return "Unknown"

def get_antivirus_name():
    try:
        result = subprocess.check_output(
            ['powershell', '-Command', 'Get-MpComputerStatus | Select-Object -Property AntivirusEnabled'],
            stderr=subprocess.DEVNULL
        ).decode()
        return "Windows Defender" if "True" in result else "None Detected"
    except Exception:
        return "Unknown"

firewall_status = get_firewall_status()
antivirus_name = get_antivirus_name()
def detect_os():
    version= sys.getwindowsversion()
    build_number= version.build
    if build_number >=22000:
        os_name="Windows 11"
    else:
        os_name= "Windos 10"

    return os_name

def detect_os():
    version = sys.getwindowsversion()
    build_number = version.build
    if build_number >= 22000:
        os_name = "Windows 11"
    else:
        os_name = "Windows 10"
    return os_name

system_info = {
        "cpu_model": cpu_model,
        "ram": f"{ram} GB",
        "disk": f"{disk} GB",
        "ip_address": ip_address,
        "cores": f"{cores} Cores / {threads} Threads",
        "mac_address": mac,
        "uptime": f"{int(uptime_seconds // 86400)} Days, {int((uptime_seconds % 86400) // 3600)} Hours",
        "boot_time": boot_time,
        "cpu_usage": f"{cpu_usage}%",
        "processes": processes,
        "hostname": hostname,
        "os_version": detect_os(),
        "system_time": system_time,
        "system_date": system_date,
        "battery": battery_percent,
        "power_source": power_plugged,
        "download_speed": f"{download_speed} Mbps",
        "upload_speed": f"{upload_speed} Mbps",
        "firewall_status": firewall_status,
        "antivirus": antivirus_name,
    }

network_interfaces = psutil.net_if_addrs()
system_info["network_interfaces"] = ", ".join(network_interfaces.keys())
system_info["python_version"] = sys.version.split()[0]

