// renderEvidenceResults.js

export function renderEvidenceResults(result, containerId = "analysisSection") {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  renderDeepfake(result.deepfake, container);
  renderMetadata(result.metadata_tags, container);
  renderForgery(result.forgery_detection, container);
}

export function renderDeepfake(data, parent) {
  const card = document.createElement("div");
  card.className = "card p-4 shadow mb-4 bg-dark text-white";

  card.innerHTML = `
    <h4>🧠 Deepfake Detection</h4>
    <p><strong>Verdict:</strong> ${data.verdict}</p>
    <p><strong>Confidence:</strong> ${data.confidence_score}%</p>
    <canvas id="deepfakeChart" height="100"></canvas>
  `;

  parent.appendChild(card);

  new Chart(document.getElementById("deepfakeChart"), {
    type: "bar",
    data: {
      labels: ["ResNet-18", "EfficientNet"],
      datasets: [{
        label: "Model Confidence (%)",
        data: [data.model_scores.resnet18, data.model_scores.efficientnet],
        backgroundColor: ["#00b894", "#6c5ce7"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Deepfake Detection Scores" }
      }
    }
  });
}

export function renderMetadata(meta, parent) {
  const card = document.createElement("div");
  card.className = "card p-4 shadow mb-4 bg-secondary text-white";

  card.innerHTML = `
    <h4>📷 Metadata Analysis</h4>
    <p><strong>Software Used:</strong> ${meta.software_used}</p>
    <p><strong>Verdict:</strong> ${meta.verdict}</p>
    <details class="mt-2">
      <summary>📁 Show EXIF Data</summary>
      <pre class="bg-dark text-light p-2 rounded">${JSON.stringify(meta.exif_data, null, 2)}</pre>
    </details>
  `;

  parent.appendChild(card);
}

export function renderForgery(data, parent) {
  const card = document.createElement("div");
  card.className = "card p-4 shadow mb-4 bg-light border-danger";

  let imgHTML = data.copy_move?.heatmap
    ? `<img src="${data.copy_move.heatmap}" class="img-fluid rounded mb-2" alt="Forgery Heatmap">`
    : `<p class="text-danger">No heatmap available.</p>`;

  card.innerHTML = `
    <h4>🔍 Forgery Detection</h4>
    <p><strong>Verdict:</strong> ${data.verdict}</p>
    <p><strong>ELA Score:</strong> ${data.ela?.ela_score}</p>
    <p><strong>Noise Variance:</strong> ${data.noise?.laplacian_variance ?? 'N/A'}</p>
    <p><strong>Edge Density:</strong> ${data.edges?.edge_density ?? 'N/A'}%</p>
    ${imgHTML}
  `;

  parent.appendChild(card);
}
