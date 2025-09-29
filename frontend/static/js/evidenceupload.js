const modal = document.getElementById("taskWizardModal");
const openModalBtn = document.querySelector(".task-button");
const closeModalBtn = document.querySelector(".close-bt");
const nextStepBtn = document.getElementById("nextStep");
const prevStepBtn = document.getElementById("prevStep");
const startAnalysisBtn = document.getElementById("startAnalysisBtn");
const step1 = document.getElementById("wizard-step-1");
const step2 = document.getElementById("wizard-step-2");
const progress = document.querySelector(".progress");

const uploadArea = document.getElementById("uploadArea");
const evidenceInput = document.getElementById("evidenceFiles");
const evidencePreview = document.getElementById("evidencePreview");
const uploadText = document.getElementById("uploadText");
const toast = document.getElementById("toast");
const forensicQuotes = [
  "🕵️‍♂️ <b>‘Digital forensics</b>: where code becomes testimony.’",
  "📁 <b>‘Every byte</b> leaves a trace — we analyze them all.’",
  "🔍 <b>‘Truth hides in pixels</b>. Let's uncover it.’",
  "🧠 <b>‘High-resolution evidence</b> may take longer. Hang tight.’",
  "📸 <b>‘One frame can reveal</b> a thousand secrets.’",
  "💡 <b>‘No data is useless</b> — every detail matters.’",
];


function loadHexy(callback) {
    if (window.hexy) {
        callback(window.hexy);
        return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/hexy@0.3.3/lib/hexy.js";
    script.onload = () => callback(window.hexy);
    script.onerror = () => {
        console.error("Failed to load hexy from CDN");
        callback(null);
    };
    document.head.appendChild(script);
}

function cycleQuotes() {
  const quoteBox = document.querySelector(".modern-quote-box");
  if (!quoteBox) return;

  let current = 0;

  setInterval(() => {
    quoteBox.classList.remove("show");
    setTimeout(() => {
      quoteBox.innerHTML = forensicQuotes[current];
      quoteBox.classList.add("show");
      current = (current + 1) % forensicQuotes.length;
    }, 300);
  }, 6000); 
}




let currentStep = 1;


openModalBtn.addEventListener("click", () => {
  modal.style.display = "block";
  updateProgress();
})



closeModalBtn.addEventListener("click", () => {
  modal.style.display = "none";
});



nextStepBtn.addEventListener("click", () => {
  step1.classList.remove("active");
  step2.classList.add("active");
  currentStep = 2;
  updateProgress();
});

prevStepBtn.addEventListener("click", () => {
  step2.classList.remove("active");
  step1.classList.add("active");
  currentStep = 1;
  updateProgress();
});

function updateProgress() {
  progress.style.width = (currentStep === 1) ? "50%" : "100%";
}


uploadArea.addEventListener("click", () => {
  evidenceInput.click();
});


function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}
function handleFiles(files) {
  if (files.length > 0) {
    uploadText.innerText = "Upload or Drag Another File";
  }
  
  evidencePreview.innerHTML = "";

  Array.from(files).forEach(file => {
    const previewItem = document.createElement("div");
    previewItem.classList.add("preview-item", "fade-in");

    let media;
    const fileURL = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      media = document.createElement("img");
      media.classList.add("preview-image");
      media.src = fileURL;
      media.style.width = "50%";
      media.style.height = "250px";
    } else if (file.type.startsWith("video/")) {
      media = document.createElement("video");
      media.src = fileURL;
      media.style.width = "50%";
      media.style.height = "250px";
      media.controls = true;
    } else if (file.type === "application/pdf") {
      media = document.createElement("iframe");
      media.src = fileURL;
      media.style.width = "50%";
      media.style.height = "250px";
      media.style.border = "1px solid #ccc";
      media.style.borderRadius = "8px";
    } else if (file.type.startsWith("text/")) {
      media = document.createElement("pre");
      const reader = new FileReader();
      reader.onload = function(e) {
        media.textContent = e.target.result;
      };
      reader.readAsText(file);
      media.style.maxHeight = "250px";
      media.style.border = "1px solid #ccc";
      media.style.width = "50%";
      media.style.overflow = "auto";
      media.style.background = "#f9f9f9";
      media.style.padding = "10px";
      media.style.borderRadius = "8px";
    } else {
      media = document.createElement("div");
      media.className = "file-icon";
      media.innerHTML = '<i class="fas fa-file-alt" style="font-size:50px;display:flex;align-items:center;justify-content:center;height:100%;color:#555;"></i>';
    }

    previewItem.appendChild(media);

    const fileInfo = document.createElement("div");
    fileInfo.classList.add("file-info");

   
    const lastModifiedDate = new Date(file.lastModified).toLocaleDateString();

fileInfo.innerHTML = `
  <div class="file-card">
    <div class="file-details">
      <div class="detail">
        <span class="label"><i class="fas fa-file-alt"></i> File Name:</span>
        <span class="value">${file.name}</span>
      </div>
      <div class="detail">
        <span class="label"><i class="fas fa-tags"></i> Type:</span>
        <span class="value">${file.type || 'Unknown'}</span>
      </div>
      <div class="detail">
        <span class="label"><i class="fas fa-weight-hanging"></i> Size:</span>
        <span class="value">${formatFileSize(file.size)}</span>
      </div>
      <div class="detail">
        <span class="label"><i class="fas fa-calendar-alt"></i> Last Modified:</span>
        <span class="value">${lastModifiedDate}</span>
      </div>
    </div>
  </div>
`;


 
    const progressContainer = document.createElement("div");
    progressContainer.classList.add("upload-progress-container");
    const progressBar = document.createElement("div");
    progressBar.classList.add("upload-progress-bar");
    progressContainer.appendChild(progressBar);

    previewItem.appendChild(fileInfo);
    previewItem.appendChild(progressContainer);

    evidencePreview.appendChild(previewItem);

    
    let percent = 0;
    const fakeUpload = setInterval(() => {
      percent += Math.random() * 10; 
      if (percent >= 100) {
        percent = 100;
        clearInterval(fakeUpload);
      }
      progressBar.style.width = percent + "%";
    }, 200); 
  });

  showToast("File(s) Uploaded Successfully!");
}


