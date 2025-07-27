from django.db import models

class User(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=30)
    level=models.CharField(max_length=30, default='beginner')
    enterprise=models.CharField(max_length=50, default='none')
    software=models.CharField(max_length=50, default='default')
    country = models.CharField(max_length=50, default='none')
    address = models.CharField(max_length=255, default='none')
    last_name = models.CharField(max_length=40)
    middle_name = models.CharField(max_length=40, default='none')
    password = models.CharField(max_length=128)  
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
