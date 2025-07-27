
document.getElementById("theme-switch").addEventListener("change", function () {
    document.body.classList.toggle("dark-theme");
  });
  

  document.getElementById("toggle-password").addEventListener("click", function () {
    const pwd = document.getElementById("password");
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
    pwd.type = pwd.type === "password" ? "text" : "password";
  });
  
  
  document.getElementById("login-form").addEventListener("submit", function (e) {
    const btnText = document.querySelector(".btn-text");
    const spinner = document.getElementById("spinner");
    btnText.textContent = "Logging in...";
    spinner.classList.remove("hidden");
  });
  