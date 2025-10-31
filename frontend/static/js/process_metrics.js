
console.log("Script loaded");

function addSpinners() {
    const metricCards = document.querySelectorAll(
        '.process_details > div:not(.run_full_scan)'
    );
    metricCards.forEach(card => {
        // Avoid adding duplicate spinners
        if (!card.querySelector('.metric-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'metric-spinner';
            card.appendChild(spinner);
        }
    });
}


function updateMetrics() {
    fetch('/process_metrics/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log("Response status:", response.status, "OK:", response.ok);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        console.log("Response text:", text);

        // ---- Remove spinners once we have any response (success or error) ----
        document.querySelectorAll('.process_details > div:not(.run_full_scan)')
                .forEach(card => card.classList.add('metric-loaded'));

        try {
            const data = JSON.parse(text);

            const mappings = {
                '.current_processes'      : 'total_processes',
                '.malicious_process'      : 'malicious_processes',
                '.virus_total_flagged'    : 'virus_total_flagged',
                '.yara_rules_malicious'   : 'open_threat_matches'
            };

        
            Object.entries(mappings).forEach(([selector, key]) => {
                const el = document.querySelector(selector);
                if (!el) {
                    console.warn(`Element not found: ${selector}`);
                    return;
                }
                const value = data.error ? 0 : (data[key] ?? 0);
                const label = selector === '.yara_rules_malicious'
                              ? 'Open Threat'
                              : selector.split('.')[1].replace(/_/g, ' ');
                el.setAttribute('data-content', `${label}: ${value}`);

                // Force repaint so ::after updates immediately
                el.style.display = 'none';
                void el.offsetHeight; // trigger reflow
                el.style.display = '';
            });

            // ---- Fallback span (in case ::after isn't visible) ----
            Object.entries(mappings).forEach(([selector, key]) => {
                const el = document.querySelector(selector);
                if (!el) return;

                let span = el.querySelector('span');
                if (!span) {
                    span = document.createElement('span');
                    el.appendChild(span);
                }
                const value = data.error ? 0 : (data[key] ?? 0);
                const label = selector === '.yara_rules_malicious'
                              ? 'Open Threat'
                              : selector.split('.')[1].replace(/_/g, ' ');
                span.textContent = `${label}: ${value}`;
                span.style.cssText = `
                    font-size: 1.1em;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-top: 12px;
                    display: block;
                `;
            });

        } catch (e) {
            console.error('Invalid JSON:', text, e);

            // ---- Show 0 on parse error (spinners already removed above) ----
            const fallbackLabels = {
                '.current_processes'      : 'Total Processes',
                '.malicious_process'      : 'Malicious Processes',
                '.virus_total_flagged'    : 'VirusTotal Flagged',
                '.yara_rules_malicious'   : 'Open Threat'
            };

            Object.entries(fallbackLabels).forEach(([selector, label]) => {
                const el = document.querySelector(selector);
                if (!el) return;
                el.setAttribute('data-content', `${label}: 0`);

                let span = el.querySelector('span');
                if (!span) {
                    span = document.createElement('span');
                    el.appendChild(span);
                }
                span.textContent = `${label}: 0`;
                span.style.cssText = `
                    font-size: 1.1em;
                    font-weight: 600;
                    color: var(--text-color);
                    margin-top: 12px;
                    display: block;
                `;
            });
        }
    })
    .catch(error => {
        console.error('Error fetching metrics:', error);

        // Hide spinners even on network error
        document.querySelectorAll('.process_details > div:not(.run_full_scan)')
                .forEach(card => card.classList.add('metric-loaded'));
    });
}

// -------------------------------------------------------------
// 3. Kick everything off
// -------------------------------------------------------------
addSpinners();               // Insert spinners immediately
updateMetrics();             // First fetch
setInterval(updateMetrics, 5000);   // Refresh every 5 seconds
