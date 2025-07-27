import hashlib
import json
import os

def compute_file_hashes(file_path):
    """
    Compute multiple hash digests for a file and return results in JSON format
    :param file_path: Path to the file to be hashed
    :return: JSON string containing hash results
    """
    if not os.path.exists(file_path):
        return json.dumps({"error": "File not found"})
    
    try:
        # Initialize hash algorithms
        hash_algorithms = {
            "md5": hashlib.md5(),
            "sha1": hashlib.sha1(),
            "sha256": hashlib.sha256(),
            "sha384": hashlib.sha384(),
            "sha512": hashlib.sha512(),
            "blake2b": hashlib.blake2b(),
            "blake2s": hashlib.blake2s(),
            "sha3_256": hashlib.sha3_256(),
            "sha3_512": hashlib.sha3_512()
        }
        
        # Read file in chunks to handle large files
        chunk_size = 65536  # 64KB chunks
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                for algorithm in hash_algorithms.values():
                    algorithm.update(chunk)
        
        # Prepare results
        file_stats = os.stat(file_path)
        results = {
            "file_path": file_path,
            "file_size": file_stats.st_size,
            "created_at": file_stats.st_ctime,
            "modified_at": file_stats.st_mtime,
            "hashes": {name: algo.hexdigest() for name, algo in hash_algorithms.items()}
        }
        
        return json.dumps(results, indent=2)
    
    except Exception as e:
        return json.dumps({"error": str(e)})