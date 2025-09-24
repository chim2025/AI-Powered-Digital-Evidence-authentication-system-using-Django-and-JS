document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("running_process"); // container div
  const openBtn = document.getElementById("button");       // your button
  let intervalId = null;
  let enrichedIntervalId = null; // NEW: poll id for enrichment
  let currentSearch = "";
  let typingTimeout = null;
  let isPaused = false;
  let sortState = { col: null, order: "asc" };
  let latestData = null; // keep latest raw data for save/export
  /* ------------------- Helpers ------------------- */
  function safeText(s) { return s == null ? "" : String(s); }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function updateCounter() {
    const tbody = modal.querySelector("#processTable tbody");
    const counter = modal.querySelector("#rowCounter");
    if (!tbody || !counter) return;
    const total = tbody.querySelectorAll("tr").length;
    const visible = tbody.querySelectorAll("tr:not([style*='display: none'])").length;
    counter.textContent = `Showing ${visible} / ${total}`;
  }
  /**
   * Render status indicator HTML.
   * - `status` must be the raw status string used to decide color (e.g. "running")
   * - `labelHtml` is optional HTML to display (e.g. with <mark>)
   */
  function renderStatusIndicator(status, labelHtml) {
    const text = safeText(status);
    const s = text.toLowerCase();
    // if labelHtml provided we inject it as-is (it's either escaped/highlighted by caller)
    const label = (labelHtml !== undefined && labelHtml !== null) ? String(labelHtml) : escapeHtml(text);
    if (s === "running") {
      return `<span class="status-indicator running"><i class="fa fa-circle" style="color:green"></i> <span class="status-text">${label}</span></span>`;
    } else if (["sleeping", "idle"].includes(s)) {
      return `<span class="status-indicator sleeping"><i class="fa fa-circle" style="color:orange"></i> <span class="status-text">${label}</span></span>`;
    } else {
      return `<span class="status-indicator stopped"><i class="fa fa-circle" style="color:red"></i> <span class="status-text">${label}</span></span>`;
    }
  }
  /* ------------------- Search (preserves arrows & colors) ------------------- */
  function applySearch() {
    const rows = Array.from(modal.querySelectorAll("#processTable tbody tr"));
    const search = currentSearch;
    if (!rows.length) return;
    // if search is empty -> reset display (use raw originals)
    if (!search) {
      rows.forEach(row => {
        row.querySelectorAll("td").forEach((cell, idx) => {
          // never touch the arrow cell
          if (cell.classList && cell.classList.contains("row-arrow")) return;
          const original = cell.getAttribute("data-original") || (cell.textContent || "");
          if (idx === 4) { // status column (index 4)
            cell.innerHTML = renderStatusIndicator(original);
          } else {
            cell.innerHTML = escapeHtml(original);
          }
        });
        row.style.display = "";
      });
      updateCounter();
      return;
    }
    // build safe regex for search and a replace-regex with global flag for highlighting
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const testRE = new RegExp(escaped, "i");
    const replaceRE = new RegExp(escaped, "gi");
    rows.forEach(row => {
      let matchFound = false;
      row.querySelectorAll("td").forEach((cell, idx) => {
        // keep the arrow cell alone
        if (cell.classList && cell.classList.contains("row-arrow")) return;
        const original = cell.getAttribute("data-original") || (cell.textContent || "");
        if (idx === 4) { // status column
          // highlight inside the label only; use raw original to decide color
          if (testRE.test(original)) {
            matchFound = true;
            const highlighted = escapeHtml(original).replace(replaceRE, "<mark>$&</mark>");
            cell.innerHTML = renderStatusIndicator(original, highlighted);
          } else {
            cell.innerHTML = renderStatusIndicator(original);
          }
        } else {
          if (testRE.test(original)) {
            matchFound = true;
            const highlighted = escapeHtml(original).replace(replaceRE, "<mark>$&</mark>");
            cell.innerHTML = highlighted;
          } else {
            cell.innerHTML = escapeHtml(original);
          }
        }
      });
      row.style.display = matchFound ? "" : "none";
    });
    updateCounter();
  }
  function renderRiskCell(risk) {
    let color = "#a1a4a7ff"; // default gray
    if (risk === "safe") color = "green";
    else if (risk === "suspicious") color = "orange";
    else if (risk === "malicious") color = "red";
    else if (risk === "unknown" || risk === "pending") color = "#a1a4a7ff";
    return `<span style="color:${color}; font-weight:bold;">${escapeHtml(risk || "Waiting")}</span>`;
  }
  /* ------------------- Table rendering helpers ------------------- */
  function renderRows(processes) {
    return processes.map(p => {
      const mem = (p.memory_percent ?? 0);
      const cpu = (p.cpu_percent ?? 0);
      // every data-original contains the raw text used by search
      return `
        <tr data-cpu="${escapeHtml(cpu)}" data-mem="${escapeHtml(mem)}">
          <td class="row-arrow"><i class="fa fa-caret-right"></i></td>
          <td data-original="${escapeHtml(p.pid)}">${escapeHtml(p.pid)}</td>
          <td data-original="${escapeHtml(p.name)}">${escapeHtml(p.name)}</td>
          <td data-original="${escapeHtml(p.username)}">${escapeHtml(p.username)}</td>
          <td class="status-col" data-original="${escapeHtml(p.status)}">${renderStatusIndicator(p.status)}</td>
          <td data-original="${escapeHtml(mem)}">${escapeHtml(mem)}</td>
          <td data-original="${escapeHtml(cpu)}">${escapeHtml(cpu)}</td>
          <td data-original="Waiting">${renderRiskCell("Waiting")}</td>
        </tr>
      `;
    }).join("");
  }
  function buildModalSkeleton(timestamp) {
    return `
      <div class="modal-box">
        <span class="close">&times;</span>
        <h2>Running Processes <small>(Last Updated: ${escapeHtml(timestamp || "")})</small></h2>
        <div class="toolbar sticky">
          <input type="text" id="processSearch" placeholder="Search processes..." />
          <button id="toggleRefresh">${isPaused ? '<i class="fa fa-play"></i> Resume' : '<i class="fa fa-pause"></i> Pause'}</button>
          <div class="save-menu">
            <button id="saveBtn"><i class="fa fa-save"></i> Save <i class="fa fa-caret-down"></i></button>
            <div id="saveDropdown" class="dropdown hidden">
              <button data-format="json"><i class="fa fa-code"></i> Save as JSON</button>
              <button data-format="txt"><i class="fa fa-file-alt"></i> Save as TXT</button>
            </div>
          </div>
          <span id="rowCounter" class="counter"></span>
        </div>
        <div class="table-wrapper">
          <table id="processTable">
            <thead>
              <tr>
                <th class="row-arrow"></th>
                <th>PID</th>
                <th>Name</th>
                <th>User</th>
                <th>Status</th>
                <th class="sortable" data-col="mem">Memory %</th>
                <th class="sortable" data-col="cpu">CPU %</th>
                <th class="sortable" data-col="risk">Risk</th>
              </tr>
            </thead>
            <tbody>
            <!-- rows go here -->
            </tbody>
          </table>
        </div>
        <div id="loadingOverlay" class="hidden">
          <div class="modal-spinner-container">
            <div class="modal-spinner-ring"></div>
            <div class="modal-spinner-core"></div>
            <div class="modal-spinner-glow"></div>
          </div>
          <span>Fetching process data, please wait...</span>
        </div>
      </div>
    `;
  }
  /* ------------------- UI wiring (initial, once) ------------------- */
  function wireUI() {
    // close button (delegated - present in skeleton)
    modal.addEventListener("click", (e) => {
      if (e.target.classList && e.target.classList.contains("close")) {
        modal.classList.add("hidden");
        stopAutoRefresh();
      }
    });
    // save dropdown toggle + handlers (delegated)
    modal.addEventListener("click", (e) => {
      const saveBtn = modal.querySelector("#saveBtn");
      const saveDropdown = modal.querySelector("#saveDropdown");
      if (!saveBtn || !saveDropdown) return;
      if (e.target.closest("#saveBtn")) {
        e.stopPropagation();
        saveDropdown.classList.toggle("hidden");
      } else if (!saveDropdown.contains(e.target)) {
        // click outside dropdown -> close
        saveDropdown.classList.add("hidden");
      }
    });
    // save export handlers (delegated)
    modal.addEventListener("click", (e) => {
      const btn = e.target.closest("#saveDropdown button");
      if (!btn) return;
      const fmt = btn.dataset.format;
      if (!latestData) return;
      if (fmt === "json") {
        const blob = new Blob([JSON.stringify(latestData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "processes.json"; a.click();
        URL.revokeObjectURL(url);
      } else if (fmt === "txt") {
        let txt = "PID\tName\tUser\tStatus\tMemory%\tCPU%\tCommand Line\tCreated\n";
        latestData.processes.forEach(p => {
          txt += `${safeText(p.pid)}\t${safeText(p.name)}\t${safeText(p.username)}\t${safeText(p.status)}\t${safeText(p.memory_percent)}\t${safeText(p.cpu_percent)}\t${safeText(p.risk)}\n`;
        });
        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "processes.txt"; a.click();
        URL.revokeObjectURL(url);
      }
      modal.querySelector("#saveDropdown").classList.add("hidden");
    });
    // row click handler via delegation â€” shows popup
    const tbody = modal.querySelector("#processTable tbody");
    // We add handler only once; the tbody element persists even when we change innerHTML.
    tbody.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      if (e.target.closest(".dropdown") || e.target.closest("#saveBtn")) return;
      // if clicked the arrow itself, allow popup too
      const pidTd = row.querySelector("td:nth-child(2)");
      if (!pidTd) return;
      const pid = pidTd.textContent.trim();
      const p = latestData && latestData.processes ? latestData.processes.find(pr => String(pr.pid) === pid) : null;
      if (!p) return;
      const details = {
        pid: safeText(p.pid),
        name: safeText(p.name),
        user: safeText(p.username),
        status: safeText(p.status),
        mem: safeText(p.memory_percent),
        cpu: safeText(p.cpu_percent),
        cmd: safeText(p.cmdline),
        created: safeText(p.create_time)
      };
      showProcessPopup(details, row);
    });
    // sorting handlers (run initially and after each row-update)
  }
  function addSortHandlers() {
    // safe idempotent: remove old listeners by cloning header cells then add again
    const ths = modal.querySelectorAll("#processTable th.sortable");
    ths.forEach(th => th.replaceWith(th.cloneNode(true)));
    const freshThs = modal.querySelectorAll("#processTable th.sortable");
    freshThs.forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        let order = "asc";
        if (sortState.col === col && sortState.order === "asc") order = "desc";
        sortState = { col, order };
        sortTable(col, order);
        modal.querySelectorAll("#processTable th.sortable").forEach(h => h.classList.remove("asc", "desc"));
        th.classList.add(order);
      });
    });
    if (sortState.col) {
      const h = modal.querySelector(`#processTable th.sortable[data-col="${sortState.col}"]`);
      if (h) h.classList.add(sortState.order);
      sortTable(sortState.col, sortState.order);
    }
  }
  /* ------------------- Enrichment refresh for popup ------------------- */
  function refreshPopupEnrichment(pid, popupEl) {
    if (!pid || !document.body.contains(popupEl)) return;
    fetchEnriched().then(enriched => {
      if (!document.body.contains(popupEl)) return;
      const updated = latestData && latestData.processes ? latestData.processes.find(pr => String(pr.pid) === String(pid)) : null;
      if (!updated) return;
      // Update risk
      const riskSection = popupEl.querySelector(".risk-section");
      if (riskSection) {
        let newRiskClass = "badge-safe";
        if (updated.risk === "suspicious") newRiskClass = "badge-suspicious";
        if (updated.risk === "malicious") newRiskClass = "badge-malicious";
        if (updated.risk === "pending") newRiskClass = "badge-pending";
        riskSection.innerHTML = `<strong>Risk:</strong> <span class="badge ${newRiskClass}">${escapeHtml(updated.risk || "Unknown")}${updated.risk === "pending" ? ' <span class="spinner-container"><span class="spinner-ring"></span><span class="spinner-core"></span><span class="spinner-glow"></span></span>' : ''}</span>`;
      }
      // Update alerts
      const alertsSection = popupEl.querySelector(".alerts-section");
      if (alertsSection) {
        alertsSection.innerHTML = `<strong>Alerts:</strong><br>${
          (updated.alerts && updated.alerts.length)
            ? `<div class="alerts-container"><ul class="alerts-list">${
                updated.alerts.map(a => {
                  const severity = determineAlertSeverity(a);
                  return `<li class="alert-item ${severity}"><i class="fa ${severity === 'critical' ? 'fa-exclamation-circle' : severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i> ${escapeHtml(a)}</li>`;
                }).join("")
              }</ul></div>`
            : "<em>No alerts</em>"
        }`;
      }
      // Update reason
      const reasonSection = popupEl.querySelector(".reason-section");
      if (reasonSection) {
        reasonSection.innerHTML = `<strong>Reason:</strong> ${escapeHtml(updated.reason || "N/A")}`;
      }
      // Update connections
      const connectionsSection = popupEl.querySelector(".connections-section");
      if (connectionsSection && updated.connections) {
        const connectionsHtml = (updated.connections && updated.connections.length)
          ? `<div style="overflow-x:auto;">
               <table class="network-table">
                 <thead>
                   <tr>
                     <th>Family</th>
                     <th>Type</th>
                     <th>Local</th>
                     <th>Remote</th>
                     <th>DNS</th>
                     <th>Blacklist</th>
                     <th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${updated.connections.map(c => `
                     <tr>
                       <td>${escapeHtml(c.family || "")}</td>
                       <td>${escapeHtml(c.type || "")}</td>
                       <td>${escapeHtml(c.laddr || "")}</td>
                       <td>${escapeHtml(c.raddr || "")}</td>
                       <td>${escapeHtml(c.reverse_dns || "Pending")}</td>
                       <td>${escapeHtml(c.blacklist || "None")}</td>
                       <td>${escapeHtml(c.status || "")}</td>
                     </tr>`).join("")}
                 </tbody>
               </table>
             </div>`
          : "<em>No active network connections</em>";
        connectionsSection.innerHTML = `<strong>Network Connections:</strong><br>${connectionsHtml}`;
      }
      // Retry if pending
      if (updated.risk === "pending") {
        setTimeout(() => refreshPopupEnrichment(pid, popupEl), 5000);
      }
    }).catch(() => {
      // Retry on error
      setTimeout(() => refreshPopupEnrichment(pid, popupEl), 10000);
    });
  }
  /* ------------------- Alert Severity Helper ------------------- */
  function determineAlertSeverity(alert) {
    if (!alert) return "info";
    const text = alert.toLowerCase();
    if (text.includes("malicious") || text.includes("critical") || text.includes("error")) return "critical";
    if (text.includes("warning") || text.includes("suspicious") || text.includes("unusual")) return "warning";
    return "info";
  }
  /* ------------------- Popup (submenu) - draggable ------------------- */
  function showProcessPopup(proc, anchorRow) {
    // Remove old popups and reset arrow states
    document.querySelectorAll(".process-popup").forEach(p => p.remove());
    document.querySelectorAll("#processTable tbody tr").forEach(r => {
      r.classList.remove("row-active");
      const arrow = r.querySelector("td.row-arrow i");
      if (arrow) arrow.className = "fa fa-caret-right";
    });
    anchorRow.classList.add("row-active");
    const arrowIcon = anchorRow.querySelector("td.row-arrow i");
    if (arrowIcon) arrowIcon.className = "fa fa-caret-down";
    const p = latestData.processes.find(pr => String(pr.pid) === proc.pid);
    if (!p) return;
    const popup = document.createElement("div");
    popup.className = "process-popup";
    // Risk badge
    let riskClass = "badge-safe";
    if (p.risk === "suspicious") riskClass = "badge-suspicious";
    if (p.risk === "malicious") riskClass = "badge-malicious";
    if (p.risk === "pending") riskClass = "badge-pending";
    // Network connections table with reverse_dns and blacklist
    const connectionsHtml = (p.connections && p.connections.length)
      ? `<div style="overflow-x:auto;">
          <table class="network-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Type</th>
                <th>Local</th>
                <th>Remote</th>
                <th>DNS</th>
                <th>Blacklist</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${p.connections.map(c => `
                <tr>
                  <td>${escapeHtml(c.family || "")}</td>
                  <td>${escapeHtml(c.type || "")}</td>
                  <td>${escapeHtml(c.laddr || "")}</td>
                  <td>${escapeHtml(c.raddr || "")}</td>
                  <td>${escapeHtml(c.reverse_dns || "Pending")}</td>
                  <td>${escapeHtml(c.blacklist || "None")}</td>
                  <td>${escapeHtml(c.status || "")}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`
      : "<em>No active network connections</em>";
    popup.innerHTML = `
  <div class="popup-header">
    <span class="menu-icon"><i class="fa fa-bars"></i></span>
    <h4>Process Details (PID: ${escapeHtml(p.pid)})</h4>
    <button class="theme-toggle" title="Toggle Theme"><i class="fa fa-moon-o"></i></button>
    <button class="copy-btn"><i class="fa fa-copy"></i> Copy</button>
  </div>
  <div class="popup-content">
    <p><strong>Name:</strong> ${escapeHtml(p.name)}</p>
    <p><strong>User:</strong> ${escapeHtml(p.username)}</p>
    <p><strong>Status:</strong> ${renderStatusIndicator(p.status)}</p>
    <p><strong>Creation Time:</strong> ${escapeHtml(p.create_time || "N/A")}</p>
    <p><strong>Memory %:</strong> ${escapeHtml(p.memory_percent || "0")}</p>
    <p><strong>CPU %:</strong> ${escapeHtml(p.cpu_percent || "0")}</p>
    <p class="cmdline">
      <strong>Command Line:</strong>
      <code>${escapeHtml(p.cmdline || "No cmdline available")}</code>
    </p>
    <p class="executable">
      <strong>Executable:</strong>
      <span>${escapeHtml(p.exe || "N/A")}</span>
    </p>
    <p class="executable-hash">
      <strong>SHA256 Hash:</strong>
      <span>${escapeHtml(p.exe_hash || "N/A")}</span>
    </p>
    <p><strong>Threads:</strong> ${escapeHtml(p.num_threads || "0")}</p>
    <p><strong>IO Read Bytes:</strong> ${escapeHtml(p.io_read_bytes || "0")}</p>
    <p><strong>IO Write Bytes:</strong> ${escapeHtml(p.io_write_bytes || "0")}</p>
    <p><strong>Parent:</strong> ${escapeHtml(p.parent ? `${p.parent.name || "None detected"} (PID: ${p.parent.pid || "N/A"})` : "None detected")}</p>
    <p><strong>Signature:</strong> ${
      p.signature && typeof p.signature === 'object' && 'signed' in p.signature
        ? p.signature.signed ? "Signed" : "Not_Signed"
        : "Not_Signed"
    }</p>
    <p><strong>YARA Matches:</strong> ${p.yara_matches && p.yara_matches.length ? p.yara_matches.map(escapeHtml).join(", ") : "None"}</p>
    <p class="risk-section"><strong>Risk:</strong> <span class="badge ${riskClass}">${escapeHtml(p.risk || "Unknown")}${p.risk === "pending" ? ' <span class="spinner-container"><span class="spinner-ring"></span><span class="spinner-core"></span><span class="spinner-glow"></span></span>' : ''}</span></p>
    <p class="alerts-section"><strong>Alerts:</strong><br>
    </p>
    <p class="reason-section"><strong>Reason:</strong> ${escapeHtml(p.reason || "N/A")}</p>
    <p class="connections-section"><strong>Network Connections:</strong><br>${connectionsHtml}</p>
  </div>`;
document.body.appendChild(popup);
    popup.dataset.pid = p.pid; // For global poll
    // Position popup
    const rect = anchorRow.getBoundingClientRect();
    const popupWidth = Math.min(500, Math.max(300, window.innerWidth * 0.4));
    popup.style.width = popupWidth + "px";
    let left = rect.right + 16;
    if (rect.right + popupWidth + 20 > window.innerWidth) {
      left = rect.left - popupWidth - 16;
      if (left < 10) left = 10;
    }
    popup.style.left = `${left + window.scrollX}px`;
    popup.style.top = `${Math.max(10, rect.top + window.scrollY)}px`;
    requestAnimationFrame(() => popup.classList.add("visible"));
    // Draggable
    makeDraggable(popup, ".popup-header");
    const themeToggle = popup.querySelector(".theme-toggle");
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      themeToggle.innerHTML = `<i class="fa fa-${newTheme === "light" ? "moon-o" : "sun-o"}"></i>`;
    });
    // Copy button
    const copyBtn = popup.querySelector(".copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const codeEl = popup.querySelector("code");
        navigator.clipboard.writeText(codeEl?.textContent || "").then(() => {
          copyBtn.innerHTML = '<i class="fa fa-check"></i> Copied';
          setTimeout(() => { copyBtn.innerHTML = '<i class="fa fa-copy"></i> Copy'; }, 2000);
        });
      });
    }
    // After popup shown, try to refresh enrichment for this process
    refreshPopupEnrichment(p.pid, popup); // Initial refresh
    let popupPoll = setInterval(() => refreshPopupEnrichment(p.pid, popup), 10000); // Periodic poll
    // Close popup if clicked outside
    const closePopup = (e) => {
      if (!popup.contains(e.target) && !anchorRow.contains(e.target)) {
        clearInterval(popupPoll);
        popup.remove();
        anchorRow.classList.remove("row-active");
        const ai = anchorRow.querySelector("td.row-arrow i");
        if (ai) ai.className = "fa fa-caret-right";
        document.removeEventListener("click", closePopup);
      }
    };
    setTimeout(() => document.addEventListener("click", closePopup), 0);
  }
  function makeDraggable(el, handleSelector) {
    const handle = el.querySelector(handleSelector) || el;
    let offsetX = 0, offsetY = 0, isDown = false;
    handle.style.cursor = "move";
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDown = true;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("mouseup", mouseUp);
    });
    function mouseMove(e) {
      if (!isDown) return;
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
      el.style.position = "absolute";
      el.style.zIndex = 9999;
    }
    function mouseUp() {
      isDown = false;
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    }
  }
  /* ------------------- Enrichment fetch + merge (NEW) ------------------- */
  function fetchEnriched() {
    return fetch("/get_enriched/")
      .then(r => {
        if (!r.ok) throw new Error("Enriched fetch failed " + r.status);
        return r.json();
      })
      .then(enriched => {
        mergeEnrichment(enriched);
        return enriched;
      })
      .catch(err => {
        console.error("Enriched fetch error:", err);
        // Retry after 10 seconds
        setTimeout(() => fetchEnriched(), 10000);
        throw err; // Maintain promise rejection for callers
      });
  }
  /**
   * mergeEnrichment(enriched)
   * - Handles enriched returned as either:
   *    a) object keyed by exe_hash (legacy), or
   *    b) array/list of enrichment objects (new backend)
   *
   * Expected enrichment object fields: { exe_hash, pids: [...], pid, risk, alerts, reason, ... }
   */
  function mergeEnrichment(enriched) {
    if (!latestData || !latestData.processes) return;
    const processes = latestData.processes;
    // Normalize enriched into maps: byHash and pidMap
    const byHash = {};   // exe_hash -> entry
    const pidMap = {};   // pid_str -> entry
    if (!enriched) return;
    // If server returned an array, iterate; if object, iterate keys -> values
    if (Array.isArray(enriched)) {
      enriched.forEach(entry => {
        if (!entry) return;
        if (entry.exe_hash) byHash[String(entry.exe_hash)] = entry;
        // support entries that supply pids array
        if (Array.isArray(entry.pids)) {
          entry.pids.forEach(pid => { pidMap[String(pid)] = entry; });
        }
        if (entry.pid) pidMap[String(entry.pid)] = entry;
      });
    } else if (typeof enriched === "object") {
      // either keyed by exe_hash or keyed by pid - be flexible
      Object.keys(enriched).forEach(key => {
        const entry = enriched[key];
        if (!entry) return;
        // if the key looks like an exe_hash, store byHash
        if (entry.exe_hash) {
          byHash[String(entry.exe_hash)] = entry;
        }
        // also accept keyed-by-exehash object style: enriched[exe_hash] = {...}
        if (/^[0-9a-f]{64}$/i.test(key)) {
          byHash[key] = entry;
        }
        if (Array.isArray(entry.pids)) {
          entry.pids.forEach(pid => { pidMap[String(pid)] = entry; });
        }
        if (entry.pid) pidMap[String(entry.pid)] = entry;
        // fallback: if key is numeric, map under pid
        if (/^\d+$/.test(key)) pidMap[key] = entry;
      });
    }
    // helper to determine priority of risks
    const rank = (r) => {
      if (!r) return 0;
      r = String(r).toLowerCase();
      if (r === "malicious") return 4;
      if (r === "suspicious") return 3;
      if (r === "safe") return 2;
      if (r === "unknown") return 1;
      if (r === "pending") return 0;
      return 1;
    };
    // Merge for each process in latestData
    processes.forEach(proc => {
      const pidKey = String(proc.pid);
      let entry = pidMap[pidKey] || (proc.exe_hash ? byHash[proc.exe_hash] : undefined);
      if (!entry) return; // nothing to merge for this process
      // Decide whether to overwrite the proc.risk using ranking logic:
      // don't let 'pending' (rank 0) overwrite a higher ranked existing risk
      const incomingRisk = entry.risk;
      const existingRisk = proc.risk || "unknown";
      if (incomingRisk && rank(incomingRisk) >= rank(existingRisk)) {
        proc.risk = incomingRisk;
      } else {
        // keep existing proc.risk (higher priority)
      }
      // Merge alerts (preserve existing proc.alerts and dedupe)
      const existingAlerts = Array.isArray(proc.alerts) ? proc.alerts.slice() : [];
      const incomingAlerts = Array.isArray(entry.alerts) ? entry.alerts : [];
      incomingAlerts.forEach(a => { if (!existingAlerts.includes(a)) existingAlerts.push(a); });
      proc.alerts = existingAlerts;
      // Reason: prefer explicit entry.reason, else join alerts
      if (entry.reason) {
        proc.reason = entry.reason;
      } else if (proc.alerts && proc.alerts.length) {
        proc.reason = proc.alerts.join("; ");
      }
      // Copy all relevant fields safely
      if (entry.last_updated) proc.last_updated = entry.last_updated;
      if (entry.exe) proc.exe = entry.exe;
      if (entry.vt_score !== undefined) proc.vt_score = entry.vt_score;
      if (entry.otx_pulses !== undefined) proc.otx_pulses = entry.otx_pulses;
      if (Array.isArray(entry.connections)) proc.connections = entry.connections; // Overwrite connections
      proc.enriched = true; // Flag to indicate enrichment applied
    });
    // update latestData reference
    latestData.processes = processes;
    // Now update rendered table rows status cell (only)
    const tbody = modal.querySelector("#processTable tbody");
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.forEach(row => {
        const pid = (row.querySelector("td:nth-child(2)") || {}).textContent?.trim();
        if (!pid) return;
        const proc = latestData.processes.find(pr => String(pr.pid) === pid);
        if (!proc) return;
        // Status column update (already exists)
        const statusTd = row.querySelector("td.status-col");
        if (statusTd) {
          statusTd.setAttribute("data-original", proc.status || "");
          statusTd.innerHTML = renderStatusIndicator(proc.status || "");
        }
        // NEW: Risk column update
        const riskTd = row.querySelector("td[data-original][data-col='risk']") || row.querySelector("td:last-child");
        if (proc.alerts && proc.alerts.length) {
          row.dataset.alerts = proc.alerts.join(", ");
        } else {
          row.dataset.alerts = "";
        }
        if (riskTd) {
          const currentRisk = riskTd.getAttribute("data-original") || "unknown";
          if (currentRisk !== (proc.risk || "unknown")) {
            riskTd.setAttribute("data-original", proc.risk || "unknown");
            riskTd.innerHTML = proc.risk === "pending"
              ? `<span class="risk-pending">${escapeHtml(proc.risk)} <span class="spinner-container"><span class="spinner-ring"></span><span class="spinner-core"></span><span class="spinner-glow"></span></span></span>`
              : renderRiskCell(proc.risk || "unknown");
            // Re-apply search if active
            if (currentSearch) applySearch();
            // Re-sort if risk column is sorted
            if (sortState.col === "risk") sortTable("risk", sortState.order);
          }
        }
      });
    }
  }
  /* ------------------- Main fetch + incremental render ------------------- */
  // We render skeleton once, update tbody on subsequent refreshes to keep UI state
  function fetchProcesses() {
    if (isPaused) return;
    const overlay = modal.querySelector("#loadingOverlay");
    if (!modal.querySelector("#processTable") && overlay) overlay.classList.remove("hidden");
    fetch("/get_process/")
      .then(r => {
        if (!r.ok) throw new Error("Server error " + r.status);
        return r.json();
      })
      .then(data => {
        if (overlay) overlay.classList.add("hidden");
        latestData = data;
        sessionStorage.setItem("latestData", JSON.stringify(data));
        // If modal doesn't have the table skeleton yet, add it
        if (!modal.querySelector("#processTable")) {
          modal.innerHTML = buildModalSkeleton(data.timestamp);
          // wire UI event handlers that depend on the skeleton
          wireUI();
          // search input setup
          const searchBox = modal.querySelector("#processSearch");
          if (searchBox) {
            searchBox.value = currentSearch;
            searchBox.addEventListener("input", () => {
              currentSearch = searchBox.value.trim().toLowerCase();
              applySearch();
              stopAutoRefresh();
              clearTimeout(typingTimeout);
              typingTimeout = setTimeout(() => {
                if (!isPaused) startAutoRefresh();
              }, 1400);
            });
          }
          // toggleRefresh
          const toggleRefresh = modal.querySelector("#toggleRefresh");
          if (toggleRefresh) {
            toggleRefresh.addEventListener("click", () => {
              isPaused = !isPaused;
              if (isPaused) {
                stopAutoRefresh();
                toggleRefresh.innerHTML = '<i class="fa fa-play"></i> Resume';
              } else {
                toggleRefresh.innerHTML = '<i class="fa fa-pause"></i> Pause';
                fetchProcesses();
                startAutoRefresh();
              }
            });
          }
        } else {
          // update timestamp in header (optional)
          const hSmall = modal.querySelector("h2 small");
          if (hSmall) hSmall.textContent = `(Last Updated: ${data.timestamp})`;
        }
        // update tbody html only
        const tbody = modal.querySelector("#processTable tbody");
        if (tbody) {
          tbody.innerHTML = renderRows(data.processes);
        }
        // after updating rows, ensure each td has data-original (they already do from renderRows),
        // but if you have legacy rows, we keep the safeguard:
        modal.querySelectorAll("#processTable tbody tr").forEach(tr => {
          tr.querySelectorAll("td").forEach(td => {
            if (!td.hasAttribute("data-original")) {
              td.setAttribute("data-original", td.textContent || "");
            }
          });
        });
        // re-attach sort handlers (idempotent)
        addSortHandlers();
        // re-apply search (so highlights & hiding persist)
        applySearch();
        // update counter
        updateCounter();
        // NEW: after initial fast fetch, request enrichment merge in background (non-blocking)
        // Errors are ignored to keep UI responsive
        fetchEnriched().catch(() => {});
      })
      .catch(err => {
        if (overlay) overlay.classList.add("hidden");
        console.error("Fetch error:", err);
      });
  }
  function startAutoRefresh() {
    stopAutoRefresh();
    // reasonable defaults: process list every 10s, enriched every 30s
    if (!isPaused) intervalId = setInterval(() => fetchProcesses(), 10000);
    if (!isPaused && !enrichedIntervalId) {
      enrichedIntervalId = setInterval(() => {
        fetchEnriched().catch(() => {});
      }, 30000);
    }
  }
  function stopAutoRefresh() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (enrichedIntervalId) { clearInterval(enrichedIntervalId); enrichedIntervalId = null; }
  }
  function sortTable(col, order) {
    const tbody = modal.querySelector("#processTable tbody");
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const aVal = col === "risk" ? riskRank(a.dataset[col]) : parseFloat(a.dataset[col]) || 0;
      const bVal = col === "risk" ? riskRank(b.dataset[col]) : parseFloat(b.dataset[col]) || 0;
      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
    rows.forEach(r => tbody.appendChild(r));
    updateCounter();
  }
  function riskRank(r) {
    if (!r) return 0;
    r = r.toLowerCase();
    if (r === "malicious") return 3;
    if (r === "suspicious") return 2;
    if (r === "safe") return 1;
    return 0;
  }
  /* ------------------- open button binds ------------------- */
  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    // render immediately once, then start auto-refresh
    fetchProcesses();
    startAutoRefresh();
  });
});
/*
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const targetId = btn.getAttribute("data-target");
  const text = document.getElementById(targetId)?.innerText || "";
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<i class="fa fa-check"></i> Copied';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa fa-copy"></i> Copy';
    }, 2000);
  });
});
*/