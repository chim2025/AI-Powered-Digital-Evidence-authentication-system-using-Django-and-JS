document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');
    const mainContent = document.querySelector('.main-content'); 
   

   window.showSection =function showSection(sectionId) {
   
        sections.forEach(section => section.classList.remove('active'));

       
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }

       
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        
        mainContent.style.display = 'none';

        
        if (sectionId === 'home') {
            mainContent.style.display = 'block';
        }
    }

    
    showSection('home');

    
    navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        const sectionId = this.getAttribute('data-section');
        if (sectionId === "task-wizard") {
            e.preventDefault();
            const modal = document.getElementById("taskWizardModal");
            if (modal) {
                modal.style.display = "block";
                if (typeof updateProgress === "function") {
                    updateProgress();
                }
            }
            return; 
        }
        showSection(sectionId);
    });
});
});


document.addEventListener('DOMContentLoaded', function () {
    const lightThemeRadio = document.getElementById('theme-light');
    const darkThemeRadio = document.getElementById('theme-dark');

   
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            darkThemeRadio.checked = true;
        } else {
            lightThemeRadio.checked = true;
        }
    }

    lightThemeRadio.addEventListener('change', function () {
        if (lightThemeRadio.checked) {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    
    darkThemeRadio.addEventListener('change', function () {
        if (darkThemeRadio.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });
});
function updateDateTime() {
    const now = new Date();

    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    const formattedDate = now.toLocaleString('en-US', options);
    document.getElementById('datetime').textContent = formattedDate;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  function detectOS() {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    if (platform.includes("win")) return "Windows";
    if (platform.includes("mac")) return "macOS";
    if (platform.includes("linux")) return "Linux";
    if (/android/.test(userAgent)) return "Android";
    if (/iphone|ipad|ipod/.test(userAgent)) return "iOS";

    return "Unknown OS";
  }


  const osName = detectOS();
  document.querySelector("#os-name b").textContent = osName;

  fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(data => {
      document.querySelector("#ip-address b").textContent = data.ip;
    })
    .catch(() => {
      document.querySelector("#ip-address b").textContent = "Unavailable";
    });

    function getBrowserName() {
        const userAgent = navigator.userAgent;
      
        if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
        if (userAgent.includes("Edg/")) return "Microsoft Edge";
        if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/") && !userAgent.includes("OPR/")) return "Google Chrome";
        if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
        if (userAgent.includes("OPR/") || userAgent.includes("Opera")) return "Opera";
      
        return "Unknown Browser";
      }
      document.querySelector("#browser-name b").textContent = getBrowserName();