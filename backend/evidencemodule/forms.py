from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class CustomRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True, label="Email Address")
    full_name = forms.CharField(max_length=100, required=True, label="Full Name")

    class Meta:
        model = User
        fields = ['username', 'full_name', 'email', 'password1', 'password2']
