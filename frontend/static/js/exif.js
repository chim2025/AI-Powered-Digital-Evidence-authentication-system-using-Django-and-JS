// Modal toggle functionality
document.getElementById('openExifComparatorx1').addEventListener('click', function() {
    document.getElementById('exifComparatorModalx1').style.display = 'block';
    const dateInput = document.getElementById('datex1');
    dateInput.value = '2025-10-10'; // Set to current date
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
        showToast("Fill In both the name and description")
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
    const files = e.target.files;
    const preview = document.getElementById('filePreviewx1');
    if (files.length > 0) {
        Array.from(files).forEach(file => {
            const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9); // Unique ID
            const div = document.createElement('div');
            div.className = 'preview-itemx1';
            let previewContent = '';

            // Image handling
            if (file.type.startsWith('image/')) {
                previewContent = `<img src="${URL.createObjectURL(file)}" alt="${file.name}" class="preview-imgx1">`;
            }
            // Video handling
            else if (file.type.startsWith('video/')) {
                previewContent = `<video controls class="preview-videox1"><source src="${URL.createObjectURL(file)}" type="${file.type}">Your browser does not support the video tag.</video>`;
            }
            // PDF handling with iframe
            else if (file.type === 'application/pdf') {
                previewContent = `<iframe src="${URL.createObjectURL(file)}" class="preview-pdfx1" title="${file.name}"></iframe>`;
            }
            // Text-based files (including JSON, CSV, etc.)
            else if (file.type.includes('text') || file.type === 'application/json' || file.type === 'text/csv') {
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
            }
            // Unsupported types
            else {
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

            // Add cancel functionality
            div.querySelector('.cancel-iconx1').addEventListener('click', function() {
                div.remove();
                updateCompareButton();
            });
        });
        updateCompareButton();
    }
    // Keep input value to allow multiple uploads
});

function updateCompareButton() {
    const previews = document.getElementById('filePreviewx1').children;
    document.getElementById('compareExifBtnx1').disabled = previews.length < 2;
}

// Compare button functionality (basic placeholder)
document.getElementById('compareExifBtnx1').addEventListener('click', function() {
    const files = Array.from(document.getElementById('filePreviewx1').children).map(child => ({
        name: child.querySelector('.file-infox1 p').textContent.replace('Name: ', ''),
        fileId: child.querySelector('.cancel-iconx1').getAttribute('data-file-id')
    }));
    if (files.length >= 2) {
        alert('Comparing EXIF data for ' + files.length + ' files. File IDs: ' + files.map(f => f.fileId).join(', '));
        // Send to backend using fileId
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
    document.getElementById('exifUploadx1').value = '';
    document.getElementById('filePreviewx1').innerHTML = '';
    document.getElementById('compareExifBtnx1').disabled = true;
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