from transformers import pipeline, AutoTokenizer

def load_detector(model_path, device=-1):
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    detector = pipeline(
        "text-classification",
        model=model_path,
        tokenizer=tokenizer,
        device=device
    )
    return detector, tokenizer
import re

def truncate_to_max_tokens(text, tokenizer, max_tokens=512):
    tokens = tokenizer.encode(text, truncation=True, max_length=max_tokens, return_tensors=None)
    return tokenizer.decode(tokens, skip_special_tokens=True)

def classify_text(detector, tokenizer, text, max_chunk_tokens=512):
    
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    processed_chunks = []
    chunk_inputs = []

    for idx, para in enumerate(paragraphs, start=1):
        trimmed_para = truncate_to_max_tokens(para, tokenizer, max_chunk_tokens)

        processed_chunks.append({
            "chunk_index": idx,
            "original_text": para,
            "model_input_text": trimmed_para 
        })

        chunk_inputs.append(trimmed_para)

   
    predictions = detector(chunk_inputs)

    
    results = []
    for i, prediction in enumerate(predictions):
        results.append({
            "chunk_index": processed_chunks[i]["chunk_index"],
            "label": prediction['label'],
            "score": round(prediction['score'], 4),
            "full_text": processed_chunks[i]["original_text"],
            "model_input": processed_chunks[i]["model_input_text"]  
        })

    
    real = sum(1 for r in results if r['label'] == 'Real')
    fake = len(results) - real
    final_label = 'Real' if real >= fake else 'Fake'
    avg_score = round(sum(r['score'] for r in results) / len(results), 4)

    return {
        "final_decision": final_label,
        "average_score": avg_score,
        "chunks_evaluated": len(results),
        "chunk_results": results
    }
