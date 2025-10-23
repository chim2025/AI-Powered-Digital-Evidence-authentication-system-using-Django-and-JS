// Declare global variables
let selectedFiles = []; // Cumulative array to store all selected files
let metadata = {}; // Store metadata for all selected files

// Modal toggle functionality
document.getElementById('openExifComparatorx1').addEventListener('click', function() {
    document.getElementById('exifComparatorModalx1').style.display = 'block';
    
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
            // Avoid duplicates
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
                    selectedFiles = selectedFiles.filter(f => f.name !== file.name); // Remove from selectedFiles
                    // Update metadata when a file is removed
                    delete metadata[file.name];
                    updateCompareButton();
                });
            }
        });
        // Update metadata for new files
        newFiles.forEach(file => {
            if (!metadata[file.name]) {
                metadata[file.name] = {
                    size_bytes: file.size,
                    modification_time: new Date(file.lastModified).toISOString(),
                    creation_time: new Date(file.lastModified).toISOString() // Note: Browser may use lastModified as a proxy for creation time
                };
                // Use exif-js for EXIF data (requires <script src="https://cdn.jsdelivr.net/npm/exif-js"></script>)
                if (file.type.startsWith('image/')) {
                    EXIF.getData(file, function() {
                        const exifData = EXIF.getAllTags(this);
                        if (exifData && Object.keys(exifData).length > 0) {
                            metadata[file.name].exif = exifData;
                        }
                    });
                }
            }
        });
        updateCompareButton();
    }
    // Clear input to allow adding more files
    e.target.value = '';
});

function updateCompareButton() {
    const previews = document.getElementById('filePreviewx1').children;
    document.getElementById('compareExifBtnx1').disabled = previews.length < 2;
}

document.getElementById('compareExifBtnx1').addEventListener('click', async function() {
    const previewFiles = Array.from(document.getElementById('filePreviewx1').children).map(child => ({
        name: child.querySelector('.file-infox1 p').textContent.replace('Name: ', ''),
        fileId: child.querySelector('.cancel-iconx1').getAttribute('data-file-id')
    }));
    if (previewFiles.length >= 2) {
        console.log('Initiating comparison for ' + previewFiles.length + ' files at ' + new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Lagos' }));
        console.log('Comparing EXIF data for ' + previewFiles.length + ' files. File IDs: ' + previewFiles.map(f => f.fileId).join(', '));
        const formData = new FormData();
        console.log('Number of selected files:', selectedFiles.length); // Debug log
        if (!selectedFiles || selectedFiles.length === 0) {
            console.warn('No selected files available.');
            return;
        }
        selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });
        // Add metadata to formData
        formData.append('metadata', JSON.stringify(metadata));
        for (let pair of formData.entries()) {
            console.log(pair[0] + ', ' + (pair[0] === 'metadata' ? pair[1] : pair[1].name));
        }
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
                console.error('HTTP error! Status:', response.status, 'URL:', response.url);
            }
            const data = await response.json();
            console.log('Response from server:', data); // Log the response for debugging
            if (data.status === 'success') {
                console.log('Report URL:', data.report_url);
            } else {
                console.error('Error:', data.error);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }
});

function resetModalx1() {
    document.getElementById('step-1x1').classList.add('active');
    document.getElementById('step-2x1').classList.remove('active');
    document.getElementById('progress-barx1').style.width = '50%';
    document.getElementById('step-1-indicatorx1').classList.add('active-stepx1');
    document.getElementById('step-2-indicatorx1').classList.remove('active-stepx1');
    document.getElementById('evidenceNamex1').value = '';
    document.getElementById('evidenceDescriptionx1').value = '';
    document.getElementById('datex1').value = '2025-10-10';
    document.getElementById('filePreviewx1').innerHTML = '';
    document.getElementById('compareExifBtnx1').disabled = true;
    selectedFiles = []; // Clear stored files
    metadata = {}; // Clear metadata
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