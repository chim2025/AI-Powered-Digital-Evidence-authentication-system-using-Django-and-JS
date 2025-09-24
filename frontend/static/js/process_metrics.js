console.log("Script loaded");
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
        try {
            const data = JSON.parse(text);
            console.log("Parsed data:", data);
            const mappings = {
                '.current_processes': 'total_processes',
                '.malicious_process': 'malicious_processes',
                '.virus_total_flagged': 'virus_total_flagged',
                '.yara_rules_malicious': 'open_threat_matches'
            };
            Object.entries(mappings).forEach(([selector, key]) => {
                const element = document.querySelector(selector);
                if (element) {
                    const value = data.error ? 0 : data[key] || 0;
                    const label = selector === '.yara_rules_malicious' ? 'Open Threat' : selector.split('.')[1].replace('_', ' ');
                    element.setAttribute('data-content', `${label}: ${value}`);

                    // Force repaint to ensure ::after updates
                    element.style.display = 'none';
                    element.offsetHeight; // Trigger reflow
                    element.style.display = '';
                } else {
                    console.warn(`Element not found for selector: ${selector}`);
                }
            });

            // Fallback: Create child span if ::after doesn't work
            Object.entries(mappings).forEach(([selector, key]) => {
                const element = document.querySelector(selector);
                if (element) {
                    let span = element.querySelector('span');
                    if (!span) {
                        span = document.createElement('span');
                        element.appendChild(span);
                    }
                    const value = data.error ? 0 : data[key] || 0;
                    const label = selector === '.yara_rules_malicious' ? 'Open Threat' : selector.split('.')[1].replace('_', ' ');
                    span.textContent = `${label}: ${value}`;
                    span.style.cssText = 'font-size: 1.1em; font-weight: 600; color: var(--text-color); margin-top: 12px;';
                }
            });
        } catch (e) {
            console.error('Invalid JSON:', text, e);
            // Fallback to defaults
            const mappings = {
                '.current_processes': 'Total Processes',
                '.malicious_process': 'Malicious Processes',
                '.virus_total_flagged': 'VirusTotal Flagged',
                '.yara_rules_malicious': 'Open Threat'
            };
            Object.entries(mappings).forEach(([selector, label]) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.setAttribute('data-content', `${label}: 0`);
                    let span = element.querySelector('span');
                    if (!span) {
                        span = document.createElement('span');
                        element.appendChild(span);
                    }
                    span.textContent = `${label}: 0`;
                    span.style.cssText = 'font-size: 1.1em; font-weight: 600; color: var(--text-color); margin-top: 12px;';
                }
            });
        }
    })
    .catch(error => console.error('Error fetching metrics:', error));
}
setInterval(updateMetrics, 5000);
updateMetrics();