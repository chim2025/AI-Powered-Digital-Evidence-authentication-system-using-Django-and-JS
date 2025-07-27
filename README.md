# AI-Powered Digital Evidence Authentication System

This project is a personal and academic effort to build a system that can help verify the authenticity of digital evidence using Artificial Intelligence. It's meant to support digital forensic work — especially when it comes to identifying tampered or fake content like edited images, documents, or videos.

The solution uses Django (Python) for the backend and JavaScript for the frontend. It also includes some AI models for analysis and decision-making during the evidence authentication process.

---

##  What This Project Does

- Allows users to upload digital evidence (images, docs, etc.)
- Analyzes the uploaded files using AI-based models
- Checks for deepfake content, altered metadata, or other red flags
- Displays the analysis result in a user-friendly interface

The goal is to help forensic analysts or investigators quickly verify if a file has been tampered with, without going through the stress of manual checking.

---

##  Project Structure

Here’s a breakdown of the folders:
backend/ -> Django backend (logic, AI integration, APIs)
frontend/ -> User interface (HTML, JS, CSS)
.gitignore -> File to exclude unnecessary or heavy files(not added yet)
README.md -> You’re here!

---

## ⚙ How to Set It Up

### 1. Clone the Repo

```bash
git clone https://github.com/chim2025/AI-Powered-Digital-Evidence-authentication-system-using-Django-and-JS.git
cd AI-Powered-Digital-Evidence-authentication-system-using-Django-and-JS
```

Set Up the Backend

cd backend
python -m venv venv
venv\Scripts\activate  # If on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

Future Plans:

Here are a few things I hope to improve or add:

1. User authentication and roles (admin, investigator, etc.)

2. Better visual feedback during evidence analysis
3.  Deployment to a live server for public use

4.  utomatic deepfake detection with live updates

About the Developer

Hi, I’m Chimenka Goodluck Uchechi, the developer behind this project. I’m passionate about cybersecurity, AI, and building tools that solve real problems — especially in the digital forensics space.

You can connect with me on GitHub: github.com/chim2025

