
const modal = document.getElementById("taskWizardModal");
const openModalBtn = document.querySelector(".task-button");
const closeModalBtn = document.querySelector(".close-btn");
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

 
  modal.style.display = "none";
  document.body.classList.remove('modal-open');
  document.querySelector('.modal-backdrop')?.remove();

  if (typeof showSection === 'function') {
    showSection("analytics");
  }

  const analyticsSection = document.getElementById("analytics_section");
  document.querySelector(".no-process")?.remove();

  analyticsSection.innerHTML = `
    <div class="overlay-loader" role="status" aria-live="assertive" aria-busy="true">
      <div class="horizontal-bar">
        <div class="bar bar1"></div>
        <div class="bar bar2"></div>
        <div class="bar bar3"></div>
        <div class="bar bar4"></div>
      </div>
      <div class="spinner-box">
        <div class="modern-spinner"></div>
        <p class="loading-text">Analyzing evidence... please wait.</p>
      </div>
      <div class="modern-quote-box">⌛ Initializing forensic modules...</div>
    </div>
  `;

  cycleQuotes(); 

  const formData = new FormData();
  formData.append('file', file);

  fetch("/evidence/analyze/", {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken")
    },
    body: formData
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    function readChunk({ done, value }) {
      if (done) return;

      const chunk = decoder.decode(value, { stream: true });
      const messages = chunk.split("\n\n").filter(Boolean);

      messages.forEach(msg => {
        if (msg.startsWith("data:")) {
          const json = JSON.parse(msg.slice(5));
          const progress = json.progress || 0;
          const message = json.message || "Processing...";

          const progressBar = document.querySelector(".upload-progress-bar");
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
            let percentDisplay = document.getElementById("percent-text");
            if (!percentDisplay) {
                percentDisplay = document.createElement("div");
                percentDisplay.id = "percent-text";
                percentDisplay.style.marginTop = "10px";
                percentDisplay.style.fontWeight = "bold";
                percentDisplay.style.color = "#fff";
                 document.querySelector(".overlay-loader").appendChild(percentDisplay);
            }
            percentDisplay.textContent = `Progress: ${progress}%`;

          } else {
            const bar = document.createElement("div");
            bar.className = "upload-progress-bar";
            bar.style.width = `${progress}%`;
            document.querySelector(".overlay-loader").appendChild(bar);
          }

          const loadingText = document.querySelector(".loading-text");
          if (loadingText) {
            loadingText.textContent = message;
          }

          if (json.result) {
  
  localStorage.setItem("evidenceResults", JSON.stringify(json.result));

 
  if (json.result.deepfake_detection || json.result.forgery_detection || json.result.metadata) {
    renderEvidenceResults(json.result);
  } else if (json.result.report && json.result.text_detection) {
    renderDocumentResults({
      text_detection: json.result.text_detection,
      report: json.result.report,
      hashes: json.result.hashes
    });
  } else {
    console.warn("Unknown evidence result format", result);
  }

  showToast("Analysis complete.");
}


          if (json.error) {
            const loadingText = document.querySelector(".loading-text");
            if (loadingText) {
                  loadingText.innerHTML = ` ${json.message} <br><small>But it’s not a problem, continuing analysis...</small>`;
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
    analyticsSection.innerHTML = `<p class="text-danger">An error occurred during analysis.</p>`;
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
  console.log(hashes);
  const imageurl=document.getElementsByClassName("preview-image");

  section.innerHTML = `
    <div class="analysis-container modern-analysis">
      <h3 class="section-title">🧪 Evidence Analysis Results</h3>

      <div class="tabs">
        <button class="tab-button active" data-tab="summaryTab">Summary</button>
        <button class="tab-button" data-tab="deepfakeTab">Deepfake Analysis</button>
        <button class="tab-button" data-tab="forgeryTab">Forgery Detection</button>
        <button class="tab-button" data-tab="metadataTab">Metadata Details</button>
      </div>

      <div class="tab-content active" id="summaryTab">
        <div class="card-grid">
          <div class="result-card">
            <h4>General Model Score</h4>
            <p>${df.verdict}</p>
           <div class="progress-circle" data-percentage="${(df.confidence_score ).toFixed(0)}">
  <span class="progress-value">${(df.confidence_score ).toFixed(0)}%</span>
</div>
            <small>Confidence Score</small>
          </div>
                    <div class="result-card">
            <h4>Deepfake/AI Verdict</h4>
            <p>${df.ai_generated}</p>
           <div class="progress-circle" data-percentage="${(df.ai_generated_confidence ).toFixed(0)}">
  <span class="progress-value">${(df.ai_generated_confidence ).toFixed(0)}%</span>
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
      </span> ${df.ai_generated_confidence}%
      </p>
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

    <!-- Methods Used -->
    <div class="forgery-card">
      <h5><i class="fas fa-tools"></i> Methods Used</h5>
      <ul class="method-list">
        ${forgery.methods_used?.map(method => `<li><i class="fas fa-check-circle"></i> ${method}</li>`).join("") || "<li>None</li>"}
      </ul>
    </div>

    <!-- Copy-Move Score -->
    <div class="forgery-card">
      <h5><i class="fas fa-copy"></i> Copy-Move Detection</h5>
      <p><strong>Score:</strong> ${forgery.copy_move?.score || "N/A"}</p>
      <p><strong>Flagged:</strong> 
        <span class="${forgery.copy_move?.flagged ? 'badge-fake' : 'badge-real'}">
          ${forgery.copy_move?.flagged ? "Yes" : "No"}
        </span>
      </p>
  

    </div>

    <!-- Edge & Blur Checks -->
    <div class="forgery-card">
      <h5><i class="fas fa-vector-square"></i> Edge & Blur Analysis</h5>
      <p><strong>Edge Density:</strong> ${forgery.edges?.edge_density || "N/A"}</p>
      <p><strong>Edge Flagged:</strong> ${forgery.edges?.edge_flagged ? "Yes" : "No"}</p>
      <p><strong>Blur Score:</strong> ${forgery.edges?.blur_score || "N/A"}</p>
      <p><strong>Blur Flagged:</strong> ${forgery.edges?.blur_flagged ? "Yes" : "No"}</p>
    </div>

    <!-- ELA Analysis -->
    <div class="forgery-card">
      <h5><i class="fas fa-paint-brush"></i> ELA (Error Level Analysis)</h5>
      <p><strong>ELA Score:</strong> ${forgery.ela?.ela_score}</p>
      <p><strong>ELA Flagged:</strong> ${forgery.ela?.ela_flagged ? "Yes" : "No"}</p>
      <p><strong>Histogram Std:</strong> ${forgery.ela?.histogram_std || "N/A"}</p>
    </div>

    <!-- Noise Pattern -->
    <div class="forgery-card">
      <h5><i class="fas fa-signal"></i> Noise Pattern Analysis</h5>
      <p><strong>Laplacian Variance:</strong> ${forgery.noise?.laplacian_variance || "N/A"}</p>
      <p><strong>Flagged:</strong> ${forgery.noise?.noise_flagged ? "Yes" : "No"}</p>
    </div>

    <!-- Final Verdict -->
    <div class="forgery-card verdict-box">
      <h5><i class="fas fa-balance-scale"></i> Verdict</h5>
      <p class="verdict-text ${forgery.verdict === 'Forged' ? 'verdict-fake' : 'verdict-real'}">
        ${forgery.verdict}
      </p>
    </div>

  </div>

  <!-- Leave canvas untouched as instructed -->
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

    </div>
    

  `;

  
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

      this.classList.add("active");
      document.getElementById(this.dataset.tab).classList.add("active");
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

    // Forgery radar chart
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
