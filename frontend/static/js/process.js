document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("running_process"); // container div
  const openBtn = document.getElementById("button");       // your button
  let intervalId = null;
  let currentSearch = "";
  let typingTimeout = null;
  let isPaused = false;
  let sortState = { col: null, order: "asc" };
  let latestData = null; // keep latest raw data for save/export

  /* ------------------- Helpers ------------------- */
  function safeText(s){ return s == null ? "" : String(s); }
  function escapeHtml(str){
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
    } else if (["sleeping","idle"].includes(s)) {
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
          <td class="cmd" data-full="${escapeHtml(p.cmdline)}" data-original="${escapeHtml(p.cmdline)}">${escapeHtml(p.cmdline)}</td>
          <td data-original="${escapeHtml(p.create_time)}">${escapeHtml(p.create_time)}</td>
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
                <th>Command Line</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
            <!-- rows go here -->
            </tbody>
          </table>
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
        const blob = new Blob([JSON.stringify(latestData, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "processes.json"; a.click();
        URL.revokeObjectURL(url);
      } else if (fmt === "txt") {
        let txt = "PID\tName\tUser\tStatus\tMemory%\tCPU%\tCommand Line\tCreated\n";
        latestData.processes.forEach(p => {
          txt += `${safeText(p.pid)}\t${safeText(p.name)}\t${safeText(p.username)}\t${safeText(p.status)}\t${safeText(p.memory_percent)}\t${safeText(p.cpu_percent)}\t${safeText(p.cmdline)}\t${safeText(p.create_time)}\n`;
        });
        const blob = new Blob([txt], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "processes.txt"; a.click();
        URL.revokeObjectURL(url);
      }
      modal.querySelector("#saveDropdown").classList.add("hidden");
    });

    // row click handler via delegation — shows popup
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
        modal.querySelectorAll("#processTable th.sortable").forEach(h => h.classList.remove("asc","desc"));
        th.classList.add(order);
      });
    });

    if (sortState.col) {
      const h = modal.querySelector(`#processTable th.sortable[data-col="${sortState.col}"]`);
      if (h) h.classList.add(sortState.order);
      sortTable(sortState.col, sortState.order);
    }
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

  // Risk color
  let riskColor = "#6c757d";
  if (p.risk === "suspicious") riskColor = "orange";
  if (p.risk === "malicious") riskColor = "red";
  if (p.risk === "safe") riskColor = "green";

  const connectionsHtml = (p.connections && p.connections.length)
    ? `<table style="width:100%; border-collapse:collapse; margin-top:6px; font-size:12px;">
         <thead><tr><th>Local</th><th>Remote</th><th>Status</th></tr></thead>
         <tbody>
           ${p.connections.map(c => `
             <tr>
               <td>${escapeHtml(c.laddr || "")}</td>
               <td>${escapeHtml(c.raddr || "")}</td>
               <td>${escapeHtml(c.status || "")}</td>
             </tr>`).join("")}
         </tbody>
       </table>`
    : "<em>No active network connections</em>";

  popup.innerHTML = `
    <div class="popup-header">
      <span class="menu-icon"><i class="fa fa-bars"></i></span>
      <h4 style="display:inline-block; margin:0 10px; font-size:14px;">Process Details</h4>
    </div>
    <div class="popup-content">
      <p><strong>PID:</strong> ${escapeHtml(p.pid)}</p>
      <p><strong>Name:</strong> ${escapeHtml(p.name)}</p>
      <p><strong>User:</strong> ${escapeHtml(p.username)}</p>
      <p><strong>Status:</strong> ${renderStatusIndicator(p.status)}</p>
      <p><strong>Memory %:</strong> ${escapeHtml(p.memory_percent)}</p>
      <p><strong>CPU %:</strong> ${escapeHtml(p.cpu_percent)}</p>

      <p class="cmdline"><strong>Command Line:</strong>
        <button class="copy-btn"><i class="fa fa-copy"></i> Copy</button>
        <code>${escapeHtml(p.cmdline || "")}</code>
      </p>

      <p><strong>Created:</strong> ${escapeHtml(p.create_time)}</p>
      <p><strong>Executable:</strong> ${escapeHtml(p.exe || "")}</p>
      <p><strong>SHA256:</strong> <code style="font-size:11px;">${escapeHtml(p.exe_hash || "")}</code></p>
      <p><strong>Threads:</strong> ${escapeHtml(p.num_threads || "")}</p>
      <p><strong>I/O:</strong> Read ${escapeHtml(p.io_read_bytes || 0)} bytes, Write ${escapeHtml(p.io_write_bytes || 0)} bytes</p>

      <p><strong>Risk:</strong> <span style="color:${riskColor}; font-weight:bold;">${escapeHtml(p.risk)}</span></p>
      <p><strong>Alerts:</strong><br>
        ${(p.alerts && p.alerts.length) ? "<ul style='margin:4px 0; padding-left:16px;'>" + p.alerts.map(a => `<li>${escapeHtml(a)}</li>`).join("") + "</ul>" : "<em>No alerts</em>"}
      </p>

      <p><strong>Network Connections:</strong><br>${connectionsHtml}</p>
    </div>
  `;

  document.body.appendChild(popup);

  // Position popup
  const rect = anchorRow.getBoundingClientRect();
  const popupWidth = Math.min(480, Math.max(340, window.innerWidth * 0.35));
  popup.style.width = popupWidth + "px";
  let left = rect.right + 12;
  if (rect.right + popupWidth + 20 > window.innerWidth) {
    left = rect.left - popupWidth - 12;
    if (left < 6) left = 6;
  }
  popup.style.left = `${left + window.scrollX}px`;
  popup.style.top = `${rect.top + window.scrollY}px`;

  requestAnimationFrame(() => popup.classList.add("visible"));

  // Draggable
  makeDraggable(popup, ".popup-header");

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

  // Close popup if clicked outside
  const closePopup = (e) => {
    if (!popup.contains(e.target) && !anchorRow.contains(e.target)) {
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

  /* ------------------- Main fetch + incremental render ------------------- */
  // We render skeleton once, update tbody on subsequent refreshes to keep UI state
  function fetchProcesses() {
    if (isPaused) return;
    const overlay = modal.querySelector("#loadingOverlay");
    if (overlay) overlay.classList.remove("hidden");

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
      })
      .catch(err => {
        if (overlay) overlay.classList.add("hidden");
        console.error("Fetch error:", err);
      });
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!isPaused) intervalId = setInterval(() => fetchProcesses(), 10000);
  }
  function stopAutoRefresh(){
    if (intervalId){ clearInterval(intervalId); intervalId = null; }
  }

  function sortTable(col, order) {
    const tbody = modal.querySelector("#processTable tbody");
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a,b) => {
      const aVal = parseFloat(a.dataset[col]) || 0;
      const bVal = parseFloat(b.dataset[col]) || 0;
      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
    rows.forEach(r => tbody.appendChild(r));
    updateCounter();
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
