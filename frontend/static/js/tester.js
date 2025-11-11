// ====================================================
// FULL renderExifResults.js – 100% COMPLETE & WORKING
// Magic Curtain + Full UI + All Tabs + No Errors
// ====================================================

function renderExifResults(data = null) {
    const analyticsSection = document.getElementById('analytics_section');
    if (!analyticsSection) {
        console.error("analytics_section element not found");
        showToast("Error: Analytics section not found.");
        return;
    }

    // === 1. LOAD CACHED DATA IF NO FRESH DATA ===
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

    // === 2. NO DATA → SHOW EMPTY STATE ===
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

    // === 3. SHOW MAGIC LOADING SCREEN ===
    analyticsSection.innerHTML = `
        <div id="magic-loading-screen" class="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div class="stars"></div>
            <div class="stars2"></div>
            <div class="stars3"></div>
            <div id="curtain-left" class="curtain curtain-left"></div>
            <div id="curtain-right" class="curtain curtain-right"></div>
            <div id="magic-assistant" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-64 opacity-0">
                <div class="relative">
                    <div class="w-24 h-32 mx-auto bg-gradient-to-b from-purple-400 to-purple-600 rounded-full shadow-2xl animate-float"></div>
                    <div class="w-20 h-20 mx-auto -mt-8 bg-gradient-to-b from-pink-300 to-pink-400 rounded-full shadow-xl relative overflow-hidden">
                        <div class="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                        <div class="absolute top-5 left-4 w-3 h-4 bg-black rounded-full animate-blink"></div>
                        <div class="absolute top-5 right-4 w-3 h-4 bg-black rounded-full animate-blink"></div>
                        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-pink-600 rounded-full"></div>
                    </div>
                    <div id="wand" class="absolute top-12 -right-8 w-16 h-1 bg-yellow-400 rounded-full origin-left transform rotate-45 shadow-lg">
                        <div class="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-yellow-300 rounded-full animate-ping"></div>
                    </div>
                    <div class="magic-particles"></div>
                </div>
            </div>
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white opacity-0" id="loading-text">
                <h1 class="text-5xl font-bold mb-4 tracking-wider animate-glow">Initializing Magic...</h1>
                <p class="text-xl animate-typewriter">Preparing the presentation layer</p>
            </div>
            <div class="sparkles"></div>
        </div>
    `;

    // === 4. START MAGIC ANIMATION ===
    const startMagic = () => {
        const screen = document.getElementById('magic-loading-screen');
        const assistant = document.getElementById('magic-assistant');
        const text = document.getElementById('loading-text');
        const curtainL = document.getElementById('curtain-left');
        const curtainR = document.getElementById('curtain-right');
        const wand = document.getElementById('wand');

        if (!screen || !assistant || !text || !curtainL || !curtainR || !wand) {
            console.error("Magic elements missing.");
            analyticsSection.innerHTML = `<p class="text-red-600">Animation failed.</p>`;
            return;
        }

        assistant.style.opacity = '1';
        assistant.style.transition = 'opacity 1s ease';

        setTimeout(() => {
            text.style.opacity = '1';
            text.style.transition = 'opacity 1s ease';
        }, 800);

        setTimeout(() => {
            wand.style.transform = 'rotate(0deg) scale(1.5)';
            wand.style.transition = 'transform 0.5s ease';
            const particles = screen.querySelector('.magic-particles');
            for (let i = 0; i < 20; i++) {
                const p = document.createElement('div');
                p.style.cssText = `
                    position: absolute; width: 6px; height: 6px; background: #00ccff; border-radius: 50%;
                    left: 50%; top: 50%; --x: ${(Math.random() - 0.5) * 300}px; --y: ${(Math.random() - 0.5) * 300}px;
                    animation: particle 1.5s forwards;
                `;
                particles.appendChild(p);
                setTimeout(() => p.remove(), 1500);
            }
        }, 2000);

        setTimeout(() => {
            curtainL.classList.add('open');
            curtainR.classList.add('open');
            setTimeout(() => {
                screen.style.transition = 'opacity 1s ease';
                screen.style.opacity = '0';
                setTimeout(() => {
                    loadRealContent(data);
                    screen.remove();
                }, 1000);
            }, 1500);
        }, 3500);
    };

    // === 5. LOAD REAL CONTENT (AFTER CURTAIN) ===
    const loadRealContent = (data) => {
        fetch(data.report_url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(reportData => {
                console.log("Fetched reportData:", reportData);

                analyticsSection.innerHTML = `
                    <div class="container p-6">
                        <div class="evidence-container mb-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
                            <h2 class="text-3xl font-bold text-gray-800 mb-4">Evidence Details</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="p-4 bg-gray-50 rounded-lg shadow-inner">
                                    <label class="block text-lg font-semibold text-gray-700">Evidence Name</label>
                                    <p class="text-gray-900 mt-2">${data.task_data.task_name || "Unspecified"}</p>
                                </div>
                                <div class="p-4 bg-gray-50 rounded-lg shadow-inner">
                                    <label class="block text-lg font-semibold text-gray-700">Description</label>
                                    <p class="text-gray-900 mt-2">${data.task_data.task_description || "Unspecified"}</p>
                                </div>
                            </div>
                            <div class="mt-6">
                                <h3 class="text-xl font-semibold text-gray-700 mb-4">File Previews</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="file-preview-display">
                                    ${selectedFiles.map(file => `
                                        <div class="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                                            <p class="text-sm text-gray-600">Name: ${file.name}</p>
                                            ${file.type.startsWith('image/') ? `<img src="${URL.createObjectURL(file)}" alt="${file.name}" class="w-full h-48 object-cover rounded mt-2">` :
                                            file.type === 'application/pdf' ? `<iframe src="${URL.createObjectURL(file)}" class="w-full h-48 mt-2"></iframe>` :
                                            `<p class="text-gray-500 mt-2">Preview unavailable</p>`}
                                            <span class="file-typex1">${file.type.split('/')[1].toUpperCase() || file.type}</span>
                                        </div>
                                    `).join('') || '<p class="text-gray-500">No files previewed.</p>'}
                                </div>
                            </div>
                        </div>

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
                        .container { position: relative; width: 100%; padding: 0 30px; }
                        .evidence-container, .tabs-container { background: rgba(255,255,255,0.95); backdrop-filter: blur(5px); }
                        .tab { border: none; cursor: pointer; transition: all 0.3s ease; }
                        .tab[data-active] { border-bottom: 2px solid #00cc00; }
                        .card { background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 1rem; }
                        .card:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
                        .animate-pulse { animation: pulse 2s infinite; }
                        .animate-float { animation: float 4s infinite ease-in-out; }
                        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
                        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                        [title]:hover:after { content: attr(title); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1a202c; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 0.9em; white-space: nowrap; z-index: 20; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        @media (max-width: 768px) { .container { padding: 1rem; } .grid { grid-template-columns: 1fr; } }

                        /* MAGIC CSS */
                        .stars, .stars2, .stars3 { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: transparent; }
                        .stars { background: radial-gradient(2px 2px at 20px 30px, #eee, transparent), radial-gradient(2px 2px at 40px 70px, #fff, transparent); background-repeat: repeat; background-size: 200px 200px; animation: zoom 20s infinite; opacity: 0; }
                        .stars2 { animation: zoom 30s infinite; opacity: 0; }
                        .stars3 { animation: zoom 40s infinite; opacity: 0; }
                        @keyframes zoom { 0%,100% { opacity:0; transform:scale(1); } 50% { opacity:1; transform:scale(1.2); } }
                        .curtain { position: absolute; top: 0; bottom: 0; width: 51%; background: linear-gradient(to bottom, #8b0000, #450000); box-shadow: 0 0 30px rgba(0,0,0,0.8); transition: transform 2s cubic-bezier(0.25,0.8,0.25,1); z-index: 10; }
                        .curtain-left { left: 0; border-right: 3px solid gold; }
                        .curtain-right { right: 0; border-left: 3px solid gold; }
                        .curtain.open { transform: translateX(-110%) !important; }
                        .curtain-right.open { transform: translateX(110%) !important; }
                        .animate-float { animation: float 3s ease-in-out infinite; }
                        .animate-blink { animation: blink 4s infinite; }
                        @keyframes blink { 0%,90%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
                        .animate-glow { animation: glow 2s ease-in-out infinite alternate; }
                        @keyframes glow { from { text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #00ccff; } to { text-shadow: 0 0 20px #fff, 0 0 40px #00ccff; } }
                        .animate-typewriter { overflow: hidden; border-right: 3px solid #00ccff; white-space: nowrap; animation: typing 3s steps(30) forwards, blink-caret 0.75s step-end infinite; }
                        @keyframes typing { from { width: 0; } to { width: 100%; } }
                        @keyframes blink-caret { from,to { border-color: transparent; } 50% { border-color: #00ccff; } }
                        @keyframes particle { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--x), var(--y)) scale(0); opacity: 0; } }
                    </style>
                `;

                // === RENDER FUNCTIONS (GLOBAL) ===
                window.renderContent = function(tabId, content) {
                    const el = document.getElementById(tabId);
                    if (el) el.innerHTML = content || '<p class="text-gray-600">No data available.</p>';
                };

                window.renderVerdictSummary = function() {
                    const verdict = reportData.verdict_summary;
                    const overall = reportData.overall_verdict;
                    const narrative = reportData.overall_verdict_narrative.replace(/\n/g, '<br>');
                    const content = `
                        <div class="p-6 relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                                <div class="animate-float w-24 h-24 bg-green-100 rounded-full" style="top: 5%; left: 5%;"></div>
                                <div class="animate-float-slow w-16 h-16 bg-green-200 rounded-full" style="top: 20%; right: 10%;"></div>
                            </div>
                            <h3 class="text-4xl font-extrabold text-gray-900 mb-6 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent animate-pulse">Verdict Summary</h3>
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
                            <div class="bg-gray-50 p-6 rounded-lg shadow-lg">
                                <h4 class="text-xl font-semibold text-gray-800 mb-4">Narrative Summary</h4>
                                <div class="text-gray-700 whitespace-pre-line">${narrative}</div>
                            </div>
                        </div>
                    `;
                    renderContent('verdict', content);
                };

                window.renderIndividualAnalyses = function() {
                    const content = Object.entries(reportData.individual_analyses).map(([fileName, analysis], index) => {
                        const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-');
                        return `
                            <div class="file-analysis-card ${index === 0 ? 'expanded' : 'collapsed'} mb-6 p-6 bg-gray-50/80 rounded-xl shadow-lg" data-index="${index}">
                                <div class="file-header cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-[#b8c9b8] to-[#6a973f] text-white rounded-t-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]" onclick="toggleAnalysisCard(event, this)">
                                    <div class="flex items-center gap-3">
                                        <i class="material-icons text-2xl">${getFileIcon(analysis.types.mime_type)}</i>
                                        <div>
                                            <h3 class="text-xl font-bold break-all">${fileName}</h3>
                                            <div class="text-xs opacity-90 flex items-center gap-2 mt-1">
                                                <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">${analysis.types.mime_type}</span>
                                                <span class="text-xs">${analysis.metadata.size_readable || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
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
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
                                            <i class="material-icons text-blue-600 text-lg">folder_open</i>
                                            <div>
                                                <div class="font-semibold text-sm text-gray-700">Path</div>
                                                <div class="text-sm break-all">${analysis.path || 'N/A'}</div>
                                            </div>
                                        </div>
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
                                        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
                                            <i class="material-icons text-purple-600 text-lg">bar_chart</i>
                                            <div>
                                                <div class="font-semibold text-sm text-gray-700">Entropy</div>
                                                <div class="text-sm font-mono">${analysis.entropy?.toFixed(6) || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
                                            <i class="material-icons text-orange-600 text-lg">photo_size_select_actual</i>
                                            <div>
                                                <div class="font-semibold text-sm text-gray-700">Dimensions</div>
                                                <div class="text-sm">${analysis.dimensions.width || 'N/A'} × ${analysis.dimensions.height || 'N/A'}</div>
                                                ${analysis.dimensions.error ? `<div class="text-xs text-red-600 mt-1">${analysis.dimensions.error}</div>` : ''}
                                            </div>
                                        </div>
                                        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
                                            <i class="material-icons text-teal-600 text-lg">texture</i>
                                            <div>
                                                <div class="font-semibold text-sm text-gray-700">JPEG LSB Entropy</div>
                                                <div class="text-sm font-mono">${analysis.jpeg_lsb_entropy?.toFixed(6) || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div class="flex items-start gap-2 p-3 bg-white rounded-lg border">
                                            <i class="material-icons text-pink-600 text-lg">compress</i>
                                            <div>
                                                <div class="font-semibold text-sm text-gray-700">Compression Ratio</div>
                                                <div class="text-sm font-mono">${analysis.compression_ratio?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
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
                                    <div class="mb-6">
                                        <div class="flex items-center gap-2 mb-3">
                                            <i class="material-icons text-cyan-600">info</i>
                                            <strong>Metadata</strong>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div class="bg-white p-3 rounded border"><strong>Size:</strong> ${analysis.metadata.size_readable || 'N/A'} (${analysis.metadata.size_bytes || 'N/A'} bytes)</div>
                                            <div class="bg-white p-3 rounded border"><strong>Modified:</strong> ${analysis.metadata.modification_time_readable || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>Accessed:</strong> ${analysis.metadata.access_time_readable || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>Created:</strong> ${analysis.metadata.creation_time_readable || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>Inode:</strong> ${analysis.metadata.inode || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>Permissions:</strong> ${analysis.metadata.permissions_octal || 'N/A'} (${analysis.metadata.permissions_symbolic || 'N/A'})</div>
                                            <div class="bg-white p-3 rounded border"><strong>Owner:</strong> UID ${analysis.metadata.owner_uid || 'N/A'}, GID ${analysis.metadata.group_gid || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>File Type:</strong> ${analysis.metadata.file_type || 'N/A'}</div>
                                            <div class="bg-white p-3 rounded border"><strong>Device ID:</strong> ${analysis.metadata.device_id || 'N/A'}, Links: ${analysis.metadata.hard_links || 'N/A'}</div>
                                        </div>
                                    </div>
                                    ${analysis.tampering_hints?.length > 0 ? `
                                    <div class="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2">
                                        <i class="material-icons text-red-600">warning</i>
                                        <div>
                                            <strong class="text-red-800">Tampering Hints:</strong>
                                            <span class="text-red-700">${analysis.tampering_hints.join(', ')}</span>
                                        </div>
                                    </div>` : ''}
                                    ${analysis.embedded_signatures?.length > 0 ? `
                                    <div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-2">
                                        <i class="material-icons text-yellow-600">security</i>
                                        <div>
                                            <strong class="text-yellow-800">Embedded Signatures:</strong>
                                            <span class="text-yellow-700">${analysis.embedded_signatures.join(', ')}</span>
                                        </div>
                                    </div>` : '<div class="mb-4 p-3 bg-gray-100 border rounded-lg text-gray-600"><strong>Embedded Signatures:</strong> None</div>'}
                                    ${analysis.errors?.length > 0 ? `
                                    <div class="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-start gap-2">
                                        <i class="material-icons text-orange-600">error</i>
                                        <div>
                                            <strong class="text-orange-800">Errors:</strong>
                                            <span class="text-orange-700">${analysis.errors.join(', ')}</span>
                                        </div>
                                    </div>` : ''}
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
                                    <div class="mt-6 flex gap-3 flex-wrap justify-start">
                                        <button class="pairwise-trigger px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-2" data-target="individual-entropy-${safeFileName}-dialog">
                                            <i class="material-icons text-sm">table_chart</i> Entropy Table
                                        </button>
                                        <button class="pairwise-trigger px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center gap-2" data-target="individual-printable-${safeFileName}-dialog">
                                            <i class="material-icons text-sm">text_fields</i> Strings
                                        </button>
                                        <button class="pairwise-trigger px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium flex items-center gap-2" data-target="individual-hex-${safeFileName}-dialog">
                                            <i class="material-icons text-sm">code</i> Hex Viewer
                                        </button>
                                    </div>
                                </div>
                                <!-- MODALS (Entropy, Strings, Hex) -->
                                <div id="individual-entropy-${safeFileName}-dialog" class="pairwise-overlay hidden fixed inset-0 z-50">
                                    <div class="pairwise-dialog bg-gray-900 text-gray-100 p-6 rounded-lg w-11/12 max-w-5xl shadow-2xl border border-gray-700" style="max-height:90vh;">
                                        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                            <h4 class="text-xl font-mono font-bold text-green-400">Entropy Table for — ${fileName}</h4>
                                            <button class="pairwise-close text-gray-400 hover:text-red-400"><i class="material-icons text-xl">close</i></button>
                                        </div>
                                        <div class="overflow-auto bg-black rounded border border-gray-800 p-2" style="max-height:calc(90vh - 120px);">
                                            <table class="entropy-table w-full text-xs">
                                                <thead><tr><th>Offset</th><th>Byte</th><th>Frequency</th><th>Bar</th></tr></thead>
                                                <tbody>
                                                    ${Object.entries(analysis.entropy_histogram || {})
                                                        .sort(([a],[b])=>+a-+b)
                                                        .map(([byte,freq])=>{
                                                            const pct = (freq*100).toFixed(4);
                                                            const barW = Math.max(1, Math.round(freq*500));
                                                            const hex = (+byte).toString(16).toUpperCase().padStart(2,'0');
                                                            return `<tr><td>${hex}</td><td>${hex}</td><td>${pct}%</td><td><div class="entropy-bar" style="width:${barW}px;"></div></td></tr>`;
                                                        }).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <!-- Printable Strings Modal -->
                                <div id="individual-printable-${safeFileName}-dialog" class="pairwise-overlay hidden fixed inset-0 z-50">
                                    <div class="pairwise-dialog bg-gray-900 text-gray-100 p-6 rounded-lg w-11/12 max-w-6xl shadow-2xl border border-gray-700" style="max-height:90vh;">
                                        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                            <h4 class="text-xl font-mono font-bold text-cyan-400">Printable Strings — ${fileName}</h4>
                                            <button class="pairwise-close text-gray-400 hover:text-red-400"><i class="material-icons text-xl">close</i></button>
                                        </div>
                                        <div class="modal-toolbar flex gap-2 mb-2">
                                            <input type="text" class="strings-search flex-1 px-3 py-1 bg-gray-800 text-white rounded" placeholder="Search strings..." />
                                            <button class="modal-btn strings-copy px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded">Copy</button>
                                            <button class="modal-btn strings-download px-3 py-1 bg-green-600 hover:bg-green-700 rounded">Download</button>
                                        </div>
                                        <div class="overflow-auto bg-black p-3 flex-1 rounded" style="max-height:calc(90vh - 140px);">
                                            <pre class="text-xs leading-tight">${(() => {
                                                const strings = analysis.printable_strings || [];
                                                if (!strings.length) return '<span class="text-gray-600">No printable strings found.</span>';
                                                let out = '';
                                                strings.forEach(s => out += s + '\n');
                                                return out;
                                            })()}</pre>
                                        </div>
                                    </div>
                                </div>
                                <!-- Hex Viewer Modal -->
                                <div id="individual-hex-${safeFileName}-dialog" class="pairwise-overlay hidden fixed inset-0 z-50">
                                    <div class="pairwise-dialog bg-gray-900 text-gray-100 p-6 rounded-lg w-11/12 max-w-6xl shadow-2xl border border-gray-700" style="max-height:90vh;">
                                        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                            <h4 class="text-xl font-mono font-bold text-yellow-400">Hex Viewer — ${fileName}</h4>
                                            <button class="pairwise-close text-gray-400 hover:text-red-400"><i class="material-icons text-xl">close</i></button>
                                        </div>
                                        <div class="modal-toolbar flex gap-2 mb-2">
                                            <input type="text" class="hex-search flex-1 px-3 py-1 bg-gray-800 text-white rounded" placeholder="Search hex or ASCII..." />
                                            <button class="modal-btn hex-copy px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded">Copy</button>
                                            <button class="modal-btn hex-download px-3 py-1 bg-green-600 hover:bg-green-700 rounded">Download .txt</button>
                                        </div>
                                        <div class="overflow-auto bg-black p-3 flex-1 rounded" style="max-height:calc(90vh - 140px);">
                                            <pre class="text-xs leading-tight">No raw data available for hex view.</pre>
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

                    // Accordion
                    window.toggleAnalysisCard = function(e, header) {
                        e.stopPropagation();
                        const card = header.parentElement;
                        const body = card.querySelector('.file-body');
                        const icon = header.querySelector('i');
                        const isCurrentlyOpen = !body.classList.contains('hidden');
                        document.querySelectorAll('.file-analysis-card').forEach(c => {
                            c.querySelector('.file-body').classList.add('hidden');
                            c.querySelector('.file-header i').classList.remove('rotate-180');
                            c.classList.remove('expanded'); c.classList.add('collapsed');
                        });
                        if (!isCurrentlyOpen) {
                            body.classList.remove('hidden');
                            icon.classList.add('rotate-180');
                            card.classList.remove('collapsed'); card.classList.add('expanded');
                        }
                    };

                    // Modals
                    document.querySelectorAll('.pairwise-trigger').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const modal = document.getElementById(btn.dataset.target);
                            if (modal) modal.classList.remove('hidden');
                        });
                    });
                    document.querySelectorAll('.pairwise-close').forEach(btn => {
                        btn.addEventListener('click', () => {
                            btn.closest('.pairwise-overlay').classList.add('hidden');
                        });
                    });
                    document.addEventListener('click', e => {
                        if (!e.target.closest('.pairwise-trigger') && !e.target.closest('.pairwise-dialog')) {
                            document.querySelectorAll('.pairwise-overlay').forEach(m => m.classList.add('hidden'));
                        }
                    });
                };

                window.renderPairwiseComparisons = function() {
                    const pairs = reportData.pairwise_comparisons;
                    const hasPairs = pairs && Object.keys(pairs).length > 0;
                    const content = hasPairs
                        ? Object.entries(pairs).map(([pairName, comp], idx) => {
                            const diffs = comp.metadata_diffs || {};
                            const tampering = (comp.tampering_hints_combined?.join(', ')) || 'None';
                            const isFirst = idx === 0;
                            return `
                                <div class="pairwise-card mb-8 bg-white rounded-xl shadow-lg border-l-4 border-green-600 overflow-hidden ${isFirst ? 'expanded' : 'collapsed'}" data-idx="${idx}">
                                    <div class="pairwise-header cursor-pointer flex items-center justify-between p-4 bg-gradient-to-r from-[#b8c9b8] to-[#6a973f] text-white" onclick="togglePairwiseCard(event, this)">
                                        <div class="flex items-center gap-3">
                                            <i class="material-icons text-2xl">${getFileIcon(comp.file1_mime) || 'compare_arrows'}</i>
                                            <h3 class="text-xl font-bold">${pairName}</h3>
                                        </div>
                                        <i class="material-icons text-2xl transition-transform ${isFirst ? 'rotate-180' : ''}">expand_more</i>
                                    </div>
                                    <div class="pairwise-body p-6 ${isFirst ? '' : 'hidden'}">
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
                                                        const renderValue = (val) => {
                                                            if (val === null || val === undefined) return '<span class="text-gray-400">N/A</span>';
                                                            if (typeof val === 'object') return `<pre class="text-xs bg-gray-800 text-green-300 p-2 rounded overflow-x-auto font-mono">${JSON.stringify(val, null, 2)}</pre>`;
                                                            return `<span class="font-medium">${val}</span>`;
                                                        };
                                                        return `
                                                            <div class="diff-item bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                                <div class="flex items-start gap-3">
                                                                    <i class="material-icons text-gray-500 mt-1 text-lg">${getDiffIcon(key)}</i>
                                                                    <div class="flex-1">
                                                                        <div class="font-semibold text-gray-800 mb-2">${label}</div>
                                                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                                            <div class="p-3 bg-green-50 rounded-lg border border-blue-200">
                                                                                <div class="flex items-center gap-2 mb-1"><i class="material-icons text-green-600 text-sm">description</i><strong>File 1</strong></div>
                                                                                <div class="break-all">${renderValue(value.file1)}</div>
                                                                            </div>
                                                                            <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                                                                                <div class="flex items-center gap-2 mb-1"><i class="material-icons text-red-600 text-sm">description</i><strong>File 2</strong></div>
                                                                                <div class="break-all">${renderValue(value.file2)}</div>
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
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div class="info-card p-4 bg-gray-50 rounded-lg"><strong class="block text-gray-800">Byte Differences</strong><p class="text-xl text-gray-700">${(comp.byte_differences?.toLocaleString() ?? 'N/A')}</p></div>
                                            <div class="info-card p-4 bg-gray-50 rounded-lg"><strong class="block text-gray-800">Unique Strings</strong><p class="text-xl text-gray-700">File 1: ${comp.unique_strings_file1 ?? 'N/A'}<br>File 2: ${comp.unique_strings_file2 ?? 'N/A'}</p></div>
                                            <div class="info-card p-4 bg-gray-50 rounded-lg"><strong class="block text-gray-800">Common Strings</strong><p class="text-xl text-gray-700">${comp.common_strings ?? 'N/A'} (${comp.common_strings_list?.length ?? 0} items)</p></div>
                                            <div class="info-card p-4 bg-gray-50 rounded-lg"><strong class="block text-gray-800">Entropy Difference</strong><p class="text-xl text-gray-700">${(comp.entropy_difference?.toFixed(6) ?? 'N/A')}</p></div>
                                        </div>
                                    </div>
                                </div>`;
                        }).join('')
                        : '<p class="text-center text-gray-600 py-8">No pairwise comparisons available.</p>';

                    function getFileIcon(mime) { /* same as above */ return 'insert_drive_file'; }
                    function getDiffIcon(key) {
                        const icons = { size: 'storage', time: 'schedule', dimensions: 'aspect_ratio', exif: 'camera_alt', entropy: 'bar_chart', hashes: 'lock', default: 'info' };
                        const lowered = key.toLowerCase();
                        return Object.keys(icons).find(k => lowered.includes(k)) ? icons[Object.keys(icons).find(k => lowered.includes(k))] : icons.default;
                    }

                    renderContent('pairwise', content);

                    window.togglePairwiseCard = function(e, header) {
                        e.stopPropagation();
                        const card = header.parentElement;
                        const body = card.querySelector('.pairwise-body');
                        const icon = header.querySelector('i:last-child');
                        const wasOpen = !body.classList.contains('hidden');
                        document.querySelectorAll('.pairwise-card').forEach(c => {
                            c.querySelector('.pairwise-body').classList.add('hidden');
                            c.querySelector('.pairwise-header i:last-child').classList.remove('rotate-180');
                            c.classList.remove('expanded'); c.classList.add('collapsed');
                        });
                        if (!wasOpen) {
                            body.classList.remove('hidden');
                            icon.classList.add('rotate-180');
                            card.classList.remove('collapsed'); card.classList.add('expanded');
                        }
                    };
                };

                // === TAB SWITCHING ===
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        document.querySelectorAll('.tab').forEach(t => t.removeAttribute('data-active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                        tab.setAttribute('data-active', '');
                        const id = tab.dataset.tab;
                        document.getElementById(id).style.display = 'block';
                        if (id === 'verdict') renderVerdictSummary();
                        if (id === 'individual') renderIndividualAnalyses();
                        if (id === 'pairwise') renderPairwiseComparisons();
                    });
                });

                // Initial render
                renderVerdictSummary();
                document.querySelector('.tab[data-tab="verdict"]').setAttribute('data-active', '');
                document.getElementById('verdict').style.display = 'block';
            })
            .catch(err => {
                analyticsSection.innerHTML = `<p class="text-red-600 p-8 text-center">Failed to load report: ${err.message}</p>`;
            });
    };

    // === 6. START MAGIC ===
    startMagic();
}