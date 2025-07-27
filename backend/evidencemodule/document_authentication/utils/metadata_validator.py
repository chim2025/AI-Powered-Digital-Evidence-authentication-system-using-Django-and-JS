from datetime import datetime
import re
import os
from typing import Dict, List
from PyPDF2 import PdfReader



SUSPICIOUS_SOFTWARE = [
  'ghostscript', 'wps office', 'scrivener', 'openxml', 'pdfcreator',
  'xps', 'demo', 'anonymous', 'pdf-xchange', 'printer', 'unknown', 'null',
  'timestomp' 
]


APPROVED_GENERATORS = ['microsoft word', 'acrobat', 'adobe', 'libreoffice','Microsoft Office Word', 'LibreOffice Writer']


GENERIC_USERS = ['user', 'admin', 'test', 'anonymous', 'system']


REQUIRED_FIELDS = ['creator', 'created', 'modified', 'title']


def detect_metadata_inconsistencies(metadata: Dict, file_path: str = None):
    issues = []
    now = datetime.now()
    normalized = {k.lower(): str(v).strip() for k, v in metadata.items() if v}

    for field in REQUIRED_FIELDS:
        if field.lower() not in normalized:
            issues.append(f"Missing metadata field: {field}")

    
    for key in ['creator', 'producer', 'application', 'generator', 'lastmodifiedby']:
        value = normalized.get(key)
        if value and any(s in value.lower() for s in SUSPICIOUS_SOFTWARE):
            issues.append(f"Suspicious software/editor in {key}: {value}")

    
    for k, v in normalized.items():
        if v.lower() in ['none', 'null', 'untitled', 'document', '']:
            issues.append(f"Default or blank value in {k}: {v}")
        elif len(v) < 3:
            issues.append(f"Suspiciously short value in {k}: {v}")

    
    for key in ['creator', 'author', 'lastmodifiedby']:
        value = normalized.get(key)
        if value and any(g in value.lower() for g in GENERIC_USERS):
            issues.append(f"Generic user/editor in {key}: {value}")

    
    if normalized.get('created') == normalized.get('modified'):
        issues.append("Identical 'created' and 'modified' timestamps detected")

    
    for date_field in ['created', 'modified', 'creationdate', 'moddate']:
        raw = normalized.get(date_field)
        if raw:
            try:
                parsed = parse_date(raw)
                if parsed > now:
                    issues.append(f"{date_field} is set in the future: {raw}")
            except:
                issues.append(f"Unparsable {date_field}: {raw}")

    
    for field in metadata:
        if isinstance(metadata[field], str) and re.search(r'\b(\d{1,3}\.\d+),\s*(\d{1,3}\.\d+)\b', metadata[field]):
            issues.append(f"Possible geo-location leak in {field}: {metadata[field]}")

    
    if file_path and os.path.exists(file_path):
        file_stat = os.stat(file_path)
        fs_mtime = datetime.fromtimestamp(file_stat.st_mtime)
        meta_time_str = normalized.get('modified') or normalized.get('moddate')
        if meta_time_str:
            try:
                meta_time = parse_date(meta_time_str)
                delta = abs((meta_time - fs_mtime).total_seconds())
                if delta > 60:
                    issues.append(f"File system timestamp mismatch (>60s): FS={fs_mtime}, Meta={meta_time}")
            except:
                pass

    
    gen_key = normalized.get('generator') or normalized.get('application') or ""
    if gen_key and not any(app in gen_key.lower() for app in APPROVED_GENERATORS):
        issues.append(f"Unapproved software generator detected: {gen_key}")

    
    if 'pdfcreator' in gen_key.lower() and 'word' in gen_key.lower():
        issues.append("Suspicious combo: Microsoft Word used with PDFCreator (possible tampering)")

    
    if file_path and file_path.lower().endswith('.pdf'):
        try:
            reader = PdfReader(file_path)
            if not reader.trailer.get("/Root", {}).get("/AcroForm"):
                issues.append("No digital signature detected in PDF")
            else:
                
                issues.append("Digital signature present (but not verified)")
        except:
            issues.append("Unable to read PDF signature section")

    return {
        "is_metadata_suspicious": len(issues) > 0,
        "confidence_score": round(min(len(issues) * 10, 100), 2),
        "issues_found": issues,
        "fields_analyzed": list(metadata.keys()),
        "field_values": metadata
    }


def parse_date(date_str: str) -> datetime:
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y:%m:%d %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y%m%d"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except:
            continue
    digits = list(map(int, re.findall(r'\d+', date_str)))
    if len(digits) >= 3:
        try:
            return datetime(digits[0], digits[1], digits[2])
        except:
            pass
    raise ValueError(f"Unknown date format: {date_str}")
