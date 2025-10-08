import psutil
import datetime
import hashlib
import threading
import queue
import requests
import time
import socket
import json

import os
import logging
from .process_helpers import analyze_process_proc, safe_hash_file, is_pe_signed, escalate_risk
from .yaracode import load_yara_rules_from_dir, scan_file_with_rules,YARA_RULES

#================YARA RULES ===================


# ================== CUSTOM FEEDS ================== #
FEEDS = {
    "hashes": [
        "https://bazaar.abuse.ch/export/txt/sha256/recent/"
    ],
    "ips": [
        "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
        "https://www.spamhaus.org/drop/drop.txt"
    ],
    "domains": [
        "https://urlhaus.abuse.ch/downloads/text/"
    ]
}

# ================== CONFIG ================== #
VT_API_KEY = "2d20df93153f2c9559d3ef9e231e2cab6c170af6bf5cb21e1a5b26ef7cb1d424"
OTX_API_KEY = "9cf063fc2a02198d48f07e13cab4e6214b83bb679e98bf85a688efdcfd57dc24"

# Optional: location to persist feed snapshots (can be in same folder)
FEED_SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), "feeds_cache")
os.makedirs(FEED_SNAPSHOT_DIR, exist_ok=True)

# Thread-safe queue for enrichment jobs
job_queue = queue.Queue()
# Cache to store enrichment results {exe_hash: {...}}
enrichment_cache = {}

# --- RATE LIMIT CONFIGS (free API safety) ---
VT_DELAY = 20 # seconds between VT lookups (public: 4/min)
OTX_DELAY = 15 # seconds between OTX lookups (avoid hitting free limits)
_last_vt_time = 0.0
_last_otx_time = 0.0
_time_lock = threading.Lock()

# small requeue delay helper (seconds) to avoid immediate rework loops
REQUEUE_DELAY = 6

# ================== HELPERS ================== #
def get_cached_domain(ip):
    now = time.time()
    if ip in _reverse_dns_cache:
        domain, ts = _reverse_dns_cache[ip]
        if now - ts <= CACHE_TTL:
            return domain
    domain = resolve_domain(ip)
    _reverse_dns_cache[ip] = (domain, now)
    return domain

def now_ts():
    return time.time()

def safe_sha256_of_file(path):
    """Compute SHA256 of a file, return None on failure."""
    try:
        with open(path, "rb") as f:
            h = hashlib.sha256()
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
            return h.hexdigest()
    except Exception:
        return None

def hash_executable(path):
    """Alias kept for compatibility with earlier function name."""
    return safe_sha256_of_file(path)

def format_time(epoch_time):
    try:
        return datetime.datetime.fromtimestamp(epoch_time).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ""

import heapq

# ================== HIGH-SCALE REQUEUE ================== #

# Priority queue: list of (next_attempt_time, (exe, exe_hash, pid))
retry_queue = []
retry_lock = threading.Lock()
retry_event = threading.Event()

def requeue_job(exe, exe_hash, pid, delay):
    """Schedule a job for retry without spawning a separate Timer per job."""
    next_attempt = time.time() + delay
    with retry_lock:
        heapq.heappush(retry_queue, (next_attempt, (exe, exe_hash, pid)))
        retry_event.set() # wake up scheduler thread if waiting

def retry_scheduler():
    """Background thread to re-insert jobs into main job_queue at scheduled times."""
    while True:
        with retry_lock:
            if not retry_queue:
                # wait until a new retry is scheduled
                retry_event.clear()
            else:
                next_attempt, job = retry_queue[0]
                now = time.time()
                if now >= next_attempt:
                    # Pop job and put it into main job_queue
                    heapq.heappop(retry_queue)
                    job_queue.put(job)
                    continue # check next job immediately
                else:
                    # Wait until the next scheduled job
                    retry_event.clear()
                    wait_time = next_attempt - now

        # Wait until the next scheduled job or new retry added
        retry_event.wait(timeout=wait_time if 'wait_time' in locals() else None)

# Start scheduler thread
threading.Thread(target=retry_scheduler, daemon=True).start()

