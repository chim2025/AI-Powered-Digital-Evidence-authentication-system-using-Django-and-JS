const preloader = document.getElementById("preloader");
  const doneSound = document.getElementById("doneSound");
  const reloadBtn = document.getElementById("reload-btn");

  function showPreloader() {
    preloader.classList.remove("fade-out");
    const bar = document.querySelector(".progress-bar .bar");
    bar.style.width = "0%";
    setTimeout(() => {
      bar.style.animation = "loadingBar 3s ease forwards";
    }, 10);
  }

  window.addEventListener("load", () => {
    setTimeout(() => {
      preloader.classList.add("fade-out");
      doneSound.play();
    }, 6000);
  });

  reloadBtn.addEventListener("click", () => {
    showPreloader();
    setTimeout(() => {
      preloader.classList.add("fade-out");
      doneSound.play();
    }, 3000);
  });
  const toggle = document.getElementById('themeCheckbox');
  const toast = document.getElementById('toast');

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function applyTheme(theme, show = false) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    toggle.checked = theme === 'dark';
    if (show) {
      showToast(`Switched to ${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`);
    }
  }

  // Load theme or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    applyTheme(systemDark.matches ? 'dark' : 'light');
  }

  // Toggle by click
  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    applyTheme(theme, true);
  });

  // Auto detect system changes
  systemDark.addEventListener('change', e => {
    const newTheme = e.matches ? 'dark' : 'light';
    const stored = localStorage.getItem('theme');
    if (!stored) applyTheme(newTheme, true);
  });

