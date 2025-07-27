document.addEventListener("DOMContentLoaded", () => {
    const switchToggle = document.getElementById("theme-switch");
    const isDark = localStorage.getItem("darkMode") === "true";
  
    if (isDark) {
      document.body.classList.add("dark-mode");
      switchToggle.checked = true;
    }
  
    switchToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
    });
  });
  