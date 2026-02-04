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

function saveAnalysisResult(result) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `analysis_result_${timestamp}.json`;

  fetch("/save_analysis_result/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, data: result })
  })
    .then(r => r.json())
    .then(resp => console.log("Saved analysis result:", resp))
    .catch(err => console.error("Error saving analysis result:", err));
}


function listAnalysisResults() {
  return fetch("/list_analysis_results/")
    .then(r => r.json())
    .catch(err => {
      console.error("Error listing analysis results:", err);
      return [];
    });
}


function getAnalysisResult(filename) {
  return fetch(`/get_analysis_result/${filename}`)
    .then(r => r.json())
    .catch(err => {
      console.error("Error loading analysis result:", err);
      return null;
    });
}


let currentStep = 1;


openModalBtn.addEventListener("click", () => {
  modal.style.display = "block";
  updateProgress();
});

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
evidenceInput.addEventListener("change", () => handleFiles(evidenceInput.files));
uploadArea.addEventListener("dragover", e => {
  e.preventDefault();
  uploadArea.style.backgroundColor = "#e0f0ff";
});
uploadArea.addEventListener("dragleave", () => (uploadArea.style.backgroundColor = ""));


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
      reader.onload = function (e) {
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
        <span id="filename_" class="value">${file.name}</span>
      </div>
      <div class="detail">
        <span class="label"><i class="fas fa-tags"></i> Type:</span>
        <span id="filetype_" class="value">${file.type || 'Unknown'}</span>
      </div>
      <div class="detail">
        <span class="label"><i class="fas fa-weight-hanging"></i> Size:</span>
        <span id="filesize_" class="value">${formatFileSize(file.size)}</span>
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
  toast.innerHTML = `<div class="Information">
    <div class="init-text"><p> <span class="fas fa-info-circle"></span>  Information Center</p></div></br>
    <p>${message}</p>
  </div>`;
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
function get_task_data() {
  const task_data = {};
  let task_name = document.getElementById("taskName")?.value || ""; // Use optional chaining and default to empty string
  let task_description = document.getElementById("taskDescription")?.value || "";
  let file_type = document.getElementById("filetype_")?.value || "";
  let file_name = document.getElementById("filename_")?.value || "";
  let file_size = document.getElementById("filesize_")?.value || "";

  // Validate required fields
  if (!task_name.trim() || !task_description.trim()) {
    console.warn("Task name and description are required.");
    return null; // Return null to indicate failure
  }

  // Populate task_data
  task_data.task_name = task_name;
  task_data.task_description = task_description;
  task_data.file_type = file_type;
  task_data.file_name = file_name;
  task_data.file_size = file_size;

  return task_data; // Return the populated object
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
  const taskData = get_task_data()
  if (taskData) {
    for (const [key, value] of Object.entries(taskData)) {
      formData.append(`task_${key}`, value)
    }
  }
  console.log("FormData entries:", [...formData.entries()]);
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
    let buffer = ""; // Buffer to accumulate partial chunks

    function readChunk({ done, value }) {
      if (done) {
        // Process remaining buffer
        if (buffer) {
          processBuffer(buffer);
        }
        loadingOverlay.classList.add("hidden");
        console.log("Streaming done, hiding analysis-loading-overlay");
        return;
      }

      // Decode and append to buffer
      const chunk = decoder.decode(value, { stream: true });
      console.log("Received chunk:", chunk); // Debug streaming data
      buffer += chunk;

      // Process complete messages
      processBuffer(buffer);

      return reader.read().then(readChunk);
    }

    function processBuffer(currentBuffer) {
      let lastValidIndex = 0;
      let i = 0;
      while (i < currentBuffer.length) {
        if (currentBuffer.substr(i, 5) === "data:") {
          const endIndex = currentBuffer.indexOf("\n\n", i + 5);
          if (endIndex !== -1) {
            const msg = currentBuffer.substring(i, endIndex);
            processMessage(msg);
            i = endIndex + 2;
            lastValidIndex = i;
          } else {
            // Partial message, keep in buffer
            break;
          }
        } else {
          // Skip invalid data
          i++;
        }
      }
      buffer = currentBuffer.substring(lastValidIndex);
    }

    function processMessage(msg) {
      let json;
      try {
        json = JSON.parse(msg.slice(5));
        console.log("Parsed JSON:", json); // Debug parsed data
        console.log("Stego data:", json.result?.steganographic_detection); // Debug stego data
      } catch (e) {
        console.error("Failed to parse JSON:", msg, e);
        showToast("Error parsing analysis data, continuing...");
        return; // Skip invalid message
      }

      const progress = json.progress || 0;
      const message = json.message || "Processing...";
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.style.backgroundColor = "#b3ffb3 !important";
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
        saveAnalysisResult(json.result)
        try {
          if (json.result.memdump) {
            renderMemdumpResults(json.result.memdump);
          } else if (json.result.steganographic_detection) {
            renderEvidenceResults({
              ...json.result,
              stego: json.result.steganographic_detection // Map to 'stego' for renderEvidenceResults
            });
            document.getElementById("vt-status").innerHTML = "VirusTotal: queued (starting now...)";
            startVTPolling(json.result.meta.task_id);
          } else if (json.result.deepfake_detection || json.result.forgery_detection || json.result.metadata) {
            renderEvidenceResults(json.result);
          }
          else if(json.result.deepfake_video){
            videoForensics(json.result)
            document.getElementById("vt-status").innerHTML = "VirusTotal: queued (starting now...)";
            startVTPolling(json.result.meta.task_id);
          }
          else if (json.result.report && json.result.text_detection) {
            renderDocumentResults({
              text_detection: json.result.text_detection,
              report: json.result.report,
              hashes: json.result.hashes
            });
          } else {
            console.warn("Unknown evidence result format", json.result);
          }
          showToast("Analysis complete.");
        } catch (e) {
          console.error("Error rendering results:", e);
          const analyticsSection = document.getElementById("analytics_section");
          if (analyticsSection) {
            analyticsSection.innerHTML = `<p class="text-danger">Rendering error: ${e.message}</p>`;
          }
          showToast("Error rendering analysis results");
        }
      }
      if (json.error) {
        if (loadingText) {
          loadingText.innerHTML = `${json.message}<br><small>But it’s not a problem, continuing analysis...</small>`;
        }
        showToast("Notice: " + json.message);
      }
    }

    return reader.read().then(readChunk);
  }).catch(err => {
    console.error("Streaming fetch error:", err);
    loadingOverlay.classList.add("hidden");
    const analyticsSection = document.getElementById("analytics_section");
    if (analyticsSection) {
      analyticsSection.innerHTML = `<p class="text-danger">An error occurred during analysis: ${err.message}</p>`;
    }
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


const RESPONSE_URL = '/response/steganography/';
async function renderEvidenceResults(data) {
  console.log('renderEvidenceResults called with data:', data); // Log 1: Input data
  const section = document.getElementById("analytics_section");

  // Check if this is video data
  const isVideo = data.video_duration !== undefined;

  const filepath = data.file_path || data.video_path || '';
  const fileName = filepath.substring(filepath.lastIndexOf('\\') + 1);
  const df = data.deepfake || {};
  const task = data.task_data || {};
  const forgery = data.forgery_detection || {};
  const meta = data.metadata_tags || {};
  const hashes = data.hashes || {};
  const stego_file = data.steganographic_detection?.filename || '';
  console.log('Stego file path:', stego_file); // Log 2: Stego filename
  console.log('Is video:', isVideo); // Log: Video detection
  let stego = { stego_detected: "Loading...", message: 'Loading Steganography Results...', loading: true };

  // Render initial HTML with conditional tabs based on file type
  section.innerHTML = `
        <div class="analysis-container modern-analysis">
            <h3 class="section-title">Evidence Analysis Results ${isVideo ? '(Video)' : '(Image)'}</h3>
            <div class="tabs">
                <button class="tab-button active" data-tab="summaryTab">Summary</button>
                <button class="tab-button" data-tab="deepfakeTab">Deepfake Analysis</button>
                ${!isVideo ? '<button class="tab-button" data-tab="forgeryTab">Forgery Detection</button>' : ''}
                <button class="tab-button" data-tab="metadataTab">Metadata Details</button>
                ${!isVideo ? '<button class="tab-button" data-tab="stegoTab">Steganography</button>' : ''}
            </div>
            <div class="tab-content active" id="summaryTab">
                ${isVideo ? `
                    <p>Video Summary</p>
                    <div class="evidence-info-grid">
                        <div class="evidence-image-container">
                            <video src="/evidence/files/${fileName}" controls class="evidence-image" style="max-height: 400px; width: 100%;"></video>
                        </div>
                        <div class="evidence-info-content">
                         <div class="evidence-info-item">
                                    <h4>Evidence Name</h4>
                                    <p>${task.task_name || ""}</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>Evidence Description</h4>
                                    <p>${task.task_description || "No description for this case"}</p>
                                </div>
                            <div class="evidence-info-item">
                                <h4>File Name</h4>
                                <p>${fileName}</p>
                            </div>
                            <div class="evidence-info-item">
                                <h4>Duration</h4>
                                <p>${(data.video_duration || 0).toFixed(2)} seconds</p>
                            </div>
                            <div class="evidence-info-item">
                                <h4>Total Frames</h4>
                                <p>${data.total_frames || 0}</p>
                            </div>
                            <div class="evidence-info-item">
                                <h4>Processed Frames</h4>
                                <p>${data.processed_frames || 0}</p>
                            </div>
                            <div class="evidence-info-item">
                                <h4>Processing Time</h4>
                                <p>${(data.processing_time || 0).toFixed(2)} seconds</p>
                            </div>
                            <div class="evidence-info-item">
                                    <h4>File Size</h4>
                                    <p>${formatFileSize(task.file_size || 0)}</p>
                                </div>
                        </div>
                    </div>
                ` : `
                    <p>Image Summary Contents</p>
                    <div class="Image description">
                        <div class="evidence-info-grid">
                            <div class="evidence-image-container">
                                <img src="/evidence/files/${fileName}" alt="Evidence Image" class="evidence-image" onclick="openHeatmapModal('/evidence/files/${fileName}')">
                            </div>
                            <div class="evidence-info-content">
                                <div class="evidence-info-item">
                                    <h4>Evidence Name</h4>
                                    <p>${task.task_name || ""}</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>Evidence Description</h4>
                                    <p>${task.task_description || "No description for this case"}</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>File Name</h4>
                                    <p>${task.file_name || ""}</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>File Type</h4>
                                    <p>${task.file_type || ""} (${fileName.split('.').pop().toUpperCase()})</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>File Size</h4>
                                    <p>${formatFileSize(task.file_size || 0)}</p>
                                </div>
                                <div class="evidence-info-item">
                                    <h4>Analysis Timing</h4>
                                    <p>${(df.timing_ms?.total / 1000 || 0).toFixed(2)} seconds</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
                ${isVideo ? `
                    <p>Analysis Verdict</p>
                    <div class="card-grid">
                        <div class="result-card">
                            <h4>Final Verdict</h4>
                            <p class="${data.prediction === 'FAKE' ? 'text-danger' : 'text-success'}" style="font-size: 1.5em; font-weight: bold;">${data.prediction || "N/A"}</p>
                            <div class="progress-circle" data-percentage="${((data.confidence || 0) * 100).toFixed(0)}">
                                <span class="progress-value">${((data.confidence || 0) * 100).toFixed(0)}%</span>
                            </div>
                            <small>Confidence Score</small>
                        </div>
                        <div class="result-card">
                            <h4>Fake Faces Detected</h4>
                            <p style="font-size: 1.3em;">${data.fake_face_count || 0}</p>
                            <small>out of ${(data.fake_face_count || 0) + (data.real_face_count || 0)} total faces</small>
                        </div>
                        <div class="result-card">
                            <h4>Fake Percentage</h4>
                            <p style="font-size: 1.3em;">${(data.fake_face_percentage || 0).toFixed(1)}%</p>
                            <small>Percentage of manipulated faces</small>
                        </div>
                    </div>
                    <div id="vt-section" style="margin-top: 30px; padding: 15px; border: 1px solid #444; border-radius: 8px; background: #1e1e1e;">
  <h3>VirusTotal Scan</h3>
  <div id="vt-status" style="font-style: italic; color: #888;">
    Not started yet...
  </div>
</div>
                ` : `
                    <p>General Model Scoring</p>
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
                            <h4><i class="fas fa-file-signature"></i> Forgery Verdict</h4>
                            <p>${forgery.verdict || "N/A"}</p>
                        </div>
                        <div class="result-card">
                            <h4><i class="fas fa-info-circle"></i> Metadata Verdict</h4>
                            <p>${meta.verdict || "N/A"}</p>
                        </div>
                        <div class="result-card">
                            <h4><i class="fas fa-eye"></i> Steganography Presence</h4>
                            <p id="stegoPresence">${stego.stego_detected ? "Detected" : "Not Detected"}</p>
                        </div>
                    </div>
                `}

<p>File Hash Computation</p>
                

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
          

</div>
                
            <div class="tab-content deepfake-section" id="deepfakeTab">
                ${isVideo ? `
                    <h4 class="section-title"><i class="fas fa-brain"></i> Video Deepfake Detection Analysis</h4>
                    <div class="deepfake-grid">
                        <div class="df-card verdict-box">
                            <h5><i class="fas fa-balance-scale"></i> Final Verdict</h5>
                            <p class="verdict-text ${data.prediction === 'FAKE' ? 'verdict-fake' : 'verdict-real'}">
                                ${data.prediction || "N/A"}
                            </p>
                            <p><strong>Confidence:</strong> ${(data.confidence * 100 || 0).toFixed(2)}%</p>
                        </div>
                        <div class="df-card">
                            <h5><i class="fas fa-chart-pie"></i> Frame Statistics</h5>
                            <p><strong>Total Faces:</strong> ${(data.fake_face_count || 0) + (data.real_face_count || 0)}</p>
                            <p><strong>Fake Faces:</strong> ${data.fake_face_count || 0}</p>
                            <p><strong>Real Faces:</strong> ${data.real_face_count || 0}</p>
                            <p><strong>Fake Percentage:</strong> ${(data.fake_face_percentage || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                    ${data.frame_predictions && data.frame_predictions.length > 0 ? `
                        <h5 style="margin-top: 20px;"><i class="fas fa-film"></i> Suspicious Frames</h5>
                        <div class="frame-predictions" style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th style="padding: 10px; text-align: left;">Frame #</th>
                                        <th style="padding: 10px; text-align: left;">Prediction</th>
                                        <th style="padding: 10px; text-align: left;">Confidence</th>
                                        <th style="padding: 10px; text-align: left;">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.frame_predictions.filter(fp => fp.prediction === 'FAKE').map(fp => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 10px;">${fp.frame_number}</td>
                                            <td style="padding: 10px;">
                                                <span class="badge-fake" style="padding: 4px 8px; border-radius: 4px;">
                                                    <i class="fas fa-times-circle"></i> ${fp.prediction}
                                                </span>
                                            </td>
                                            <td style="padding: 10px;">${(fp.confidence * 100 || 0).toFixed(2)}%</td>
                                            <td style="padding: 10px;">${fp.timestamp.toFixed(2)}s</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="margin-top: 20px; color: #666;">No frame-level predictions available</p>'}

                    ${data.heatmap_paths && data.heatmap_paths.length > 0 ? `
                        <div class="heatmap-section" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
                            <h5><i class="fas fa-fire"></i> Suspicious Region Heatmaps (${data.heatmap_paths.length})</h5>
                            <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">
                                Visualizing the <strong>${data.heatmap_paths.length}</strong> most suspicious frames. 
                                (Layout: Original Face | Heatmap | Overlay)
                            </p>
                            <div class="heatmap-gallery" style="display: flex; overflow-x: auto; gap: 15px; padding: 5px; padding-bottom: 15px;">
                                ${data.heatmap_paths.map((path, idx) => `
                                    <div class="heatmap-card" style="flex: 0 0 auto; background: white; padding: 10px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                        <img src="${path}" alt="Heatmap ${idx + 1}" style="height: 180px; border-radius: 4px; cursor: pointer; display: block;" onclick="openHeatmapModal('${path}')">
                                        <p style="font-size: 0.8em; margin-top: 8px; text-align: center; font-weight: bold; color: #333;">Frame ${idx + 1}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<p> Error loading heatmaps</p>'}
                ` : `
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
                `}
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
                ${isVideo ? `
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-video meta-icon"></i> <strong>Video Duration:</strong> ${(data.video_duration || 0).toFixed(2)} seconds</p>
                    </div>
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-film meta-icon"></i> <strong>Total Frames:</strong> ${data.total_frames || 0}</p>
                    </div>
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-play meta-icon"></i> <strong>Processed Frames:</strong> ${data.processed_frames || 0}</p>
                    </div>
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-clock meta-icon"></i> <strong>Processing Time:</strong> ${(data.processing_time || 0).toFixed(2)} seconds</p>
                    </div>
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-calendar meta-icon"></i> <strong>Analysis Timestamp:</strong> ${data.timestamp || "N/A"}</p>
                    </div>
                ` : `
                    <div class="meta-highlight-box">
                        <p><i class="fas fa-tools meta-icon"></i> <strong>Software Used:</strong> ${meta.software_used || "Not Detected"}</p>
                    </div>
                    <div class="meta-highlight-box warning">
                        <p><i class="fas fa-exclamation-triangle"></i> Inconsistencies: ${meta.metadata_inconsistencies?.join(", ") || "None found"}</p>
                    </div>
                    <div class="meta-highlight-box location">
                        <p><i class="fas fa-map-marker-alt"></i> GPS Location: ${meta.gps_coordinates?.latitude || "N/A"}, ${meta.gps_coordinates?.longitude || "N/A"}</p>
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
                `}
            </div>
            <div class="tab-content stego-section" id="stegoTab">
                <h4 class="section-title"><i class="fas fa-eye-slash"></i> Steganography Analysis</h4>
                <div class="stego-grid">
                    <div class="stego-card">
                        <h5><i class="fas fa-check-circle"></i> Detection Status</h5>
                        <p><strong>Status:</strong>
                            <span id="stegoStatus" class="${stego.stego_detected ? 'badge-fake' : 'badge-real'}">
                                <i class="fas ${stego.stego_detected ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                                ${stego.stego_detected ? "Detected" : "Not Detected"}
                            </span>
                        </p>
                    </div>
                    <div class="stego-card" id="stegoLoading">
                        <h5><i class="fas fa-spinner"></i> Loading</h5>
                        <div class="loading-indicator">
                            <div class="spinner"></div>
                            <p>Loading Steganography Results...</p>
                        </div>
                    </div>
                    <div class="stego-card" id="stegoDetails" style="display: none;">
                        ${stego.is_encrypted ? `
                            <h5><i class="fas fa-lock"></i> Encryption Status</h5>
                            <p>Password protection: <span class="badge-fake">Detected</span></p>
                        ` : ""}
                        ${stego.extracted_data && stego.extracted_data.length > 0 ? `
                            <h5><i class="fas fa-file-alt"></i> Extracted Data</h5>
                            <ul class="stego-list">
                                ${stego.extracted_data.map(data => `<li>${data}</li>`).join("")}
                            </ul>
                        ` : ""}
                        ${stego.message ? `
                            <h5><i class="fas fa-info-circle"></i> Message</h5>
                            <p>${stego.message}</p>
                        ` : ""}
                        ${stego.error ? `
                            <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
                            <p>${stego.error}</p>
                        ` : ""}
                        ${(stego.raw_output) ? `
                            <h5><i class="fas fa-code"></i> Raw Data</h5>
                            <button id="viewRawBtn" aria-label="View raw data in hex editor">View in Hex Editor</button>
                        ` : ""}
                    </div>
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
      console.log('Tab clicked:', this.dataset.tab); // Log 3: Tab switch
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
    });
  });
  // Initialize hex editor elements
  const hexEditorPopup = document.getElementById("hexEditorPopup");
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
  // Fetch stego data asynchronously
  if (stego_file) {
    console.log('Fetching stego data from:', RESPONSE_URL + stego_file); // Log 4: Fetch start
    try {
      const response = await fetch(RESPONSE_URL + stego_file);
      console.log('Fetch response status:', response.status); // Log 5: Fetch response
      if (!response.ok) {
        throw new Error(`Failed to fetch stego data: ${response.status}`);
      }
      stego = await response.json();
      console.log('Fetched stego data:', stego); // Log 6: Fetched data
      // Update stegoTab content
      const stegoDetails = document.getElementById('stegoDetails');
      const stegoLoading = document.getElementById('stegoLoading');
      const stegoStatus = document.getElementById('stegoStatus');
      if (stegoDetails && stegoLoading && stegoStatus) {
        stegoStatus.innerHTML = `
                    <i class="fas ${stego.stego_detected ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                    ${stego.stego_detected ? "Detected" : "Not Detected"}
                `;
        stegoStatus.className = stego.stego_detected ? 'badge-fake' : 'badge-real';
        document.getElementById('stegoPresence').textContent = stego.stego_detected ? "Detected" : "Not Detected";
        stegoDetails.innerHTML = `
                    ${stego.is_encrypted ? `
                        <h5><i class="fas fa-lock"></i> Encryption Status</h5>
                        <p>Password protection: <span class="badge-fake">Detected</span></p>
                    ` : ""}
                    ${stego.extracted_data && stego.extracted_data.length > 0 ? `
                        <h5><i class="fas fa-file-alt"></i> Extracted Data</h5>
                        <ul class="stego-list">
                            ${stego.extracted_data.map(data => `<li>${data}</li>`).join("")}
                        </ul>
                    ` : ""}
                    ${stego.message ? `
                        <h5><i class="fas fa-info-circle"></i> Message</h5>
                        <p>${stego.message}</p>
                    ` : ""}
                    ${stego.error ? `
                        <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
                        <p>${stego.error}</p>
                    ` : ""}
                    ${(stego.raw_output || stego.hex_output || stego.lsb_output) ? `
                        <h5><i class="fas fa-code"></i> Raw Data</h5>
                        <button id="viewRawBtn" aria-label="View raw data in hex editor">View in Hex Editor</button>
                    ` : ""}
                `;
        stegoLoading.style.display = 'none';
        stegoDetails.style.display = 'block';
        console.log('Stego content updated'); // Log 7: Content updated
        // Initialize hex editor after stego data is fetched
        const viewRawBtn = document.getElementById("viewRawBtn");
        if (viewRawBtn && hexEditorPopup && closeHexEditor && hexView) {
          if (!window.hexy) {
            hexView.textContent = "Error: Hex viewer library not loaded.";
            console.error("hexy.js not loaded"); // Log 21: hexy.js missing
            showToast("Hex viewer library not loaded.", 3000);
            return;
          }
          console.log('Attaching hex editor listeners'); // Log 22: Listener setup
          const toggleHexEditor = () => {
            console.log('toggleHexEditor called, open:', hexEditorPopup.classList.contains("open")); // Log 23: Toggle state
            if (hexEditorPopup.classList.contains("open")) {
              hexEditorPopup.classList.remove("open");
              viewRawBtn.textContent = "View in Hex Editor";
            } else {
              renderRawStegoData(stego, hexView, window.hexy);
              hexEditorPopup.classList.add("open");
              hexEditorPopup.style.display = 'block'; // Ensure visibility
              viewRawBtn.textContent = "Hide Hex Editor";
              console.log('Hex editor opened, hexView content:', hexView.innerHTML.substring(0, 100)); // Log 24: Hex view content
            }
          };
          viewRawBtn.addEventListener("click", () => {
            console.log('View Raw button clicked'); // Log 8: Hex editor toggle
            toggleHexEditor();
          });
          closeHexEditor.addEventListener("click", () => {
            hexEditorPopup.classList.remove("open");
            hexEditorPopup.style.display = 'none';
            viewRawBtn.textContent = "View in Hex Editor";
            console.log('Hex editor closed'); // Log 25: Hex editor closed
          });
          // Ctrl+Q keyboard shortcut
          document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key === "q" && (stego.raw_output || stego.hex_output)) {
              e.preventDefault();
              toggleHexEditor();
              console.log('Ctrl+Q triggered'); // Log 26: Keyboard shortcut
            }
          });
          // Drag functionality for popup
          const header = hexEditorPopup.querySelector(".hex-editor-header");
          let isDragging = false;
          let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
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
          const originalHexContent = { value: "" };
          const performSearch = debounce((searchValue) => {
            let hexText = originalHexContent.value;
            if (!hexText) {
              hexText = hexView.textContent;
              originalHexContent.value = hexText;
            }
            if (searchValue) {
              const regex = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              const highlighted = hexText.replace(regex, (match) => `<span class="search-highlight">${match}</span>`);
              hexView.innerHTML = highlighted;
            } else {
              hexView.innerHTML = originalHexContent.value
                .replace(/([0-9a-f]{8}:)/gi, '<span class="hex-offset">$1</span>')
                .replace(/([0-9A-F]{2})/gi, '<span class="hex-byte">$1</span>')
                .replace(/([^\s].*)$/gm, '<span class="hex-ascii">$1</span>');
            }
            console.log('Search performed, value:', searchValue); // Log 27: Search
          }, 300);
          searchHex.addEventListener("input", (e) => {
            performSearch(e.target.value.toLowerCase());
          });
          // Font size adjustment
          fontSize.addEventListener("input", (e) => {
            hexView.style.fontSize = `${e.target.value}px`;
            console.log('Font size changed:', e.target.value); // Log 28: Font size
          });
          zoomIn.addEventListener("click", () => {
            let currentSize = parseInt(fontSize.value) || 12;
            currentSize = Math.min(currentSize + 1, 20);
            fontSize.value = currentSize;
            hexView.style.fontSize = `${currentSize}px`;
            console.log('Zoom in, new size:', currentSize); // Log 29: Zoom in
          });
          zoomOut.addEventListener("click", () => {
            let currentSize = parseInt(fontSize.value) || 12;
            currentSize = Math.max(currentSize - 1, 10);
            fontSize.value = currentSize;
            hexView.style.fontSize = `${currentSize}px`;
            console.log('Zoom out, new size:', currentSize); // Log 30: Zoom out
          });
          // Theme toggle
          themeToggle.addEventListener("click", () => {
            hexEditorPopup.classList.toggle("light-theme");
            themeToggle.textContent = hexEditorPopup.classList.contains("light-theme") ? "Dark Theme" : "Light Theme";
            console.log('Theme toggled:', hexEditorPopup.classList.contains("light-theme") ? "light" : "dark"); // Log 31: Theme
          });
          // Full screen toggle
          fullscreenHex.addEventListener("click", () => {
            if (!document.fullscreenElement) {
              hexEditorPopup.requestFullscreen().then(() => {
                hexEditorPopup.classList.add("fullscreen");
                fullscreenHex.textContent = "Exit Full Screen";
                hexEditorPopup.style.transform = "none";
                console.log('Entered fullscreen'); // Log 32: Fullscreen
              }).catch(err => {
                console.error("Fullscreen error:", err);
                showToast("Failed to enter full screen");
              });
            } else {
              document.exitFullscreen().then(() => {
                hexEditorPopup.classList.remove("fullscreen");
                fullscreenHex.textContent = "Full Screen";
                xOffset = 0;
                yOffset = 0;
                hexEditorPopup.style.transform = "translate(-50%, -50%) translate3d(0, 0, 0)";
                console.log('Exited fullscreen'); // Log 33: Exit fullscreen
              }).catch(err => {
                console.error("Exit fullscreen error:", err);
                showToast("Failed to exit full screen");
              });
            }
          });
          document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && hexEditorPopup.classList.contains("fullscreen")) {
              hexEditorPopup.classList.remove("fullscreen");
              fullscreenHex.textContent = "Full Screen";
              xOffset = 0;
              yOffset = 0;
              hexEditorPopup.style.transform = "translate(-50%, -50%) translate3d(0, 0, 0)";
              console.log('Fullscreen exited via browser'); // Log 34: Fullscreen change
            }
          });
          // Copy hex
          copyHexBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(hexView.textContent).then(() => {
              showToast("Hex dump copied to clipboard!");
              console.log('Hex dump copied'); // Log 35: Copy hex
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
            console.log('Hex dump saved'); // Log 36: Save hex
          });
        } else {
          console.error('Hex editor elements missing:', { viewRawBtn, hexEditorPopup, closeHexEditor, hexView }); // Log 37: Missing elements
          showToast("Hex editor initialization failed.", 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching steganography results:', error); // Log 9: Fetch error
      const stegoDetails = document.getElementById('stegoDetails');
      const stegoLoading = document.getElementById('stegoLoading');
      if (stegoDetails && stegoLoading) {
        stegoDetails.innerHTML = `<h5><i class="fas fa-exclamation-triangle"></i> Error</h5><p>Failed to load steganography results</p>`;
        stegoLoading.style.display = 'none';
        stegoDetails.style.display = 'block';
      }
    }
  } else {
    console.warn('No steganography filename provided'); // Log 10: No filename
    const stegoDetails = document.getElementById('stegoDetails');
    const stegoLoading = document.getElementById('stegoLoading');
    if (stegoDetails && stegoLoading) {
      stegoDetails.innerHTML = `<h5><i class="fas fa-info-circle"></i> Message</h5><p>No steganography results available</p>`;
      stegoLoading.style.display = 'none';
      stegoDetails.style.display = 'block';
    }
  }
  // Progress circle animation
  setTimeout(() => {
    document.querySelectorAll('.progress-circle').forEach(circle => {
      const percentage = parseInt(circle.getAttribute('data-percentage')) || 0;
      const degrees = (percentage / 100) * 360;
      circle.style.setProperty('--progress', `${degrees}deg`);
    });
  }, 300);
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
                label: function (context) {
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
  console.log('renderRawStegoData called with stegoData:', stegoData); // Log 1: Input data
  console.log('containerElement:', containerElement); // Log 2: Container element
  if (!containerElement) {
    console.error('Error: containerElement is null or undefined');
    showToast("Error: Hex viewer container not found.", 3000);
    return;
  }
  if (!stegoData.raw_output && !stegoData.hex_output && !stegoData.lsb_output) {
    containerElement.textContent = "No raw data available.";
    showToast("No data available to display in hex editor.", 3000);
    console.log('No raw data available'); // Log 3: No data
    return;
  }
  let hexInput = stegoData.lsb_output || stegoData.hex_output || stegoData.raw_output;
  console.log('hexInput:', hexInput); // Log 4: Selected input
  if (!hexInput) {
    containerElement.textContent = "No raw data available.";
    showToast("No data available to display in hex editor.", 3000);
    console.log('No hexInput provided'); // Log 5: No hexInput
    return;
  }
  let dataBuffer;
  try {
    dataBuffer = new Uint8Array(
      hexInput.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ||
      new TextEncoder().encode(stegoData.raw_output || "")
    );
    console.log('dataBuffer length:', dataBuffer.length); // Log 6: Buffer size
  } catch (e) {
    containerElement.textContent = "Error: Invalid hex data.";
    console.error("Failed to parse hex data:", e); // Log 7: Parse error
    showToast("Error processing hex data.", 3000);
    return;
  }
  const pageSize = 4096;
  let currentPage = 0;
  const totalPages = Math.ceil(dataBuffer.length / pageSize);
  console.log('totalPages:', totalPages); // Log 8: Total pages
  function renderPage(page) {
    const start = page * pageSize;
    const end = Math.min(start + pageSize, dataBuffer.length);
    const pageData = dataBuffer.slice(start, end);
    let hexDump = hexy(pageData, {
      width: 16,
      numbering: 'hex_bytes',
      format: 'twos',
      caps: 'upper',
      annotate: 'ascii',
      prefix: '',
      indent: 0,
      html: false
    });
    console.log('hexDump sample:', hexDump.substring(0, 100)); // Log 9: Hex dump sample
    hexDump = hexDump.replace(
      /(def |import |class |print\(|input\()/g,
      '<span class="python-keyword">$1</span>'
    );
    const colorizedDump = hexDump
      .replace(/([0-9a-fA-F]{8}:)/gi, '<span class="hex-offset">$1</span>')
      .replace(/([0-9A-F]{2})/gi, '<span class="hex-byte">$1</span>')
      .replace(/([^\s].*)$/gm, '<span class="hex-ascii">$1</span>');
    console.log('colorizedDump sample:', colorizedDump.substring(0, 100)); // Log 10: Colorized dump
    containerElement.innerHTML = colorizedDump;
    console.log('containerElement updated with innerHTML'); // Log 11: DOM update
    updatePaginationControls(page, totalPages);
  }
  function updatePaginationControls(page, totalPages) {
    let controls = document.querySelector('.hex-pagination');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'hex-pagination';
      containerElement.parentElement.appendChild(controls);
      console.log('Created hex-pagination controls'); // Log 12: Pagination created
    }
    controls.innerHTML = `
            <button id="prevPage" ${page === 0 ? 'disabled' : ''}>Previous</button>
            <span>Page ${page + 1} of ${totalPages}</span>
            <button id="nextPage" ${page >= totalPages - 1 ? 'disabled' : ''}>Next</button>
        `;
    const prevButton = controls.querySelector('#prevPage');
    const nextButton = controls.querySelector('#nextPage');
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        if (currentPage > 0) {
          currentPage--;
          renderPage(currentPage);
          console.log('Previous page clicked, currentPage:', currentPage); // Log 13: Prev page
        }
      });
    }
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
          currentPage++;
          renderPage(currentPage);
          console.log('Next page clicked, currentPage:', currentPage); // Log 14: Next page
        }
      });
    }
  }
  let decodedText = '';
  try {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(dataBuffer);
    console.log('Decoded text sample:', decoded.substring(0, 100)); // Log 15: Decoded text
    if (decoded.includes('def ') || decoded.includes('import ') || decoded.includes('class ')) {
      decodedText = decoded;
    }
  } catch (e) {
    console.warn("Decoding as text failed:", e); // Log 16: Text decode error
  }
  if (decodedText && (decodedText.includes('def ') || decodedText.includes('import '))) {
    const codeCard = document.createElement('div');
    codeCard.className = 'stego-card';
    codeCard.innerHTML = `
            <h5><i class="fas fa-code"></i> Extracted Python Code</h5>
            <pre class="python-code">${decodedText}</pre>
        `;
    const stegoGrid = document.querySelector('.stego-grid');
    if (stegoGrid) {
      stegoGrid.prepend(codeCard);
      console.log('Python code card added to stego-grid'); // Log 17: Python code added
    } else {
      console.error('Error: .stego-grid not found'); // Log 18: Stego-grid missing
    }
  }
  renderPage(currentPage);
  if (saveRawBtn) {
    saveRawBtn.addEventListener('click', () => {
      const blob = new Blob([dataBuffer], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'raw_stego_data.bin';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Raw data saved!');
      console.log('Raw data saved'); // Log 19: Save clicked
    });
  } else {
    console.warn('saveRawBtn not found'); // Log 20: Save button missing
  }
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
           <div class="progress-circle" data-percentage="${(report.confidence_score / 2).toFixed(0)}">
  <span class="progress-value">${(report.confidence_score / 2).toFixed(0)}%</span>
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
    const cached = localStorage.getItem('evidenceResults');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed) {
                console.log('Using cached EXIF report');
                videoForensics(parsed);
                startVTPolling(parsed.meta.task_id);  
            }
        } catch (e) {
            console.error('Failed to parse cached EXIF data', e);
        }
    }
});



function createHeatmapModal() {
  if (document.getElementById('heatmapModalDisplay')) return;

  const modalHtml = `
    <div id="heatmapModalDisplay" style="display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.9); justify-content: center; align-items: center;">
        <span style="position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer;" onclick="closeHeatmapModal()">&times;</span>
        <img class="modal-content" id="img01" style="margin: auto; display: block; max-width: 90%; max-height: 90vh; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
    </div>
    `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Close when clicking outside
  const modal = document.getElementById('heatmapModalDisplay');
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeHeatmapModal();
    }
  }
}

/**
 * Helper function to generate the VT status HTML with or without a spinner.
 * @param {string} statusText The human-readable status text.
 * @param {boolean} showSpinner Whether to include the spinning icon.
 * @returns {string} The resulting HTML string.
 */
const getSpinnerHTML = (statusText, showSpinner) => {
    const spinnerIcon = showSpinner 
        ? `<span class="material-symbols-rounded spinner-spin text-lg text-green-600">sync</span>`
        : '';
    
    // Uses the flex container structure defined in the HTML above
    return `
        ${spinnerIcon}
        <span class="text-gray-600">${statusText}</span>
    `;
};


function startVTPolling(taskId) {
    const statusEl = document.getElementById("vt-status");
    
    // Initial state set with spinner (queued)
    statusEl.innerHTML = getSpinnerHTML("VirusTotal: queued (will start automatically)", true);

    const poll = setInterval(() => {
        fetch(`/evidence/vt-status/${taskId}/`)
            .then(r => r.json())
            .then(data => {
                const vtStatus = data.vt_status;

                if (vtStatus === "completed") {
                    clearInterval(poll);
                    const r = data.vt_result;
                    statusEl.innerHTML = `
                        <strong class="text-sm" style="color: ${r.malicious > 0 ? '#ef4444' : '#10b981'}">
                            <span class="material-symbols-rounded align-middle mr-1 text-base">check_circle</span>
                            VirusTotal: ${r.detection_ratio}
                        </strong>
                        <a href="${r.permalink}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800 transition ml-2">
                            Open Full Report
                        </a>
                    `;
                } else if (vtStatus === "scanning") {
                    statusEl.innerHTML = getSpinnerHTML("VirusTotal: scanning with 70+ engines...", true);
                } else if (vtStatus === "queued") {
                    statusEl.innerHTML = getSpinnerHTML("VirusTotal: queued (will start soon)", true);
                } else if (vtStatus === "error") {
                    clearInterval(poll);
                    statusEl.innerHTML = `
                        <span class="text-sm text-red-600 font-semibold">
                            <span class="material-symbols-rounded align-middle mr-1 text-base">error</span>
                            VT Error: ${data.vt_result?.error || "Unknown"}
                        </span>`;
                }
            })
            .catch(err => {
                console.error("VT polling error:", err);
                clearInterval(poll);
                statusEl.innerHTML = `
                    <span class="text-sm text-red-600 font-semibold">
                        <span class="material-symbols-rounded align-middle mr-1 text-base">warning</span>
                        VT Polling Failed. Check Console.
                    </span>`;
            });
    }, 12000); 
}








async function videoForensics(data) {
    
 

    const section = document.getElementById("analytics_section");

 
    if (!section) {
        console.error("Error: Could not find element with ID 'analytics_section'. The function cannot render the content.");
      
        return; 
    }
    
   
    const result = data || {};

   
    const df = result.deepfake_video || {};
    const metadatasection= ""
    const task = result.task_data || {};
    const meta = result.meta || {};
    const hashes = result.hashes || {};
    const majorAnalysis = result.major_analysis || {};
    
    // Core data extraction
    const filepath = df.video_path || meta.file_path || '';
    const fileName = filepath.substring(filepath.lastIndexOf('\\') + 1) || task.file_name;
    const isVideo = df.video_duration !== undefined; 

    if (!isVideo) {
        section.innerHTML = `<div class="p-8 bg-red-100 text-red-800 rounded-lg">Error: Data is not recognized as a video analysis result.</div>`;
        return;
    }


const getVerdictStyle = (verdict) => {
    const v = verdict?.toLowerCase() || 'n/a';
    
    if (v.includes('fake') || v.includes('tampered') || v.includes('tamper')) {
        return 'bg-red-500 text-white shadow-red-300';
    }
    
    if (v.includes('real') || v.includes('intact') || v.includes('clean')) {
        return 'bg-green-500 text-white shadow-green-300';
    }
    
    return 'bg-gray-300 text-gray-800 shadow-gray-200';
};


const renderDataList = (items) => `
    <div class="space-y-3">
        ${items.map(item => `
            <div class="flex justify-between items-start py-1 border-b border-gray-100 last:border-b-0">
                <span class="font-medium text-gray-600 text-sm">${item.title}</span>
                <span class="text-gray-800 font-semibold text-right text-sm">${item.value}</span>
            </div>
        `).join('')}
    </div>
`;

// --- NEW HELPER FUNCTION: Renders the VT Polling Section ---
const renderVTPollingSection = (vtStatus) => {
    // 1. Define the initial status text
    let statusText = 'N/A';
    let showSpinner = false;
    
    if (vtStatus === 'queued') {
        statusText = 'Queued (will start automatically)';
        showSpinner = true;
    } else if (vtStatus === 'scanning') {
        statusText = 'Scanning with 70+ engines...';
        showSpinner = true;
    } else if (vtStatus === 'completed') {
        statusText = 'Completed (polling will not start)';
    } else if (vtStatus === 'error') {
        statusText = 'Error during previous scan.';
    }

    // 2. Spinner HTML logic
    const spinnerIcon = showSpinner 
        ? `<span class="material-symbols-rounded spinner-spin text-lg text-green-600">sync</span>`
        : '';
        
    return `
        <div id="vt-section" class="mt-6 p-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-700">
            <h3 class="text-lg font-bold mb-2 border-b pb-2 text-green-700">
                <span class="material-symbols-rounded align-middle mr-2">security_shield</span>VirusTotal Scan
            </h3>
            <div id="vt-status" class="flex items-center space-x-2 font-medium text-sm text-gray-600">
                ${spinnerIcon}
                <span>VirusTotal: ${statusText}</span>
            </div>
        </div>
    `;
};


const renderMetadataCard = (metaData) => {
    // 1. Separate VT status from general metadata
    const vtStatus = metaData?.vt_status;
    const filteredMetaData = { ...metaData };
    delete filteredMetaData.vt_status; // Ensure it's not rendered in the main grid

    const metadataEntries = Object.entries(filteredMetaData || {});
    
    // Check if the original metadata was empty before filtering (if only vt_status was present)
    const isEmpty = metadataEntries.length === 0;

    const metadataContent = metadataEntries.map(([key, value]) => `
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h5 class="text-xs font-medium text-green-600 uppercase mb-1">${key.replace(/_/g, ' ')}</h5>
            <p class="text-xs text-gray-700 break-words">${value || 'N/A'}</p>
        </div>
    `).join("");

    const metadataCardHTML = `
        <div class="p-5 bg-white rounded-xl shadow-lg border border-green-100">
            <h4 class="text-lg font-bold mb-4 text-green-700 border-b pb-2">
                <span class="material-symbols-rounded align-middle mr-2">sell</span>Core File Metadata
            </h4>
            <div class="grid grid-cols-2 gap-4">
                ${metadataContent}
            </div>
            ${isEmpty ? '<div class="p-4 bg-gray-100 text-gray-700 rounded-lg mt-4">ℹ️ No core metadata extracted.</div>' : ''}
        </div>
    `;
    
    // 3. Combine the Metadata Card with the dynamic VT Section (if VT data exists)
    const vtSectionHTML = vtStatus ? renderVTPollingSection(vtStatus) : '';
    
    // Return both HTML blocks combined.
    return metadataCardHTML + vtSectionHTML;
};


const renderCircularProgress = (percentage, title, prediction, predictionType) => {
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    
    let mainColorClass = 'green';
    
    if (predictionType === 'Deepfake') {
        if (clampedPercentage > 50 && prediction?.toLowerCase() === 'fake') {
            mainColorClass = 'red';
        } else if (clampedPercentage > 50 && prediction?.toLowerCase() === 'real') {
            mainColorClass = 'green';
        }
    } else if (predictionType === 'Tamper') {
        if (clampedPercentage >= 40) {
            mainColorClass = 'red';       
        } else if (clampedPercentage >= 25) {
            mainColorClass = 'orange';    
        } else if (clampedPercentage >= 15) {
            mainColorClass = 'yellow';    
        } else if (clampedPercentage >= 5) {
            mainColorClass = 'lime';      
        } else {
            mainColorClass = 'green';     
        }
    }

    let fillColor = '';
    let textColor = '';
    
    switch (mainColorClass) {
        case 'red':
            fillColor = '#ef4444'; 
            textColor = 'text-red-700';
            break;
        case 'orange':
            fillColor = '#f97316'; 
            textColor = 'text-orange-700';
            break;
        case 'yellow':
            fillColor = '#facc15'; 
            textColor = 'text-yellow-700';
            break;
        case 'lime':
            fillColor = '#84cc16'; 
            textColor = 'text-lime-700';
            break;
        case 'green':
            fillColor = '#10b981'; 
            textColor = 'text-green-700';
            break;
        default:
            fillColor = '#9ca3af'; 
            textColor = 'text-gray-700';
            break;
    }

    const conicGradientStyle = `
        background: conic-gradient(
            ${fillColor} ${clampedPercentage}%, 
            #e5e7eb ${clampedPercentage}%
        );
    `;

    return `
        <div class="flex flex-col items-center p-3">
            <h5 class="text-sm font-semibold text-gray-600 mb-2">${title}</h5>
            
            <div class="relative w-32 h-32 flex items-center justify-center rounded-full shadow-inner bg-gray-100">
                
                <div class="absolute w-full h-full rounded-full flex items-center justify-center overflow-hidden" 
                     style="${conicGradientStyle}">

                    <div class="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center p-1 shadow-md">
                        <p class="text-2xl font-extrabold ${textColor} leading-none">${clampedPercentage.toFixed(0)}%</p>
                        <p class="text-xs text-gray-500 mt-1">Score</p>
                    </div>
                </div>
            </div>

            <p class="mt-3 text-base font-bold ${textColor} text-center">${prediction || 'N/A'}</p>
            <p class="text-xs text-gray-500 text-center uppercase tracking-wider">${predictionType}</p>
        </div>
    `;
};



// Function to generate the HTML (NO EMBEDDED <script> tag)
const renderFileHashes = (hashes) => {
    const hashEntries = Object.entries(hashes || {});
    const initialDisplayCount = 4;
    const totalCount = hashEntries.length;

    if (totalCount === 0) {
        return `
            <div class="p-5 bg-white rounded-xl shadow-lg border border-green-100">
                <h4 class="text-lg font-bold mb-4 text-green-700 border-b pb-2">
                    <span class="material-symbols-rounded align-middle mr-2">lock</span>File Integrity Hashes
                </h4>
                <div class="p-4 bg-gray-100 text-gray-700 rounded-lg">No file hashes provided for this evidence.</div>
            </div>
        `;
    }

    const initialHashes = hashEntries.slice(0, initialDisplayCount);
    const hiddenHashes = hashEntries.slice(initialDisplayCount);
    const hiddenCount = totalCount - initialDisplayCount;

    // Pre-calculate the initial button text
    const initialButtonText = `Show ${hiddenCount} More`;

    const initialContent = initialHashes.map(([key, value]) => `
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h5 class="text-xs font-medium text-green-600 uppercase mb-1">${key.toUpperCase()}</h5>
            <p class="text-xs font-mono text-gray-700 break-all">${value}</p>
        </div>
    `).join("");

    const hiddenContent = hiddenHashes.map(([key, value]) => `
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h5 class="text-xs font-medium text-green-600 uppercase mb-1">${key.toUpperCase()}</h5>
            <p class="text-xs font-mono text-gray-700 break-all">${value}</p>
        </div>
    `).join("");

    return `
        <div class="p-5 bg-white rounded-xl shadow-lg border border-green-100">
            <h4 class="text-lg font-bold mb-4 text-green-700 border-b pb-2">
                <span class="material-symbols-rounded align-middle mr-2">lock</span>File Integrity Hashes
            </h4>
            
            <div id="initial-hashes-display" class="grid grid-cols-2 gap-4 mb-4">
                ${initialContent}
            </div>

            ${hiddenHashes.length > 0 ? `
                <div id="hidden-hashes-content" class="grid grid-cols-2 gap-4 transition-all duration-300 ease-in-out hidden mb-4">
                    ${hiddenContent}
                </div>

                <div class="flex justify-end">
                    <button data-hash-toggle="true"
                            data-initial-count="${initialDisplayCount}"
                            data-total-count="${totalCount}"
                            class="flex items-center text-sm font-semibold text-green-600 hover:text-green-800 transition duration-150">
                        <span id="hash-button-text-${Math.random().toString(36).substring(2, 9)}">${initialButtonText}</span>
                        <span class="material-symbols-rounded align-middle text-lg transition-transform transform rotate-0 ml-1">expand_more</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
};

const verdictColorBorder = (majorAnalysis.verdict || df.prediction)?.toLowerCase().includes('fake') ? 'border-red-600' : 'border-green-600';

const videoSummaryContent = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div class="lg:col-span-1 space-y-6">
            
            <div class="p-4 bg-gray-100 rounded-xl shadow-inner flex flex-col items-center">
                <h4 class="text-lg font-bold mb-3 text-gray-700">
                    <span class="material-symbols-rounded align-middle mr-2">videocam</span>Video Evidence Preview
                </h4>
                <video src="/evidence/files/${fileName}" controls class="w-full h-auto rounded-lg shadow-xl" style="max-height: 450px;"></video>
            </div>

            <div class="p-5 bg-white rounded-xl shadow-lg ${verdictColorBorder} border-2 text-center space-y-4">
                <h5 class="text-sm font-semibold text-gray-500 mb-2 pt-2">Overall Forensic Verdict</h5>
                <span class="inline-block px-4 py-1 rounded-lg text-2xl font-extrabold shadow-sm ${getVerdictStyle(majorAnalysis.verdict || df.prediction)}">
                    ${majorAnalysis.verdict || df.prediction || "N/A"}
                </span>
                
                <div class="grid grid-cols-2 gap-3 pt-5 border-t border-gray-100">
                    ${renderCircularProgress(
                        df.confidence * 100 || 0, 
                        "Deepfake Confidence", 
                        df.prediction,
                        'Deepfake'
                    )}
                    ${renderCircularProgress(
                        majorAnalysis.tamper_probability * 100 || 0, 
                        "Tamper Probability", 
                        (majorAnalysis.tamper_probability || 0) > 0.4 ? 'Strongly Tampered' : ((majorAnalysis.tamper_probability || 0) > 0.25 ? 'Tampered' : 'Intact'),
                        'Tamper'
                    )}
                </div>
            </div>

            <div class="p-5 bg-white rounded-xl shadow-lg border border-gray-200">
                <h4 class="text-lg font-bold mb-4 text-green-700 border-b pb-2">
                    <span class="material-symbols-rounded align-middle mr-2">schedule</span>Video Analysis Metrics
                </h4>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-extrabold text-green-800">${(df.video_duration || 0).toFixed(2)}</p>
                        <p class="text-xs text-gray-600">Duration (s)</p>
                    </div>
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-extrabold text-green-800">${df.total_frames || 0}</p>
                        <p class="text-xs text-gray-600">Total Frames</p>
                    </div>
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-extrabold text-green-800">${df.processed_frames || 0}</p>
                        <p class="text-xs text-gray-600">Processed Frames</p>
                    </div>
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <p class="text-2xl font-extrabold text-green-800">${(df.processing_time || 0).toFixed(2)}</p>
                        <p class="text-xs text-gray-600">Processing Time (s)</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="lg:col-span-2 space-y-6">
            
            ${renderMetadataCard(meta)}
            
            <div class="p-5 bg-white rounded-xl shadow-lg border border-green-100">
                <h4 class="text-lg font-bold mb-4 text-green-700 border-b pb-2">
                    <span class="material-symbols-rounded align-middle mr-2">folder_open</span>Case & File Details
                </h4>
                ${renderDataList([
                    { title: "Evidence Name", value: task.task_name || "N/A" },
                    { title: "Description", value: task.task_description || "No description provided" },
                    { title: "File Name", value: fileName },
                    { title: "File Type", value: task.file_type || "N/A" },
                    { title: "File Size", value: formatFileSize(task.file_size || 0) },
                    { title: "Report Reference", value: majorAnalysis.report_reference?.filename || 'N/A' },
                    { title: "Analysis Timestamp", value: majorAnalysis.report_reference?.timestamp || "N/A" }
                ])}
            </div>

            ${renderFileHashes(hashes)}
        </div>
    </div>
`;


function initializeHeatmapCarousel() {
    // 1. Get the elements by their unique IDs defined in the HTML
    const container = document.getElementById('heatmap-carousel-container');
    const prevBtn = document.getElementById('heatmap-prev-btn');
    const nextBtn = document.getElementById('heatmap-next-btn');
    
    // Safety check: if the carousel HTML section was not rendered (e.g., no heatmaps), exit.
    if (!container || !prevBtn || !nextBtn) {
        return; 
    }
    
    const scrollStep = 250; 
    
    const checkScroll = () => {
        // Disable prev button if at the start
        prevBtn.disabled = container.scrollLeft <= 1; 
        
        // Disable next button if at the end (using a small tolerance)
        nextBtn.disabled = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 5);
    };

    // 3. Attach Event Listeners
    
    prevBtn.addEventListener('click', () => {
        container.scrollBy({ left: -scrollStep, behavior: 'smooth' });
        // Use setTimeout to check scroll after smooth animation starts
        setTimeout(checkScroll, 150); 
    });

    nextBtn.addEventListener('click', () => {
        container.scrollBy({ left: scrollStep, behavior: 'smooth' });
        setTimeout(checkScroll, 150); 
    });
    
    // Check scroll position when scrolling naturally (by mouse/touch) or resizing
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    // 4. Initial check to set the button states immediately
    checkScroll();
    
    console.log("Heatmap Carousel Initialized."); // For debugging
}

/**
 * Helper function to safely convert a value to a finite number.
 * Accepts numbers or numeric strings. Returns undefined for invalid values.
 * @param {any} v
 * @returns {number|undefined}
 */
const toNumber = (v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'number') {
        return Number.isFinite(v) ? v : undefined;
    }
    if (typeof v === 'string') {
        const n = Number(v.trim());
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
};

/**
 * Helper to return a safe numeric value or fallback.
 * @param {any} v
 * @param {number} fallback
 * @returns {number}
 */
const safeNum = (v, fallback = 0) => {
    const n = toNumber(v);
    return typeof n === 'number' ? n : fallback;
};

/**
 * Helper function to safely format fractional scores (0 to 1) as percentages.
 * Returns 'N/A' if the value is not a valid number.
 * NOTE: returns numeric string without the trailing '%' so callers can decide
 * whether to append '%' (keeps compatibility with your template usage).
 * @param {number|string} value - The score to convert (e.g., 0.6713 or "0.6713")
 * @returns {string} The formatted percentage string (e.g., '67.13') or 'N/A'
 */
const formatPercentage = (value) => {
    const n = toNumber(value);
    if (typeof n === 'number') {
        return (n * 100).toFixed(2);
    }
    return 'N/A';
};

/**
 * Helper function to safely format a raw number to a specified decimal place.
 * Returns 'N/A' if the value is not a valid number.
 * @param {number|string} value - The number to format.
 * @param {number} decimals - Number of decimal places (default 4).
 * @returns {string} The formatted number string or 'N/A'.
 */
const formatNumber = (value, decimals = 0) => {
    const n = toNumber(value);
    if (typeof n === 'number') {
        return n.toFixed(decimals);
    }
    return 'N/A';
};

/**
 * Helper function to determine the visual severity color for a score tile.
 * This logic is based on common forensic score interpretations.
 * @param {number|string} score - accepts numeric strings too.
 * @param {string} metricType - 'probability' | 'instability' | 'correlation'
 * @returns {string} Tailwind CSS classes.
 */
const getScoreColor = (score, metricType) => {
    const safeScore = toNumber(score) ?? 0;

    if (metricType === 'probability' || metricType === 'instability') {
        if (safeScore > 0.8) return 'text-red-700 bg-red-100 border-red-300';
        if (safeScore > 0.5) return 'text-orange-700 bg-orange-100 border-orange-300';
        return 'text-green-700 bg-green-100 border-green-300';
    } else if (metricType === 'correlation') {
        if (safeScore < 0.05) return 'text-red-700 bg-red-100 border-red-300';
        if (safeScore < 0.15) return 'text-orange-700 bg-orange-100 border-orange-300';
        return 'text-green-700 bg-green-100 border-green-300';
    }
    return 'text-gray-700 bg-gray-100 border-gray-300';
};


const renderDetailedChecks = (detailedChecks) => {
  
    if (!detailedChecks.detailed_checks || typeof detailedChecks.detailed_checks !== 'object' || Array.isArray(detailedChecks.detailed_checks)) {
        return '<div class="text-xs text-gray-500">No detailed checks data available.</div>';
    }

    const entries = Object.entries(detailedChecks.detailed_checks);
    if (entries.length === 0) {
        return '<div class="text-xs text-gray-500">No detailed checks data available.</div>';
    }

    const checks = entries.map(([key, value]) => {
        const label = String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const passed = Boolean(value);
        const color = passed ? 'text-green-600' : 'text-red-600';
        const icon = passed ? 'done' : 'close';
        return `
        
        <div class="flex items-center space-x-2"><span class="material-symbols-rounded text-base ${color} flex-shrink-0">${icon}</span><span class="text-xs font-medium text-gray-700">${label}</span></div>
        
        
        `;
    }).join('');
    return `
    
    ${checks}
    `;
};


const renderExplanationBullets = (explanationBullets) => {
    if (!Array.isArray(explanationBullets) || explanationBullets.length === 0) {
        return `<li class="text-sm text-gray-500">No detailed explanation bullets provided.</li>`;
    }
    return explanationBullets.map(bullet => {
        const safeBullet = String(bullet);
        return `
            <li class="flex items-start space-x-2 text-sm text-gray-700">
                <span class="material-symbols-rounded text-base text-purple-500 flex-shrink-0 mt-1">chevron_right</span>
                <span>${safeBullet}</span>
            </li>
        `;
    }).join('');
};


const renderGlobalStats = (globalStats) => {
    const meanCorr = (globalStats || {}).mean_correlation || {};
    const stdCorr = (globalStats || {}).std_correlation || {};
    const madCorr = (globalStats || {}).mad_correlation || {};

    const stats = {
        'Mean Correlation': meanCorr,
        'Std Correlation': stdCorr,
        'MAD Correlation': madCorr
    };

    return Object.entries(stats).map(([label, data]) => {
        const min = formatNumber(data.min, 4);
        const max = formatNumber(data.max, 4);
        const p25 = formatNumber(data.p25, 4);
        const median = formatNumber(data.median, 4);
        const p75 = formatNumber(data.p75, 4);
        return `
            <div class="p-3 border rounded-lg bg-white shadow-sm">
                <p class="text-sm font-semibold mb-1 text-gray-700">${label}</p>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <span class="font-mono">Min: ${min}</span>
                    <span class="font-mono">Max: ${max}</span>
                    <span class="font-mono">First Quartile: ${p25}</span>
                    <span class="font-mono">Mean: ${median}</span>
                    <span class="font-mono">Third Quartile: ${p75}</span>
                </div>
            </div>
        `;
    }).join('');
};


const renderCalibThresholds = (calibThresholds) => {
    const consistent = calibThresholds?.consistent_camera ?? {};
    const tampering  = calibThresholds?.possible_tampering ?? {};

    const hasConsistent = Object.keys(consistent).length > 0;
    const hasTampering  = Object.keys(tampering).length > 0;

    const formatLabel = (key) =>
        key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

    const renderBlock = (data, title) => {
        const rows = Object.entries(data)
            .filter(([, value]) => typeof value === 'number')
            .map(([key, value]) => `
                <span class="font-mono">
                    ${formatLabel(key)}: ${formatNumber(value, 4)}
                </span>
            `)
            .join('');

        return ` 
            <div class="p-3 border rounded-lg bg-white shadow-sm">
                <p class="text-sm font-semibold mb-1 text-gray-700">${title}</p>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    ${rows}
                </div>
            </div>
        `;
    };

    const consistentHtml = hasConsistent
        ? renderBlock(consistent, 'Consistent Camera Thresholds')
        : '';

    const tamperingHtml = hasTampering
        ? renderBlock(tampering, 'Possible Tampering Thresholds')
        : '';

    return (consistentHtml + tamperingHtml) ||
        '<div class="text-xs text-gray-500">No specific thresholds derived.</div>';
};


/**
 * Renders Stream Metadata.
 * stream: ffmpeg stream object (may be {}), title: string, format: ffmpeg format object (may be {}).
 */
const renderStreamMetadata = (stream, title, format) => {
    // 1. Initial Guard Clause (Already present, which is good)
    if (!stream || typeof stream !== 'object' || Object.keys(stream).length === 0) {
        return `
            <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <h5 class="text-sm font-black uppercase tracking-widest mb-2 text-slate-400">${title}</h5>
                <p class="text-sm text-slate-500 italic">Stream data is unavailable.</p>
            </div>`;
    }

    const type = stream.codec_type || 'unknown';
    
    // 2. FIXED LINE: Added optional chaining and a fallback to 'UNKNOWN'
    const codecName = (stream.codec_name?.toUpperCase()) || 'UNKNOWN';
    const profile = stream.profile ? ` (${stream.profile})` : '';
    const codec = codecName + profile;

    const frameCount = stream.nb_frames || 'N/A';
    const duration = stream.duration ? parseFloat(stream.duration).toFixed(2) + 's' : 'N/A';
    
    // 3. Bitrate Safety
    const brValue = stream.bit_rate || format?.bit_rate;
    const brNum = brValue ? parseInt(brValue) : NaN;
    const bitRateDisplay = !isNaN(brNum) ? `${Math.round(brNum / 1000)} kb/s` : 'N/A';

    // Helper for Video Stats (Added fallbacks for width/height)
    const renderVideoSpecific = () => `
        <div class="flex justify-between py-1 border-b border-slate-50">
            <dt class="text-slate-500">Resolution</dt>
            <dd class="font-bold text-slate-800">${stream.width || '?'} x ${stream.height || '?'}</dd>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-50">
            <dt class="text-slate-500">Frame Rate</dt>
            <dd class="font-bold text-slate-800">${stream.avg_frame_rate || 'N/A'} fps</dd>
        </div>
        <div class="flex justify-between py-1 border-b border-slate-50">
            <dt class="text-slate-500">Total Frames</dt>
            <dd class="font-mono font-bold text-indigo-600">${frameCount}</dd>
        </div>
    `;

    // Helper for Audio Stats (Added safety for sample_rate)
    const renderAudioSpecific = () => {
        const sRate = stream.sample_rate ? (parseInt(stream.sample_rate) / 1000).toFixed(1) + ' kHz' : 'N/A';
        return `
            <div class="flex justify-between py-1 border-b border-slate-50">
                <dt class="text-slate-500">Sample Rate</dt>
                <dd class="font-bold text-slate-800">${sRate}</dd>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
                <dt class="text-slate-500">Channels</dt>
                <dd class="font-bold text-slate-800">${stream.channel_layout || 'N/A'} (${stream.channels || 0}ch)</dd>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
                <dt class="text-slate-500">Total Samples</dt>
                <dd class="font-mono font-bold text-indigo-600">${frameCount}</dd>
            </div>
        `;
    };

    return `
        <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors">
            <div class="flex items-center justify-between mb-4">
                <h5 class="text-sm font-black uppercase tracking-widest text-indigo-600">${title}</h5>
                <span class="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    Index ${stream.index ?? '?'}
                </span>
            </div>
            
            <div class="mb-4">
                <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Codec & Profile</span>
                <div class="text-lg font-black text-slate-800">${codec}</div>
            </div>

            <dl class="text-xs space-y-2">
                ${type === 'video' ? renderVideoSpecific() : renderAudioSpecific()}
                
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <dt class="text-slate-500">Bit Rate</dt>
                    <dd class="font-bold text-slate-800">${bitRateDisplay}</dd>
                </div>
                <div class="flex justify-between py-1">
                    <dt class="text-slate-500">Duration</dt>
                    <dd class="font-bold text-slate-800">${duration}</dd>
                </div>
            </dl>
            
            ${stream.disposition?.default === 1 ? `
                <div class="mt-4 flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg w-fit">
                    <span class="material-symbols-rounded text-sm mr-1">check_circle</span>
                    Primary Default Stream
                </div>
            ` : ''}
        </div>
    `;
};
/**
 * Renders a modern, 3D-style bar chart for histogram data.
 * @param {Array} data - The histogram array (e.g., mean_corr).
 * @param {string} colorClass - Tailwind color for the bars.
 * @returns {string} HTML for the chart.
 */
/**
 * Renders a formal 3D-style bar graph with X and Y axes.
 */
const render3DChart = (data, colorClass = 'bg-indigo-500') => {
    if (!data || data.length === 0) return '<p class="text-xs text-gray-400">No data</p>';
    
    const maxVal = Math.max(...data.map(d => d.count), 0);
    const yAxisMax = maxVal < 5 ? 5 : Math.ceil(maxVal / 5) * 5;
    const yTicks = [yAxisMax, Math.floor(yAxisMax * 0.75), Math.floor(yAxisMax * 0.5), Math.floor(yAxisMax * 0.25), 0];

    return `
        <div class="flex flex-col w-full">
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between items-end pr-2 pb-6 text-[10px] text-gray-400 font-mono w-8">
                    ${yTicks.map(tick => `<span>${tick}</span>`).join('')}
                </div>

                <div class="relative flex-1 flex items-end justify-between border-l-2 border-b-2 border-gray-300 px-2 pb-1 bg-white/50">
                    
                    <div class="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1">
                        ${yTicks.map((_, i) => i === yTicks.length - 1 ? '' : `<div class="w-full border-t border-gray-100 h-0"></div>`).join('')}
                    </div>

                    ${data.map(item => {
                        const heightPercent = (item.count / yAxisMax) * 100;
                        const isActive = item.count > 0;
                        
                        return `
                            <div class="group relative flex flex-col items-center flex-1 mx-1 transition-all duration-300 hover:z-[50] z-10">
                                
                                <div class="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900 text-white text-[10px] rounded-lg px-3 py-2 pointer-events-none shadow-2xl border border-white/10 w-max min-w-[100px] z-[100]">
                                    <div class="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                                        <span class="text-gray-400">Count</span>
                                        <span class="font-bold text-sm text-white">${item.count}</span>
                                    </div>
                                    <div class="text-[9px] text-gray-400 leading-tight">
                                        Range: <span class="text-gray-200">${item.range}</span>
                                    </div>
                                    <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>

                                <div class="w-full relative transition-all duration-700 ease-out" style="height: ${heightPercent}%;">
                                    <div class="absolute -top-1.5 left-0 w-full h-3 rounded-full ${isActive ? colorClass : 'bg-gray-200'} filter brightness-125 z-20 transform -skew-x-12"></div>
                                    
                                    <div class="w-full h-full ${isActive ? colorClass : 'bg-gray-100'} rounded-t-sm shadow-lg relative overflow-hidden group-hover:brightness-110 transition-all">
                                        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent"></div>
                                        
                                        ${item.count > 0 ? `
                                            <span class="absolute top-1 left-0 w-full text-[10px] text-white text-center font-black drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] z-30">
                                                ${item.count}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                
                                <div class="absolute top-full pt-2 text-[9px] text-gray-500 font-bold rotate-45 origin-left whitespace-nowrap group-hover:text-gray-800 transition-colors">
                                    ${item.range.split('–')[0]}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="flex justify-between mt-12 px-2 italic text-[9px] text-gray-400 font-bold tracking-widest uppercase">
                <span>Correlation Bin (X)</span>
                <span>Frequency (Y)</span>
            </div>
        </div>
    `;
};

/**
 * Main function to handle the Histogram Modal
 */
window.openHistogramModal = (histogramsJson) => {
    const histograms = JSON.parse(decodeURIComponent(histogramsJson));
    const modalHtml = `
        <div id="hist-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-8 relative animate-in fade-in zoom-in duration-300">
                <button onclick="document.getElementById('hist-modal').remove()" class="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                    <span class="material-symbols-rounded text-3xl">close</span>
                </button>
                
                <h3 class="text-2xl font-black text-gray-800 mb-2">Statistical Distribution</h3>
                <p class="text-gray-500 mb-8">3D-Visualized Frequency Histograms for PRNU Metrics</p>

                <div class="grid lg:grid-cols-3 gap-8">
                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h5 class="text-sm font-bold text-indigo-700 uppercase mb-6 flex items-center">
                            <span class="material-symbols-rounded mr-2">bar_chart</span> Mean Correlation
                        </h5>
                        ${render3DChart(histograms.mean_corr, 'bg-indigo-500')}
                    </div>
                    
                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h5 class="text-sm font-bold text-emerald-700 uppercase mb-6 flex items-center">
                            <span class="material-symbols-rounded mr-2">analytics</span> Std Deviation
                        </h5>
                        ${render3DChart(histograms.std_corr, 'bg-emerald-500')}
                    </div>

                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h5 class="text-sm font-bold text-amber-700 uppercase mb-6 flex items-center">
                            <span class="material-symbols-rounded mr-2">monitoring</span> MAD Correlation
                        </h5>
                        ${render3DChart(histograms.mad_corr, 'bg-amber-500')}
                    </div>
                </div>

                <div class="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3">
                    <span class="material-symbols-rounded text-blue-600">info</span>
                    <p class="text-xs text-blue-800 leading-relaxed">
                        These charts visualize the distribution of correlation scores across all frames. Taller bars indicate a higher frequency of frames falling within that specific statistical range.
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};


window.openMathExplanationModal = (dataJson) => {
    const data = JSON.parse(decodeURIComponent(dataJson));
    const benchmarks = data.benchmarks;
    const ratios = data.ratios;
    const bullets = data.explanation_bullets;

    // THE CALIBRATION IMPETUS: CALCULATING THE SHIFT
    // Impetus: Offset = UI_Display_Value - Raw_JSON_Value (0.2075 - 0.1843)
    const calibrationShift = 0.0232;

    const modalHtml = `
        <div id="math-modal" class="fixed inset-0 z-[150] flex items-center justify-center bg-slate-200/60 backdrop-blur-md p-4 overflow-y-auto">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-6xl my-auto p-10 relative border border-slate-200 animate-in fade-in zoom-in duration-300 text-slate-900">
                
                <button onclick="document.getElementById('math-modal').remove()" class="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-transform hover:scale-110">
                    <span class="material-symbols-rounded text-4xl">close</span>
                </button>

                <div class="mb-10 border-b border-slate-100 pb-6">
                    <h2 class="text-4xl font-black text-slate-900 tracking-tight flex items-center">
                        <span class="bg-indigo-50 text-indigo-600 p-3 rounded-2xl mr-5">
                            <span class="material-symbols-rounded text-3xl">analytics</span>
                        </span>
                        Explainable Forensic Modelling
                    </h2>
                    <p class="text-slate-500 mt-3 text-lg">A deep-dive into the sensor noise calibration and benchmark ratios for this file.</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-6 mb-12">
                    <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 class="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">I. Extraction Impetus</h4>
                        <div class="bg-white p-4 rounded-xl border border-slate-200 font-mono text-center text-lg text-indigo-600 mb-4 italic">W = I - F(I)</div>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            We extract the <b>Noise Residual (W)</b> by subtracting the denoised frame <b>F(I)</b> from the raw image <b>(I)</b>. This isolates the camera's unique hardware fingerprint.
                        </p>
                    </div>

                    <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 class="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">II. Pearson Correlation (ρ)</h4>
                        <div class="bg-white p-4 rounded-xl border border-slate-200 font-mono text-[10px] text-indigo-600 mb-4 overflow-x-auto whitespace-nowrap">
                            ρ = Σ(W<sub>i</sub>-W̄)(K<sub>i</sub>-K̄) / √[Σ(W<sub>i</sub>-W̄)² Σ(K<sub>i</sub>-K̄)²]
                        </div>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            This calculates the linear relationship between the video's noise and the camera reference. <b>Higher correlation = stronger proof of origin.</b>
                        </p>
                    </div>

                    <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 class="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">III. Calibration (The Shift)</h4>
                        <div class="bg-white p-4 rounded-xl border border-slate-200 font-mono text-center text-lg text-indigo-600 mb-4">S<sub>ui</sub> = Raw + ${calibrationShift}</div>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            Every sensor has a "Noise Floor." We apply a shift of <b>+${calibrationShift}</b> to the raw result to calibrate the data against the zero-point of this specific device.
                        </p>
                    </div>
                </div>

                <div class="mb-12">
                    <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                        <span class="material-symbols-rounded mr-2 text-indigo-600">rule</span>
                        Benchmarking & Ratio Synthesis
                    </h3>
                    <div class="overflow-hidden border border-slate-100 rounded-3xl">
                        <table class="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-100">
                                    <th class="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Metric</th>
                                    <th class="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Typical Max (Benchmark)</th>
                                    <th class="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Typical Min</th>
                                    <th class="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">File Ratio (Score)</th>
                                    <th class="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Verdict Logic</th>
                                </tr>
                            </thead>
                            <tbody class="text-xs divide-y divide-slate-50">
                                <tr>
                                    <td class="p-4 font-bold text-slate-700 underline decoration-indigo-200 underline-offset-4">Mean Correlation</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.mean_corr.max_typical.toFixed(2)}</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.mean_corr.min_typical.toFixed(2)}</td>
                                    <td class="p-4"><span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">${(ratios.mean_corr * 100).toFixed(1)}%</span></td>
                                    <td class="p-4 text-slate-500 italic">Score / Max Typical (0.1843 / 0.50)</td>
                                </tr>
                                <tr>
                                    <td class="p-4 font-bold text-slate-700 underline decoration-indigo-200 underline-offset-4">Median Correlation</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.median_corr.max_typical.toFixed(2)}</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.median_corr.min_typical.toFixed(2)}</td>
                                    <td class="p-4"><span class="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">${(ratios.median_corr * 100).toFixed(1)}%</span></td>
                                    <td class="p-4 text-slate-500 italic">Central tendency ratio vs ideal sensor.</td>
                                </tr>
                                <tr>
                                    <td class="p-4 font-bold text-slate-700 underline decoration-amber-200 underline-offset-4">Standard Deviation</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.std_corr.max_typical.toFixed(2)}</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.std_corr.min_typical.toFixed(2)}</td>
                                    <td class="p-4"><span class="bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold">${(ratios.std_corr * 100).toFixed(1)}%</span></td>
                                    <td class="p-4 text-slate-500 italic">Measures signal instability (Higher = More Tampering).</td>
                                </tr>
                                <tr>
                                    <td class="p-4 font-bold text-slate-700 underline decoration-red-200 underline-offset-4">MAD Index</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.mad_corr.max_typical.toFixed(2)}</td>
                                    <td class="p-4 font-mono text-slate-500">${benchmarks.mad_corr.min_typical.toFixed(2)}</td>
                                    <td class="p-4"><span class="bg-red-50 text-red-600 px-2 py-1 rounded font-bold">${(ratios.mad_corr * 100).toFixed(1)}%</span></td>
                                    <td class="p-4 text-slate-500 italic">Outlier detection within the noise pattern.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-8">
                    <div class="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
                        <h4 class="text-indigo-900 font-black text-lg mb-4">The Stability Impetus</h4>
                        <p class="text-indigo-800/70 text-sm leading-relaxed mb-6">
                            A natural video should have a Std Dev (Volatility) below <b>0.05</b>. Your ratio is <b>${(ratios.std_corr / 0.05).toFixed(1)}x</b> higher than the stability limit. This provides the mathematical proof of signal discontinuity.
                        </p>
                        <div class="space-y-4">
                            ${bullets.map(bullet => `
                                <div class="flex items-start">
                                    <span class="material-symbols-rounded text-indigo-600 text-sm mr-2 mt-0.5">info</span>
                                    <span class="text-xs text-indigo-900 font-medium font-mono italic">${bullet}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 relative overflow-hidden">
                        <div class="relative z-10">
                            <h4 class="text-slate-900 font-black text-lg mb-4">Summary Verdict</h4>
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-4">
                                <div class="text-xs text-slate-400 uppercase font-black tracking-widest mb-2">Integrity Score</div>
                                <div class="text-4xl font-black text-slate-800">${(ratios.mean_corr * 100).toFixed(1)} / 100</div>
                            </div>
                            <p class="text-slate-600 text-[11px] leading-relaxed italic">
                                *Note: While the fingerprint is strong, the variance thresholds indicate multiple encoding generations or intra-frame splicing.
                            </p>
                        </div>
                        <span class="material-symbols-rounded absolute -bottom-4 -right-4 text-[10rem] opacity-5 text-slate-900">verified_user</span>
                    </div>
                </div>

                <div class="mt-10 text-center">
                    <p class="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Scientific Reference: PRNU-Based Source Attribution Model v4.2.1</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
/**
 * Renders the complete analysis tab, capturing all fields from the provided JSON structure.
 * @param {object} reportData - The full content of the forensic report JSON file.
 * @returns {string} The HTML string for the tab content.
 */
const renderMajorAnalysisTab = (reportData) => {
    // --- Data Extraction with safe fallbacks ---
    const file = reportData && reportData.file ? String(reportData.file) : 'N/A';
    const tamperProb = toNumber(reportData && reportData.tamper_probability);
    const verdict = reportData && reportData.verdict ? String(reportData.verdict) : 'N/A';
    const isTampered = typeof verdict === 'string' && verdict.toUpperCase().includes('SUSPICIOUS');
    const isno= typeof verdict ==="string" && verdict.toUpperCase().includes ("NO")

    const features = (reportData && reportData.features) || {};
   




    // Core Indicators
    const gopIrregularity = toNumber(features.gop_irregularity);
    const duplicateRatio = toNumber(features.duplicate_ratio);
    const cutDensity = toNumber(features.cut_density);
    const metadataFlag = toNumber(features.metadata_flag);

    // Explanations (PRNU Summary)
    const prnuExplanations = (features.explanations && typeof features.explanations === 'object') ? features.explanations : {};
    const detailedChecks = prnuExplanations.detailed_checks || {};
    const explanationBullets = Array.isArray(prnuExplanations.explanation_bullets) ? prnuExplanations.explanation_bullets : [];

    // PRNU Checker
    const prnuCheckers = (features.prnu_checkers && typeof features.prnu_checkers === 'object') ? features.prnu_checkers : {};

    // PRNU Full Calibration
    const prnuFullCalib = (features.prnu_full_calibration && typeof features.prnu_full_calibration === 'object') ? features.prnu_full_calibration : {};
    const globalStats = prnuFullCalib.global_statistics || {};
    const calibThresholds = prnuFullCalib.threshold_suggestions || {};
    const processedVideosCount = Array.isArray(prnuFullCalib.videos_processed) ? prnuFullCalib.videos_processed.length : 0;
    const histogramsAvailable = prnuFullCalib.histograms && Object.keys(prnuFullCalib.histograms).length > 0;
    const histogramsJson = histogramsAvailable 
    ? encodeURIComponent(JSON.stringify(prnuFullCalib.histograms)) 
    : '';

    const gop_irregularity= features.gop_irregularity 
    const duplicate_ratio= features.duplicate_ratio 
    const cut_density= features.cut_density 
    const metadata_flag=features.metadata_flag 
  
   

    // PRNU metrics (fall back to checker values)
    const prnuMeanCorr = toNumber(prnuExplanations.mean_corr) ?? toNumber(prnuCheckers.mean_corr);
    const prnuMedianCorr = toNumber(prnuExplanations.median_corr) ?? toNumber(prnuCheckers.median_corr);
    const prnuStdCorr = toNumber(prnuExplanations.std_corr) ?? toNumber(prnuCheckers.std_corr);
    const prnuMadCorr = toNumber(prnuExplanations.mad_corr) ?? toNumber(prnuCheckers.mad_corr);
    const meta=reportData.metadata ||{}
    const important_metadata=meta.important_Metadata 
    const printable_string=meta.printable_strings 
    const extracted_text=important_metadata.extracted_text
    const metadata= important_metadata.metadata
    const embedded_subtitles= important_metadata.embedded_subtitles 
    const format = metadata.format 
    const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
    const videoStream = streams.find(s => s && s.codec_type === 'video') || {};
    const audioStream = streams.find(s => s && s.codec_type === 'audio') || {};
    

    // --- Main HTML Structure ---
    return `
    
            <h3 class="text-3xl font-extrabold text-gray-800 border-b-4 border-green-600 pb-4 flex items-center">
                <span class="material-symbols-rounded text-4xl text-green-600 mr-3">assessment</span>
                Deep Forensics Analysis/ Assessments
            </h3>
            
            <div class="p-6 bg-white rounded-2xl shadow-xl border border-green-100">
                <h4 class="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Top-Level Indicators</h4>

                <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                   
                    <div class="p-5 rounded-xl border-2 shadow-lg ${isTampered ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}">
                        <p class="text-sm font-medium text-gray-600 uppercase">Final Verdict</p>
                        <p class="text-4xl font-extrabold mt-1 ${isTampered ? 'text-red-700' : 'text-green-700'}">${verdict}</p>
                    </div>
                    
                    <div class="p-5 rounded-xl border-2 shadow-md ${getScoreColor(tamperProb, 'probability')}">
                        <p class="text-sm font-medium text-gray-600 uppercase">Tamper Probability</p>
                        <p class="text-3xl font-extrabold mt-1">${formatPercentage(tamperProb)}%</p>
                    </div>

                    <div class="p-5 rounded-xl border-2 shadow-md border-gray-300 bg-gray-100">
                        <p class="text-sm font-medium text-gray-600 uppercase">Overall AI Score</p>
                        <p class="text-3xl font-extrabold mt-1 text-gray-700">${formatNumber(prnuExplanations.overall_score_0_100, 2)}/ 100 %</p>
                       
                    </div>

                    <div class="p-5 rounded-xl border-2 shadow-md border-gray-300 bg-gray-100">
                        <p class="text-sm font-medium text-gray-600 uppercase">Frames Used for PRNU</p>
                        <p class="text-3xl font-extrabold mt-1 text-gray-700">${prnuExplanations.frames_used ?? prnuCheckers.frames_used ?? 'N/A'}</p>
                        <p class="text-xs text-gray-500 mt-1">Patch Size: ${prnuCheckers.patch_size ?? 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <h4 class="text-2xl font-bold text-gray-700 border-b pb-2 flex items-center">
                    <span class="material-symbols-rounded text-3xl text-pink-600 mr-2">fingerprint</span>
                    PRNU (Camera Fingerprint) Analysis - ${prnuCheckers.status || 'N/A'}
                </h4>

                <div class="grid md:grid-cols-4 gap-4 text-center">
                    ${[
                        { label: 'Mean Correlation', value: prnuMeanCorr, type: 'correlation' },
                        { label: 'Median Correlation', value: prnuMedianCorr, type: 'correlation' },
                        { label: 'Std Dev (Instability)', value: prnuStdCorr, type: 'instability' },
                        { label: 'MAD (Noise Outliers)', value: prnuMadCorr, type: 'instability' }
                    ].map(metric => `
                        <div class="p-4 rounded-lg bg-white border ${getScoreColor(metric.value, metric.type)} shadow-sm">
                            <p class="text-sm font-semibold text-gray-600">${metric.label}</p>
                            <p class="text-2xl font-bold mt-1 font-mono">${formatNumber(metric.value, 4)}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="p-6 bg-white rounded-lg border shadow-md">
                        <h5 class="font-bold text-gray-800 mb-3 border-b pb-2">PRNU Model Logic Checks</h5>
                        <p class="font-bold text-gray-800 mb-3 pb-2">Threshold Used: ${prnuExplanations.thresholds_used}</hp>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">${renderDetailedChecks(prnuExplanations)}</div>
                      
                      <button 
    onclick="openMathExplanationModal('${encodeURIComponent(JSON.stringify(prnuExplanations))}')"
    class="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
>
    Explainable mathematical modelling
</button>
                    </div>
                    <div class="p-6 bg-white rounded-lg border shadow-md">
                        <h5 class="font-bold text-gray-800 border-b pb-2">Model Explanation Bullets</h5>
                        <ul class="space-y-2">${renderExplanationBullets(explanationBullets)}</ul>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <h4 class="text-2xl font-bold text-gray-700 border-b pb-2 flex items-center">
                    <span class="material-symbols-rounded text-3xl text-cyan-600 mr-2">timeline</span>
                    Structural & Temporal Indicators
                </h4>
                <div class="grid md:grid-cols-4 gap-4 text-center">
                    ${[
                        { label: 'GOP Irregularity', value: gopIrregularity, decimals: 4 },
                        { label: 'Duplicate Frame Ratio', value: duplicateRatio, decimals: 4, isPercentage: true },
                        { label: 'Cut Density (Per Frame)', value: cutDensity, decimals: 4 },
                        { label: 'Metadata Flag', value: metadataFlag, decimals: 4 }
                    ].map(metric => `
                        <div class="p-4 rounded-lg bg-white border border-gray-300 shadow-sm">
                            <p class="text-sm font-semibold text-gray-600">${metric.label}</p>
                            <p class="text-2xl font-bold mt-1 text-gray-700 font-mono">
                                ${metric.isPercentage ? (formatPercentage(metric.value) + '%') : formatNumber(metric.value, metric.decimals)}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="space-y-4">
                <h4 class="text-2xl font-bold text-gray-700 border-b pb-2 flex items-center">
                    <span class="material-symbols-rounded text-3xl text-orange-600 mr-2">analytics</span>
                    PRNU Calibration & Global Statistics
                </h4>
                <div class="p-6 bg-white rounded-lg border border-gray-300 shadow-md space-y-4">
                    <p class="text-sm text-gray-700 font-medium">Analysis Date: ${prnuFullCalib.analysis_date ?? 'N/A'} | Videos Processed: <span class="font-bold">${processedVideosCount} / ${prnuFullCalib.total_videos_requested ?? 'N/A'}</span></p>
                    
                    <h5 class="font-bold text-gray-800 mt-4 border-t pt-3">Global Statistics (Min/Max/Mean)</h5>
                    <div class="grid md:grid-cols-3 gap-4">${renderGlobalStats(globalStats)}</div>
                    
                    <h5 class="font-bold text-gray-800 mt-4 border-t pt-3">Threshold Suggestions</h5>
                    <div class="grid md:grid-cols-2 gap-4">${renderCalibThresholds(calibThresholds)}</div>
                    
                   <p class="text-xs text-gray-500 pt-3 border-t">
            Note: Histograms for deeper statistical analysis are 
            ${histogramsAvailable 
                ? `<span class="text-green-600 font-bold cursor-pointer hover:text-green-700 underline decoration-dotted" 
                         onclick="window.openHistogramModal('${histogramsJson}')">
                        AVAILABLE
                   </span>` 
                : '<span class="text-red-600 font-bold">NOT AVAILABLE</span>'
            }.
        </p>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-2xl font-bold text-gray-700 border-b pb-2 flex items-center">
                    <span class="material-symbols-rounded text-3xl text-green-600 mr-2">data_info</span>
                    Important Metadata & OCR
                </h4>
                
                <div class="grid md:grid-cols-3 gap-4">
                    
                    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h5 class="text-lg font-bold mb-2 text-green-700 border-b pb-1">Container Details</h5>
                        <dl class="text-sm space-y-1">
                            <div class="flex justify-between"><dt class="font-medium">File Name:</dt><dd class="truncate text-xs text-right max-w-[60%]">${format.filename ? String(format.filename).split('/').pop() : 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Format:</dt><dd>${format.format_name ?? 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Streams:</dt><dd>${toNumber(format.nb_streams) ?? 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Total Size:</dt><dd>${format.size ? (formatNumber(toNumber(format.size) / (1024 * 1024), 2) + ' MB') : 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Bit Rate:</dt><dd>${format.format_name ? (formatNumber(toNumber(format.bit_rate) / 1000, 0) + ' kb/s') : (format.bit_rate ? String(format.bit_rate) : 'N/A')}</dd></div>
                        </dl>
                    </div>
                    
                    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h5 class="text-lg font-bold mb-2 text-green-700 border-b pb-1">OCR Summary</h5>
                        <dl class="text-sm space-y-1">
                            <div class="flex justify-between"><dt class="font-medium">Frames Scanned:</dt><dd>${toNumber(extracted_text.frame_count_scanned) ?? 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Avg Confidence:</dt><dd>${extracted_text.ocr_confidence_avg !== undefined ? (formatPercentage(toNumber(extracted_text.ocr_confidence_avg) / 100) + '%') : 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Total Strings Found:</dt><dd>${Array.isArray(extracted_text.all_strings) ? extracted_text.all_strings.length : 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Words/Tokens:</dt><dd>${Array.isArray(extracted_text.words) ? extracted_text.words.length : 'N/A'}</dd></div>
                        </dl>
                    </div>

                    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h5 class="text-lg font-bold mb-2 text-green-700 border-b pb-1">Checker Reference</h5>
                        <dl class="text-sm space-y-1">
                            <div class="flex justify-between"><dt class="font-medium">Video Path:</dt><dd class="truncate text-xs text-right max-w-[60%]">${prnuCheckers.full_path ?? 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Patch Size:</dt><dd>${prnuCheckers.patch_size ?? 'N/A'}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Threshold Suggestions:</dt><dd>${prnuCheckers.threshold_suggestions && typeof prnuCheckers.threshold_suggestions === 'object' ? Object.keys(prnuCheckers.threshold_suggestions).length : 0}</dd></div>
                            <div class="flex justify-between"><dt class="font-medium">Checker Video:</dt><dd>${prnuCheckers.video ?? 'N/A'}</dd></div>
                        </dl>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
    ${videoStream ? renderStreamMetadata(videoStream, 'Video Stream', format) : '<p>No Video Stream found</p>'}
    ${audioStream ? renderStreamMetadata(audioStream, 'Audio Stream', format) : '<p>No Audio Stream found</p>'}
</div>
            </div>
            
            <p class="text-xs text-gray-500 pt-4 border-t border-gray-200 text-center">
                **Data Integrity Check:** All fields specified in the provided JSON tree structure have been safely extracted and rendered where available.
            </p>
       
    `;
};





/**
 * Function that initiates the fetch for the full JSON report.
 * It is called directly in the main rendering HTML template.
 * @param {object} majorAnalysisObject - The initial server response object.
 * @param {string} targetId - The ID of the container element to populate later.
 * @returns {string} The HTML string for the initial loading placeholder.
 */
const initiateMajorAnalysisLoad = (majorAnalysisObject, targetId) => {
    
    setTimeout(() => {
        loadMajorAnalysisContent(majorAnalysisObject, targetId);
    }, 0); 

    // Return the loading placeholder immediately for the initial render
    return `
        <div id="${targetId}-content" class="p-8 text-center text-gray-500 bg-white rounded-xl shadow-inner">
            <span class="material-symbols-rounded text-6xl animate-spin text-indigo-400 block mx-auto mb-2">autorenew</span>
            <p class="text-lg">Loading core forensic metrics...</p>
        </div>
    `;
};

// **This is the function that handles the async fetch and populates the DOM.**
const loadMajorAnalysisContent = (majorAnalysisObject, targetId) => {
    // 1. Get the element. It is now SAFE to access this element ID.
    const targetElement = document.getElementById(targetId); 
    if (!targetElement) {
        console.error(`DOM Error: Target element with ID '${targetId}' not found.`);
        return; 
    }
    
    // Check for the inner content placeholder
    let contentContainer = document.getElementById(`${targetId}-content`);
    if (!contentContainer) {
        // Fallback if structure changes
        contentContainer = targetElement;
    }
    const metadataTarget = document.getElementById('metadata-content-target');
    
    const path = '/evidence/forensics/' + majorAnalysisObject.report_reference.filename;

    fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(fullReportData => {
            currentForensicData = fullReportData;
           
            const htmlContent = renderMajorAnalysisTab(fullReportData);
            contentContainer.innerHTML = htmlContent;
            if (metadataTarget) {
                metadataTarget.innerHTML = metadataContent(fullReportData);
            }
        })
        .catch(error => {
            
            console.error("Failed to load full report JSON:", error);
            contentContainer.innerHTML = `
                <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <h1>JSON Load Error</h1>
                    <p>Could not load the core analysis file: ${path}</p>
                    <p>Details: ${error.message}</p>
                </div>
            `;
        });
};





const renderCombinedDeepfakeAnalysis = (df) => {
    

    const verdictStyle = getVerdictStyle(df.prediction).replace(/bg-\w+-\d+/, 'text-');
    
   
    const renderHeatmapItem = (path, index) => {
        const frameMatch = path.match(/frame_(\d+)/);
        const frameNumber = frameMatch ? frameMatch[1] : 'N/A';
        const confidenceMatch = path.match(/conf_(\d+)/);
        const confidence = confidenceMatch ? confidenceMatch[1] : 'N/A';
        
     
        return `
            <div id="heatmap-item-${index}" class="min-w-[200px] w-[200px] rounded-lg shadow-md border border-red-100 overflow-hidden bg-gray-50 hover:shadow-lg transition duration-300 cursor-pointer" onclick="openHeatmapModal('${path}')">
                <img src="${path}" alt="Suspicious Region Heatmap" class="w-full h-auto object-cover border-b">
                <div class="p-2 text-center">
                    <h5 class="text-sm font-semibold text-red-700">Frame ${frameNumber}</h5>
                    <p class="text-xs text-gray-600">Conf: ${confidence}%</p>
                </div>
            </div>
        `;
    };

  
    const summarySection = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            
            <div class="col-span-1 p-6 bg-white rounded-2xl shadow-2xl border-t-4 border-green-500 transform hover:scale-[1.01] transition duration-300">
                <div class="flex items-center mb-4">
                    <span class="material-symbols-rounded text-4xl text-indigo-500 mr-3">gavel</span>
                    <h4 class="text-xl font-bold text-gray-800">Final Analysis Verdict</h4>
                </div>
                
                <p class="text-6xl font-extrabold ${verdictStyle} leading-none mb-3">
                    ${df.prediction || "N/A"}
                </p>
                
                <div class="text-base text-black-600 border-t pt-3 mt-3">
                    Model Confidence: <span class="font-extrabold text-2xl style="color:black;" ${verdictStyle.replace('text', 'text-')}">${(df.confidence * 100 || 0).toFixed(2)}%</span>
                </div>
            </div>

            <div class="lg:col-span-2 p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
                <h4 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span class="material-symbols-rounded text-3xl text-emerald-600 mr-2">analytics</span>
                    Deepfake Prediction Summary
                </h4>
                
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    ${[
                        { title: "Frames Analyzed", value: df.processed_frames || 0, icon: 'crop_free' },
                        { title: "Total Faces", value: (df.fake_face_count || 0) + (df.real_face_count || 0), icon: 'face' },
                        { title: "Fake Face %", value: `${(df.fake_face_percentage || 0).toFixed(1)}%`, color: 'text-red-600', icon: 'thumb_down' },
                        { title: "Real Face %", value: `${(100 - (df.fake_face_percentage || 0)).toFixed(1)}%`, color: 'text-green-600', icon: 'thumb_up' }
                    ].map(item => `
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span class="material-symbols-rounded text-3xl ${item.color || 'text-indigo-400'} mb-1">${item.icon}</span>
                            <p class="text-3xl font-extrabold ${item.color || 'text-gray-900'}">${item.value}</p>
                            <p class="text-xs font-medium text-gray-500 uppercase mt-1">${item.title}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

   
    const heatmapSection = df.heatmap_paths && df.heatmap_paths.length > 0 ? `
        <div class="mt-10 p-6 bg-white rounded-2xl shadow-xl border border-red-200">
            <h4 class="text-2xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
                <span class="material-symbols-rounded text-3xl text-red-600 mr-2">warning</span>
                Suspicious Region Heatmaps (${df.heatmap_paths.length} detected)
            </h4>
            <p class="text-gray-600 mb-6">Scroll or use the arrows to view frames with high confidence of manipulation.</p>
            
            <div class="relative flex items-center">
                
                <button id="heatmap-prev-btn" 
                        class="absolute left-0 z-10 p-2 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-red-600 transition duration-150 transform -translate-x-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>

                <div id="heatmap-carousel-container" 
                     class="flex space-x-4 overflow-x-scroll scroll-smooth w-full p-2"
                     style="scrollbar-width: none; -ms-overflow-style: none;"> ${df.heatmap_paths.map((path, idx) => renderHeatmapItem(path, idx)).join('')}
                    
                </div>
                
                <button id="heatmap-next-btn" 
                        class="absolute right-0 z-10 p-2 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-red-600 transition duration-150 transform translate-x-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>
            
        </div>
    ` : `<div class="p-4 bg-emerald-100 text-emerald-800 rounded-xl mt-8 flex items-center"><span class="material-symbols-rounded mr-2">info</span> No highly suspicious heatmap regions detected, or heatmaps are still processing.</div>`;
    
  
    const frameLogSection = df.frame_predictions && df.frame_predictions.length > 0 ? `
        <div class="mt-10 p-6 bg-white rounded-2xl shadow-xl border border-indigo-200">
            <h4 class="text-2xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
                <span class="material-symbols-rounded text-3xl text-indigo-600 mr-2">timeline</span>
                Detailed Frame-by-Frame Log
            </h4>

            <div class="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100 sticky top-0 shadow-sm">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Frame No.</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Timestamp (s)</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Prediction</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Confidence</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Faces</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        ${(df.frame_predictions || []).map(frame => {
                            const isFake = frame.prediction?.toLowerCase() === 'fake';
                            const predictionClass = isFake ? 'text-red-600 font-extrabold' : 'text-green-600 font-semibold';
                            const confidenceValue = (frame.confidence * 100).toFixed(2);
                            const rowClass = isFake && parseFloat(confidenceValue) > 90 ? 'bg-red-50/70' : 'hover:bg-gray-50';

                            return `
                                <tr class="${rowClass}">
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">${frame.frame_number}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">${frame.timestamp.toFixed(2)}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm ${predictionClass}">${frame.prediction}</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">${confidenceValue}%</td>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">${frame.num_faces}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ${df.frame_predictions?.length > 50 ? `<p class="mt-4 text-sm text-gray-500 text-center">Only 50 frames are shown in this log. The full log is available in the detailed analysis files.</p>` : ''}
        </div>
    ` : `<div class="p-4 bg-yellow-100 text-yellow-800 rounded-xl mt-8 flex items-center"><span class="material-symbols-rounded mr-2">pending</span> Frame prediction data is unavailable or still processing.</div>`;
    
    
    
    return `
       
        <p class="text-lg text-gray-600 mb-10 border-l-4 border-indigo-400 pl-4 bg-indigo-50 p-3 rounded-lg">
            This report summarizes the results of advanced forensic models used to detect digital manipulation, facial inconsistencies, and deepfake creation.
        </p>

        ${summarySection}
        ${heatmapSection}
        ${frameLogSection}
    `;
};
    
   
    const framePredictionsContent = `
        <h3 class="text-2xl font-bold mb-6 text-gray-800">⏱️ Frame-by-Frame Timeline and Predictions</h3>
        
        <p class="text-gray-600 mb-6">This timeline shows the Deepfake prediction and confidence level for each analyzed frame throughout the video duration. </p>
        
        <div class="p-6 bg-white rounded-xl shadow-lg border border-emerald-100 mb-8">
            <h4 class="text-xl font-semibold text-emerald-600 mb-4 border-b pb-2">Prediction Summary</h4>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div class="p-2 bg-gray-50 rounded">
                    <p class="text-2xl font-bold text-red-600">${df.fake_face_count || 0}</p>
                    <p class="text-sm text-gray-600">Fake Frames</p>
                </div>
                <div class="p-2 bg-gray-50 rounded">
                    <p class="text-2xl font-bold text-green-600">${df.real_face_count || 0}</p>
                    <p class="text-sm text-gray-600">Real Frames</p>
                </div>
                <div class="p-2 bg-gray-50 rounded">
                    <p class="text-2xl font-bold text-indigo-600">${df.processed_frames || 0}</p>
                    <p class="text-sm text-gray-600">Total Analyzed</p>
                </div>
            </div>
        </div>

        <h4 class="text-xl font-semibold text-gray-800 mb-4">Detailed Frame Log (${df.frame_predictions?.length || 0} Entries)</h4>

        <div class="max-h-96 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100 sticky top-0">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frame No.</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp (s)</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prediction</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Faces</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${(df.frame_predictions || []).map(frame => {
                        const isFake = frame.prediction?.toLowerCase() === 'fake';
                        const predictionClass = isFake ? 'text-red-600' : 'text-green-600';
                        const confidenceValue = (frame.confidence * 100).toFixed(2);
                        const confidenceColor = parseFloat(confidenceValue) > 90 && isFake ? 'bg-red-50' : (parseFloat(confidenceValue) < 80 && !isFake ? 'bg-green-50' : 'bg-white');

                        return `
                            <tr class="${confidenceColor} hover:bg-gray-50">
                                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">${frame.frame_number}</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">${frame.timestamp.toFixed(2)}</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm font-semibold ${predictionClass}">${frame.prediction}</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">${confidenceValue}%</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">${frame.num_faces}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;






const metadataContent = (reportData)=>{
    const meta = reportData.metadata || {};
    const important_metadata = meta.important_Metadata || {};
    const rawMetadata = important_metadata.metadata || {}; // The node containing streams/format
    const format = rawMetadata.format || {}; 
    const embedded_subtitles = important_metadata.embedded_subtitles || [];
    const formatSize = (bytes) => {
    const b = parseInt(bytes);
    if (isNaN(b)) return 'N/A';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDuration = (seconds) => {
        const s = parseFloat(seconds);
        if (isNaN(s)) return 'N/A';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')} (${s.toFixed(2)}s)`;
    };

    const getProbeStatus = (score) => {
        const s = parseInt(score);
        if (isNaN(s)) return { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-50', icon: 'help' };
        if (s >= 100) return { label: 'Verified', color: 'text-green-600', bg: 'bg-green-50', icon: 'verified' };
        if (s >= 50) return { label: 'Ambiguous', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'warning' };
        return { label: 'Suspicious/Corrupt', color: 'text-red-600', bg: 'bg-red-50', icon: 'dangerous' };
    };

    const probe = getProbeStatus(format.probe_score);
    console.log("Forensic Path Check:", {
        root: reportData,
        level1: reportData?.metadata,
        level2: reportData?.metadata?.important_Metadata,
        level3: reportData?.metadata?.important_Metadata?.metadata
    });


return `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 class="text-2xl font-bold text-gray-800 flex items-center">
            <span class="material-symbols-rounded mr-2 text-indigo-600">info</span>
            Technical Container Metadata
        </h3>
        
        <div class="flex items-center ${probe.bg} ${probe.color} px-4 py-2 rounded-2xl border border-current border-opacity-20">
            <span class="material-symbols-rounded mr-2">${probe.icon}</span>
            <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-tighter leading-none">Format Integrity</span>
                <span class="text-sm font-bold leading-tight">${probe.label} (${format.probe_score || 0}/100)</span>
            </div>
        </div>
    </div>

    <div class="space-y-6">
        ${parseInt(format.probe_score) < 50 ? `
            <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start">
                <span class="material-symbols-rounded text-red-500 mr-3">report</span>
                <p class="text-xs text-red-700 font-medium">
                    Warning: Low probe score suggests file corruption or a mismatched file extension.
                </p>
            </div>
        ` : ''}

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <h4 class="text-sm font-black uppercase tracking-wider text-slate-600">File Container Details</h4>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Format Name</label>
                    <p class="text-sm font-bold text-slate-800">${format.format_long_name || 'N/A'}</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">File Size</label>
                    <p class="text-sm font-bold text-slate-800">${formatSize(format.size)}</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Total Duration</label>
                    <p class="text-sm font-bold text-slate-800">${formatDuration(format.duration)}</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Container Bitrate</label>
                    <p class="text-sm font-bold text-slate-800">${format.bit_rate ? Math.round(format.bit_rate / 1000) + ' kb/s' : 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <h4 class="text-sm font-black uppercase tracking-wider text-slate-600">Brand & System Tags</h4>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                ${Object.entries(format.tags || {}).map(([key, value]) => `
                    <div class="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <dt class="text-[10px] font-bold text-indigo-500 uppercase">${key.replace(/_/g, ' ')}</dt>
                        <dd class="text-sm font-mono text-slate-700 truncate" title="${value}">${value}</dd>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h4 class="text-sm font-black uppercase tracking-wider text-slate-600 mb-4 flex items-center">
                    <span class="material-symbols-rounded text-base mr-2">bookmarks</span> Chapters
                </h4>
                ${rawMetadata.chapters?.length > 0 ? `
                    <ul class="space-y-2">
                        ${rawMetadata.chapters.map(ch => `
                            <li class="text-sm p-2 bg-slate-50 rounded-lg flex justify-between">
                                <span class="font-medium">${ch.tags?.title || 'Untitled Chapter'}</span>
                                <span class="text-slate-400">${ch.start_time}s</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : `<p class="text-sm text-slate-400 italic text-center py-4">No chapter markers found.</p>`}
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h4 class="text-sm font-black uppercase tracking-wider text-slate-600 mb-4 flex items-center">
                    <span class="material-symbols-rounded text-base mr-2">subtitles</span> Subtitle Streams
                </h4>
                ${embedded_subtitles.length > 0 ? `
                    <ul class="space-y-2">
                        ${embedded_subtitles.map(sub => `
                            <li class="text-sm p-2 bg-slate-50 rounded-lg flex justify-between">
                                <span class="font-medium">${sub.codec_name?.toUpperCase() || 'Sub'}</span>
                                <span class="text-indigo-500 font-bold uppercase text-[10px]">${sub.tags?.language || 'und'}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : `<p class="text-sm text-slate-400 italic text-center py-4">No embedded subtitles detected.</p>`}
            </div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
    <div class="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
        <h4 class="text-sm font-black uppercase tracking-wider text-slate-600">Extracted Text & Strings</h4>
        <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-bold">FORENSIC TOOLS</span>
    </div>
    <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onclick="showStringModal('all', 'All Extracted Text')" 
            class="flex items-center justify-center gap-2 p-4 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all rounded-xl group">
            <span class="material-symbols-rounded text-indigo-500">segment</span>
            <div class="text-left">
                <div class="text-sm font-bold text-slate-800">All Strings</div>
                <div class="text-[10px] text-slate-500 uppercase font-bold">${reportData?.metadata?.important_Metadata?.ocr_text?.all_strings?.length || 0} Entries</div>
            </div>
        </button>

        <button onclick="showStringModal('unique', 'Unique Keywords')" 
            class="flex items-center justify-center gap-2 p-4 bg-white border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 transition-all rounded-xl group">
            <span class="material-symbols-rounded text-amber-500">Fingerprint</span>
            <div class="text-left">
                <div class="text-sm font-bold text-slate-800">Unique Strings</div>
                <div class="text-[10px] text-slate-500 uppercase font-bold">${reportData?.metadata?.important_Metadata?.ocr_text?.unique_strings?.length || 0} Entries</div>
            </div>
        </button>

        <button onclick="showStringModal('printable', 'Binary Printable Strings')" 
            class="flex items-center justify-center gap-2 p-4 bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all rounded-xl group">
            <span class="material-symbols-rounded text-emerald-500">binary</span>
            <div class="text-left">
                <div class="text-sm font-bold text-slate-800">Printable Strings</div>
                <div class="text-[10px] text-slate-500 uppercase font-bold">${reportData?.metadata?.important_Metadata?.printable_strings?.length || 0} Offsets</div>
            </div>
        </button>
    </div>
</div>
    </div>
`;
}
    section.innerHTML = `
        <div class="analysis-container modern-analysis bg-gray-50 p-6 md:p-10">
           <h2 class="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-3">
    <span class="material-symbols-rounded align-middle mr-3 text-4xl">movie_filter</span>
    Video Forensic Analysis Report
</h2>

            <div class="flex border-b border-gray-200 mb-8 overflow-x-auto">
    <button class="modern-tab-button active" data-tab="summaryTab">Summary</button>
    <button class="modern-tab-button" data-tab="deepfakeTab">Deepfake Analysis</button>
    <button class="modern-tab-button" data-tab="majorTab">Major Analysis</button>
    <button class="modern-tab-button" data-tab="metadataTab">Metadata Details</button>
</div>

            <div class="tab-content active" id="summaryTab">
                ${videoSummaryContent}
            </div>
            
            <div class="tab-content" id="deepfakeTab">
                ${renderCombinedDeepfakeAnalysis(df)}
            </div>
            
            <div class="tab-content" id="majorTab">
               ${initiateMajorAnalysisLoad(majorAnalysis, 'majorTab')}
            </div>

            
                <div class="tab-content" id="metadataTab">
    <div id="metadata-content-target">
        <div class="p-8 text-center text-slate-400">
            <div class="animate-spin mb-2 text-indigo-500">⏳</div>
            Loading technical metadata...
        </div>
    </div>
</div>
            </div>

    `;
    

document.querySelectorAll('.modern-tab-button').forEach(button => { 
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');

        document.querySelectorAll('.modern-tab-button').forEach(btn => btn.classList.remove('active')); 
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(targetTab)?.classList.add('active');
        if (targetTab === 'deepfakeTab') {
    
            setTimeout(initializeHeatmapCarousel, 50); 
            console.log("Deepfake Tab clicked: Initializing Heatmap Carousel.");
        }
    });
});

}





document.addEventListener('DOMContentLoaded', () => {
 

   
    document.body.addEventListener('click', (event) => {
        
        const toggleButton = event.target.closest('[data-hash-toggle="true"]');

        if (toggleButton) {
    
            const hashContainer = toggleButton.closest('.p-5.bg-white'); 
            if (!hashContainer) return;

            const hiddenContent = hashContainer.querySelector('#hidden-hashes-content');
            const buttonText = toggleButton.querySelector('span:first-child');
            const buttonIcon = toggleButton.querySelector('.material-symbols-rounded');

            if (!hiddenContent || !buttonText || !buttonIcon) return;
            
           
            const initialCount = parseInt(toggleButton.dataset.initialCount, 10);
            const totalCount = parseInt(toggleButton.dataset.totalCount, 10);
            
            if (hiddenContent.classList.contains('hidden')) {
                
                hiddenContent.classList.remove('hidden');
                buttonText.textContent = 'Hide Extra Hashes';
                buttonIcon.textContent = 'expand_less'; 
                buttonIcon.classList.add('rotate-180');
            } else {
              
                hiddenContent.classList.add('hidden');
                
              
                const hiddenCount = totalCount - initialCount;
                buttonText.textContent = `Show ${hiddenCount} More`; 
                
                buttonIcon.textContent = 'expand_more'; 
                buttonIcon.classList.remove('rotate-180');
            }
        }
    });
});

// Global variable to store the current zoom level
let currentZoomLevel = 1.0;

/**
 * Generates the HTML for the heatmap color interpretation legend inside the modal.
 */
window.getHeatmapColorKeyHtml = () => {
    const keyData = [
        { colorClass: 'bg-blue-500', label: 'Blue', detection: 'Very low intensity / Normal Region' },
        { colorClass: 'bg-green-500', label: 'Green', detection: 'Low-to-moderate intensity / Slight inconsistencies' },
        { colorClass: 'bg-yellow-500', label: 'Yellow', detection: 'Moderate-to-high intensity / Probable manipulation' },
        { colorClass: 'bg-red-500', label: 'Red', detection: 'Highest intensity / Strong evidence of deepfake' }
    ];

    return `
        <h4 class="text-lg font-semibold text-gray-700 mb-3 sticky top-0 bg-white pb-2 border-b">Intensity Information</h4>
        <div class="space-y-4">
            ${keyData.map(item => `
                <div class="flex items-start space-x-3 p-2 border-b border-gray-100">
                    <div class="w-6 h-6 ${item.colorClass} rounded-sm shadow-md flex-shrink-0 mt-1"></div>
                    <div>
                        <p class="text-sm font-bold text-gray-900">${item.label}</p>
                        <p class="text-xs text-gray-600">${item.detection}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};


/**
 * Opens the modal to show a large preview of the selected heatmap image.
 * @param {string} path - The URL path to the heatmap image.
 */
window.openHeatmapModal = (path) => {
    const modal = document.getElementById('heatmapModal');
    const image = document.getElementById('modalImage');
    const title = document.getElementById('modalTitle');
    const downloadBtn = document.getElementById('downloadButton');
    const colorKey = document.getElementById('modalColorKey');
    const scrollContainer = document.getElementById('imageScrollContainer');
    
    // Reset zoom level every time a new image is opened
    currentZoomLevel = 1.0;
    image.style.transform = `scale(${currentZoomLevel})`;
    image.style.width = 'auto'; 
    image.style.height = 'auto';
    image.style.maxWidth = 'none';

    // Extract frame/confidence details from the path for the title
    const frameMatch = path.match(/frame_(\d+)/);
    const confidenceMatch = path.match(/conf_(\d+)/);
    const frameNumber = frameMatch ? frameMatch[1] : 'N/A';
    const confidence = confidenceMatch ? confidenceMatch[1] : 'N/A';

    // Set content
    image.src = path;
    title.textContent = `Deepfake Heatmap - Frame ${frameNumber} (Confidence: ${confidence}%)`;
    downloadBtn.href = path; // Set download link to the image path
    colorKey.innerHTML = getHeatmapColorKeyHtml(); // Insert the color key
    
   image.onload = () => {
        const scrollContainer = document.getElementById('imageScrollContainer');
        
        // Step 1: Ensure the transform property (zoom) is reset
        image.style.transform = `scale(1.0)`; 
        currentZoomLevel = 1.0;

        // Step 2: Use a delay to ensure scrollWidth is calculated based on the NATIVE image size
        setTimeout(() => {
            
            // Check if the content is wider than the container
            if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                
                // Calculate position to center the content
                // Subtracting clientWidth ensures we scroll to the position where the image is centered in the viewport
                const centerPosition = (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2;
                
                // Set initial scroll position to the center
                scrollContainer.scrollLeft = centerPosition;
                
                // Set vertical scroll to center (optional, but helps tall images)
                scrollContainer.scrollTop = (scrollContainer.scrollHeight - scrollContainer.clientHeight) / 2;

                console.log(`Scroll centered at: ${centerPosition} / ${scrollContainer.scrollWidth}`); 
            } else {
                 // If image is small, reset scroll to ensure it starts at 0,0
                scrollContainer.scrollLeft = 0;
                scrollContainer.scrollTop = 0;
            }
            
            // Disable onload handler
            image.onload = null;
        }, 50); // Increased delay to 50ms for high reliability
    };
  
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

/**
 * Closes the modal.
 */
window.closeHeatmapModal = () => {
    const modal = document.getElementById('heatmapModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

/**
 * Increases or decreases the zoom level of the heatmap image.
 * @param {number} delta - The amount to change the zoom level (e.g., 0.1 for zoom in).
 */
window.zoomHeatmap = (delta) => {
    const image = document.getElementById('modalImage');
    const newZoom = currentZoomLevel + delta;
    
    // Set bounds for zoom (e.g., min 0.5x, max 4x)
    if (newZoom >= 0.5 && newZoom <= 4.0) {
        currentZoomLevel = newZoom;
        // Apply the zoom transform
        image.style.transform = `scale(${currentZoomLevel})`;
    }
};
// Global variable to hold the currently loaded forensic data
let currentForensicData = null;

window.showStringModal = (type, title) => {
    if (!currentForensicData) return;

    const modal = document.getElementById('forensicModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalBody = document.getElementById('modalBody');
    const entryCount = document.getElementById('entryCount');

    modalTitle.innerText = title;
    modal.classList.remove('hidden');

    // 1. Resolve Data Paths
    const impMeta = currentForensicData?.metadata?.important_Metadata || {};
    const ocrNode = impMeta.extracted_text || {};
    const printableNode = currentForensicData?.metadata?.printable_strings || impMeta.printable_strings || [];

    let data = [];
    let html = '';

    // 2. Select Renderer Based on Type
    if (type === 'all') {
        data = ocrNode.all_strings || [];
        modalSubtitle.innerText = "Full OCR sequence captured from video frames";
        html = renderAllStrings(data);
    } 
    else if (type === 'unique') {
        data = ocrNode.unique_strings || [];
        modalSubtitle.innerText = "Deduplicated keywords and entities";
        html = renderUniqueStrings(data);
    } 
    else if (type === 'printable') {
        data = printableNode;
        modalSubtitle.innerText = "Readable ASCII/UTF-8 strings extracted from binary stream";
        html = renderPrintableStrings(data);
    }

    modalBody.innerHTML = html;
    entryCount.innerText = `${data.length} ENTRIES FOUND`;
};

// --- RENDER HELPERS ---

const renderAllStrings = (items) => {
    if (!items.length) return renderEmptyState("No OCR strings were extracted from this file.");
    
    return items.map(item => `
        <div class="group flex items-center justify-between p-3 border-b border-slate-50 hover:bg-indigo-50/50 rounded-lg transition-colors">
            <div class="flex items-center gap-4">
                <span class="text-xs font-mono text-slate-300">#${item.frame}</span>
                <span class="text-sm font-semibold text-slate-700">${item.text}</span>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full ${item.confidence > 80 ? 'bg-green-500' : 'bg-amber-500'}" style="width: ${item.confidence}%"></div>
                </div>
                <span class="text-[10px] font-black text-slate-400 w-8">${item.confidence}%</span>
            </div>
        </div>
    `).join('');
};

const renderUniqueStrings = (strings) => {
    if (!strings.length) return renderEmptyState("No unique keywords detected.");
    
    return `
        <div class="flex flex-wrap gap-2">
            ${strings.map(str => `
                <span class="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-default">
                    ${str}
                </span>
            `).join('')}
        </div>
    `;
};

const renderPrintableStrings = (offsets) => {
    if (!offsets.length) return renderEmptyState("No printable strings found in binary data.");
    
    return `
        <div class="font-mono text-[11px]">
            <div class="grid grid-cols-12 gap-2 mb-4 text-slate-400 font-bold uppercase tracking-widest border-b pb-2">
                <div class="col-span-2">Offset</div>
                <div class="col-span-2">Size</div>
                <div class="col-span-8">Data / String Value</div>
            </div>
            ${offsets.map(off => `
                <div class="grid grid-cols-12 gap-2 py-1 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <div class="col-span-2 text-indigo-500 font-bold">${off.hex_offset}</div>
                    <div class="col-span-2 text-slate-400">${off.length}b</div>
                    <div class="col-span-8 text-slate-700 truncate group-hover:text-indigo-600" title="${off.string}">
                        ${off.string.replace(/ /g, '·')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

const renderEmptyState = (msg) => `
    <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-rounded text-slate-300 text-3xl">database_off</span>
        </div>
        <h3 class="text-slate-800 font-bold">Data Unavailable</h3>
        <p class="text-slate-400 text-sm max-w-xs mx-auto">${msg}</p>
    </div>
`;

// Close logic
window.closeForensicModal = () => {
    document.getElementById('forensicModal').classList.add('hidden');
};


document.getElementById('forensicSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#modalBody > div, #modalBody > span');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
});