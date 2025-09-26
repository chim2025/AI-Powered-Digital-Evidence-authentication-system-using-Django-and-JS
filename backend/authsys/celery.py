# authsys/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'authsys.settings')

app = Celery('evidencemodule')

# use RabbitMQ as broker
app.conf.broker_url = 'amqp://guest:guest@localhost:5672//'

# auto-discover tasks.py in apps
app.autodiscover_tasks()
