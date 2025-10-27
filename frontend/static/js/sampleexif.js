// Declare global variables
let selectedFiles = []; // Cumulative array to store all selected files
let metadata = {}; // Store metadata for all selected files

// Modal toggle functionality
document.getElementById('openExifComparatorx1').addEventListener('click', function() {
    document.getElementById('exifComparatorModalx1').style.display = 'block';
    const dateInput = document.getElementById('datex1');
    dateInput.value = '2025-10-11'; // Updated to current date
});

document.getElementsByClassName('closex1')[0].addEventListener('click', function() {
    document.getElementById('exifComparatorModalx1').style.display = 'none';
    resetModalx1();
});

window.addEventListener('DOMContentLoaded', () => {
    const evidenceDateInput = document.getElementById('datex1');
    const now = new Date();
    const formattedDateTime = now.toLocaleString();
    evidenceDateInput.value = formattedDateTime;
});

// Step navigation
document.getElementById('nextStepBtnx1').addEventListener('click', function() {
    const name = document.getElementById('evidenceNamex1').value.trim();
    const desc = document.getElementById('evidenceDescriptionx1').value.trim();
    if (name && desc) {
        document.getElementById('step-1x1').classList.remove('active');
        document.getElementById('step-2x1').classList.add('active');
        document.getElementById('progress-barx1').style.width = '100%';
        document.getElementById('step-1-indicatorx1').classList.remove('active-stepx1');
        document.getElementById('step-2-indicatorx1').classList.add('active-stepx1');
    } else {
        showToast("Fill In both the name and description");
    }
});

document.getElementById('prevStepBtnx1').addEventListener('click', function() {
    document.getElementById('step-2x1').classList.remove('active');
    document.getElementById('step-1x1').classList.add('active');
    document.getElementById('progress-barx1').style.width = '50%';
    document.getElementById('step-2-indicatorx1').classList.remove('active-stepx1');
    document.getElementById('step-1-indicatorx1').classList.add('active-stepx1');
});

// File upload and preview
document.getElementById('uploadTriggerx1').addEventListener('click', function() {
    document.getElementById('exifUploadx1').click();
});

document.getElementById('exifUploadx1').addEventListener('change', function(e) {
    const newFiles = Array.from(e.target.files); // Get newly selected files
    const preview = document.getElementById('filePreviewx1');
    if (newFiles.length > 0 && preview) {
        newFiles.forEach(file => {
            if (!selectedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
                selectedFiles.push(file);
                const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9); // Unique ID
                const div = document.createElement('div');
                div.className = 'preview-itemx1';
                let previewContent = '';
                if (file.type.startsWith('image/')) {
                    previewContent = `<img src="${URL.createObjectURL(file)}" alt="${file.name}" class="preview-imgx1">`;
                } else if (file.type.startsWith('video/')) {
                    previewContent = `<video controls class="preview-videox1"><source src="${URL.createObjectURL(file)}" type="${file.type}">Your browser does not support the video tag.</video>`;
                } else if (file.type === 'application/pdf') {
                    previewContent = `<iframe src="${URL.createObjectURL(file)}" class="preview-pdfx1" title="${file.name}"></iframe>`;
                } else if (file.type.includes('text') || file.type === 'application/json' || file.type === 'text/csv') {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const text = e.target.result;
                        div.querySelector('.preview-contentx1').innerHTML = `<p class="preview-textx1">${text.substring(0, 100)}${text.length > 100 ? '...' : ''}</p>`;
                    };
                    reader.onerror = function() {
                        div.querySelector('.preview-contentx1').innerHTML = `<p class="preview-textx1">${file.name} (Error reading text)</p>`;
                    };
                    reader.readAsText(file);
                    previewContent = '<p class="preview-textx1">Loading text...</p>';
                } else {
                    previewContent = `<p class="preview-textx1">${file.name} (Unsupported - <a href="${URL.createObjectURL(file)}" download="${file.name}" target="_blank">click to download</a>)</p>`;
                }
                div.innerHTML = `
                    <div class="preview-contentx1">${previewContent}</div>
                    <div class="file-infox1">
                        <p>Name: ${file.name}</p>
                        <span class="file-typex1">${file.type.split('/')[1].toUpperCase() || file.type}</span>
                        <span class="cancel-iconx1 material-symbols-outlined" data-file-id="${fileId}">cancel</span>
                    </div>
                `;
                preview.appendChild(div);
                div.querySelector('.cancel-iconx1').addEventListener('click', function() {
                    div.remove();
                    selectedFiles = selectedFiles.filter(f => f.name !== file.name);
                    delete metadata[file.name];
                    updateCompareButton();
                });
            }
        });
        newFiles.forEach(file => {
            if (!metadata[file.name]) {
                metadata[file.name] = {
                    size_bytes: file.size,
                    modification_time: new Date(file.lastModified).toISOString(),
                    creation_time: new Date(file.lastModified).toISOString()
                };
                if (file.type.startsWith('image/')) {
                    EXIF.getData(file, function() {
                        const exifData = EXIF.getAllTags(this);
                        if (exifData && Object.keys(exifData).length > 0) {
                            metadata[file.name].exif = exifData;
                            console.log(`EXIF data for ${file.name}:`, exifData); // Restored EXIF logging
                        }
                    });
                }
            }
        });
        updateCompareButton();
    }
    e.target.value = '';
});

