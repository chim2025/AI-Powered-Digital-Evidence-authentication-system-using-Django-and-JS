import sys
import os

# Ensure root path is available
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

# Prevent TensorFlow-related imports
os.environ["TRANSFORMERS_NO_TF"] = "1"

from transformers import RobertaTokenizer, RobertaForSequenceClassification, pipeline
import pandas as pd

# Load local tokenizer and model from Desktop
MODEL_PATH = "C:/Users/Chimenka/Desktop/roberta-base"
tokenizer = RobertaTokenizer.from_pretrained(MODEL_PATH)
model = RobertaForSequenceClassification.from_pretrained(MODEL_PATH, num_labels=2)

# Create pipeline for inference
classifier = pipeline("text-classification", model=model, tokenizer=tokenizer)

# Sample predictions – You can modify or replace with dynamic text
sample_texts = [
    "This content was written by a human.",
    "Introducing our revolutionary AI-powered image editor.",
    "You are amazing. Let’s meet at 7 PM!"
]

for text in sample_texts:
    result = classifier(text)
    print(f"Input: {text}\nPrediction: {result}\n")
