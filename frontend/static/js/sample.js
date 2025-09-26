function renderEvidenceResults(data) {
  const section = document.getElementById("analytics_section");
  const df = data.deepfake || {};
  const forgery = data.forgery_detection || {};
  const meta = data.metadata_tags || {};
  const hashes = data.hashes || {};
  const stego = data.stego || {};
  console.log("Stego data:", stego); // Debug stego data

  const imageurl = document.getElementsByClassName("preview-image");
  section.innerHTML = `
    <div class="analysis-container modern-analysis">
      <h3 class="section-title">🧪 Evidence Analysis Results</h3>
      <div class="tabs">
        <button class="tab-button active" data-tab="summaryTab">Summary</button>
        <button class="tab-button" data-tab="deepfakeTab">Deepfake Analysis</button>
        <button class="tab-button" data-tab="forgeryTab">Forgery Detection</button>
        <button class="tab-button" data-tab="metadataTab">Metadata Details</button>
        <button class="tab-button" data-tab="stegoTab">Steganography</button>
      </div>
      <div class="tab-content active" id="summaryTab">
        <div class="card-grid">
          <div class="result-card">
            <h4>General Model Score</h4>
            <p>${df.verdict || "N/A"}</p>
            <div class="progress-circle" data-percentage="${(df.confidence_score || 0).toFixed(0)}">
              <span class="progress-value">${(df.confidence_score || 0).toFixed(0)}%</span>
            </div>
            <small>Confidence Score</small>
          </div>
          <div class="result-card">
            <h4>Deepfake/AI Verdict</h4>
            <p>${df.ai_generated || "N/A"}</p>
            <div class="progress-circle" data-percentage="${(df.ai_generated_confidence || 0).toFixed(0)}">
              <span class="progress-value">${(df.ai_generated_confidence || 0).toFixed(0)}%</span>
            </div>
            <small>Confidence Score</small>
          </div>
          <div class="result-card">
            <h4>Forgery Verdict</h4>
            <p>${forgery.verdict || "N/A"}</p>
          </div>
          <div class="result-card">
            <h4>Metadata Verdict</h4>
            <p>${meta.verdict || "N/A"}</p>
          </div>
          <div class="result-card">
            <h4>Steganography Verdict</h4>
            <p>${stego.stego_detected ? "Detected" : "Not Detected"}</p>
          </div>
        </div>
        <div class="heatmap-container">
          <p>${data.file_path || "N/A"}</p>
          <div class="hash-grid">
            ${Object.entries(hashes || {}).map(([key, value]) => `
              <div class="hash-card">
                <div class="hash-icon">
                  <i class="fas ${key.includes('md5') ? 'fa-fingerprint' : key.includes('sha1') ? 'fa-shield-alt' : key.includes('sha256') ? 'fa-lock' : 'fa-key'}"></i>
                </div>
                <div class="hash-info">
                  <h6>${key.toUpperCase()}</h6>
                  <code class="hash-value">${value}</code>
                </div>
              </div>
            `).join("")}
          </div>
          <small><i class="fas fa-search-plus"></i> Click to enlarge</small>
        </div>
      </div>
      <div class="tab-content deepfake-section" id="deepfakeTab">
        <h4 class="section-title"><i class="fas fa-brain"></i> Deepfake Detection Summary</h4>
        <div class="deepfake-grid">
          <div class="df-card">
            <h5><i class="fas fa-user-check"></i> Face Detection</h5>
            <p><strong>Regions Detected:</strong> ${df.detected_regions || "N/A"}</p>
            <p><strong>Faces Count:</strong> ${df.face_count || "N/A"}</p>
            <p><strong>Content Type:</strong> ${df.content_type || "N/A"}</p>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-random"></i> Manipulation</h5>
            <p><strong>Type:</strong> ${df.manipulation_type || "N/A"}</p>
            <p><strong>Tampering:</strong>
              <span class="${df.tampering_detected ? 'badge-fake' : 'badge-real'}">
                <i class="fas ${df.tampering_detected ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                ${df.tampering_detected ? "Detected" : "Not Detected"}
              </span>
            </p>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-robot"></i> AI Verdict</h5>
            <p><strong>AI Verdict:</strong> ${df.ai_generated_label || "Unknown"}</p>
            <p><strong>Confidence:</strong> <span class="conf-bar">
              <span class="conf-fill" style="width:${df.ai_generated_confidence || 0}%;"></span>
            </span> ${df.ai_generated_confidence || 0}%</p>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-microchip"></i> Models Used</h5>
            <ul class="df-list">
              ${df.models_used?.map(m => `<li><i class="fas fa-cogs"></i> ${m}</li>`).join("") || "<li>None</li>"}
            </ul>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-percentage"></i> Model Scores</h5>
            <p><strong>ResNet-18:</strong> ${df.model_scores?.resnet18 || "N/A"}%</p>
            <p><strong>EfficientNet:</strong> ${df.model_scores?.efficientnet || "N/A"}%</p>
            <p><strong>Overall Confidence:</strong> ${df.confidence_score || "N/A"}%</p>
          </div>
          <div class="df-card verdict-box">
            <h5><i class="fas fa-balance-scale"></i> Final Verdict</h5>
            <p class="verdict-text ${df.verdict === 'Authentic' ? 'verdict-real' : 'verdict-fake'}">
              ${df.verdict || "N/A"}
            </p>
          </div>
        </div>
        <canvas id="dfChart"></canvas>
      </div>
      <div class="tab-content forgery-section" id="forgeryTab">
        <h4 class="section-title"><i class="fas fa-search-dollar"></i> Forgery Detection Summary</h4>
        <div class="forgery-grid">
          <div class="forgery-card">
            <h5><i class="fas fa-tools"></i> Methods Used</h5>
            <ul class="method-list">
              ${forgery.methods_used?.map(method => `<li><i class="fas fa-check-circle"></i> ${method}</li>`).join("") || "<li>None</li>"}
            </ul>
          </div>
          <div class="forgery-card">
            <h5><i class="fas fa-copy"></i> Copy-Move Detection</h5>
            <p><strong>Score:</strong> ${forgery.copy_move?.score || "N/A"}</p>
            <p><strong>Flagged:</strong>
              <span class="${forgery.copy_move?.flagged ? 'badge-fake' : 'badge-real'}">
                ${forgery.copy_move?.flagged ? "Yes" : "No"}
              </span>
            </p>
          </div>
          <div class="forgery-card">
            <h5><i class="fas fa-vector-square"></i> Edge & Blur Analysis</h5>
            <p><strong>Edge Density:</strong> ${forgery.edges?.edge_density || "N/A"}</p>
            <p><strong>Edge Flagged:</strong> ${forgery.edges?.edge_flagged ? "Yes" : "No"}</p>
            <p><strong>Blur Score:</strong> ${forgery.edges?.blur_score || "N/A"}</p>
            <p><strong>Blur Flagged:</strong> ${forgery.edges?.blur_flagged ? "Yes" : "No"}</p>
          </div>
          <div class="forgery-card">
            <h5><i class="fas fa-paint-brush"></i> ELA (Error Level Analysis)</h5>
            <p><strong>ELA Score:</strong> ${forgery.ela?.ela_score || "N/A"}</p>
            <p><strong>ELA Flagged:</strong> ${forgery.ela?.ela_flagged ? "Yes" : "No"}</p>
            <p><strong>Histogram Std:</strong> ${forgery.ela?.histogram_std || "N/A"}</p>
          </div>
          <div class="forgery-card">
            <h5><i class="fas fa-signal"></i> Noise Pattern Analysis</h5>
            <p><strong>Laplacian Variance:</strong> ${forgery.noise?.laplacian_variance || "N/A"}</p>
            <p><strong>Flagged:</strong> ${forgery.noise?.noise_flagged ? "Yes" : "No"}</p>
          </div>
          <div class="forgery-card verdict-box">
            <h5><i class="fas fa-balance-scale"></i> Verdict</h5>
            <p class="verdict-text ${forgery.verdict === 'Forged' ? 'verdict-fake' : 'verdict-real'}">
              ${forgery.verdict || "N/A"}
            </p>
          </div>
        </div>
        <canvas id="elaChart"></canvas>
      </div>
      <div class="tab-content metadata-tab" id="metadataTab">
        <h4 class="meta-section-title"><i class="fas fa-info-circle"></i> Metadata Findings</h4>
        <div class="meta-highlight-box">
          <p><i class="fas fa-tools meta-icon"></i> <strong>Software Used:</strong> ${meta.software_used || "Not Detected"}</p>
        </div>
        <div class="meta-highlight-box warning">
          <p><i class="fas fa-exclamation-triangle"></i> Inconsistencies:
            ${meta.metadata_inconsistencies?.join(", ") || "None found"}
          </p>
        </div>
        <div class="meta-highlight-box location">
          <p><i class="fas fa-map-marker-alt"></i> GPS Location:
            ${meta.gps_coordinates?.latitude || "N/A"}, ${meta.gps_coordinates?.longitude || "N/A"}
          </p>
        </div>
        <div class="meta-subsection">
          <h5><i class="fas fa-camera-retro"></i> EXIF Data</h5>
          <div class="exif-grid">
            ${Object.entries(meta.exif_data || {}).map(([k, v]) => `
              <div class="exif-card">
                <p class="exif-key"><i class="fas fa-tag"></i> ${k}</p>
                <p class="exif-value">${v}</p>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="tab-content stego-section" id="stegoTab">
        <h4 class="section-title"><i class="fas fa-eye-slash"></i> Steganography Analysis</h4>
        <div class="stego-grid">
          <div class="stego-card">
            <h5><i class="fas fa-check-circle"></i> Detection Status</h5>
            <p><strong>Status:</strong>
              <span class="${stego.stego_detected ? 'badge-fake' : 'badge-real'}">
                <i class="fas ${stego.stego_detected ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                ${stego.stego_detected ? "Detected" : "Not Detected"}
              </span>
            </p>
          </div>
          ${stego.message ? `
            <div class="stego-card">
              <h5><i class="fas fa-info-circle"></i> Message</h5>
              <p>${stego.message}</p>
            </div>
          ` : ""}
          ${stego.stego_detected && stego.extracted_data && stego.extracted_data.length > 0 ? `
            <div class="stego-card">
              <h5><i class="fas fa-file-alt"></i> Extracted Data</h5>
              <ul class="stego-list">
                ${stego.extracted_data.map(data => `<li>${data}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${stego.stego_detected && stego.error ? `
            <div class="stego-card">
              <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
              <p>${stego.error}</p>
            </div>
          ` : ""}
          ${stego.stego_detected && (stego.hex_data?.length > 0 || stego.raw_output || stego.hex_output) ? `
            <div class="stego-card">
              <h5><i class="fas fa-code"></i> Raw Data</h5>
              <button id="viewRawBtn" aria-label="Toggle raw hex view">View Raw Data as Hex</button>
              <pre id="hexView" style="display: none; background: #f8f8f8; border: 1px solid #ddd; padding: 10px; font-family: monospace; font-size: 12px; overflow: auto; max-height: 400px; white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  // Tab switching logic
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });

  // Progress circle animation
  setTimeout(() => {
    document.querySelectorAll('.progress-circle').forEach(circle => {
      const percentage = parseInt(circle.getAttribute('data-percentage')) || 0;
      const degrees = (percentage / 100) * 360;
      circle.style.setProperty('--progress', `${degrees}deg`);
    });
  }, 300);

  // Hex viewer toggle
  const viewRawBtn = document.getElementById("viewRawBtn");
  if (viewRawBtn) {
    if (!window.hexy) {
      document.getElementById("hexView").textContent = "Error: Hex viewer library not loaded.";
      console.error("hexy.js not loaded");
      return;
    }
    viewRawBtn.addEventListener("click", () => {
      const hexView = document.getElementById("hexView");
      if (hexView.style.display === "none") {
        renderRawStegoData(stego, hexView, window.hexy);
        hexView.style.display = "block";
        viewRawBtn.textContent = "Hide Raw Hex View";
      } else {
        hexView.style.display = "none";
        viewRawBtn.textContent = "View Raw Data as Hex";
      }
    });
  }

  // Charts
  setTimeout(() => {
    if (df.model_scores) {
      const ctx = document.getElementById("dfChart").getContext("2d");
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(df.model_scores),
          datasets: [{
            label: 'Model Confidence',
            data: Object.values(df.model_scores),
            backgroundColor: [
              'rgba(46, 204, 113, 0.7)',
              'rgba(52, 152, 219, 0.7)',
              'rgba(155, 89, 182, 0.7)',
              'rgba(241, 196, 15, 0.7)'
            ],
            borderColor: [
              'rgba(46, 204, 113, 1)',
              'rgba(52, 152, 219, 1)',
              'rgba(155, 89, 182, 1)',
              'rgba(241, 196, 15, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Confidence %'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Detection Models'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.parsed.y}% confidence`;
                }
              }
            }
          }
        }
      });
    }
    if (forgery.ela) {
      const ctx2 = document.getElementById("elaChart").getContext("2d");
      new Chart(ctx2, {
        type: 'radar',
        data: {
          labels: ['ELA Score', 'Histogram STD', 'Edge Density', 'Blur Score', 'Copy-Move'],
          datasets: [{
            label: 'Detection Metrics',
            data: [
              forgery.ela.ela_score || 0,
              forgery.ela.histogram_std || 0,
              forgery.edges?.edge_density || 0,
              forgery.edges?.blur_score || 0,
              forgery.copy_move?.score || 0
            ],
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            borderColor: 'rgba(231, 76, 60, 1)',
            pointBackgroundColor: 'rgba(231, 76, 60, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(231, 76, 60, 1)'
          }]
        },
        options: {
          scales: {
            r: {
              angleLines: {
                display: true
              },
              suggestedMin: 0,
              suggestedMax: 100
            }
          }
        }
      });
    }
  }, 500);
}

function renderRawStegoData(stegoData, containerElement, hexy) {
  if (!stegoData.stego_detected) {
    containerElement.textContent = "No raw data available.";
    return;
  }

  let hexInput = stegoData.hex_data && stegoData.hex_data.length > 0
    ? stegoData.hex_data.join("")
    : stegoData.hex_output || stegoData.raw_output || "";

  if (!hexInput) {
    containerElement.textContent = "No raw data available.";
    return;
  }

  let dataBuffer;
  try {
    dataBuffer = new Uint8Array(
      hexInput.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
  } catch (e) {
    containerElement.textContent = "Error: Invalid hex data.";
    console.error("Failed to parse hex data:", e);
    return;
  }

  const hexDump = hexy(dataBuffer, {
    width: 16,
    numbering: 'hex',
    format: 'twos',
    caps: 'upper',
    annotate: 'ascii',
    prefix: '',
    indent: 0,
    html: false
  });

  const maxLength = 10000;
  const truncatedDump = hexDump.length > maxLength ? hexDump.slice(0, maxLength) + "\n... (Truncated - Full data too large)" : hexDump;
  containerElement.textContent = truncatedDump;
}