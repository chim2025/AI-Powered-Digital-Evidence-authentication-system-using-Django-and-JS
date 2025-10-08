import os
import threading
import yara
import time
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

_RULES_CACHE = {}
_rules_lock = threading.Lock()
RULE_TTL = 3600  # 1 hour

def resolve_includes(rules_dir, file_path, visited=None):
    """Recursively resolve include statements in a YARA file."""
    if visited is None:
        visited = set()
    if file_path in visited:
        logging.warning(f"Circular include detected at {file_path}")
        return ""
    visited.add(file_path)
    
    content = ""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        file_dir = os.path.dirname(file_path)
        for line in content.splitlines():
            if line.strip().startswith("include "):
                include_path = line.split("include ", 1)[1].strip().strip('"\'')
                full_path = os.path.normpath(os.path.join(file_dir, include_path))
                if not os.path.isfile(full_path):
                    # Search the rules directory tree
                    for root, _, files in os.walk(rules_dir):
                        for fname in files:
                            if fname == os.path.basename(include_path):
                                full_path = os.path.join(root, fname)
                                break
                if os.path.isfile(full_path):
                    included_content = resolve_includes(rules_dir, full_path, visited)
                    content = content.replace(line, included_content)
                else:
                    logging.warning(f"Include not found: {include_path} in {file_path}. Skipping.")
                    content = content.replace(line, "// Skipped unresolved include: " + include_path)
            else:
                content += "\n" + line  # Preserve non-include lines
    except Exception as e:
        logging.error(f"Error resolving includes in {file_path}: {e}")
    return content

def load_yara_rules_from_dir(rules_dir):
    if not os.path.isdir(rules_dir):
        logging.error(f"Rules directory not found: {rules_dir}")
        raise FileNotFoundError(rules_dir)
    with _rules_lock:
        cached = _RULES_CACHE.get(rules_dir)
        if cached:
            rules_obj, ts = cached
            if time.time() - ts < RULE_TTL:
                logging.info(f"Using cached YARA rules from {rules_dir}")
                return rules_obj
        
        filepaths = {}
        for root, _, files in os.walk(rules_dir):
            for fname in files:
                if not (fname.endswith(".yar") or fname.endswith(".yara")):
                    continue
                path = os.path.join(root, fname)
                rel_path = os.path.relpath(path, rules_dir)
                try:
                    resolved_content = resolve_includes(rules_dir, path)
                    if resolved_content:
                        filepaths[rel_path] = resolved_content
                    else:
                        filepaths[rel_path] = path
                except Exception as e:
                    logging.error(f"Failed to process {fname}: {e}")
                    continue
        
        if not filepaths:
            logging.warning(f"No valid YARA rules found in {rules_dir}")
            return None
        
        rules = None
        error_file = None
        try:
            # Incremental compilation to find the error
            for rel_path, content_or_path in filepaths.items():
                try:
                    if isinstance(content_or_path, str):
                        yara.compile(sources={rel_path: content_or_path})
                    else:
                        yara.compile(filepaths={rel_path: content_or_path})
                    logging.info(f"Compiled rule: {rel_path}")
                except yara.Error as e:
                    logging.error(f"Compilation failed at {rel_path}: {e}")
                    error_file = rel_path
                    break
            # If no error, compile all
            if not error_file:
                rules = yara.compile(sources=filepaths) if any(isinstance(v, str) for v in filepaths.values()) else yara.compile(filepaths=filepaths)
                logging.info(f"Successfully loaded {len(filepaths)} YARA rules from {rules_dir}")
                for key in filepaths.keys():
                    logging.info(f" - {key}")
            else:
                logging.error(f"Compilation halted due to error in {error_file}. Check this file for syntax issues.")
        except yara.Error as e:
            logging.error(f"YARA compilation error: {e}")
            rules = None
        except Exception as e:
            logging.error(f"Unexpected error compiling YARA rules: {e}")
            rules = None
        _RULES_CACHE[rules_dir] = (rules, time.time())
        return rules

def scan_file_with_rules(rules, path, timeout=5):
    """
    Safe wrapper to scan a file with compiled rules object.
    Returns list of matching rule names (or empty).
    """
    if rules is None or not path or not os.path.isfile(path):
        logging.debug(f"Scan skipped: rules={rules}, path={path}")
        return []
    try:
        matches = rules.match(path=path, timeout=timeout)
        if matches:
            logging.info(f"Matches found for {path}: {[m.rule for m in matches]}")
            return [m.rule for m in matches]
        logging.debug(f"No matches found for {path}")
        return []
    except yara.TimeoutError as e:
        logging.warning(f"YARA timeout for {path}: {e}")
        return ["yara timeout"]
    except Exception as e:
        logging.error(f"YARA scanning error for {path}: {e}")
        return []

# Use the project root's yararules/rules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
YARA_RULES = load_yara_rules_from_dir(os.path.join(project_root, "../", "custom_rules"))