evidenceInput.addEventListener("change", () => {
  handleFiles(evidenceInput.files);
});


uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = "#e0f0ff";
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.backgroundColor = "";
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = "";

  const droppedFiles = e.dataTransfer.files;
  handleFiles(droppedFiles);
});

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.warn("Toast element not found.");
    alert(message); 
    return;
  }

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 30000);
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.slice(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function startEvidenceAnalysis() {
  const evidenceInput = document.getElementById("evidenceFiles");
  const file = evidenceInput.files[0];
  if (!file) {
    showToast("Please upload a file before starting analysis.");
    return;
  }

  // Hide the modal and clean up
  modal.style.display = "none";
  document.body.classList.remove('modal-open');
  document.querySelector('.modal-backdrop')?.remove();

  // Navigate to analytics section
  if (typeof showSection === 'function') {
    showSection("analytics");
  } else {
    console.warn("showSection function not found, analytics section may not display correctly");
  }

  // Set up analytics section
  const analyticsSection = document.getElementById("analytics_section");
  if (!analyticsSection) {
    console.error("analytics_section element not found");
    showToast("Error: Analytics section not found.");
    return;
  }
  document.querySelector(".no-process")?.remove();

  // Auto-generate loading overlay within analytics_section with unique progress bar class
  analyticsSection.innerHTML = `
    <div class="analysis-loading-overlay" role="status" aria-live="assertive" aria-busy="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; transition: opacity 0.3s ease-in-out;">
      <div class="modal-spinner-container" style="display: flex; align-items: center; justify-content: center; position: relative; width: 60px; height: 60px; margin: 0 auto 12px;">
        <div class="modal-spinner-ring" style="position: absolute; width: 100%; height: 100%; border: 5px solid transparent; border-top-color: #00cc00; border-left-color: #00cc00; border-radius: 50%; animation: modal-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;"></div>
        <div class="modal-spinner-core" style="width: 36px; height: 36px; background: linear-gradient(135deg, #00cc00, #66ff66); border-radius: 50%; animation: modal-pulse 1.4s ease-in-out infinite; box-shadow: 0 0 12px rgba(0, 204, 0, 0.6), 0 0 20px rgba(0, 204, 0, 0.3);"></div>
        <div class="modal-spinner-glow" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(0, 204, 0, 0.4) 0%, transparent 70%); animation: modal-glow 1.8s ease-in-out infinite;"></div>
      </div>
      <span style="font-size: 1.1em; color: #333; font-weight: 500; text-align: center;">Analyzing evidence... please wait.<br><small>It can take up to two minutes</small></span>
      <div class="upload-progress-container" style="width: 80%; max-width: 500px; height: 10px; background: #222; border-radius: 5px; overflow: hidden; margin-top: 20px;">
        <div class="analysis-progress-bar" style="height: 100%; background-color: #b3ffb3 !important; width: 0%; transition: width 0.3s ease;"></div>
      </div>
      <div id="percent-text" style="margin-top: 10px; font-size: 1.1em; font-weight: 500; color: #333; text-align: center; visibility: visible;">Progress: 0%</div>
      <div class="modern-quote-box" style="margin-top: 15px; font-size: 14px; color: #666; text-align: center; opacity: 0; transition: opacity 0.3s ease;"></div>
    </div>
    <style>
      @keyframes modal-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes modal-pulse {
        0% { transform: scale(0.85); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(0.85); opacity: 0.8; }
      }
      @keyframes modal-glow {
        0% { opacity: 0.4; transform: scale(0.95); }
        50% { opacity: 0.7; transform: scale(1.1); }
        100% { opacity: 0.4; transform: scale(0.95); }
      }
      .analysis-loading-overlay.hidden {
        opacity: 0;
        pointer-events: none;
      }
      .modern-quote-box.show {
        opacity: 1 !important;
      }
      .analysis-progress-bar {
        background-color: #b3ffb3 !important; /* Light green fill */
        transition: width 0.3s ease, background-color 0.3s ease !important;
      }
    </style>
  `;

  // Cache DOM elements
  const loadingOverlay = analyticsSection.querySelector(".analysis-loading-overlay");
  const loadingText = loadingOverlay.querySelector("span");
  const progressBar = analyticsSection.querySelector(".analysis-progress-bar");
  const percentDisplay = loadingOverlay.querySelector("#percent-text");
  const quoteBox = loadingOverlay.querySelector(".modern-quote-box");

  // Debug element presence and initial styles
  console.log("Generated overlay elements:", {
    loadingOverlay: !!loadingOverlay,
    loadingText: !!loadingText,
    progressBar: !!progressBar,
    progressBarBackground: progressBar ? window.getComputedStyle(progressBar).backgroundColor : null,
    percentDisplay: !!percentDisplay,
    quoteBox: !!quoteBox
  });

  // Start cycling quotes
  cycleQuotes();

  // Fetch analysis
  const formData = new FormData();
  formData.append('file', file);
  fetch("/evidence/analyze/", {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken")
    },
    body: formData
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    function readChunk({ done, value }) {
      if (done) {
        loadingOverlay.classList.add("hidden");
        console.log("Streaming done, hiding analysis-loading-overlay");
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      console.log("Received chunk:", chunk); // Debug streaming data
      const messages = chunk.split("\n\n").filter(Boolean);
      messages.forEach(msg => {
        if (msg.startsWith("data:")) {
          let json;
          try {
            json = JSON.parse(msg.slice(5));
            console.log("Parsed JSON:", json); // Debug parsed data
          } catch (e) {
            console.error("Failed to parse JSON:", msg, e);
            return;
          }
          const progress = json.progress || 0;
          const message = json.message || "Processing...";
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.style.backgroundColor = "#b3ffb3 !important"; // Reinforce light fill color
            console.log("Updated progressBar:", {
              width: progressBar.style.width,
              backgroundColor: window.getComputedStyle(progressBar).backgroundColor,
              inlineStyle: progressBar.getAttribute("style")
            });
          } else {
            console.warn("analysis-progress-bar not found during update");
          }
          if (percentDisplay) {
            percentDisplay.textContent = `Progress: ${progress}%`;
            console.log("Updated percentDisplay to:", `Progress: ${progress}%`);
          } else {
            console.warn("percent-text not found during update");
          }
          if (loadingText) {
            loadingText.innerHTML = `${message}<br><small>It can take up to two minutes</small>`;
            console.log("Updated loadingText to:", message);
          } else {
            console.warn("loadingText not found during update");
          }
          if (json.result) {
            localStorage.setItem("evidenceResults", JSON.stringify(json.result));
            if (json.result.memdump) {
              renderMemdumpResults(json.result.memdump);
            }  else if (json.result.steganographic_detection) {
                    renderEvidenceResults({
                        ...json.result,
                        stego: json.result.steganographic_detection  // Map to 'stego' for renderEvidenceResults
                    });
                }
            else if (json.result.deepfake_detection || json.result.forgery_detection || json.result.metadata) {
              renderEvidenceResults(json.result);
            } else if (json.result.report && json.result.text_detection) {
              renderDocumentResults({
                text_detection: json.result.text_detection,
                report: json.result.report,
                hashes: json.result.hashes
              });
            } else {
              console.warn("Unknown evidence result format", json.result);
            }
            showToast("Analysis complete.");
          }
          if (json.error) {
            if (loadingText) {
              loadingText.innerHTML = `${json.message}<br><small>But it’s not a problem, continuing analysis...</small>`;
            }
            showToast("Notice: " + json.message);
          }
        }
      });
      return reader.read().then(readChunk);
    }
    return reader.read().then(readChunk);
  }).catch(err => {
    console.error("Streaming fetch error:", err);
    loadingOverlay.classList.add("hidden");
    analyticsSection.innerHTML = `<p class="text-danger">An error occurred during analysis: ${err.message}</p>`;
    showToast("Streaming error occurred.");
  });

  try {
    new Audio('/static/audio/processing-start.mp3').play();
  } catch (err) {
    console.warn("Audio failed:", err);
  }
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("Is showSection available?", typeof showSection);

    startAnalysisBtn.addEventListener("click", startEvidenceAnalysis);
});


