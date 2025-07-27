from transformers import pipeline

classifier = pipeline("text-classification", model="model/roberta_fake_real_model", tokenizer="model/roberta_fake_real_model")

def predict_text(text):
    result = classifier(text, truncation=True, max_length=512)[0]
    label = result['label']
    score = result['score']
    return label, score
