import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))



os.environ["TRANSFORMERS_NO_TF"] = "1"  # 💥 Prevents TF-related imports

from transformers import RobertaTokenizer, RobertaForSequenceClassification, Trainer, TrainingArguments
from sklearn.model_selection import train_test_split
import pandas as pd
from backend.evidencemodule.document_authentication.training.dataset import TextDataset


# Load dataset
base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "..", "data", "AI_Human.csv")
print(f"Reading CSV from: {csv_path}")

df = pd.read_csv(csv_path)[['text', 'generated']].dropna()
df.rename(columns={'generated': 'label'}, inplace=True)


train_texts, val_texts, train_labels, val_labels = train_test_split(
    df['text'], df['label'], test_size=0.1, stratify=df['label']
)


tokenizer = RobertaTokenizer.from_pretrained("C:/Users/Chimenka/Desktop/roberta-base")


train_enc = tokenizer(list(train_texts), truncation=True, padding=True, max_length=512)
val_enc = tokenizer(list(val_texts), truncation=True, padding=True, max_length=512)

# Prepare datasets
train_dataset = TextDataset(train_enc, list(train_labels))
val_dataset = TextDataset(val_enc, list(val_labels))

# Model
model = RobertaForSequenceClassification.from_pretrained("C:/Users/Chimenka/Desktop/roberta-base", num_labels=2)

# Training args
training_args = TrainingArguments(
    output_dir="model/roberta_fake_real_model",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset
)

# Train
trainer.train()
