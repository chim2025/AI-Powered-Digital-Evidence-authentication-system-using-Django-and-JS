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
  "ðŸ•µï¸â€â™‚ï¸ <b>â€˜Digital forensics</b>: where code becomes testimony.â€™",
  "ðŸ“ <b>â€˜Every byte</b> leaves a trace â€” we analyze them all.â€™",
  "ðŸ” <b>â€˜Truth hides in pixels</b>. Let's uncover it.â€™",
  "ðŸ§  <b>â€˜High-resolution evidence</b> may take longer. Hang tight.â€™",
  "ðŸ“¸ <b>â€˜One frame can reveal</b> a thousand secrets.â€™",
  "ðŸ’¡ <b>â€˜No data is useless</b> â€” every detail matters.â€™",
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
          } else if (json.result.deepfake_video) {
            // Video deepfake detection result - merge with parent data
            renderEvidenceResults({
              ...json.result.deepfake_video,
              task_data: json.result.task_data,
              hashes: json.result.hashes
            });
          } else if (json.result.steganographic_detection) {
            renderEvidenceResults({
              ...json.result,
              stego: json.result.steganographic_detection // Map to 'stego' for renderEvidenceResults
            });
          } else if (json.result.deepfake_detection || json.result.forgery_detection || json.result.metadata) {
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
          loadingText.innerHTML = `${json.message}<br><small>But itâ€™s not a problem, continuing analysis...</small>`;
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
                    ` : ''}
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
                    <button id="closeHexEditor" aria-label="Close hex editor">âœ–</button>
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
  <h4>âš ï¸ Issues Found</h4>
  <div class="issue-count" data-count="${report.issues_found?.length || 0}">0</div>
  <small title="${report.issues_found?.join('\n')}">
  ${report.issues_found?.length === 0 ? "No suspicious metadata" : "Hover to see issues"}
</small>

  </div>

         <div class="result-card pages-card">
  <h4>ðŸ—‚ï¸ Pages Analyzed</h4>
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
  <h4 class="meta-section-title">ðŸ—‚ï¸ Document Metadata & Integrity Report</h4>

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
          showToast("ðŸ“‹ Text copied to clipboard!", "success");
        }).catch(err => {
          console.error("Copy failed", err);
          showToast("âš ï¸ Failed to copy text", "error");
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
      <h3 class="section-title">ðŸ§  Memory Dump Analysis Results</h3>

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
  listAnalysisResults().then(files => {
    if (files.length > 0) {
      // Load the latest result
      const latestFile = files[files.length - 1];
      getAnalysisResult(latestFile).then(parsed => {
        if (!parsed) return;

        if (parsed.deepfake_detection || parsed.forgery_detection || parsed.metadata_tags) {
          renderEvidenceResults(parsed);
        } else if (parsed.text_detection && parsed.report) {
          renderDocumentResults({
            text_detection: parsed.text_detection,
            report: parsed.report,
            hashes: parsed.hashes
          });
        } else if (parsed.memdump) {
          renderMemdumpResults(parsed.memdump);
        }
      });
    }
  });
});
// --- Heatmap Lightbox Modal ---
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

function openHeatmapModal(src) {
  createHeatmapModal();
  const modal = document.getElementById('heatmapModalDisplay');
  const modalImg = document.getElementById("img01");
  modal.style.display = "flex";
  modalImg.src = src;
}

function closeHeatmapModal() {
  const modal = document.getElementById('heatmapModalDisplay');
  if (modal) modal.style.display = "none";
}