
document.addEventListener('DOMContentLoaded', () => {
    const cached = localStorage.getItem('lastExifReport');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.status === 'success') {
                console.log('Using cached EXIF report');
                renderExifResults(parsed);  
            }
        } catch (e) {
            console.error('Failed to parse cached EXIF data', e);
            localStorage.removeItem('lastExifReport'); 
        }
    }
});


let selectedFiles = []; 
let metadata = {};


document.getElementById('openExifComparatorx1').addEventListener('click', function() {
    document.getElementById('exifComparatorModalx1').style.display = 'block';
    const dateInput = document.getElementById('datex1');
    dateInput.value = '2025-10-11'; 
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
                localStorage.setItem('lastExifReport', JSON.stringify(data));
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

function renderExifResults (data = null) {
    
    const fileUrls = data?.file_url?.file_urls || [];
    console.log(fileUrls)

    function filePreviews(selectedFiles = [], fileUrls = []) {
    // Build a list of files to render
    const filesToRender = [];

    // 1. Use selectedFiles if available (first load)
    if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, idx) => {
            const staticUrl = fileUrls[idx];
            filesToRender.push({ file, staticUrl });
        });
    }
    // 2. If no selectedFiles → use fileUrls only (refresh)
    else if (fileUrls.length > 0) {
        fileUrls.forEach(staticUrl => {
            filesToRender.push({ file: null, staticUrl });
        });
    }

    // 3. Nothing? → empty message
    if (filesToRender.length === 0) {
        return '<p class="text-gray-500">No files previewed.</p>';
    }

    return filesToRender.map(({ file, staticUrl }) => {
        const hasObjectUrl = !!file;
        const src = hasObjectUrl ? URL.createObjectURL(file) : staticUrl;

        const preview = (() => {
            if (!src) return `<p class="text-gray-500 mt-2">Preview unavailable</p>`;

            const isImage = file?.type?.startsWith('image/') || 
                           staticUrl?.match(/\.(jpe?g|png|gif|bmp|webp)$/i);
            const isPdf = file?.type === 'application/pdf' || 
                         staticUrl?.endsWith('.pdf');

            if (isImage) {
                return `<img src="${src}" alt="${file?.name || staticUrl.split('/').pop()}"
                             class="w-full h-48 object-cover rounded mt-2" style="max-height:300px;">`;
            }
            if (isPdf) {
                return `<iframe src="${src}" class="w-full h-48 mt-2"
                                title="${file?.name || staticUrl.split('/').pop()}"></iframe>`;
            }
            return `<p class="text-gray-500 mt-2">Preview unavailable</p>`;
        })();

        const displayName = file?.name || (staticUrl ? staticUrl.split('/').pop() : 'Unknown');
        const fileExt = file?.type?.split('/')[1]?.toUpperCase() || 
                       staticUrl?.split('.').pop()?.toUpperCase() || 'FILE';

        return `
            <div class="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <p class="text-sm text-gray-600">Name: ${displayName}</p>
                ${preview}
                <span class="file-typex1">${fileExt}</span>
            </div>`;
    }).join('');
}
    const analyticsSection = document.getElementById('analytics_section');
    if (!analyticsSection) {
        console.error("analytics_section element not found");
        showToast("Error: Analytics section not found.");
        return;
    }
    if (!data) {
        const cached = localStorage.getItem('lastExifReport');
        if (cached) {
            try {
                data = JSON.parse(cached);
                console.log('Using cached data for renderExifResults');
            } catch (e) {
                console.error('Corrupted cached data', e);
                localStorage.removeItem('lastExifReport');
            }
        }
    }
    if (!data || data.status !== 'success') {
        analyticsSection.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="material-icons text-6xl mb-4 text-gray-300">image_search</i>
                <h3 class="text-xl font-semibold mb-2">No EXIF Analysis Yet</h3>
                <p>Upload files to start analyzing.</p>
            </div>
        `;
        return;
    }

    analyticsSection.innerHTML = `
   <div id="magic-loading-screen" class="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
    <!-- STARS BACKGROUND -->
    <div class="stars"></div>
    <div class="stars2"></div>
    <div class="stars3"></div>

    <!-- CURTAINS (closed at start) -->
    <div id="curtain-left" class="curtain curtain-left"></div>
    <div id="curtain-right" class="curtain curtain-right"></div>

    <!-- MAGIC CHARACTER -->
    <div id="magic-assistant" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-64 opacity-0">
        <div class="relative">
            <!-- Body -->
            <div class="w-24 h-32 mx-auto bg-gradient-to-b from-purple-400 to-purple-600 rounded-full shadow-2xl animate-float"></div>
            <!-- Head -->
            <div class="w-20 h-20 mx-auto -mt-8 bg-gradient-to-b from-pink-300 to-pink-400 rounded-full shadow-xl relative overflow-hidden">
                <div class="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                <!-- Eyes -->
                <div class="absolute top-5 left-4 w-3 h-4 bg-black rounded-full animate-blink"></div>
                <div class="absolute top-5 right-4 w-3 h-4 bg-black rounded-full animate-blink"></div>
                <!-- Smile -->
                <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-pink-600 rounded-full"></div>
            </div>
            <!-- Wand -->
            <div id="wand" class="absolute top-12 -right-8 w-16 h-1 bg-yellow-400 rounded-full origin-left transform rotate-45 shadow-lg">
                <div class="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-300 rounded-full animate-ping"></div>
            </div>
            <!-- Magic Particles -->
            <div class="magic-particles"></div>
        </div>
    </div>

    <!-- TEXT -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white opacity-0" id="loading-text">
        <h1 class="text-5xl font-bold mb-4 tracking-wider animate-glow">Initializing Magic...</h1>
        <p class="text-xl animate-typewriter">Preparing the presentation layer</p>
    </div>

    <!-- SPARKLES -->
    <div class="sparkles"></div>
</div>
`;

setTimeout(() => {
    const screen = document.getElementById('magic-loading-screen');
    const assistant = document.getElementById('magic-assistant');
    const text = document.getElementById('loading-text');
    const curtainL = document.getElementById('curtain-left');
    const curtainR = document.getElementById('curtain-right');

    assistant.style.opacity = '1';
    assistant.style.transition = 'opacity 1s ease';

 
    setTimeout(() => {
        text.style.opacity = '1';
        text.style.transition = 'opacity 1s ease';
    }, 800);

    setTimeout(() => {
        const wand = document.getElementById('wand');
        wand.style.transform = 'rotate(0deg) scale(1.5)';
        wand.style.transition = 'transform 0.5s ease';
        
      
        const particles = document.querySelector('.magic-particles');
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                width: 6px; height: 6px;
                background: #1c752bff;
                border-radius: 50%;
                left: 50%; top: 50%;
                --x: ${(Math.random() - 0.5) * 300}px;
                --y: ${(Math.random() - 0.5) * 300}px;
                animation: particle 1.5s forwards;
            `;
            particles.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }, 2000);

    // 4. OPEN CURTAIN AFTER 3.5s
    setTimeout(() => {
        curtainL.classList.add('open');
        curtainR.classList.add('open');
        
       
        // const sound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magic-notification-2348.mp3');
        // sound.play().catch(() => {});

       
        setTimeout(() => {
            screen.style.transition = 'opacity 1s ease';
            screen.style.opacity = '0';
            setTimeout(() => screen.remove(), 1000);
        }, 1500);
    }, 3500);

}, 100);



        fetch(data.report_url)
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP error! Status: ${r.status}`);
                }
                return r.json();
            })
            .then(reportData => {
                console.log("Fetched reportData:", reportData);
                
                
                
                
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
                    ${filePreviews(selectedFiles, fileUrls)}
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
                <div class="card p-4 bg-gray-50 border-l-4 border-gray-600" title="Average similarity between file pairs">
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

function renderIndividualAnalyses() {
    const content = Object.entries(reportData.individual_analyses).map(([fileName, analysis], index) => {
        const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-');

        return `
            <!-- COLLAPSIBLE CARD -->
            <div class="file-analysis-card ${index === 0 ? 'expanded' : 'collapsed'} mb-6 p-6 bg-gray-50/80 rounded-xl shadow-lg" data-index="${index}">
               <div class="file-header cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#b8c9b8] to-[#6a973f] text-white rounded-t-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]" onclick="toggleAnalysisCard(event, this)">
    <div class="flex items-center gap-3">
        <i class="material-icons text-2xl">${getFileIcon(analysis.types.mime_type)}</i>
        <div>
            <h3 class="text-xl font-bold break-all">${fileName}</h3>
            <div class="text-xs opacity-90 flex items-center gap-2 mt-1">
                <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                    ${analysis.types.mime_type}
                </span>
                <span class="text-xs">
                    ${analysis.metadata.size_readable || 'N/A'}
                </span>
            </div>
        </div>
    </div>

    <!-- RIGHT: Expand Icon + Optional Status -->
    <div class="flex items-center gap-3">
        ${analysis.tampering_hints?.length > 0 ? `
        <div class="flex items-center gap-1 text-red-200">
            <i class="material-icons text-lg">warning</i>
            <span class="text-xs">Tampered</span>
        </div>` : ''}
        
        <i class="material-icons text-2xl transition-transform duration-300 ${index === 0 ? 'rotate-180' : ''}">expand_more</i>
    </div>
