import os
import time
import hashlib
import threading
import pefile
import psutil
from functools import lru_cache
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

_lock = threading.Lock()
_reverse_dns_cache = {}  # ip -> (domain, ts)
_PE_SIGNATURE_CACHE = {}  # path -> dict / None
_SHA_CACHE = {}         # path -> sha256
CACHE_TTL = 3600
RISK_PRIORITY = {
    "safe": 0,
    "unknown": 1,
    "suspicious": 2,
    "malicious": 3
}

def safe_hash_file(path):
    """Compute sha256; cache results for path -> sha256. Returns None on error."""
    if not path or not os.path.isfile(path):
        return None
    with _lock:
        cached = _SHA_CACHE.get(path)
        if cached:
            return cached
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        digest = h.hexdigest()
        with _lock:
            _SHA_CACHE[path] = digest
        return digest
    except Exception as e:
        logging.error(f"Hashing error for {path}: {e}")
        return None

# ----- parent-child checks -----
def parent_child_check(proc):
    """
    Return dict with parent info and alerts based on parent-child relationships.
    Takes psutil.Process instance.
    """
    alerts = []
    parent_info = {"pid": None, "name": None}
    try:
        parent = proc.parent()
        if not parent:
            return {"alerts": alerts, "parent": parent_info}
        try:
            parent_info["pid"] = parent.pid
            parent_info["name"] = parent.name() or "N/A"
            p_name = (proc.name() or "").lower()
            parent_name = (parent_info["name"] or "").lower()
        except Exception as e:
            logging.warning(f"Parent name error for PID {proc.pid}: {e}")
            return {"alerts": alerts, "parent": parent_info}

        # suspicious combos
        if p_name in ("powershell.exe", "pwsh.exe", "cmd.exe") and parent_name not in ("explorer.exe", "services.exe", "taskeng.exe"):
            alerts.append(f"Suspicious parent-child: {parent_name} â†’ {p_name}")
        if p_name == "svchost.exe" and parent_name != "services.exe":
            alerts.append(f"svchost.exe running with parent {parent_name}")

        # child process running from temp folders
        try:
            exe = proc.exe()
            if exe and (("\\temp\\" in exe.lower()) or ("/tmp/" in exe.lower())):
                alerts.append(f"Executable running from temp path: {exe}")
        except Exception as e:
            logging.warning(f"EXE path error for PID {proc.pid}: {e}")
    except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
        logging.warning(f"Parent access denied for PID {proc.pid}: {e}")
    return {"alerts": alerts, "parent": parent_info}

def is_pe_signed(path):
    """
    Check for certificate table presence and return detailed signature info.
    Uses cache to minimize repeated pefile loads.
    Returns dict with 'signed', 'signer', 'valid', or None on error.
    """
    if not path or not os.path.isfile(path):
        return None
    with _lock:
        if path in _PE_SIGNATURE_CACHE:
            val, ts = _PE_SIGNATURE_CACHE[path]
            if time.time() - ts < CACHE_TTL:
                return val
    try:
        pe = pefile.PE(path, fast_load=True)
        sig_info = {"signed": False, "signer": None, "valid": False}
        try:
            dir_entry = pe.OPTIONAL_HEADER.DATA_DIRECTORY[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_SECURITY']]
            if getattr(dir_entry, 'VirtualAddress', 0):
                sig_info["signed"] = True
                # Extract signer and validate (basic check)
                if hasattr(pe, 'DIRECTORY_ENTRY_SECURITY'):
                    cert_data = pe.get_certificate_data()
                    if cert_data:
                        sig_info["signer"] = cert_data[0].get('issuer', 'Unknown')
                        sig_info["valid"] = True  # Simplified; add full validation if needed
        except Exception as e:
            logging.warning(f"Signature directory error for {path}: {e}")
        with _lock:
            _PE_SIGNATURE_CACHE[path] = (sig_info, time.time())
        return sig_info
    except Exception as e:
        logging.error(f"PE parsing error for {path}: {e}")
        with _lock:
            _PE_SIGNATURE_CACHE[path] = (None, time.time())
        return None

# ----- command-line heuristics -----
def suspicious_commandline(cmdline):
    """Return list of alerts for suspicious commandlines"""
    alerts = []
    if not cmdline:
        return alerts
    s = cmdline.lower()
    # examples: encoded commands, downloaders, mshta/or rundll usage
    if " -enc " in s or " -encodedcommand " in s:
        alerts.append("Encoded PowerShell command detected")
    if "bitsadmin" in s or "certutil -urlcache" in s or "certutil -decode" in s:
        alerts.append("Downloader-like command detected (bitsadmin/certutil)")
    if "mshta" in s or "rundll32" in s:
        alerts.append("mshta/rundll32 invocation detected")
    return alerts

# ----- network heuristics -----
def connection_suspicious(conn):
    """
    conn: a mapping with 'raddr' and 'reverse_dns' keys.
    Return alert string or None if not suspicious.
    """
    if not conn:
        return None
    raddr = conn.get("raddr")
    rdns = conn.get("reverse_dns")
    if not raddr:
        return None
    try:
        ip = raddr.split(":")[0]
    except Exception:
        ip = raddr

    # Use global from processes.py
    from importlib import import_module
    main_module = import_module('__main__')
    local_ip_blacklist = getattr(main_module, 'LOCAL_IP_BLACKLIST', {})

    if ip in local_ip_blacklist:
        return f"Remote IP blacklisted: {ip}"

    if rdns:
        rd = rdns.lower()
        if rd.endswith(".zip") or rd.endswith(".xyz") or rd.endswith(".club"):
            return f"Suspicious reverse DNS: {rd}"
    return None

def analyze_process_proc(proc, info):
    """
    Given psutil.Process proc and the existing info dict,
    return dict with alerts, parent info, and risk_override_flag.
    - info is expected to be the dict you already build with exe, exe_hash, cmdline etc.
    """
    result = {"alerts": [], "parent": {"pid": None, "name": None}, "risk_raise": False}
    try:
        parent_check = parent_child_check(proc)
        result["alerts"].extend(parent_check["alerts"])
        result["parent"] = parent_check["parent"]
        cmd = info.get("cmdline") or ""
        result["alerts"].extend(suspicious_commandline(cmd))

        exe = info.get("exe")
        if exe:
            sig_info = is_pe_signed(exe)
            if sig_info:
                if not sig_info["signed"]:
                    result["alerts"].append(f"Unsigned executable: {exe}")
                info["signature"] = sig_info  # Update info with detailed signature
            else:
                info["signature"] = {"signed": False, "signer": None, "valid": False}

        for c in info.get("connections", []) or []:
            cs = connection_suspicious(c)
            if cs:
                result["alerts"].append(cs)
    except Exception as e:
        logging.error(f"Process analysis error for PID {proc.pid}: {e}")
    if result["alerts"]:
        result["risk_raise"] = True
    return result

def escalate_risk(current, new):
    """Return the higher-priority risk between current and new."""
    if RISK_PRIORITY.get(new, 0) > RISK_PRIORITY.get(current, 0):
        return new
    return current