def resolve_domain(ip, timeout=3.0):
    """Try reverse DNS to map IP -> domain. Non-fatal; returns None if fails."""
    try:
        # socket.gethostbyaddr may block; set timeout via alarm not portable.
        # We'll attempt and swallow exceptions â€” some environments OK.
        return socket.gethostbyaddr(ip)[0].lower()
    except Exception:
        return None

# ================== PROCESS COLLECTION ================== #

FAMILY_MAP = {
    socket.AF_INET: "IPv4",
    socket.AF_INET6: "IPv6",
    ##socket.AF_UNIX: "Unix",
   
}
TYPE_MAP = {
    socket.SOCK_STREAM: "TCP",
    socket.SOCK_DGRAM: "UDP",
}

# Simple in-memory cache for reverse DNS lookups with TTL
_reverse_dns_cache = {} # {ip: (domain, timestamp)}
CACHE_TTL = 3600 # 1 hour TTL for cached entries

def get_net_connections(proc):
    """Get network connections for a process with DNS caching and auto-clear."""
    conns = []
    now = time.time()
   
    # Clean expired cache entries
    expired_ips = [ip for ip, (_, ts) in _reverse_dns_cache.items() if now - ts > CACHE_TTL]
    for ip in expired_ips:
        _reverse_dns_cache.pop(ip, None)
   
    try:
        for c in proc.connections(kind="inet"):
            try:
                laddr = None
                raddr = None
                if c.laddr:
                    laddr = f"{getattr(c.laddr, 'ip', c.laddr[0])}:{getattr(c.laddr, 'port', c.laddr[1])}"
                if c.raddr:
                    raddr = f"{getattr(c.raddr, 'ip', c.raddr[0])}:{getattr(c.raddr, 'port', c.raddr[1])}"

                conn_entry = {
                    "fd": c.fd if c.fd != -1 else None,
                    "family": FAMILY_MAP.get(c.family, str(c.family)),
                    "type": TYPE_MAP.get(c.type, str(c.type)),
                    "laddr": laddr,
                    "raddr": raddr,
                    "status": c.status if c.status != "NONE" else None,
                    "reverse_dns": None,
                    "blacklist": None
                }

                if raddr:
                    ip = raddr.split(":")[0]

                    # Use cached reverse DNS if available and not expired
                    if ip in _reverse_dns_cache:
                        domain, ts = _reverse_dns_cache[ip]
                        conn_entry["reverse_dns"] = domain
                    else:
                        domain = resolve_domain(ip)
                        conn_entry["reverse_dns"] = domain
                        _reverse_dns_cache[ip] = (domain, now)

                    conn_entry["blacklist"] = LOCAL_IP_BLACKLIST.get(ip)

                conns.append(conn_entry)

            except Exception:
                continue
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError):
        pass
    except Exception:
        pass

    return conns
