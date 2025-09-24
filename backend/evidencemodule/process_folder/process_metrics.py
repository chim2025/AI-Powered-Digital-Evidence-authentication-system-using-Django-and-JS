import time
from .processes import get_local_processes, get_enriched_results

def get_process_metrics():
    print("Starting get_process_metrics")
    process_data = get_local_processes()
    if not process_data or "processes" not in process_data:
        print("No process data available")
        return {
            "total_processes": 0,
            "malicious_processes": 0,
            "virus_total_flagged": 0,
            "open_threat_matches": 0
        }
    print(f"Process data: {process_data}")
    processes = process_data.get("processes", [])
    enriched_results = get_enriched_results()
    print(f"Enriched results: {enriched_results}")
    total_processes = len(processes)
    malicious_count = 0
    vt_flagged_count = 0
    open_threat_count = 0

    # Only process valid enriched results
    for result in enriched_results or []:  # Handle case where enriched_results is None
        risk = result.get("risk", "unknown")
        alerts = result.get("alerts", [])
        if risk in ["malicious", "suspicious"]:
            malicious_count += 1
        if any("engines flagged" in alert.lower() for alert in alerts):
            vt_flagged_count += 1
        if any("otx" in alert.lower() or "blacklisted" in alert.lower() for alert in alerts):
            open_threat_count += 1

    metrics = {
        "total_processes": total_processes,
        "malicious_processes": malicious_count,
        "virus_total_flagged": vt_flagged_count,
        "open_threat_matches": open_threat_count
    }
    print(f"Returning metrics: {metrics}")
    return metrics

def update_frontend_metrics():
    """
    Continuously update frontend with live process metrics via a Django view.
    This function can be called periodically or integrated with a WebSocket (e.g., Django Channels).
    For now, rely on the view being polled by the frontend.
    """
    while True:
        metrics = get_process_metrics()
        # For real-time, you'd push via Django Channels; here, rely on polling
        time.sleep(20)  # Update every 20 seconds