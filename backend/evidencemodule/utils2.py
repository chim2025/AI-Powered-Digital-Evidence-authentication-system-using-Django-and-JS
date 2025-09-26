# evidencemodule/utils.py
import psutil
import datetime
import hashlib
import socket
import os
import threading
import queue
import time

# Constants
FAMILY_MAP = {socket.AF_INET: "IPv4", socket.AF_INET6: "IPv6"}
TYPE_MAP = {socket.SOCK_STREAM: "TCP", socket.SOCK_DGRAM: "UDP"}
LOCAL_HASH_BLACKLIST = {
    "44d88612fea8a8f36de82e1278abb02f751d3d3e08f2c74d3a0c5e1f3fa8c8d5": "EICAR Test File",
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca4959917852b855": "Empty file (suspicious)"
}
LOCAL_IP_BLACKLIST = {"185.220.101.1": "Known Tor exit node", "45.33.32.156": "Malware C2 server"}
LOCAL_DOMAIN_BLACKLIST = {"malicious-example.com": "Phishing domain", "badsite.test": "Testing blocked site"}
FEED_SNAPSHOT_DIR = os.path.join(os.path.dirname(__file__), "feeds_cache")
os.makedirs(FEED_SNAPSHOT_DIR, exist_ok=True)
job_queue = queue.Queue()
enrichment_cache = {}
VT_DELAY = 20
OTX_DELAY = 15
_last_vt_time = 0.0
_last_otx_time = 0.0
_time_lock = threading.Lock()
REQUEUE_DELAY = 6
_reverse_dns_cache = {}
CACHE_TTL = 3600
retry_queue = []
retry_lock = threading.Lock()
retry_event = threading.Event()
hash_retry_schedule = {}
MIN_RETRY_DELAY = 6
MAX_RETRY_DELAY = 120

# Helper Functions
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
    try:
        with open(path, "rb") as f:
            h = hashlib.sha256()
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
            return h.hexdigest()
    except Exception:
        return None

def hash_executable(path):
    return safe_sha256_of_file(path)

def format_time(epoch_time):
    try:
        return datetime.datetime.fromtimestamp(epoch_time).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ""

def resolve_domain(ip, timeout=3.0):
    try:
        return socket.gethostbyaddr(ip)[0].lower()
    except Exception:
        return None

def get_net_connections(proc):
    conns = []
    now = time.time()
    expired_ips = [ip for ip, (_, ts) in _reverse_dns_cache.items() if now - ts > CACHE_TTL]
    for ip in expired_ips:
        _reverse_dns_cache.pop(ip, None)
    try:
        for c in proc.connections(kind="inet"):
            try:
                laddr = f"{getattr(c.laddr, 'ip', c.laddr[0])}:{getattr(c.laddr, 'port', c.laddr[1])}" if c.laddr else None
                raddr = f"{getattr(c.raddr, 'ip', c.raddr[0])}:{getattr(c.raddr, 'port', c.raddr[1])}" if c.raddr else None
                conn_entry = {
                    "fd": c.fd if c.fd != -1 else None,
                    "family": FAMILY_MAP.get(c.family, str(c.family)),
                    "type": TYPE_MAP.get(c.type, str(c.type)),
                    "laddr": laddr, "raddr": raddr,
                    "status": c.status if c.status != "NONE" else None,
                    "reverse_dns": None, "blacklist": None
                }
                if raddr:
                    ip = raddr.split(":")[0]
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

def requeue_job(exe, exe_hash, pid, delay):
    next_attempt = time.time() + delay
    with retry_lock:
        from heapq import heappush
        heappush(retry_queue, (next_attempt, (exe, exe_hash, pid)))
        retry_event.set()