</div>

                <div class="file-body ${index === 0 ? '' : 'hidden'}">
    <!-- MAIN GRID LAYOUT -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <!-- Path -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-blue-600 text-lg">folder_open</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">Path</div>
                <div class="text-sm break-all">${analysis.path || 'N/A'}</div>
            </div>
        </div>

        <!-- Type -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-green-600 text-lg">verified</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">Type</div>
                <div class="text-sm">${analysis.types.mime_type}</div>
                <div class="text-xs mt-1 ${analysis.types.signature_matches_extension ? 'text-green-600' : 'text-red-600'}">
                    ${analysis.types.signature_matches_extension ? 'Signature matches' : 'Signature mismatch'}
                </div>
            </div>
        </div>

        <!-- Entropy -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-purple-600 text-lg">bar_chart</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">Entropy</div>
                <div class="text-sm font-mono">${analysis.entropy?.toFixed(6) || 'N/A'}</div>
            </div>
        </div>

        <!-- Dimensions -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-orange-600 text-lg">photo_size_select_actual</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">Dimensions</div>
                <div class="text-sm">${analysis.dimensions.width || 'N/A'} × ${analysis.dimensions.height || 'N/A'}</div>
                ${analysis.dimensions.error ? `<div class="text-xs text-red-600 mt-1">${analysis.dimensions.error}</div>` : ''}
            </div>
        </div>

        <!-- JPEG LSB Entropy -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-teal-600 text-lg">texture</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">JPEG LSB Entropy</div>
                <div class="text-sm font-mono">${analysis.jpeg_lsb_entropy?.toFixed(6) || 'N/A'}</div>
            </div>
        </div>

        <!-- Compression Ratio -->
        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
            <i class="material-icons text-pink-600 text-lg">compress</i>
            <div>
                <div class="font-semibold text-sm text-gray-700">Compression Ratio</div>
                <div class="text-sm font-mono">${analysis.compression_ratio?.toFixed(2) || 'N/A'}</div>
            </div>
        </div>
    </div>

    <!-- HASHES (Grid) -->
    <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
            <i class="material-icons text-indigo-600">fingerprint</i>
            <strong>Hashes</strong>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div class="bg-gray-100 p-3 rounded border text-xs font-mono">
                <div class="text-gray-600">MD5</div>
                <div class="break-all">${analysis.hashes.md5 || 'N/A'}</div>
            </div>
            <div class="bg-gray-100 p-3 rounded border text-xs font-mono">
                <div class="text-gray-600">SHA1</div>
                <div class="break-all">${analysis.hashes.sha1 || 'N/A'}</div>
            </div>
            <div class="bg-gray-100 p-3 rounded border text-xs font-mono">
                <div class="text-gray-600">SHA256</div>
                <div class="break-all">${analysis.hashes.sha256 || 'N/A'}</div>
            </div>
            <div class="bg-gray-100 p-3 rounded border text-xs font-mono">
                <div class="text-gray-600">SHA512</div>
                <div class="break-all">${analysis.hashes.sha512 || 'N/A'}</div>
            </div>
            <div class="bg-gray-100 p-3 rounded border text-xs font-mono">
                <div class="text-gray-600">CRC32</div>
                <div class="break-all">${analysis.hashes.crc32 || 'N/A'}</div>
            </div>
        </div>
    </div>

    <!-- METADATA (Grid) -->
    <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
            <i class="material-icons text-cyan-600">info</i>
            <strong>Metadata</strong>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div class="bg-white p-3 rounded border">
                <strong>Size:</strong> ${analysis.metadata.size_readable || 'N/A'} (${analysis.metadata.size_bytes || 'N/A'} bytes)
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Modified:</strong> ${analysis.metadata.modification_time_readable || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Accessed:</strong> ${analysis.metadata.access_time_readable || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Created:</strong> ${analysis.metadata.creation_time_readable || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Inode:</strong> ${analysis.metadata.inode || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Permissions:</strong> ${analysis.metadata.permissions_octal || 'N/A'} (${analysis.metadata.permissions_symbolic || 'N/A'})
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Owner:</strong> UID ${analysis.metadata.owner_uid || 'N/A'}, GID ${analysis.metadata.group_gid || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>File Type:</strong> ${analysis.metadata.file_type || 'N/A'}
            </div>
            <div class="bg-white p-3 rounded border">
                <strong>Device ID:</strong> ${analysis.metadata.device_id || 'N/A'}, Links: ${analysis.metadata.hard_links || 'N/A'}
            </div>
        </div>
    </div>

    <!-- TAMPERING HINTS -->
    ${analysis.tampering_hints?.length > 0 ? `
    <div class="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2">
        <i class="material-icons text-red-600">warning</i>
        <div>
            <strong class="text-red-800">Tampering Hints:</strong>
            <span class="text-red-700">${analysis.tampering_hints.join(', ')}</span>
        </div>
    </div>` : ''}

    <!-- EMBEDDED SIGNATURES -->
    ${analysis.embedded_signatures?.length > 0 ? `
    <div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-2">
        <i class="material-icons text-yellow-600">security</i>
        <div>
            <strong class="text-yellow-800">Embedded Signatures:</strong>
            <span class="text-yellow-700">${analysis.embedded_signatures.join(', ')}</span>
        </div>
    </div>` : '<div class="mb-4 p-3 bg-gray-100 border rounded-lg text-gray-600"><strong>Embedded Signatures:</strong> None</div>'}

    <!-- ERRORS -->
    ${analysis.errors?.length > 0 ? `
    <div class="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-start gap-2">
        <i class="material-icons text-orange-600">error</i>
        <div>
            <strong class="text-orange-800">Errors:</strong>
            <span class="text-orange-700">${analysis.errors.join(', ')}</span>
        </div>
    </div>` : ''}

    <!-- EXIF -->
    <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
            <i class="material-icons text-lime-600">camera_alt</i>
            <strong>EXIF</strong>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            ${Object.entries(analysis.exif || {}).length > 0 ? 
                Object.entries(analysis.exif).map(([key, value]) => `
                    <div class="bg-white p-2 rounded border text-xs">
                        <strong class="text-gray-600">${key}:</strong> <span class="font-mono">${value || 'N/A'}</span>
                    </div>
                `).join('') 
                : '<div class="bg-gray-100 p-3 rounded border text-gray-500">No EXIF data</div>'
            }
        </div>
    </div>

    <!-- ACTION BUTTONS (Flex) -->
    <div class="mt-6 flex gap-3 flex-wrap justify-start">
        <button class="pairwise-trigger px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                data-target="individual-entropy-${safeFileName}-dialog">
            <i class="material-icons text-sm">table_chart</i> Entropy Table
        </button>
        <button class="pairwise-trigger px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                data-target="individual-printable-${safeFileName}-dialog">
            <i class="material-icons text-sm">text_fields</i> Strings
        </button>
        <button class="pairwise-trigger px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium flex items-center gap-2"
                data-target="individual-hex-${safeFileName}-dialog">
            <i class="material-icons text-sm">code</i> Hex Viewer
        </button>
    </div>
</div>
                    <!-- Entropy Histogram Modal -->
                    <div id="individual-entropy-${safeFileName}-dialog"
                         class="pairwise-overlay hidden fixed inset-0 z-50">
                        <div class="pairwise-dialog bg-gray-900 text-gray-100 p-6 rounded-lg w-11/12 max-w-5xl shadow-2xl border border-gray-700"
                             style="max-height:90vh;">
                            <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                <h4 class="text-xl font-mono font-bold text-green-400">Entropy Table for — ${fileName}</h4>
                                <button class="pairwise-close text-gray-400 hover:text-red-400">
                                    <i class="material-icons text-xl">close</i>
                                </button>
                            </div>
                            <div class="overflow-auto bg-black rounded border border-gray-800 p-2"
                                 style="max-height:calc(90vh - 120px);">
                                <table class="entropy-table">
                                    <thead>
                                        <tr>
                                            <th>Offset</th><th>Byte</th><th>Frequency</th><th>Bar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${Object.entries(analysis.entropy_histogram || {})
                                            .sort(([a],[b])=>+a-+b)
                                            .map(([byte,freq])=>{
                                                const pct = (freq*100).toFixed(4);
                                                const barW = Math.max(1, Math.round(freq*500));
                                                const hex = (+byte).toString(16).toUpperCase().padStart(2,'0');
                                                return `<tr class="entropy-row">
                                                    <td>${hex}</td>
                                                    <td class="entropy-byte">${hex}</td>
                                                    <td>${pct}%</td>
                                                    <td><div class="entropy-bar" style="width:${barW}px;"></div></td>
                                                </tr>`;
                                            }).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-2 text-right text-xs text-gray-500">
                                <span class="inline-block w-3 h-3 bg-green-500 mr-1"></span> High &nbsp;
                                <span class="inline-block w-3 h-3 bg-red-500 mr-1"></span> Low
                            </div>
                        </div>
                    </div>

                    <!-- Printable Strings Modal -->
                    <div id="individual-printable-${safeFileName}-dialog"
                         class="pairwise-overlay hidden fixed inset-0 z-50">
                        <div class="pairwise-dialog bg-gray-900 text-gray-100 p-6 rounded-lg w-11/12 max-w-6xl shadow-2xl border border-gray-700"
                             style="max-height:90vh; max-width:1000px;">
                            <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                <h4 class="text-xl font-mono font-bold text-cyan-400">Printable Strings — ${fileName}</h4>
                                <button class="pairwise-close text-gray-400 hover:text-red-400">
                                    <i class="material-icons text-xl">close</i>
                                </button>
                            </div>
                            <div class="modal-toolbar">
                                <input type="text" class="strings-search hex-search" placeholder="Search strings..." />
                                <button class="modal-btn strings-copy">Copy</button>
                                <button class="modal-btn strings-download">Download </button>
                            </div>
                            <div class="overflow-auto bg-black p-3 flex-1" style="max-height:calc(90vh - 140px);">
                                <pre id="strings-content-${safeFileName}" class="hex-dump text-xs leading-tight">
${(() => {
    const strings = analysis.printable_strings || [];
    if (!strings.length) return '<span class="text-gray-600">No printable strings found.</span>';
    let out = '', offset = 0, BPL = 16;
    strings.forEach((s, i) => {
        if (i > 0) out += '\n';
        const bytes = [...s].map(c => {
            const code = c.charCodeAt(0);
            return { h: code.toString(16).toUpperCase().padStart(2,'0'), c: (code >= 32 && code <= 126) ? c : '.' };
        });
        let h = '', a = '', off = offset;
        bytes.forEach((b, j) => {
            h += b.h + ' '; a += b.c;
            if ((j+1) % BPL === 0 || j === bytes.length-1) {
                const os = off.toString(16).toUpperCase().padStart(8,'0');
                const ph = h.trim().padEnd(BPL*3-1,' ');
                const pa = a.padEnd(BPL,' ');
                out += `${os}  ${ph}  |${pa}|\n`;
                off += BPL; h = ''; a = '';
            }
        });
        offset += Math.ceil(bytes.length / BPL) * BPL;
    });
    return out;
})()}
                                </pre>
                            </div>
                            <div class="mt-2 text-right text-xs text-gray-500">
                                Offset | Hex | ASCII
                            </div>
                        </div>
                    </div>

                    <!-- Hex Viewer Modal -->
                    <div id="individual-hex-${safeFileName}-dialog" class="pairwise-overlay hidden fixed inset-0 z-50">
                        <div class="pairwise-dialog" style="width:95vw; max-width:1200px;">
                            <div class="modal-header">
                                <div class="modal-title">Hex Viewer — ${fileName}</div>
                                <button class="pairwise-close text-gray-400 hover:text-red-400">
                                    <i class="material-icons text-xl">close</i>
                                </button>
                            </div>
                            <div class="modal-toolbar">
                                <input type="text" class="hex-search" placeholder="Search hex or ASCII..." />
                                <button class="modal-btn hex-copy">Copy</button>
                                <button class="modal-btn hex-download">Download .txt</button>
                            </div>
                            <div class="overflow-auto bg-black p-3 flex-1" style="max-height:calc(90vh - 140px);">
                                <pre id="hex-content-${safeFileName}" class="leading-tight text-xs">
${(() => {
    const strings = analysis.printable_strings || [];
    const raw = strings.join('\n');
    const bytes = new Uint8Array(raw.split('').map(c => c.charCodeAt(0)));
    const histogram = analysis.entropy_histogram || {};
    let out = '';
    const BPL = 16;
    for (let i = 0; i < bytes.length; i += BPL) {
        const chunk = bytes.slice(i, i + BPL);
        const offset = i.toString(16).toUpperCase().padStart(8, '0');
        let hex = '', ascii = '';
        chunk.forEach((b, j) => {
            const hexVal = b.toString(16).toUpperCase().padStart(2, '0');
            const freq = histogram[b] || 0;
            const entropyClass = freq > 0.007 ? 'hex-entropy-high' :
                                freq > 0.004 ? 'hex-entropy-med' : 'hex-entropy-low';
            hex += `<span class="hex-byte ${entropyClass}">${hexVal}</span> `;
            ascii += `<span class="ascii-char ${entropyClass}">${b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'}</span>`;
        });
        const padCount = BPL - chunk.length;
        hex += '   '.repeat(padCount);
        ascii += ' '.repeat(padCount);
        out += `<div class="hex-line" data-offset="${offset}">
    <span class="text-gray-500">${offset}</span>  ${hex} |${ascii}|
</div>`;
    }
    return out || '<span class="text-gray-600">No data to display.</span>';
})()}
                                </pre>
                            </div>
                            <div class="entropy-legend text-gray-500">
                                <span><div class="w-3 h-3 bg-[#300] inline-block"></div> Low</span>
                                <span><div class="w-3 h-3 bg-[#630] inline-block"></div> Medium</span>
                                <span><div class="w-3 h-3 bg-[#360] inline-block"></div> High Entropy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
    function getFileIcon(mime) {
    if (!mime) return 'insert_drive_file';
    const type = mime.toLowerCase();
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('video')) return 'video_file';
    if (type.includes('audio')) return 'audio_file';
    if (type.includes('text')) return 'description';
    if (type.includes('zip') || type.includes('rar')) return 'archive';
    return 'insert_drive_file';
}

    renderContent('individual', content);

    // ——— ACCORDION COLLAPSE: Only one open at a time ———
    window.toggleAnalysisCard = function(e, header) {
        e.stopPropagation();
        const card = header.parentElement;
        const body = card.querySelector('.file-body');
        const icon = header.querySelector('i');
        const isCurrentlyOpen = !body.classList.contains('hidden');

        // Close ALL cards
        document.querySelectorAll('.file-analysis-card').forEach(c => {
            c.querySelector('.file-body').classList.add('hidden');
            c.querySelector('.file-header i').classList.remove('rotate-180');
            c.classList.remove('expanded');
            c.classList.add('collapsed');
        });

        // Open clicked one if it wasn't open
        if (!isCurrentlyOpen) {
            body.classList.remove('hidden');
            icon.classList.add('rotate-180');
            card.classList.remove('collapsed');
            card.classList.add('expanded');
        }
    };

    // ——— MODAL OPEN/CLOSE (unchanged) ———
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

    // ——— DRAGGABLE MODALS ———
    document.querySelectorAll('.modal-header').forEach(header => {
        let modal = header.parentElement;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = dragMouseDown;
        function dragMouseDown(e) {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDrag;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            modal.style.top = (modal.offsetTop - pos2) + "px";
            modal.style.left = (modal.offsetLeft - pos1) + "px";
        }
        function closeDrag() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    });

    // ——— SEARCH (Strings & Hex) ———
    document.querySelectorAll('.strings-search, .hex-search').forEach(input => {
        const pre = input.closest('.pairwise-dialog').querySelector('pre');
        input.addEventListener('input', () => {
            const term = input.value.toLowerCase();
            const lines = pre.innerHTML.split('\n');
            pre.innerHTML = lines.map(line => {
                if (!term || line.toLowerCase().includes(term)) {
                    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    return line.replace(regex, `<mark class="bg-yellow-500 text-black">${term}</mark>`);
                }
                return line;
            }).join('\n');
        });
    });

    // ——— COPY & DOWNLOAD ———
    document.querySelectorAll('.strings-copy, .hex-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const pre = btn.closest('.pairwise-dialog').querySelector('pre');
            navigator.clipboard.writeText(pre.innerText).then(() => {
                alert('Copied to clipboard!');
            });
        });
    });

    document.querySelectorAll('.strings-download, .hex-download').forEach(btn => {
        btn.addEventListener('click', () => {
            const pre = btn.closest('.pairwise-dialog').querySelector('pre');
            const titleEl = btn.closest('.pairwise-dialog').querySelector('.modal-title');
            const fileName = titleEl?.innerText.split(' — ')[1] || 'file';
            const blob = new Blob([pre.innerText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName.replace(/[^a-z0-9]/gi, '_')}_${btn.classList.contains('strings-download') ? 'strings' : 'hex'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    });
}
        
    function renderPairwiseComparisons() {
    
    const pairs = reportData.pairwise_comparisons;
    const hasPairs = pairs && Object.keys(pairs).length > 0;

    const content = hasPairs
        ? Object.entries(pairs).map(([pairName, comp], idx) => {
              
              const diffs = comp.metadata_diffs || {};
              const tampering = (comp.tampering_hints_combined?.join(', ')) || 'None';
              const isFirst = idx === 0;              

             
              return `
<div class="pairwise-card mb-8 bg-white rounded-xl shadow-lg border-l-4 border-green-600 overflow-hidden ${isFirst ? 'expanded' : 'collapsed'}"
     data-idx="${idx}">

    <!-- Header (click → accordion) -->
    <div class="pairwise-header cursor-pointer flex items-center justify-between p-4 bg-gradient-to-r from-[#b8c9b8] to-[#6a973f] text-white"
         onclick="togglePairwiseCard(event, this)">
        <div class="flex items-center gap-3">
            <i class="material-icons text-2xl">${getFileIcon(comp.file1_mime) || 'compare_arrows'}</i>
            <h3 class="text-xl font-bold">${pairName}</h3>
        </div>
        <i class="material-icons text-2xl transition-transform ${isFirst ? 'rotate-180' : ''}">expand_more</i>
    </div>

    <!-- Body (hidden when collapsed) -->
    <div class="pairwise-body p-6 ${isFirst ? '' : 'hidden'}">

        <!-- 4-key metric cards (grid) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="info-card p-4 bg-green-50 rounded-lg flex items-center gap-2">
                <i class="material-icons text-blue-600 animate-float">percent</i>
                <div>
                    <strong class="block text-gray-800">Similarity</strong>
                    <p class="text-2xl font-bold text-blue-700">${(comp.similarity_percentage?.toFixed(2) ?? 'N/A')}%</p>
                </div>
            </div>

            <div class="info-card p-4 bg-red-50 rounded-lg flex items-center gap-2">
                <i class="material-icons text-red-600 animate-bounce">not_interested</i>
                <div>
                    <strong class="block text-gray-800">Identical Hashes</strong>
                    <p class="text-2xl font-bold text-red-700">${comp.identical_hashes ? 'Yes' : 'No'}</p>
                </div>
            </div>

            <div class="info-card p-4 bg-green-50 rounded-lg flex items-center gap-2">
                <i class="material-icons text-green-600 animate-pulse">data_usage</i>
                <div>
                    <strong class="block text-gray-800">Size Difference</strong>
                    <p class="text-2xl font-bold text-green-700">${comp.size_difference_readable ?? 'N/A'}</p>
                </div>
            </div>

            <div class="info-card p-4 bg-yellow-50 rounded-lg flex items-center gap-2">
                <i class="material-icons text-yellow-600 animate-pulse">warning</i>
                <div>
                    <strong class="block text-gray-800">Tampering Hints</strong>
                    <p class="text-2xl font-bold text-yellow-700">${tampering}</p>
                </div>
            </div>
        </div>

       
<div class="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-inner border border-gray-200">
    <h4 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <i class="material-icons text-indigo-600">compare_arrows</i>
        Metadata Differences
    </h4>

    <div class="space-y-4">
        ${Object.keys(diffs).length > 0
            ? Object.entries(diffs).map(([key, value]) => {
               
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                
                const renderValue = (val, fileNum) => {
                    if (val === null || val === undefined) return '<span class="text-gray-400">N/A</span>';
                    if (typeof val === 'object') {
                        if (Object.keys(val).length === 0) return '<span class="text-gray-400">Empty</span>';
                        return `<pre class="text-xs bg-gray-800 text-green-300 p-2 rounded overflow-x-auto font-mono">${JSON.stringify(val, null, 2)}</pre>`;
                    }
                    return `<span class="font-medium">${val}</span>`;
                };

                return `
                <div class="diff-item bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div class="flex items-start gap-3">
                        <i class="material-icons text-gray-500 mt-1 text-lg">${getDiffIcon(key)}</i>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                ${label}
                                ${key.includes('time') ? `<i class="material-icons text-xs text-green-600" title="Timestamp">access_time</i>` : ''}
                                ${key === 'dimensions' ? `<i class="material-icons text-xs text-orange-600" title="Image size">photo_size_select_actual</i>` : ''}
                                ${key === 'exif' ? `<i class="material-icons text-xs text-purple-600" title="Camera metadata">camera_alt</i>` : ''}
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div class="p-3 bg-green-50 rounded-lg border border-blue-200">
                                    <div class="flex items-center gap-2 mb-1">
                                        <i class="material-icons text-green-600 text-sm">description</i>
                                        <strong>File 1</strong>
                                    </div>
                                    <div class="break-all">${renderValue(value.file1, 1)}</div>
                                </div>

                                <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div class="flex items-center gap-2 mb-1">
                                        <i class="material-icons text-red-600 text-sm">description</i>
                                        <strong>File 2</strong>
                                    </div>
                                    <div class="break-all">${renderValue(value.file2, 2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')
            : '<p class="text-center text-gray-500 py-4">No metadata differences found.</p>'
        }
    </div>
</div>

        <!-- Detailed numeric stats (grid) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="info-card p-4 bg-gray-50 rounded-lg">
                <strong class="block text-gray-800">Byte Differences</strong>
                <p class="text-xl text-gray-700">${(comp.byte_differences?.toLocaleString() ?? 'N/A')}</p>
            </div>

            <div class="info-card p-4 bg-gray-50 rounded-lg">
                <strong class="block text-gray-800">Unique Strings</strong>
                <p class="text-xl text-gray-700">
                    File 1: ${comp.unique_strings_file1 ?? 'N/A'}<br>
                    File 2: ${comp.unique_strings_file2 ?? 'N/A'}
                </p>
            </div>

            <div class="info-card p-4 bg-gray-50 rounded-lg">
                <strong class="block text-gray-800">Common Strings</strong>
                <p class="text-xl text-gray-700">
                    ${comp.common_strings ?? 'N/A'} (${comp.common_strings_list?.length ?? 0} items)
                </p>
            </div>

            <div class="info-card p-4 bg-gray-50 rounded-lg">
                <strong class="block text-gray-800">Entropy Difference</strong>
                <p class="text-xl text-gray-700">${(comp.entropy_difference?.toFixed(6) ?? 'N/A')}</p>
            </div>
        </div>

    </div> <!-- /.pairwise-body -->
</div> <!-- /.pairwise-card -->`;
          }).join('')
        : '<p class="text-center text-gray-600 py-8">No pairwise comparisons available.</p>';

    renderContent('pairwise', content);
    function getDiffIcon(key) {
    const icons = {
        size: 'storage',
        time: 'schedule',
        access_time: 'access_time',
        modification_time: 'update',
        creation_time: 'add_circle',
        inode: 'fingerprint',
        permissions: 'security',
        owner: 'person',
        dimensions: 'aspect_ratio',
        exif: 'camera_alt',
        compression: 'compress',
        entropy: 'bar_chart',
        hashes: 'lock',
        default: 'info'
    };
    const lowered = key.toLowerCase();
    return Object.keys(icons).find(k => lowered.includes(k)) 
        ? icons[Object.keys(icons).find(k => lowered.includes(k))] 
        : icons.default;
}

    // -----------------------------------------------------------------
    // 3. Accordion behaviour (only one card open at a time)
    // -----------------------------------------------------------------
    window.togglePairwiseCard = function (e, header) {
        e.stopPropagation();
        const card   = header.parentElement;
        const body   = card.querySelector('.pairwise-body');
        const icon   = header.querySelector('i:last-child');
        const wasOpen = !body.classList.contains('hidden');

        // close **all** cards
        document.querySelectorAll('.pairwise-card').forEach(c => {
            c.querySelector('.pairwise-body').classList.add('hidden');
            c.querySelector('.pairwise-header i:last-child').classList.remove('rotate-180');
            c.classList.remove('expanded');
            c.classList.add('collapsed');
        });

        // open the clicked one (if it wasn’t already open)
        if (!wasOpen) {
            body.classList.remove('hidden');
            icon.classList.add('rotate-180');
            card.classList.remove('collapsed');
            card.classList.add('expanded');
        }
    };

    // -----------------------------------------------------------------
    // 4. Tiny helper – file-type icon (reuse from individual analysis)
    // -----------------------------------------------------------------
    function getFileIcon(mime) {
        if (!mime) return 'insert_drive_file';
        const m = mime.toLowerCase();
        if (m.includes('image')) return 'image';
        if (m.includes('pdf'))   return 'picture_as_pdf';
        if (m.includes('video')) return 'video_file';
        if (m.includes('audio')) return 'audio_file';
        if (m.includes('text'))  return 'description';
        return 'insert_drive_file';
    }
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