function updateCompareButton() {
    const previews = document.getElementById('filePreviewx1').children;
    document.getElementById('compareExifBtnx1').disabled = previews.length < 2;
}

document.getElementById('compareExifBtnx1').addEventListener('click', async function() {
    console.log("Started and pressed Compare button")
    let task_name = document.getElementById("evidenceNamex1")?.value || ""; 
    let task_description = document.getElementById("evidenceDescriptionx1")?.value || "";
    function get_task_data() {
            const task_data = {};
            if (! task_name && !task_description){
                console.log("Both does not exist...")
            }
    

            // Validate required fields
            if (!task_name.trim() || !task_description.trim()) {
                console.warn("Task name and description are required.");
                return ""; 
            }

            // Populate task_data
            task_data.task_name = task_name;
            task_data.task_description = task_description;
            

            return task_data || {}; 
            }

    const previewFiles = Array.from(document.getElementById('filePreviewx1').children).map(child => ({
        name: child.querySelector('.file-infox1 p').textContent.replace('Name: ', ''),
        fileId: child.querySelector('.cancel-iconx1').getAttribute('data-file-id')
    }));
    if (previewFiles.length >= 2) {
        console.log('Initiating comparison for ' + previewFiles.length + ' files at ' + new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Lagos' }));
        console.log('Comparing EXIF data for ' + previewFiles.length + ' files. File IDs: ' + previewFiles.map(f => f.fileId).join(', '));

        // Show loading overlay in the modal
        const modal = document.getElementById('exifComparatorModalx1');
        if (!modal) {
            console.error("exifComparatorModalx1 element not found");
            showToast("Error: Modal not found.");
            return;
        }
        modal.innerHTML += `
            <div class="analysis-loading-overlayx1" role="status" aria-live="assertive" aria-busy="true" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;">
                <div class="modal-spinner-containerx1" style="display: flex; align-items: center; justify-content: center; position: relative; width: 60px; height: 60px; margin: 0 auto 12px;">
                    <div class="modal-spinner-ringx1" style="position: absolute; width: 100%; height: 100%; border: 5px solid transparent; border-top-color: #00cc00; border-left-color: #00cc00; border-radius: 50%; animation: modal-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;"></div>
                    <div class="modal-spinner-corex1" style="width: 36px; height: 36px; background: linear-gradient(135deg, #00cc00, #66ff66); border-radius: 50%; animation: modal-pulse 1.4s ease-in-out infinite; box-shadow: 0 0 12px rgba(0, 204, 0, 0.6), 0 0 20px rgba(0, 204, 0, 0.3);"></div>
                    <div class="modal-spinner-glowx1" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(0, 204, 0, 0.4) 0%, transparent 70%); animation: modal-glow 1.8s ease-in-out infinite;"></div>
                </div>
                <span style="font-size: 1.1em; color: #333; font-weight: 500; text-align: center;">Analyzing evidence... please wait.<br><small>It can take up to a minute</small></span>
               
                <div id="percent-textx1" style="margin-top: 10px; font-size: 1.1em; font-weight: 500; color: #333; text-align: center; visibility: visible;"></div>
                <div class="modern-quote-boxx1" style="margin-top: 15px; font-size: 14px; color: #666; text-align: center; opacity: 0; transition: opacity 0.3s ease;"></div>
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
                .analysis-loading-overlayx1.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
                .modern-quote-boxx1.show {
                    opacity: 1 !important;
                }
                .analysis-progress-barx1 {
                    background-color: #b3ffb3 !important;
                    transition: width 0.3s ease, background-color 0.3s ease !important;
                }
            </style>
        `;

        // Force DOM update using requestAnimationFrame
        await new Promise(resolve => requestAnimationFrame(resolve));
        const loadingOverlay = modal.querySelector(".analysis-loading-overlayx1");
        const loadingText = loadingOverlay.querySelector("span");
        //const progressBar = modal.querySelector(".analysis-progress-barx1");
        //const percentDisplay = loadingOverlay.querySelector("#percent-textx1");
        const quoteBox = loadingOverlay.querySelector(".modern-quote-boxx1");

        console.log("Generated overlay elements:", {
            loadingOverlay: !!loadingOverlay,
            loadingText: !!loadingText,
            //progressBar: !!progressBar,
            //progressBarBackground: progressBar ? window.getComputedStyle(progressBar).backgroundColor : null,
           // percentDisplay: !!percentDisplay,
            quoteBox: !!quoteBox
        });

        // Start cycling quotes
        cycleQuotes();
    
        

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });
        const taskData=get_task_data()
        if (taskData){
        for(const[key, value] of Object.entries(taskData)){
            formData.append( `task_${key}`, value)
        }
        }
        console.log("FormData entries:", [...formData.entries()]);
        formData.append('metadata', JSON.stringify(metadata));

        try {
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
            if (!csrfToken) {
                console.warn('CSRF token not found. Ensure {% csrf_token %} is in the template.');
            }
            const response = await fetch('/file_comparator/', {
                method: 'POST',
                body: formData,
                headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {}
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, URL: ${response.url}`);
            }
            const data = await response.json();
            console.log('Response from server:', data);
            if (data.status === 'success') {
                console.log('Report URL:', data.report_url);
                loadingOverlay.classList.add('hidden');
                // Hide modal and navigate to analytics section
                document.getElementById('exifComparatorModalx1').style.display = 'none';
                if (typeof showSection === 'function') {
                    showSection('analytics');
                } else {
                    document.getElementById('analytics_section').scrollIntoView({ behavior: 'smooth' });
                }
                renderExifResults(data);
            } else {
                console.error('Error:', data.error);
                loadingOverlay.classList.add('hidden');
                showToast(`Analysis failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            loadingOverlay.classList.add('hidden');
            showToast(`An error occurred during analysis: ${error.message}`);
        }
    }
});

function cycleQuotes() {
    const quotes = [
        "Analyzing evidence with precision...",
        "Unveiling hidden details...",
        "Processing data securely..."
    ];
    const quoteBox = document.querySelector('.modern-quote-boxx1');
    let index = 0;
    setInterval(() => {
        if (quoteBox) {
            quoteBox.textContent = quotes[index];
            quoteBox.classList.add('show');
            setTimeout(() => quoteBox.classList.remove('show'), 3000);
            index = (index + 1) % quotes.length;
        }
    }, 3500);
}



// Define renderExifResults globally
function renderExifResults(data) {
    const analyticsSection = document.getElementById('analytics_section');
    if (!analyticsSection) {
        console.error("analytics_section element not found");
        showToast("Error: Analytics section not found.");
        return;
    }

    console.log("Starting renderExifResults with data:", data); // Debug: Check initial data

    // Check if structure is already initialized
    if (!analyticsSection.querySelector('.tabs')) {
        // Fetch the full JSON report
        fetch(data.report_url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(reportData => {
                console.log("Fetched reportData:", reportData); // Debug: Verify fetched data

                // Basic HTML structure
             analyticsSection.innerHTML = `
    <div class="container p-6">
        <!-- Evidence Container -->
        <div class="evidence-container mb-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 class="text-3xl font-bold text-gray-800 mb-4">Evidence Details</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-4 bg-gray-50 rounded-lg shadow-inner">
                    <label class="block text-lg font-semibold text-gray-700">Evidence Name</label>
                    <p class="text-gray-900 mt-2" id="evidence-name-display">${data.task_data.task_name || "Unspecified"}</p>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg shadow-inner">
                    <label class="block text-lg font-semibold text-gray-700">Description</label>
                    <p class="text-gray-900 mt-2" id="evidence-description-display">${data.task_data.task_description || "Unspecified"}</p>
                </div>
            </div>
           <div class="mt-6">
    <h3 class="text-xl font-semibold text-gray-700 mb-4">File Previews</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="file-preview-display">
        ${selectedFiles.map(file => `
            <div class="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <p class="text-sm text-gray-600">Name: ${file.name}</p>
                ${file.type.startsWith('image/') ? `<img src="${URL.createObjectURL(file)}" alt="${file.name}" class="w-full h-48 object-cover rounded mt-2" style="max-height: 300px;">` : 
                file.type === 'application/pdf' ? `<iframe src="${URL.createObjectURL(file)}" class="w-full h-48 mt-2" title="${file.name}"></iframe>` : 
                `<p class="text-gray-500 mt-2">Preview unavailable</p>`}
                <span class="file-typex1">${file.type.split('/')[1].toUpperCase() || file.type}</span>
            </div>
        `).join('') || '<p class="text-gray-500">No files previewed. Reload with image URLs if needed.</p>'}
    </div>
</div>
        </div>

        <!-- Tabs and Content -->
        <div class="tabs-container">
            <div class="tabs flex gap-4 mb-6 border-b-2 border-green-200">
                <button class="tab px-6 py-3 text-lg font-semibold text-gray-700 hover:text-green-600 data-[active]:text-green-600 data-[active]:border-b-2 data-[active]:border-green-600 transition-all" data-tab="verdict">Verdict Summary</button>
                <button class="tab px-6 py-3 text-lg font-semibold text-gray-700 hover:text-green-600 transition-all" data-tab="individual">Individual Analyses</button>
                <button class="tab px-6 py-3 text-lg font-semibold text-gray-700 hover:text-green-600 transition-all" data-tab="pairwise">Pairwise Comparisons</button>
            </div>
            <div class="tab-content" id="verdict"></div>
            <div class="tab-content" id="individual" style="display: none;"></div>
            <div class="tab-content" id="pairwise" style="display: none;"></div>
        </div>
    </div>
    <style>
        @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
        .container {
            position: relative;
            width: 100%; /* Remove max-width and mx-auto to span full width */
            padding: 0 30px; /* Match .main-content padding for consistency */
        }
        .evidence-container, .tabs-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(5px);
        }
        .tab {
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .tab[data-active] {
            border-bottom: 2px solid #00cc00;
        }
        .tab-content {
            display: block;
            opacity: 1;
            transition: opacity 0.3s ease;
            width: 100%; /* Ensure full width */
            text-align: left; /* Explicitly set left alignment */
        }
        .card {
            background: white;
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 1rem;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        .animate-pulse {
            animation: pulse 2s infinite;
        }
        .animate-float {
            animation: float 4s infinite ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        [title]:hover:after {
            content: attr(title);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #1a202c;
            color: #fff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 0.9em;
            white-space: nowrap;
            z-index: 20;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .grid { grid-template-columns: 1fr; }
        }
        /* Ensure grid items are left-aligned */
        
    </style>
`;

    function renderVerdictSummary() {
    const verdict = reportData.verdict_summary;
    const overall = reportData.overall_verdict;
    const narrative = reportData.overall_verdict_narrative.replace(/\n/g, '<br>');

    const content = `
        <div class="p-6 relative overflow-hidden">
            <!-- Animated Background -->
            <div class="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div class="animate-float w-24 h-24 bg-green-100 rounded-full" style="top: 5%; left: 5%;"></div>
                <div class="animate-float-slow w-16 h-16 bg-green-200 rounded-full" style="top: 20%; right: 10%;"></div>
            </div>

            <!-- Header -->
            <h3 class="text-4xl font-extrabold text-gray-900 mb-6 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text animate-pulse">Verdict Summary</h3>

            <!-- Key Metrics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div class="card p-4 bg-green-50 border-l-4 border-green-600">
                    <span class="material-icons text-green-600 animate-pulse mr-2">folder</span>
                    <strong class="text-lg text-gray-800">Files Analyzed:</strong>
                    <p class="text-2xl font-bold text-green-700">${verdict.files_analyzed}</p>
                </div>
                <div class="card p-4 bg-yellow-50 border-l-4 border-yellow-600" title="Indicates potential data manipulation">
                    <span class="material-icons text-yellow-600 animate-pulse mr-2">warning</span>
                    <strong class="text-lg text-gray-800">Tampering Detected:</strong>
                    <p class="text-2xl font-bold text-yellow-700">${verdict.tampering_detected ? 'Yes' : 'No'}</p>
                    ${verdict.tampering_hints.length > 0 ? `<p class="text-sm text-yellow-600 mt-1">${verdict.tampering_hints.join(', ')}</p>` : ''}
                </div>
                <div class="card p-4 bg-blue-50 border-l-4 border-blue-600" title="Average similarity between file pairs">
                    <span class="material-icons text-blue-600 animate-float mr-2">percent</span>
                    <strong class="text-lg text-gray-800">Average Similarity:</strong>
                    <p class="text-2xl font-bold text-blue-700">${verdict.average_similarity.toFixed(2)}%</p>
                </div>
                <div class="card p-4 bg-red-50 border-l-4 border-red-600" title="Whether files are exact copies">
                    <span class="material-icons text-red-600 animate-bounce mr-2">not_interested</span>
                    <strong class="text-lg text-gray-800">Identical Files:</strong>
                    <p class="text-2xl font-bold text-red-700">${verdict.identical_files ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <!-- Overall Verdict -->
            <div class="bg-white p-6 rounded-lg shadow-lg mb-6">
                <h4 class="text-2xl font-semibold text-gray-800 mb-4">Overall Verdict</h4>
                ${overall.map(item => `
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg shadow-inner flex items-start">
                        <span class="material-icons mr-3 mt-1 text-2xl ${item.type === 'duplicate' ? 'text-gray-600' : item.type === 'tampering' ? 'text-yellow-600 animate-pulse' : 'text-blue-600 animate-float'}">${item.type === 'duplicate' ? 'content_copy' : item.type === 'tampering' ? 'warning' : 'compare_arrows'}</span>
                        <div>
                            <p class="font-medium text-gray-900">${item.message}</p>
                            ${item.details.length > 0 ? `<p class="text-sm text-gray-600 mt-1">${item.details.join('<br>')}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Narrative Summary -->
            <div class="bg-gray-50 p-6 rounded-lg shadow-lg">
                <h4 class="text-xl font-semibold text-gray-800 mb-4">Narrative Summary</h4>
                <div class="text-gray-700 whitespace-pre-line">${narrative}</div>
            </div>
        </div>
    `;
    renderContent('verdict', content);
}
                // Render initial content
                function renderContent(tabId, content) {
                    const element = document.getElementById(tabId);
                    if (element) {
                        element.innerHTML = content || '<p class="text-gray-600">No data available.</p>';
                        console.log(`Rendered ${tabId} with content:`, content); // Debug: Confirm rendering
                    } else {
                        console.error(`Element ${tabId} not found`);
                    }
                }

                // Render individual analyses
                function renderIndividualAnalyses() {
                    const content = Object.entries(reportData.individual_analyses).map(([fileName, analysis]) => `
                        <div class="mb-6 p-6 bg-gray-50/80 rounded-xl shadow-lg">
                            <h3 class="text-2xl font-semibold text-black">${fileName}</h3>
                            <p><strong>Type:</strong> ${analysis.types.mime_type}</p>
                            <p><strong>Size:</strong> ${analysis.metadata.size_readable}</p>
                            ${analysis.errors.length > 0 ? `<p class="text-yellow-600">Errors: ${analysis.errors.join(', ')}</p>` : ''}
                        </div>
                    `).join('');
                    renderContent('individual', content);
                }

                // Render pairwise comparisons
                function renderPairwiseComparisons() {
    const content = (reportData.pairwise_comparisons && Object.entries(reportData.pairwise_comparisons).length > 0 
        ? Object.entries(reportData.pairwise_comparisons).map(([pairName, comparison]) => {
            const diffs = comparison.metadata_diffs || {};
            const tamperingHints = (comparison.tampering_hints_combined && comparison.tampering_hints_combined.join(', ')) || 'None';

            return `
                <div class="mb-8 p-6 bg-white rounded-xl shadow-lg border-l-4 border-blue-600 hover:shadow-xl transition-all duration-300">
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text">${pairName}</h3>
                    
                    <!-- Key Metrics Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div class="info-card-container p-4 bg-green-50">
                            <span class="material-icons text-blue-600 animate-float mr-2">percent</span>
                            <strong class="text-lg text-gray-800">Similarity:</strong>
                            <p class="text-2xl font-bold text-blue-700" title="Percentage of byte similarity between files">${comparison.similarity_percentage?.toFixed(2) || 'N/A'}%</p>
                        </div>
                        <div class="info-card-container p-4 bg-red-50">
                            <span class="material-icons text-red-600 animate-bounce mr-2">not_interested</span>
                            <strong class="text-lg text-gray-800">Identical Hashes:</strong>
                            <p class="text-2xl font-bold text-red-700">${comparison.identical_hashes ? 'Yes' : 'No' || 'N/A'}</p>
                        </div>
                        <div class="info-card-container p-4 bg-green-50">
                            <span class="material-icons text-green-600 animate-pulse mr-2">data_usage</span>
                            <strong class="text-lg text-gray-800">Size Difference:</strong>
                            <p class="text-2xl font-bold text-green-700" title="Difference in file sizes">${comparison.size_difference_readable || 'N/A'}</p>
                        </div>
                        <div class="info-card-container p-4 bg-yellow-50">
                            <span class="material-icons text-yellow-600 animate-pulse mr-2">warning</span>
                            <strong class="text-lg text-gray-800">Tampering Hints:</strong>
                            <p class="text-2xl font-bold text-yellow-700" title="Potential signs of file manipulation">${tamperingHints}</p>
                        </div>
                    </div>

                    <!-- Metadata Differences -->
                    <div class="mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
                        <h4 class="text-xl font-semibold text-gray-800 mb-2">Metadata Differences</h4>
                        ${Object.entries(diffs).length > 0 
                            ? Object.entries(diffs).map(([key, value]) => `
                                <div class="mb-2">
                                    <strong class="text-gray-700">${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>
                                    <p class="text-gray-600 ml-4">
                                        File 1: ${value.file1 || 'N/A'}<br>
                                        File 2: ${value.file2 || 'N/A'}
                                    </p>
                                </div>
                            `).join('')
                            : '<p class="text-gray-600">No metadata differences available.</p>'}
                    </div>

                    <!-- Detailed Comparison -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="info-card-container p-4">
                            <strong class="text-lg text-gray-800">Byte Differences:</strong>
                            <p class="text-xl text-gray-700">${comparison.byte_differences?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div class="info-card-container p-4">
                            <strong class="text-lg text-gray-800">Unique Strings:</strong>
                            <p class="text-xl text-gray-700">File 1: ${comparison.unique_strings_file1 || 'N/A'}, File 2: ${comparison.unique_strings_file2 || 'N/A'}</p>
                        </div>
                        <div class="info-card-container p-4">
                            <strong class="text-lg text-gray-800">Common Strings:</strong>
                            <p class="text-xl text-gray-700">${comparison.common_strings || 'N/A'} (${comparison.common_strings_list?.length || 0} items)</p>
                        </div>
                        <div class="info-card-container p-4">
                            <strong class="text-lg text-gray-800">Entropy Difference:</strong>
                            <p class="text-xl text-gray-700" title="Difference in randomness measure">${comparison.entropy_difference?.toFixed(6) || 'N/A'}</p>
                        </div>
                    </div>

                    <!-- Modal Triggers -->
                    <div class="mt-6 flex gap-4">
                        <button class="pairwise-trigger px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all" data-target="pairwise-entropy-${pairName.replace(/ /g, '-')}-dialog">View Entropy Histogram</button>
                        <button class="pairwise-trigger px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all" data-target="pairwise-printable-${pairName.replace(/ /g, '-')}-dialog">View Printable Strings</button>
                    </div>

                    <!-- Entropy Histogram Modal -->
                    <div id="pairwise-entropy-${pairName.replace(/ /g, '-')}-dialog" class="pairwise-overlay hidden fixed inset-0 bg-black bg-opacity-50 z-50">
                        <div class="pairwise-dialog bg-white p-6 rounded-lg max-w-3xl mx-auto mt-20">
                            <h4 class="text-2xl font-bold text-gray-900 mb-4">Entropy Histogram for ${pairName}</h4>
                            <div class="grid-hex-container">
                                ${Object.entries(comparison.entropy_histogram || {}).map(([value, frequency]) => `
                                    <div class="grid-hex" style="height: ${frequency * 100}px; background: hsl(${value * 1.4}, 70%, 50%);">
                                        <span class="grid-hex-value">${value}</span>
                                        <span class="grid-hex-freq">${(frequency * 100).toFixed(2)}%</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="pairwise-close mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Close</button>
                        </div>
                    </div>

                    <!-- Printable Strings Modal -->
                    <div id="pairwise-printable-${pairName.replace(/ /g, '-')}-dialog" class="pairwise-overlay hidden fixed inset-0 bg-black bg-opacity-50 z-50">
                        <div class="pairwise-dialog bg-white p-6 rounded-lg max-w-3xl mx-auto mt-20">
                            <h4 class="text-2xl font-bold text-gray-900 mb-4">Printable Strings for ${pairName}</h4>
                            <div class="grid-hex-container overflow-y-auto max-h-96">
                                ${comparison.printable_strings?.map((str, index) => `
                                    <div class="grid-hex" style="background: #e0e7ff;">
                                        <span class="grid-hex-value">${index.toString(16).padStart(2, '0')}</span>
                                        <span class="grid-hex-freq">${str}</span>
                                    </div>
                                `).join('') || '<p class="text-gray-600">No printable strings available.</p>'}
                            </div>
                            <button class="pairwise-close mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Close</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="text-gray-600">No pairwise comparisons available.</p>');

      renderContent('pairwise', content);

      // Modal Functionality
      document.querySelectorAll('.pairwise-trigger').forEach(button => {
          button.addEventListener('click', () => {
              const modalId = button.getAttribute('data-target');
              const modal = document.getElementById(modalId);
              if (modal) {
                  modal.classList.remove('hidden');
              }
          });
      });

      document.querySelectorAll('.pairwise-close').forEach(button => {
          button.addEventListener('click', () => {
              const modal = button.closest('.pairwise-overlay');
              if (modal) {
                  modal.classList.add('hidden');
              }
          });
      });

      document.addEventListener('click', (e) => {
          document.querySelectorAll('.pairwise-overlay').forEach(modal => {
              if (!modal.contains(e.target) && !e.target.classList.contains('pairwise-trigger')) {
                  modal.classList.add('hidden');
              }
          });
      });
  }

                // Initial render
                renderIndividualAnalyses();
                renderPairwiseComparisons();
                renderVerdictSummary();

                // Tab switching
                const tabs = document.querySelectorAll('.tab');
                const tabContents = document.querySelectorAll('.tab-content');
                if (tabs.length && tabContents.length) {
                    tabs.forEach(tab => {
                        tab.addEventListener('click', () => {
                            console.log(`Clicked tab: ${tab.dataset.tab}`); // Debug: Track clicks
                            tabs.forEach(t => t.removeAttribute('data-active'));
                            tabContents.forEach(content => content.style.display = 'none');
                            tab.setAttribute('data-active', '');
                            const activeContent = document.getElementById(tab.dataset.tab);
                            if (activeContent) {
                                activeContent.style.display = 'block';
                                // Re-render on switch only if content is empty
                                if (activeContent.innerHTML === '') {
                                    if (tab.dataset.tab === 'individual') renderIndividualAnalyses();
                                    else if (tab.dataset.tab === 'pairwise') renderPairwiseComparisons();
                                    else if (tab.dataset.tab === 'verdict') renderVerdictSummary();
                                }
                            }
                        });
                    });
                    // Set initial active tab
                   tabs[0].setAttribute('data-active', '');
    document.getElementById('verdict').style.display = 'block';
                } else {
                    console.error('Tabs or tab contents not found in DOM');
                }
            })
            .catch(error => {
                console.error('Error fetching report:', error);
                analyticsSection.innerHTML = `<p class="text-red-600">Failed to load analysis results: ${error.message}</p>`;
                showToast(`Error loading report: ${error.message}`);
            });
    }
}

// Update the existing DOMContentLoaded listener to remove the invalid call
document.addEventListener('DOMContentLoaded', () => {
    // No need to call renderExifResults here unless you have specific initialization data
    // Example: If you want to test with a hardcoded URL, uncomment and provide data:
    // renderExifResults({ report_url: "http://127.0.0.1:8000/response/comparator/JSON-20251023_125222-35cd7960-ed76-45b4-b2c7-88ee90be5738.json" });
});
function resetModalx1() {
    document.getElementById('step-1x1').classList.add('active');
    document.getElementById('step-2x1').classList.remove('active');
    document.getElementById('progress-barx1').style.width = '50%';
    document.getElementById('step-1-indicatorx1').classList.add('active-stepx1');
    document.getElementById('step-2-indicatorx1').classList.remove('active-stepx1');
    document.getElementById('evidenceNamex1').value = '';
    document.getElementById('evidenceDescriptionx1').value = '';
    document.getElementById('datex1').value = '2025-10-11';
    document.getElementById('filePreviewx1').innerHTML = '';
    const analyticsSection = document.getElementById('analytics_section');
    if (analyticsSection) analyticsSection.innerHTML = '<div class="no-processx1">No process yet...</div>';
    document.getElementById('compareExifBtnx1').disabled = true;
    selectedFiles = [];
    metadata = {};
}

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