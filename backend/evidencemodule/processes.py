# processes.py
import psutil
import hashlib
from .utils.timeutils import current_utc_iso  
def hash_executable(path):
    """Compute SHA256 of an executable (if accessible)."""
    try:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except Exception:
        return None

def analyze_single_process(info, proc):
    """
    Heuristic-based anomaly detection for a single process.
    Returns (risk_level, alerts_list)
    """
    alerts = []
    risk = "safe"

    # Check suspicious executable location
    exe = getattr(proc, "exe", lambda: None)()
    if exe and ("temp" in exe.lower() or "appdata" in exe.lower()):
        alerts.append(f"Executable running from unusual location: {exe}")
        risk = "suspicious"

    # High resource usage
    if (info.get("memory_percent") or 0) > 30:
        alerts.append("High memory usage")
        risk = "suspicious"
    if (proc.cpu_percent(interval=0.0) or 0) > 80:
        alerts.append("High CPU usage")
        risk = "suspicious"

    # Known malicious process names
    bad_names = ["mimikatz.exe", "nc.exe", "backdoor.exe", "keylogger.exe"]
    if info.get("name") and info["name"].lower() in bad_names:
        alerts.append("Known malicious process name detected")
        risk = "malicious"

    return risk, alerts

def get_all_processes():
    """Return a list of all processes with analysis results."""
    processes = []
    timestamp = current_utc_iso()  # UTC ISO timestamp

    psutil.cpu_percent(interval=None)  # warm-up for CPU%

    for proc in psutil.process_iter(['pid', 'ppid', 'name', 'username',
                                     'status', 'memory_percent', 'cmdline',
                                     'create_time', 'num_threads']):
        try:
            info = proc.info
            exe_path = proc.exe() if proc and proc.is_running() else None
            io_counters = proc.io_counters() if proc.is_running() else None
            connections = proc.connections(kind="inet") if proc.is_running() else []

            # Analyze process
            risk, alerts = analyze_single_process(info, proc)

            processes.append({
                "pid": info.get("pid"),
                "ppid": info.get("ppid"),
                "name": info.get("name"),
                "username": info.get("username"),
                "status": info.get("status"),
                "memory_percent": round(info.get("memory_percent") or 0, 2),
                "cpu_percent": round(proc.cpu_percent(interval=0.0) or 0, 2),
                "cmdline": " ".join(info.get("cmdline")) if info.get("cmdline") else "",
                "create_time": (
                    current_utc_iso() if info.get("create_time") else None
                ),
                "exe": exe_path,
                "exe_hash": hash_executable(exe_path) if exe_path else None,
                "num_threads": info.get("num_threads"),
                "io_read_bytes": io_counters.read_bytes if io_counters else None,
                "io_write_bytes": io_counters.write_bytes if io_counters else None,
                "connections": [
                    {
                        "laddr": f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else None,
                        "raddr": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else None,
                        "status": c.status
                    } for c in connections
                ],
                "risk": risk,
                "alerts": alerts
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, TypeError, ValueError):
            continue

    return {"timestamp": timestamp, "processes": processes}