window.addEventListener('DOMContentLoaded', () => {
    const evidenceDateInput = document.getElementById('evidenceDate');
    
    const now = new Date();
    const formattedDateTime = now.toLocaleString(); 
    evidenceDateInput.value = formattedDateTime;
  });
  

function renderEvidenceResults(data) {
  const section = document.getElementById("analytics_section");
  const df = data.deepfake || {};
  const forgery = data.forgery_detection || {};
  const meta = data.metadata_tags || {};
  const hashes = data.hashes || {};
  const stego = data.stego || {};
  console.log(hashes);

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
            <p>${df.verdict}</p>
            <div class="progress-circle" data-percentage="${(df.confidence_score).toFixed(0)}">
              <span class="progress-value">${(df.confidence_score).toFixed(0)}%</span>
            </div>
            <small>Confidence Score</small>
          </div>
          <div class="result-card">
            <h4>Deepfake/AI Verdict</h4>
            <p>${df.ai_generated}</p>
            <div class="progress-circle" data-percentage="${(df.ai_generated_confidence).toFixed(0)}">
              <span class="progress-value">${(df.ai_generated_confidence).toFixed(0)}%</span>
            </div>
            <small>Confidence Score</small>
          </div>
          <div class="result-card">
            <h4>Forgery Verdict</h4>
            <p>${forgery.verdict}</p>
          </div>
          <div class="result-card">
            <h4>Metadata Verdict</h4>
            <p>${meta.verdict}</p>
          </div>
          <div class="result-card">
            <h4>Steganography Presence</h4>
            <p>${stego.stego_detected ? "Detected" : "Not Detected"}</p>
          </div>
        </div>
        <div class="heatmap-container">
          <p>${data.file_path || "NA"}</p>
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
            <p><strong>Regions Detected:</strong> ${df.detected_regions}</p>
            <p><strong>Faces Count:</strong> ${df.face_count || "NA"}</p>
            <p><strong>Content Type:</strong> ${df.content_type}</p>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-random"></i> Manipulation</h5>
            <p><strong>Type:</strong> ${df.manipulation_type}</p>
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
              <span class="conf-fill" style="width:${df.ai_generated_confidence}%;"></span>
            </span> ${df.ai_generated_confidence}%</p>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-microchip"></i> Models Used</h5>
            <ul class="df-list">
              ${df.models_used?.map(m => `<li><i class="fas fa-cogs"></i> ${m}</li>`).join("")}
            </ul>
          </div>
          <div class="df-card">
            <h5><i class="fas fa-percentage"></i> Model Scores</h5>
            <p><strong>ResNet-18:</strong> ${df.model_scores?.resnet18 || "NA"}%</p>
            <p><strong>EfficientNet:</strong> ${df.model_scores?.efficientnet || "NA"}%</p>
            <p><strong>Overall Confidence:</strong> ${df.confidence_score || "NA"}%</p>
          </div>
          <div class="df-card verdict-box">
            <h5><i class="fas fa-balance-scale"></i> Final Verdict</h5>
            <p class="verdict-text ${df.verdict === 'Authentic' ? 'verdict-real' : 'verdict-fake'}">
              ${df.verdict}
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
            <p><strong>ELA Score:</strong> ${forgery.ela?.ela_score}</p>
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
              ${forgery.verdict}
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
          ${meta.metadata_inconsistencies?.join(", ") || "None found"}</p>
        </div>
        <div class="meta-highlight-box location">
          <p><i class="fas fa-map-marker-alt"></i> GPS Location:
          ${meta.gps_coordinates?.latitude}, ${meta.gps_coordinates?.longitude}</p>
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
          ${stego.extracted_data && stego.extracted_data.length > 0 ? `
            <div class="stego-card">
              <h5><i class="fas fa-file-alt"></i> Extracted Data</h5>
              <ul class="stego-list">
                ${stego.extracted_data.map(data => `<li>${data}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${stego.message ? `
            <div class="stego-card">
              <h5><i class="fas fa-info-circle"></i> Message</h5>
              <p>${stego.message}</p>
            </div>
          ` : ""}
          ${stego.error ? `
            <div class="stego-card">
              <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
              <p>${stego.error}</p>
            </div>
          ` : ""}
          ${(stego.raw_output) ? `
            <div class="stego-card">
              <h5><i class="fas fa-code"></i> Raw Data</h5>
              <button id="viewRawBtn" aria-label="View raw data in hex editor">View in Hex Editor</button>
            </div>
          ` : ""}
        </div>
      </div>
      <div id="hexEditorPopup" class="hex-editor-popup">
        <div class="hex-editor-header">
          <h5>Hex Editor</h5>
          <div class="hex-controls">
            <input type="text" id="searchHex" placeholder="Search hex..." aria-label="Search hex">
            <input type="number" id="fontSize" min="10" max="20" value="12" aria-label="Font size">
            <span>px</span>
            <button id="zoomIn">+</button>
            <button id="zoomOut">-</button>
            <button id="themeToggle">Theme</button>
            <button id="fullscreenHex">Full Screen</button>
            <button id="copyHexBtn">Copy Hex</button>
            <button id="saveRawBtn">Save</button>
          </div>
          <button id="closeHexEditor" aria-label="Close hex editor">✖</button>
        </div>
        <div class="hex-editor-content">
          <pre id="hexView"></pre>
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

  // Hex editor popup toggle
  const hexEditorPopup = document.getElementById("hexEditorPopup");
  const viewRawBtn = document.getElementById("viewRawBtn");
  const closeHexEditor = document.getElementById("closeHexEditor");
  const hexView = document.getElementById("hexView");
  const searchHex = document.getElementById("searchHex");
  const fontSize = document.getElementById("fontSize");
  const zoomIn = document.getElementById("zoomIn");
  const zoomOut = document.getElementById("zoomOut");
  const themeToggle = document.getElementById("themeToggle");
  const fullscreenHex = document.getElementById("fullscreenHex");
  const copyHexBtn = document.getElementById("copyHexBtn");
  const saveRawBtn = document.getElementById("saveRawBtn");

  if (viewRawBtn && hexEditorPopup && closeHexEditor) {
    if (!window.hexy) {
      hexView.textContent = "Error: Hex viewer library not loaded.";
      console.error("hexy.js not loaded");
      return;
    }

    const toggleHexEditor = () => {
      if (hexEditorPopup.classList.contains("open")) {
        hexEditorPopup.classList.remove("open");
        viewRawBtn.textContent = "View in Hex Editor";
      } else {
        renderRawStegoData(stego, hexView, window.hexy);
        hexEditorPopup.classList.add("open");
        viewRawBtn.textContent = "Hide Hex Editor";
      }
    };

    viewRawBtn.addEventListener("click", toggleHexEditor);
    closeHexEditor.addEventListener("click", () => {
      hexEditorPopup.classList.remove("open");
      viewRawBtn.textContent = "View in Hex Editor";
    });

    // Ctrl+Q keyboard shortcut
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "q" && (stego.raw_output || stego.hex_output)) {
        e.preventDefault();
        toggleHexEditor();
      }
    });

    // Drag functionality for popup
    const header = hexEditorPopup.querySelector(".hex-editor-header");
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || e.target.classList.contains("hex-editor-header")) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, hexEditorPopup);
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
      if (!el.classList.contains("fullscreen")) {
        el.style.transform = `translate(-50%, -50%) translate3d(${xPos}px, ${yPos}px, 0)`;
      }
    }

    // Debounce function for search
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Search functionality
    const originalHexContent = { value: "" }; // Store original hex content
    const performSearch = debounce((searchValue) => {
      let hexText = originalHexContent.value;
      if (!hexText) {
        hexText = hexView.textContent;
        originalHexContent.value = hexText; // Cache original content
      }
      if (searchValue) {
        const regex = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const highlighted = hexText.replace(regex, (match) => `<span class="search-highlight">${match}</span>`);
        hexView.innerHTML = highlighted;
      } else {
        hexView.innerHTML = originalHexContent.value.replace(/([0-9a-f]{8}:)/gi, '<span class="hex-offset">$1</span>')
          .replace(/([0-9A-F]{2})/gi, '<span class="hex-byte">$1</span>')
          .replace(/([^\s].*)$/gm, '<span class="hex-ascii">$1</span>');
      }
    }, 300);

    searchHex.addEventListener("input", (e) => {
      performSearch(e.target.value.toLowerCase());
    });

    // Font size adjustment
    fontSize.addEventListener("input", (e) => {
      hexView.style.fontSize = `${e.target.value}px`;
    });

    zoomIn.addEventListener("click", () => {
      let currentSize = parseInt(fontSize.value) || 12;
      currentSize = Math.min(currentSize + 1, 20);
      fontSize.value = currentSize;
      hexView.style.fontSize = `${currentSize}px`;
    });

    zoomOut.addEventListener("click", () => {
      let currentSize = parseInt(fontSize.value) || 12;
      currentSize = Math.max(currentSize - 1, 10);
      fontSize.value = currentSize;
      hexView.style.fontSize = `${currentSize}px`;
    });

    // Theme toggle
    themeToggle.addEventListener("click", () => {
      hexEditorPopup.classList.toggle("light-theme");
      themeToggle.textContent = hexEditorPopup.classList.contains("light-theme") ? "Dark Theme" : "Light Theme";
    });

    // Full screen toggle
    fullscreenHex.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        hexEditorPopup.requestFullscreen().then(() => {
          hexEditorPopup.classList.add("fullscreen");
          fullscreenHex.textContent = "Exit Full Screen";
          // Reset transform to avoid dragging issues in full screen
          hexEditorPopup.style.transform = "none";
        }).catch(err => {
          console.error("Fullscreen error:", err);
          showToast("Failed to enter full screen");
        });
      } else {
        document.exitFullscreen().then(() => {
          hexEditorPopup.classList.remove("fullscreen");
          fullscreenHex.textContent = "Full Screen";
          // Restore centered position
          xOffset = 0;
          yOffset = 0;
          hexEditorPopup.style.transform = "translate(-50%, -50%) translate3d(0, 0, 0)";
        }).catch(err => {
          console.error("Exit fullscreen error:", err);
          showToast("Failed to exit full screen");
        });
      }
    });

    // Handle full-screen change events
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && hexEditorPopup.classList.contains("fullscreen")) {
        hexEditorPopup.classList.remove("fullscreen");
        fullscreenHex.textContent = "Full Screen";
        xOffset = 0;
        yOffset = 0;
        hexEditorPopup.style.transform = "translate(-50%, -50%) translate3d(0, 0, 0)";
      }
    });

    // Copy hex
    copyHexBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(hexView.textContent).then(() => {
        showToast("Hex dump copied to clipboard!");
      }).catch(err => {
        console.error("Copy failed", err);
        showToast("Failed to copy hex dump");
      });
    });

    // Save button
    saveRawBtn.addEventListener("click", () => {
      const blob = new Blob([hexView.textContent], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hex_dump.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Hex dump saved!");
    });
  }

  // Toast notification
  function showToast(message) {
    let toast = document.querySelector(".hex-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "hex-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // Charts (unchanged)
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
  if (!stegoData.raw_output && !stegoData.hex_output) {
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

  // Colorize the hex dump
  const colorizedDump = truncatedDump.replace(/([0-9a-f]{8}:)/gi, '<span class="hex-offset">$1</span>')
    .replace(/([0-9A-F]{2})/gi, '<span class="hex-byte">$1</span>')
    .replace(/([^\s].*)$/gm, '<span class="hex-ascii">$1</span>');

  containerElement.innerHTML = colorizedDump;
}



function renderDocumentResults(data) {
  const section = document.getElementById("analytics_section");
  const text = data.text_detection || {};
  const report = data.report || {};
  const hashes = data.hashes || {};
  let textAuthHTML = "";

if (text.chunk_results && text.chunk_results.length > 0) {
  textAuthHTML = text.chunk_results.map(chunk => `
    <div class="chunk-card">
      <div class="chunk-header">
        <h5><i class="fas fa-file-alt"></i> Chunk ${chunk.chunk_index}</h5>
        <span class="chunk-confidence"><i class="fas fa-percentage"></i> ${(chunk.score * 100).toFixed(2)}%</span>
      </div>
      <p><b>Label:</b> 
        <span class="chunk-badge ${chunk.label === 'Fake' ? 'badge-fake' : 'badge-real'}">
          <i class="fas ${chunk.label === 'Fake' ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${chunk.label}
        </span>
      </p>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${(chunk.score * 100).toFixed(2)}%;"></div>
      </div>
      <details>
        <summary class="chunk-summary"><i class="fas fa-eye"></i> View Content</summary>
        <div class="text-content-wrapper">
          <pre class="chunk-text-block" id="chunkText-${chunk.chunk_index}">${chunk.full_text}</pre>
          <button class="copy-btn" data-index="${chunk.chunk_index}" title="Copy text">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </details>
    </div>
  `).join("");
} else {
  textAuthHTML = "<p class='no-chunks'><i class='fas fa-exclamation-circle'></i> No chunked results available</p>";
}


  section.innerHTML = `
    <div class="analysis-container modern-analysis">
    <div class="tabs-container">
      <div class="tabs">
  <button class="tab-button active" data-tab="docSummaryTab">
    <i class="fas fa-file-alt tab-icon"></i> Summary
  </button>
  <button class="tab-button" data-tab="textTab">
    <i class="fas fa-brain tab-icon"></i> Text Authenticity
  </button>
  <button class="tab-button" data-tab="metaTab">
    <i class="fas fa-clipboard-list tab-icon"></i> Metadata & Report
  </button>
  <button class="tab-button" data-tab="hasher">
    <i class="fas fa-lock tab-icon"></i> File Hashes
  </button>
</div>
    </div>


      

      <div class="tab-content active" id="docSummaryTab">
            <h3 class="section-title" style="margin-bottom: 20px;text-align: center;"> General Forensic Analysis Report</h3>
        <div class="card-grid">
          <div class="result-card">
            <h4>Final Verdict</h4>
            <p>${text.final_decision || "Unknown"}</p>
            <div class="progress-circle" data-percentage="${(text.average_score * 100).toFixed(0)}">
  <span class="progress-value">${(text.average_score * 100).toFixed(0)}%</span>
</div>

            <small>Average AI Confidence</small>
          </div>
          <div class="result-card">
            <h4>Suspicious Metadata?</h4>
            <p>${report.is_metadata_suspicious ? "Yes" : "No"}</p>
           <div class="progress-circle" data-percentage="${(report.confidence_score/2 ).toFixed(0)}">
  <span class="progress-value">${(report.confidence_score/2 ).toFixed(0)}%</span>
</div>
            <small>Suspicion Confidence</small>
          </div>
          <div class="result-card warning-card">
  <h4>⚠️ Issues Found</h4>
  <div class="issue-count" data-count="${report.issues_found?.length || 0}">0</div>
  <small title="${report.issues_found?.join('\n')}">
  ${report.issues_found?.length === 0 ? "No suspicious metadata" : "Hover to see issues"}
</small>

  </div>

         <div class="result-card pages-card">
  <h4>🗂️ Pages Analyzed</h4>
  <div class="pages-count" data-count="${report.field_values?.Pages || 0}">0</div>
  <small>Total Pages Found in Document</small>
</div>
 <div class="result-card pages-card">
  <h4><i class="fas fa-file-word"></i> Word Count</h4>
  <div class="pages-count" data-count="${report.field_values?.Words || 0}">0</div>
  <small>Total Words Found in Document</small>
</div>

        </div>
        <h4 class="hash-title"><i class="fas fa-lock"></i> File Integrity Hashes</h4>
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
      </div>

      <div class="tab-content text-auth-container" id="textTab">
  <h4 class="text-auth-title"><i class="fas fa-brain"></i> AI-Based Text Authenticity</h4>
  ${textAuthHTML}
</div>

      <div class="tab-content" id="metaTab">
  <h4 class="meta-section-title">🗂️ Document Metadata & Integrity Report</h4>

  <div class="meta-block">
    <h5><i class="fas fa-filter"></i> Fields Analyzed</h5>
    <p>${report.fields_analyzed?.join(", ") || "No fields found."}</p>
  </div>

  <div class="meta-block issue-box">
    <h5><i class="fas fa-exclamation-triangle"></i> Issues Found</h5>
    <ul class="meta-list">
      ${report.issues_found?.map(i => `<li><i class="fas fa-times-circle warning-icon"></i> ${i}</li>`).join("") || "<li>No issues reported</li>"}
    </ul>
  </div>

  <div class="meta-block field-box">
  <h5><i class="fas fa-database"></i> Metadata Fields</h5>
  <div class="field-grid">
    ${Object.entries(report.field_values || {}).map(([k, v]) => {
    const lowerKey = k.toLowerCase();
    let colorClass = "default-card";
    
    if (lowerKey.includes("author")) colorClass = "author-card";
    else if (lowerKey.includes("creator")) colorClass = "creator-card";
    else if (lowerKey.includes("encrypted")) colorClass = v === true ? "encrypted-card" : "safe-card";
    else if (["producer", "creationdate", "moddate"].includes(lowerKey)) colorClass = "purple-card";
    
    return `
      <div class="field-card ${colorClass}">
        <h6><i class="fas fa-tag"></i> ${k}</h6>
        <p>${v}</p>
      </div>
    `;
  }).join("")}
  </div>
</div>



    <div class="tab-content" id="hasher">
  <h4><i class="fas fa-lock"></i> File Integrity Hashes</h4>
  <p>This should appear when you click the File Hashes tab.</p>
</div>
    </div>
  `;
  section.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = btn.getAttribute("data-index");
      const textElement = document.getElementById(`chunkText-${index}`);
      const text = textElement?.innerText || "";
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast("📋 Text copied to clipboard!", "success");
        }).catch(err => {
          console.error("Copy failed", err);
          showToast("⚠️ Failed to copy text", "error");
        });
      }
    });
  });
  
  setTimeout(() => {
  document.querySelectorAll('.progress-circle').forEach(circle => {
    const percentage = parseInt(circle.getAttribute('data-percentage')) || 0;
    const degrees = (percentage / 100) * 360;
    circle.style.setProperty('--progress', `${degrees}deg`);
  });
}, 300);
setTimeout(() => {
  const counters = document.querySelectorAll('.issue-count');

  counters.forEach(counter => {
    const target = +counter.getAttribute('data-count');
    let current = 0;
    const duration = 1000;
    const stepTime = Math.max(Math.floor(duration / target), 30);

    const timer = setInterval(() => {
      current++;
      counter.textContent = current;
      if (current >= target) {
        clearInterval(timer);
      }
    }, stepTime);
  });
}, 300);
setTimeout(() => {
  const counters = document.querySelectorAll('.pages-count');

  counters.forEach(counter => {
    const target = +counter.getAttribute('data-count');
    let current = 0;
    const duration = 1000;
    const stepTime = Math.max(Math.floor(duration / target), 30);

    const timer = setInterval(() => {
      current++;
      counter.textContent = current;
      if (current >= target) {
        clearInterval(timer);
      }
    }, stepTime);
  });
}, 300);





  // Tabs interaction
  document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

    this.classList.add("active");
    document.getElementById(this.dataset.tab).classList.add("active");
  });
});

}