def get_local_processes():
    """
    Fast local process fetch.
    Returns psutil data only (no external lookups) + any enrichment available.
    Handles permission errors and missing processes gracefully.
    """
    processes = []
    for proc in psutil.process_iter():  # No attrs to avoid skipping processes
        try:
            pid = proc.pid
            # Use oneshot context for all attribute retrieval to minimize race conditions
            with proc.oneshot():
                name = proc.name()
                if not name:  # Additional check for invalid process
                    continue
                username = proc.username() if proc.username() else "N/A"
                status = proc.status() if proc.status() else "unknown"
                cpu_percent = proc.cpu_percent(interval=0.0) if proc.cpu_percent(interval=0.0) is not None else 0.0
                memory_percent = round(proc.memory_percent(), 2) if proc.memory_percent() is not None else 0.0
                create_time = format_time(proc.create_time()) if proc.create_time() else ""
                cmdline = " ".join(proc.cmdline()) if proc.cmdline() else "N/A"
                exe = proc.exe() if proc.exe() else "N/A"
                num_threads = proc.num_threads() if proc.num_threads() is not None else 0
                io_counters = proc.io_counters() if proc.io_counters() else None
                io_read_bytes = io_counters.read_bytes if io_counters else 0
                io_write_bytes = io_counters.write_bytes if io_counters else 0
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue  # Skip if process is gone, access denied, or a zombie
        except Exception as e:
            logging.error(f"Unexpected error for PID {pid}: {e}")
            continue

        # Hash if exe available
        exe_hash = hash_executable(exe) if exe and exe != "N/A" else None
        # Connections (already handles errors)
        connections = get_net_connections(proc)

        # Initialize process_entry
        process_entry = {
            "pid": pid,
            "name": name,
            "username": username,
            "status": status,
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "create_time": create_time,
            "cmdline": cmdline,
            "exe": exe,
            "exe_hash": exe_hash,
            "num_threads": num_threads,
            "io_read_bytes": io_read_bytes,
            "io_write_bytes": io_write_bytes,
            "connections": connections,
            "parent": {"pid": None, "name": None},  # Default parent value
            "signature": None,
            "yara_matches": [],
            "risk": "unknown",
            "alerts": [],
            "reason": "pending"
        }

        # Parent, signature, yara (with try-except)
        try:
            parent_data = analyze_process_proc(proc, process_entry)
            process_entry["parent"] = parent_data.get("parent", {"pid": None, "name": None})
            process_entry["alerts"].extend(parent_data.get("alerts", []))
            if parent_data.get("risk_raise", False):
                process_entry["risk"] = escalate_risk(process_entry["risk"], "suspicious")
        except Exception as e:
            logging.error(f"Error analyzing parent for PID {pid}: {e}")

        signature = None
        if exe and exe != "N/A":
            try:
                signature = is_pe_signed(exe)
            except Exception as e:
                logging.error(f"Error checking signature for {exe}: {e}")
        process_entry["signature"] = signature

        yara_matches = []
        if exe and exe != "N/A" and YARA_RULES:
            try:
                yara_matches = scan_file_with_rules(YARA_RULES, exe)
            except Exception as e:
                logging.error(f"YARA scan failed for {exe}: {e}")
        process_entry["yara_matches"] = yara_matches

        # Merge enrichment if exe_hash exists
        if exe_hash and exe_hash in enrichment_cache:
            merged = merge_results(enrichment_cache[exe_hash])
            process_entry.update({
                "risk": merged.get("risk", "unknown"),
                "alerts": merged.get("alerts", []),
                "reason": merged.get("reason", "")
            })

        # Queue enrichment if exe_hash available but not cached
        if exe_hash:
            if exe_hash not in enrichment_cache:
                job_queue.put((exe, exe_hash, pid))
            else:
                enrichment_cache[exe_hash].setdefault("pids", set()).add(pid)

        processes.append(process_entry)

    return {"timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "processes": processes}

# ... (rest of processes.py remains unchanged)
# ================== ENRICHMENT LOOKUPS ================== #

def _can_call(last_time, delay):
    """Return True if sufficient time passed since last_time (non-blocking check)."""
    return (time.time() - last_time) >= delay

def vt_lookup(sha256):
    """Query VirusTotal for a hash but do NOT block long inside worker if rate limited."""
    global _last_vt_time
    with _time_lock:
        if not _can_call(_last_vt_time, VT_DELAY):
            # skip external call to avoid blocking; caller can merge local data
            return {"risk": "unknown", "alerts": ["vt skipped (rate limit)"]}
        # mark tentative time now to avoid race where two threads call quickly
        _last_vt_time = time.time()
    try:
        url = f"https://www.virustotal.com/api/v3/files/{sha256}"
        headers = {"x-apikey": VT_API_KEY}
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            positives = stats.get("malicious", 0) + stats.get("suspicious", 0)
            alerts = []
            if positives > 0:
                alerts.append(f"{positives} engines flagged this file")
                return {"risk": "malicious", "alerts": alerts}
            return {"risk": "safe", "alerts": []}
        else:
            return {"risk": "unknown", "alerts": [f"vt http {resp.status_code}"]}
    except Exception as e:
        return {"risk": "unknown", "alerts": [f"vt error: {e}"]}

def otx_lookup(sha256):
    """Query AlienVault OTX for a hash but non-blocking on rate limit."""
    global _last_otx_time
    with _time_lock:
        if not _can_call(_last_otx_time, OTX_DELAY):
            return {"risk": "unknown", "alerts": ["otx skipped (rate limit)"]}
        _last_otx_time = time.time()
    try:
        url = f"https://otx.alienvault.com/api/v1/indicators/file/{sha256}/general"
        headers = {"X-OTX-API-KEY": OTX_API_KEY}
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            pulses = data.get("pulse_info", {}).get("pulses", [])
            if pulses:
                alerts = [p.get("name", "otx_pulse") for p in pulses]
                return {"risk": "malicious", "alerts": alerts}
            return {"risk": "safe", "alerts": []}
        else:
            return {"risk": "unknown", "alerts": [f"otx http {resp.status_code}"]}
    except Exception as e:
        return {"risk": "unknown", "alerts": [f"otx error: {e}"]}

# ================== LOCAL FALLBACK DB & DNS ================== #

# seed local lists; update_feeds() will expand these
LOCAL_HASH_BLACKLIST = {
    # sha256: reason
    "44d88612fea8a8f36de82e1278abb02f751d3d3e08f2c74d3a0c5e1f3fa8c8d5": "EICAR Test File",
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca4959917852b855": "Empty file (suspicious)"
}

LOCAL_IP_BLACKLIST = {
    "185.220.101.1": "Known Tor exit node",
    "45.33.32.156": "Malware C2 server"
}

LOCAL_DOMAIN_BLACKLIST = {
    "malicious-example.com": "Phishing domain",
    "badsite.test": "Testing blocked site"
}

def local_enrichment(exe_hash, connections):
    """
    Offline fallback enrichment using local hash/IP/domain lists.
    Returns dict with risk + alerts (lists).
    """
    alerts = []
    risk = "safe"

    # Hash check
    if exe_hash and exe_hash in LOCAL_HASH_BLACKLIST:
        alerts.append(f"Hash blacklisted: {LOCAL_HASH_BLACKLIST[exe_hash]}")
        risk = "malicious"

    # Network checks: compare remote IPs and reverse DNS
    for conn in (connections or []):
        raddr = conn.get("raddr")
        if not raddr:
            continue
        try:
            ip, port = raddr.split(":")
        except Exception:
            ip = raddr
        # direct IP check
        if ip in LOCAL_IP_BLACKLIST:
            alerts.append(f"IP blacklisted: {ip} ({LOCAL_IP_BLACKLIST[ip]})")
            risk = "malicious"

        # reverse DNS -> domain check (best-effort, may be slow; but called only in fallback)
        domain = resolve_domain(ip)
        if domain:
            # exact match or suffix match
            for d in LOCAL_DOMAIN_BLACKLIST.keys():
                if domain == d or domain.endswith("." + d):
                    alerts.append(f"Domain blacklisted: {domain} ({LOCAL_DOMAIN_BLACKLIST[d]})")
                    risk = "malicious"
                    break

    return {"risk": risk, "alerts": alerts}

# ================== FEED FETCHING / NORMALIZATION ================== #

def fetch_feed(url, timeout=20):
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code == 200:
            return resp.text.splitlines()
    except Exception as e:
        # non-fatal
        print(f"[!] Error fetching {url}: {e}")
    return []

def normalize_hashes(lines):
    out = {}
    for line in lines:
        l = line.strip()
        if not l or l.startswith("#"):
            continue
        # many feeds include hashes and other columns; pick pure SHA256-looking lines
        # Accept lines that are hex and length 64
        if len(l) == 64 and all(c in "0123456789abcdefABCDEF" for c in l):
            out[l.lower()] = "From feed"
        else:
            # some bazaar feeds include CSV-like lines, try to extract last token if hex
            toks = l.split()
            for t in toks:
                if len(t) == 64 and all(c in "0123456789abcdefABCDEF" for c in t):
                    out[t.lower()] = "From feed"
                    break
    return out

def normalize_ips(lines):
    result = {}
    for line in lines:
        if not line or line.startswith("#"):
            continue
        l = line.strip()
        # many ip feeds contain comments and ranges; take first token if valid ip
        toks = l.split()
        ip = toks[0]
        # strip possible CIDR suffix
        if "/" in ip:
            ip = ip.split("/")[0]
        # basic IPv4 sanity check
        parts = ip.split(".")
        if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
            result[ip] = "From feed"
    return result

def normalize_domains(lines):
    result = {}
    for line in lines:
        l = line.strip()
        if not l or l.startswith("#"):
            continue
        # skip lines that look like ip addresses
        if any(ch.isdigit() for ch in l) and "." in l and all(p.isdigit() for p in l.split(".") if p):
            continue
        # take the token
        domain = l.split()[0].lower()
        result[domain] = "From feed"
    return result

def persist_feed_snapshot(name, data):
    try:
        path = os.path.join(FEED_SNAPSHOT_DIR, f"{name}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
    except Exception as e:
        print(f"[!] Could not persist feed snapshot {name}: {e}")

def update_feeds():
    """
    Fetch external feeds and merge into local blacklists.
    This is tolerant to failures and keeps existing manual entries.
    """
    global LOCAL_HASH_BLACKLIST, LOCAL_IP_BLACKLIST, LOCAL_DOMAIN_BLACKLIST
    print("[*] Updating feeds...")
    new_hashes = dict(LOCAL_HASH_BLACKLIST)
    new_ips = dict(LOCAL_IP_BLACKLIST)
    new_domains = dict(LOCAL_DOMAIN_BLACKLIST)

    for url in FEEDS.get("hashes", []):
        lines = fetch_feed(url)
        extracted = normalize_hashes(lines)
        new_hashes.update(extracted)

    for url in FEEDS.get("ips", []):
        lines = fetch_feed(url)
        extracted = normalize_ips(lines)
        new_ips.update(extracted)

    for url in FEEDS.get("domains", []):
        lines = fetch_feed(url)
        extracted = normalize_domains(lines)
        new_domains.update(extracted)

    LOCAL_HASH_BLACKLIST.clear(); LOCAL_HASH_BLACKLIST.update(new_hashes)
    LOCAL_IP_BLACKLIST.clear(); LOCAL_IP_BLACKLIST.update(new_ips)
    LOCAL_DOMAIN_BLACKLIST.clear(); LOCAL_DOMAIN_BLACKLIST.update(new_domains)

    # persist snapshots for inspection
    persist_feed_snapshot("hashes", LOCAL_HASH_BLACKLIST)
    persist_feed_snapshot("ips", LOCAL_IP_BLACKLIST)
    persist_feed_snapshot("domains", LOCAL_DOMAIN_BLACKLIST)

    print(f"[+] Feeds updated. Hashes={len(LOCAL_HASH_BLACKLIST)} IPs={len(LOCAL_IP_BLACKLIST)} Domains={len(LOCAL_DOMAIN_BLACKLIST)}")

# ================== MERGE LOGIC ================== #
# ================== MERGE RESULTS ================== #

def merge_results(enrichment_entry):
    """
    Merge all enrichment sources in one cache entry into a single coherent result.
   
    Args:
        enrichment_entry: dict from enrichment_cache[exe_hash] containing:
            - vt_result
            - otx_result
            - local enrichment (risk/alerts)
            - signature, yara_matches (optional)
    Returns:
        dict with merged risk, alerts, reason
    """
    if not enrichment_entry:
        return {"risk": "unknown", "alerts": [], "reason": "No data"}

    alerts = []

    # Local enrichment always present
    local_risk = enrichment_entry.get("local_result", {}).get("risk", "unknown")
    alerts.extend(enrichment_entry.get("local_result", {}).get("alerts") or [])

    # VT results
    vt_result = enrichment_entry.get("vt_result", {"risk": "pending", "alerts": ["vt pending"]})
    if vt_result.get("alerts"):
        alerts.extend(vt_result.get("alerts"))

    # OTX results
    otx_result = enrichment_entry.get("otx_result", {"risk": "pending", "alerts": ["otx pending"]})
    if otx_result.get("alerts"):
        alerts.extend(otx_result.get("alerts"))

    # Signature check
    signature = enrichment_entry.get("signature")
    if signature is False:
        alerts.append("Unsigned executable (authenticode failed)")

    # YARA matches
    yara_matches = enrichment_entry.get("yara_matches") or []
    for match in yara_matches:
        alerts.append(f"YARA hit: {match}")

    # Determine risk escalation
    risk = local_risk
    risk = escalate_risk(risk, vt_result.get("risk", "unknown"))
    risk = escalate_risk(risk, otx_result.get("risk", "unknown"))
    if signature is False:
        risk = escalate_risk(risk, "suspicious")
    if yara_matches:
        risk = escalate_risk(risk, "malicious")

    # Deduplicate alerts
    alerts = list(dict.fromkeys(alerts))

    # Reason: show pending if any enrichment pending, else alerts
    pending_sources = []
    if vt_result.get("risk") == "pending": pending_sources.append("VirusTotal")
    if otx_result.get("risk") == "pending": pending_sources.append("OTX")
    if risk == "pending" or pending_sources:
        reason = f"Waiting for {' / '.join(pending_sources)} results" if pending_sources else "Pending external enrichment"
    else:
        reason = "; ".join(alerts) if alerts else "No alerts"

    return {"risk": risk, "alerts": alerts, "reason": reason}

hash_retry_schedule = {} # {exe_hash: next_attempt_timestamp}

MIN_RETRY_DELAY = 6 # seconds
MAX_RETRY_DELAY = 120 # exponential backoff cap

# ================== WORKER-LEVEL DNS CACHE INTEGRATION ================== #

def worker():
    """
    Optimized worker loop:
    - Automatic retry with gradual backoff for pending VT/OTX enrichments.
    - Partial results update in real time.
    - Local enrichment always runs immediately.
    - Uses cached reverse DNS for faster network enrichment.
    """
    while True:
        try:
            exe, exe_hash, pid = job_queue.get(timeout=1)
        except queue.Empty:
            time.sleep(0.1)
            continue
        if not exe_hash:
            job_queue.task_done()
            continue
        try:
            psutil.Process(pid)  # Check if process still exists
        except psutil.NoSuchProcess:
            job_queue.task_done()
            continue

        # Ensure cache entry exists
        entry = enrichment_cache.setdefault(exe_hash, {
            "exe": exe,
            "risk": "pending",
            "alerts": ["pending"],
            "pids": set([pid]),
            "reason": "Pending enrichment",
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z"
        })
        entry["pids"].add(pid)

        now = time.time()
        next_attempt = hash_retry_schedule.get(exe_hash, now)
        if now < next_attempt:
            requeue_job(exe, exe_hash, pid, delay=next_attempt - now)
            job_queue.task_done()
            continue

        # ----------------- NETWORK CONNECTIONS ----------------- #
        connections = []
        try:
            proc = psutil.Process(pid)
            for c in proc.connections(kind="inet"):
                laddr = f"{getattr(c.laddr, 'ip', c.laddr[0])}:{getattr(c.laddr, 'port', c.laddr[1])}" if c.laddr else None
                raddr = f"{getattr(c.raddr, 'ip', c.raddr[0])}:{getattr(c.raddr, 'port', c.raddr[1])}" if c.raddr else None

                conn_entry = {
                    "fd": c.fd if c.fd != -1 else None,
                    "family": FAMILY_MAP.get(c.family, str(c.family)),
                    "type": TYPE_MAP.get(c.type, str(c.type)),
                    "laddr": laddr,
                    "raddr": raddr,
                    "status": c.status if c.status != "NONE" else None,
                    "reverse_dns": None,
                    "blacklist": None
                }

                if raddr:
                    ip = raddr.split(":")[0]
                    # Use cached reverse DNS if available
                    if ip in _reverse_dns_cache:
                        domain, ts = _reverse_dns_cache[ip]
                        # Check TTL
                        if now - ts > CACHE_TTL:
                            domain = resolve_domain(ip)
                            _reverse_dns_cache[ip] = (domain, now)
                    else:
                        domain = resolve_domain(ip)
                        _reverse_dns_cache[ip] = (domain, now)

                    conn_entry["reverse_dns"] = domain
                    conn_entry["blacklist"] = LOCAL_IP_BLACKLIST.get(ip)

                connections.append(conn_entry)
        except (psutil.AccessDenied, psutil.NoSuchProcess, ValueError, Exception):
            pass

        # ----------------- LOCAL ENRICHMENT ----------------- #
        local_result = local_enrichment(exe_hash, connections)

        # ----------------- VT / OTX LOOKUPS ----------------- #
        vt_result = entry.get("vt_result", {"risk": "pending", "alerts": ["vt pending"]})
        otx_result = entry.get("otx_result", {"risk": "pending", "alerts": ["otx pending"]})

        if vt_result.get("risk") == "pending" and _can_call(_last_vt_time, VT_DELAY):
            vt_result = vt_lookup(exe_hash)
            entry["vt_result"] = vt_result

        if otx_result.get("risk") == "pending" and _can_call(_last_otx_time, OTX_DELAY):
            otx_result = otx_lookup(exe_hash)
            entry["otx_result"] = otx_result

        # ----------------- MERGE RESULTS ----------------- #
        entry["vt_result"] = vt_result
        entry["otx_result"] = otx_result
        entry["local_result"] = local_result
        merged = merge_results(entry)


        # ----------------- ALERT & REASON ----------------- #

        final_alerts = list(dict.fromkeys(
            (local_result.get("alerts") or []) +
            (vt_result.get("alerts") or []) +
            (otx_result.get("alerts") or []) +
            (merged.get("alerts") or [])
            ))


        if merged.get("risk") == "pending":
            pending_sources = []
            if vt_result.get("risk") == "pending": pending_sources.append("VirusTotal")
            if otx_result.get("risk") == "pending": pending_sources.append("OTX")
            reason = f"Waiting for {' / '.join(pending_sources)} results" if pending_sources else "Pending external enrichment"

            prev_delay = hash_retry_schedule.get(f"{exe_hash}_delay", MIN_RETRY_DELAY)
            next_delay = min(prev_delay * 2, MAX_RETRY_DELAY)
            hash_retry_schedule[exe_hash] = now + next_delay
            hash_retry_schedule[f"{exe_hash}_delay"] = next_delay

            requeue_job(exe, exe_hash, pid, delay=next_delay)
        else:
            reason = "; ".join(final_alerts) if final_alerts else "No alerts"
            hash_retry_schedule.pop(exe_hash, None)
            hash_retry_schedule.pop(f"{exe_hash}_delay", None)

        # ----------------- CACHE UPDATE ----------------- #
        enrichment_cache[exe_hash].update({
            "risk": merged.get("risk", "unknown"),
            "alerts": final_alerts,
            "reason": reason,
            "last_updated": datetime.datetime.utcnow().isoformat() + "Z"
        })

        job_queue.task_done()

# Start worker thread
threading.Thread(target=worker, daemon=True).start()

# ================== PUBLIC API ================== #

# ================== GET ENRICHED RESULTS ================== #

def get_enriched_results():
    """
    Return enrichment_cache as a list of fully merged JSON-friendly dicts.
    Each entry includes:
        - exe_hash
        - exe
        - risk
        - alerts
        - pids
        - pid (primary)
        - reason
        - last_updated
    """
    results = []
    for exe_hash, data in enrichment_cache.items():
        merged = merge_results(data)
        results.append({
            "exe_hash": exe_hash,
            "exe": data.get("exe"),
            "risk": merged.get("risk", "unknown"),
            "alerts": merged.get("alerts", []),
            "pids": list(data.get("pids") or []),
            "pid": next(iter(data.get("pids"))) if data.get("pids") else None,
            "reason": merged.get("reason", ""),
            "last_updated": data.get("last_updated")
        })
    return results




# ================== FEED SCHEDULER ================== #

def schedule_updates(interval=86400):
    """
    Update feeds immediately and schedule periodic updates using Timer.
    """
    try:
        update_feeds()
    except Exception as e:
        print("Feed update failed:", e)
    # schedule next
    t = threading.Timer(interval, schedule_updates, [interval])
    t.daemon = True
    t.start()

# Start daily feed updates (non-blocking)
schedule_updates()

# Pre-fill cache for all existing processes
for proc in psutil.process_iter():  # No attrs to avoid skipping
    try:
        pid = proc.pid
        try:
            exe = proc.exe()
        except (psutil.AccessDenied, ValueError):
            exe = None

        if not exe:
            continue
        exe_hash = hash_executable(exe)
        if not exe_hash:
            continue

        # ensure cache entry exists
        if exe_hash not in enrichment_cache:
            enrichment_cache[exe_hash] = {
                "exe": exe,
                "risk": "pending",
                "alerts": ["pending"],
                "pids": set([pid]),
                "reason": "Pending enrichment",
                "last_updated": datetime.datetime.utcnow().isoformat() + "Z"
            }
            job_queue.put((exe, exe_hash, pid))
        else:
            enrichment_cache[exe_hash]["pids"].add(pid)

    except (psutil.NoSuchProcess, psutil.AccessDenied):
        continue
    except Exception:
        continue