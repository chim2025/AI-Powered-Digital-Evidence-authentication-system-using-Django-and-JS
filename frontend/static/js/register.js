// register.js

// Global State
let currentStep = 0;
const steps = document.querySelectorAll(".step");
const progressBar = document.getElementById("progress-bar-inner");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const strengthBar = document.getElementById("strength-bar");
const themeToggle = document.getElementById("theme-toggle");


function showStep(index) {
  steps.forEach((step, i) => {
    step.style.display = i === index ? "block" : "none";
  });
  progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;
}

function validateStep(index) {
  const currentStepElement = steps[index];
  const inputs = currentStepElement.querySelectorAll("input[required], select[required], textarea[required]");
  let isValid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add("invalid");
      isValid = false;
    } else {
      input.classList.remove("invalid");
    }
  });

  // Additional validation for password step
  if (currentStepElement.id === "step-password") {
    const passwordFilled = passwordInput.value.trim() !== "";
    const strongEnough = parseInt(strengthBar.style.width) >= 50;
    if (!passwordFilled || !strongEnough) {
      isValid = false;
    }
  }

  
  const agreeCheckbox = currentStepElement.querySelector("input[type='checkbox'][required]");
  if (agreeCheckbox && !agreeCheckbox.checked) {
    agreeCheckbox.classList.add("invalid");
    isValid = false;
  } else if (agreeCheckbox) {
    agreeCheckbox.classList.remove("invalid");
  }

  return isValid;

}


function nextStep() {
  if (validateStep(currentStep) && currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

document.querySelectorAll(".next-btn").forEach(btn => {
  btn.addEventListener("click", nextStep);
});

document.querySelectorAll(".prev-btn").forEach(btn => {
  btn.addEventListener("click", prevStep);
});

// Password Strength Checker
passwordInput.addEventListener("input", () => {
  const value = passwordInput.value;
  let strength = 0;
  if (value.length > 5) strength++;
  if (/[A-Z]/.test(value)) strength++;
  if (/[0-9]/.test(value)) strength++;
  if (/[^A-Za-z0-9]/.test(value)) strength++;
  strengthBar.style.width = `${(strength / 4) * 100}%`;
  strengthBar.style.backgroundColor = ["red", "orange", "gold", "green"][strength - 1] || "transparent";
});


function checkAvailability(type, value) {
  fetch(`/check-${type}/?value=${encodeURIComponent(value)}`)
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(data => {
      const feedback = document.getElementById(`${type}-feedback`);
      if (feedback) {
        feedback.textContent = data.available ? `${type} is available` : `${type} is already taken`;
        feedback.style.color = data.available ? "green" : "red";
      }
    })
    .catch(error => {
      console.error(`Error checking ${type} availability:`, error);
    });
}

usernameInput.addEventListener("blur", () => {
  if (usernameInput.value.trim()) {
    checkAvailability("username", usernameInput.value);
  }
});

emailInput.addEventListener("blur", () => {
  if (emailInput.value.trim()) {
    checkAvailability("email", emailInput.value);
  }
});


if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }
  showStep(currentStep);
});



const countryInput = document.getElementById("country-search");
const countryList = document.getElementById("country-list");
const countryError = document.getElementById("country-error");

const countries = [
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "United States", flag: "🇺🇸" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "India", flag: "🇮🇳" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "South Africa", flag: "🇿🇦" },
  
];


function renderCountryList(filter = "") {
  const filtered = countries.filter(country => country.name.toLowerCase().includes(filter.toLowerCase()));
  countryList.innerHTML = filtered.map(
    c => `<li data-name="${c.name}">${c.flag} ${c.name}</li>`
  ).join("");
  countryList.style.display = filtered.length ? "block" : "none";
}

countryInput.addEventListener("input", () => {
  const value = countryInput.value;
  renderCountryList(value);
  countryInput.classList.remove("invalid");
  countryError.textContent = "";
});


countryList.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    countryInput.value = e.target.getAttribute("data-name");
    countryList.style.display = "none";
  }
});


document.addEventListener("click", (e) => {
  if (!countryInput.contains(e.target) && !countryList.contains(e.target)) {
    countryList.style.display = "none";
  }
});