function renderMemdumpResults(data) {
  const section = document.getElementById("analytics_section");

  section.innerHTML = `
    <div class="analysis-container modern-analysis">
      <h3 class="section-title">🧠 Memory Dump Analysis Results</h3>

      <div class="card-grid">
        <div class="result-card">
          <h4><i class="fas fa-microchip"></i> Profile</h4>
          <p>${data.profile || "Unknown"}</p>
        </div>
        <div class="result-card">
          <h4><i class="fas fa-cogs"></i> Processes Found</h4>
          <p>${data.process_count || 0}</p>
        </div>
        <div class="result-card">
          <h4><i class="fas fa-shield-alt"></i> Suspicious Indicators</h4>
          <p class="${data.suspicious && data.suspicious !== 'None' ? 'status-failed' : 'status-passed'}">
            ${data.suspicious || "None"}
          </p>
        </div>
      </div>

      <h4 class="sub-title"><i class="fas fa-list"></i> Top Processes</h4>
      <div class="card-grid">
        ${data.top_processes?.map(p => `
          <div class="result-card small-card">
            <i class="fas fa-terminal"></i> ${p}
          </div>
        `).join("") || "<div class='result-card'>No processes detected</div>"}
      </div>

      <h4 class="sub-title"><i class="fas fa-file-alt"></i> Raw Report</h4>
      <div class="result-card full-width">
        <pre class="memdump-report">${data.raw_report || "No report available"}</pre>
      </div>
    </div>
  `;
}




document.addEventListener('DOMContentLoaded', () => {
  const storedData = localStorage.getItem('evidenceResults');
  if (storedData) {
    const parsed = JSON.parse(storedData);

    if (parsed.deepfake_detection || parsed.forgery_detection || parsed.metadata_tags) {
      renderEvidenceResults(parsed);  // For image/video analysis
    } 
    else if (parsed.text_detection && parsed.report) {
      renderDocumentResults({
        text_detection: parsed.text_detection,
        report: parsed.report,
        hashes: parsed.hashes
      });  // For document/text analysis
    }
  }
});
function openHeatmapModal(src) {
  document.getElementById("heatmapModal").style.display = "block";
  document.getElementById("heatmapModalImg").src = src;
}
function closeHeatmapModal() {
  document.getElementById("heatmapModal").style.display = "none";
}
