import subprocess
import sys
import os
import hashlib
import json
import mimetypes
import datetime
import struct
import zlib
import math
import re
import uuid
from collections import defaultdict

def format_size(bytes_size):
    """Convert bytes to human-readable format (e.g., KB, MB, GB)."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.2f} PB"

def format_timestamp(iso_time):
    """Convert ISO timestamp to human-readable format."""
    try:
        dt = datetime.datetime.fromisoformat(iso_time)
        return dt.strftime("%d %B %Y, %H:%M:%S")
    except:
        return iso_time

def format_permissions(octal_perm, file_type):
    """Convert octal permissions to symbolic, handling Windows compatibility."""
    try:
        perms = int(octal_perm, 8)
        mode = ['-'] * 10  # Default to regular file
        if file_type == 'directory':
            mode[0] = 'd'
        elif file_type != 'regular file':
            mode[0] = 'l' if 'link' in file_type else '?'
        mode[1] = 'r' if perms & 0o400 else '-'
        mode[2] = 'w' if perms & 0o200 else '-'
        mode[3] = 'x' if perms & 0o100 else '-'
        mode[4] = 'r' if perms & 0o040 else '-'
        mode[5] = 'w' if perms & 0o020 else '-'
        mode[6] = 'x' if perms & 0o010 else '-'
        mode[7] = 'r' if perms & 0o004 else '-'
        mode[8] = 'w' if perms & 0o002 else '-'
        mode[9] = 'x' if perms & 0o001 else '-'
        return ''.join(mode)
    except:
        return f"?{octal_perm}"

def compute_hashes(file_path):
    """Compute multiple hashes including MD5, SHA1, SHA256, SHA512, and CRC32."""
    hashes = {}
    errors = []
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
            hashes['md5'] = hashlib.md5(data).hexdigest()
            hashes['sha1'] = hashlib.sha1(data).hexdigest()
            hashes['sha256'] = hashlib.sha256(data).hexdigest()
            hashes['sha512'] = hashlib.sha512(data).hexdigest()
            hashes['crc32'] = hex(zlib.crc32(data) & 0xFFFFFFFF)
    except Exception as e:
        errors.append(f"Hash computation failed for {file_path}: {str(e)}")
        hashes['error'] = str(e)
    return hashes, errors

def get_file_metadata(file_path, client_metadata=None):
    """Get extended file metadata including size, times, permissions, and more."""
    metadata = {}
    errors = []
    try:
        if client_metadata and 'metadata' in client_metadata:
            # Use client-provided metadata if available
            metadata.update(client_metadata['metadata'])
        else:
            # Fall back to filesystem metadata
            stats = os.stat(file_path)
            metadata['size_bytes'] = stats.st_size
            metadata['size_readable'] = format_size(stats.st_size)
            metadata['modification_time'] = datetime.datetime.fromtimestamp(stats.st_mtime).isoformat()
            metadata['modification_time_readable'] = format_timestamp(metadata['modification_time'])
            metadata['access_time'] = datetime.datetime.fromtimestamp(stats.st_atime).isoformat()
            metadata['access_time_readable'] = format_timestamp(metadata['access_time'])
            # Use exiftool to get media create date if available
            try:
                exif_output = subprocess.check_output(['exiftool', '-CreateDate', '-MediaCreateDate', file_path], text=True).strip()
                media_create_date = re.search(r'Media Create Date\s+:\s+(.+)', exif_output)
                if media_create_date:
                    metadata['creation_time'] = datetime.datetime.strptime(media_create_date.group(1), '%Y:%m:%d %H:%M:%S').isoformat()
                else:
                    metadata['creation_time'] = datetime.datetime.fromtimestamp(stats.st_ctime).isoformat()
            except subprocess.CalledProcessError:
                metadata['creation_time'] = datetime.datetime.fromtimestamp(stats.st_ctime).isoformat()
            metadata['creation_time_readable'] = format_timestamp(metadata['creation_time'])
            metadata['inode'] = stats.st_ino
            metadata['permissions_octal'] = oct(stats.st_mode)[-3:]
            metadata['permissions_symbolic'] = format_permissions(metadata['permissions_octal'], 'regular file' if os.path.isfile(file_path) else 'directory' if os.path.isdir(file_path) else 'other')
            metadata['owner_uid'] = stats.st_uid
            metadata['group_gid'] = stats.st_gid
            metadata['file_type'] = 'directory' if os.path.isdir(file_path) else 'regular file' if os.path.isfile(file_path) else 'other'
            metadata['device_id'] = stats.st_dev
            metadata['hard_links'] = stats.st_nlink
    except Exception as e:
        errors.append(f"Metadata collection failed for {file_path}: {str(e)}")
        metadata['error'] = str(e)
    return metadata, errors

def get_image_dimensions(file_path, magic, data):
    """Extract image dimensions for JPEG, PNG, and BMP."""
    errors = []
    try:
        if magic == 'JPEG':
            with open(file_path, 'rb') as f:
                f.seek(2)
                while True:
                    marker = f.read(2)
                    if not marker or marker[0] != 0xFF:
                        errors.append(f"Invalid JPEG marker in {file_path}")
                        return {'width': 0, 'height': 0, 'error': 'Invalid JPEG marker'}, errors
                    if marker[1] in (0xC0, 0xC2):  # SOF0 or SOF2
                        f.seek(3, 1)  # Skip length and precision
                        height = struct.unpack('>H', f.read(2))[0]
                        width = struct.unpack('>H', f.read(2))[0]
                        if width <= 0 or height <= 0:
                            errors.append(f"Invalid dimensions (width={width}, height={height}) in {file_path}")
                            return {'width': 0, 'height': 0, 'error': 'Invalid dimensions'}, errors
                        return {'width': width, 'height': height}, errors
                    length = struct.unpack('>H', f.read(2))[0]
                    if length < 2 or f.tell() + length - 2 > len(data):
                        errors.append(f"Truncated or invalid JPEG segment in {file_path}")
                        return {'width': 0, 'height': 0, 'error': 'Truncated JPEG segment'}, errors
                    f.seek(length - 2, 1)
                    errors.append(f"No SOF marker found in {file_path}")
                    return {'width': 0, 'height': 0, 'error': 'No SOF marker'}, errors
        elif magic == 'PNG':
            if len(data) >= 24:
                width = struct.unpack('>I', data[16:20])[0]
                height = struct.unpack('>I', data[20:24])[0]
                if width <= 0 or height <= 0:
                    errors.append(f"Invalid dimensions (width={width}, height={height}) in {file_path}")
                    return {'width': 0, 'height': 0, 'error': 'Invalid dimensions'}, errors
                return {'width': width, 'height': height}, errors
            errors.append(f"Insufficient data for PNG dimensions in {file_path}")
            return {'width': 0, 'height': 0, 'error': 'Insufficient PNG data'}, errors
        elif magic == 'BMP':
            if len(data) >= 26:
                width = struct.unpack('<i', data[18:22])[0]
                height = abs(struct.unpack('<i', data[22:26])[0])
                if width <= 0 or height <= 0:
                    errors.append(f"Invalid dimensions (width={width}, height={height}) in {file_path}")
                    return {'width': 0, 'height': 0, 'error': 'Invalid dimensions'}, errors
                return {'width': width, 'height': height}, errors
            errors.append(f"Insufficient data for BMP dimensions in {file_path}")
            return {'width': 0, 'height': 0, 'error': 'Insufficient BMP data'}, errors
        return {'width': 0, 'height': 0, 'error': 'Unsupported file type'}, errors
    except Exception as e:
        errors.append(f"Dimension extraction failed for {file_path}: {str(e)}")
        return {'width': 0, 'height': 0, 'error': str(e)}, errors

def compute_entropy_histogram(data):
    """Compute a histogram of byte frequencies for entropy analysis."""
    errors = []
    try:
        count = defaultdict(int)
        for byte in data:
            count[byte] += 1
        total = len(data)
        histogram = {str(i): count[i] / total for i in range(256) if count[i] > 0}
        return histogram, errors
    except Exception as e:
        errors.append(f"Entropy histogram computation failed: {str(e)}")
        return {}, errors

def check_header_footer(data, magic):
    """Check for unexpected data before header or after footer."""
    errors = []
    anomalies = []
    try:
        if magic == 'JPEG':
            jpeg_start = b'\xFF\xD8'
            jpeg_end = b'\xFF\xD9'
            if not data.startswith(jpeg_start):
                start_pos = data.find(jpeg_start)
                if start_pos == -1:
                    anomalies.append("No JPEG header found")
                else:
                    anomalies.append(f"Unexpected data before JPEG header: {len(data[:start_pos])} bytes")
            if not data.endswith(jpeg_end):
                end_pos = data.rfind(jpeg_end)
                if end_pos != -1:
                    anomalies.append(f"Unexpected data after JPEG footer: {len(data[end_pos+2:])} bytes")
                else:
                    anomalies.append("No JPEG footer found")
        elif magic == 'PNG':
            png_start = b'\x89PNG\r\n\x1A\n'
            if not data.startswith(png_start):
                start_pos = data.find(png_start)
                if start_pos == -1:
                    anomalies.append("No PNG header found")
                else:
                    anomalies.append(f"Unexpected data before PNG header: {len(data[:start_pos])} bytes")
            iend_pos = data.rfind(b'IEND')
            if iend_pos != -1:
                iend_length = struct.unpack('>I', data[iend_pos-4:iend_pos])[0]
                if iend_pos + iend_length + 12 < len(data):
                    anomalies.append(f"Unexpected data after PNG IEND chunk: {len(data[iend_pos+iend_length+12:])} bytes")
            else:
                anomalies.append("No PNG IEND chunk found")
        elif magic == 'PDF':
            pdf_start = b'%PDF-'
            if not data.startswith(pdf_start):
                start_pos = data.find(pdf_start)
                if start_pos == -1:
                    anomalies.append("No PDF header found")
                else:
                    anomalies.append(f"Unexpected data before PDF header: {len(data[:start_pos])} bytes")
            eof_pos = data.rfind(b'%%EOF')
            if eof_pos != -1 and eof_pos + 5 < len(data):
                anomalies.append(f"Unexpected data after PDF %%EOF: {len(data[eof_pos+5:])} bytes")
            elif eof_pos == -1:
                anomalies.append("No PDF %%EOF marker found")
    except Exception as e:
        errors.append(f"Header/footer check failed: {str(e)}")
    return anomalies, errors

def compute_compression_ratio(file_path, magic, data):
    """Compute compression ratio for compressed formats."""
    errors = []
    try:
        if magic in ['PNG', 'JPEG', 'ZIP']:
            actual_size = len(data)
            if magic == 'JPEG':
                try:
                    with open(file_path, 'rb') as f:
                        f.seek(2)
                        while True:
                            marker = f.read(2)
                            if not marker or marker[0] != 0xFF:
                                errors.append(f"Invalid JPEG marker in {file_path}")
                                return 0.0, errors
                            if marker[1] in (0xC0, 0xC2):
                                f.seek(3, 1)
                                height = struct.unpack('>H', f.read(2))[0]
                                width = struct.unpack('>H', f.read(2))[0]
                                break
                            length = struct.unpack('>H', f.read(2))[0]
                            if length < 2 or f.tell() + length - 2 > len(data):
                                errors.append(f"Truncated or invalid JPEG segment in {file_path}")
                                return 0.0, errors
                            f.seek(length - 2, 1)
                        if width <= 0 or height <= 0:
                            errors.append(f"Invalid dimensions (width={width}, height={height}) in {file_path}")
                            return 0.0, errors
                        uncompressed_size = width * height * 3
                        ratio = uncompressed_size / actual_size if actual_size > 0 else 0
                        return ratio, errors
                except Exception as e:
                    errors.append(f"JPEG dimension extraction failed for {file_path}: {str(e)}")
                    return 0.0, errors
            # ... (PNG and ZIP handling remains unchanged)
        return 0.0, errors
    except Exception as e:
        errors.append(f"Compression ratio computation failed for {file_path}: {str(e)}")
        return 0.0, errors

def extract_exif_jpeg(data, file_path):
    """Enhanced EXIF extraction for JPEG."""
    exif = {}
    errors = []
    try:
        app1_pos = data.find(b'\xFF\xE1')
        if app1_pos == -1:
            errors.append(f"No EXIF marker found in {file_path}")
            exif['error'] = 'No EXIF marker'
            return exif, errors
        length = struct.unpack('>H', data[app1_pos + 2:app1_pos + 4])[0]
        if app1_pos + 4 + length > len(data):
            errors.append(f"Truncated EXIF data in {file_path}")
            exif['error'] = 'Truncated EXIF data'
            return exif, errors
        exif_data = data[app1_pos + 4:app1_pos + 2 + length]
        if not exif_data.startswith(b'Exif\x00\x00'):
            errors.append(f"Invalid EXIF header in {file_path}")
            exif['error'] = 'Invalid EXIF header'
            return exif, errors
        tiff_offset = 6
        byte_order = exif_data[tiff_offset:tiff_offset+2]
        endian = '<' if byte_order == b'II' else '>' if byte_order == b'MM' else None
        if not endian:
            errors.append(f"Invalid byte order in {file_path}")
            exif['error'] = 'Invalid byte order'
            return exif, errors
        ifd0_offset = struct.unpack(endian + 'I', exif_data[tiff_offset + 4:tiff_offset + 8])[0]
        if tiff_offset + ifd0_offset + 2 > len(exif_data):
            errors.append(f"Invalid IFD0 offset in {file_path}")
            exif['error'] = 'Invalid IFD0 offset'
            return exif, errors
        num_entries = struct.unpack(endian + 'H', exif_data[tiff_offset + ifd0_offset:tiff_offset + ifd0_offset + 2])[0]
        tags = {
            0x010F: 'Make',
            0x0110: 'Model',
            0x0131: 'Software',
            0x0132: 'DateTime',
            0x9003: 'DateTimeOriginal',
            0x9286: 'UserComment',
            0x829A: 'ExposureTime',
            0x829D: 'FNumber',
            0x8827: 'ISO'
        }
        for i in range(num_entries):
            entry_offset = tiff_offset + ifd0_offset + 2 + i * 12
            if entry_offset + 12 > len(exif_data):
                errors.append(f"Truncated EXIF entry in {file_path}")
                exif['error'] = 'Truncated EXIF entry'
                break
            tag = struct.unpack(endian + 'H', exif_data[entry_offset:entry_offset + 2])[0]
            fmt = struct.unpack(endian + 'H', exif_data[entry_offset + 2:entry_offset + 4])[0]
            count = struct.unpack(endian + 'I', exif_data[entry_offset + 4:entry_offset + 8])[0]
            value_offset = struct.unpack(endian + 'I', exif_data[entry_offset + 8:entry_offset + 12])[0]
            if tiff_offset + value_offset + count > len(exif_data):
                errors.append(f"Invalid EXIF value offset for tag 0x{tag:04x} in {file_path}")
                continue
            if tag in tags:
                if fmt == 2:  # ASCII
                    value = exif_data[tiff_offset + value_offset:tiff_offset + value_offset + count].decode('ascii', errors='ignore').rstrip('\x00')
                    exif[tags[tag]] = value
                elif fmt == 5:  # Rational
                    num = struct.unpack(endian + 'I', exif_data[tiff_offset + value_offset:tiff_offset + value_offset + 4])[0]
                    den = struct.unpack(endian + 'I', exif_data[tiff_offset + value_offset + 4:tiff_offset + value_offset + 8])[0]
                    exif[tags[tag]] = f"{num}/{den}" if den != 0 else "N/A"
                elif fmt == 3 or fmt == 4:  # Short/Long
                    value = struct.unpack(endian + ('H' if fmt == 3 else 'I'), exif_data[tiff_offset + value_offset:tiff_offset + value_offset + (2 if fmt == 3 else 4)])[0]
                    exif[tags[tag]] = value
    except Exception as e:
        errors.append(f"EXIF extraction failed for {file_path}: {str(e)}")
        exif['error'] = str(e)
    return exif, errors

def extract_pdf_metadata(data, file_path):
    """Extract PDF metadata with signature validation."""
    metadata = {}
    errors = []
    try:
        text = data.decode('latin1', errors='ignore')
        patterns = {
            'Producer': r'/Producer \((.*?)\)',
            'Creator': r'/Creator \((.*?)\)',
            'CreationDate': r'/CreationDate \((.*?)\)',
            'ModDate': r'/ModDate \((.*?)\)',
            'Author': r'/Author \((.*?)\)',
            'Title': r'/Title \((.*?)\)',
            'Subject': r'/Subject \((.*?)\)',
            'Keywords': r'/Keywords \((.*?)\)'
        }
        for key, pat in patterns.items():
            match = re.search(pat, text, re.DOTALL)
            if match:
                metadata[key] = match.group(1)
        metadata['has_signature'] = bool(re.search(r'/Type /Sig', text))
        if metadata['has_signature']:
            sig_match = re.search(r'/Contents <([0-9a-fA-F]+)>', text)
            if sig_match:
                try:
                    sig_data = bytes.fromhex(sig_match.group(1))
                    computed_hash = hashlib.sha256(sig_data).hexdigest()
                    metadata['signature_hash'] = computed_hash
                    metadata['signature_valid'] = len(sig_data) > 0
                except:
                    metadata['signature_valid'] = False
                    errors.append(f"Signature validation failed for {file_path}")
            else:
                metadata['signature_valid'] = False
                errors.append(f"No signature contents found in {file_path}")
        metadata['revision_count'] = len(re.findall(r'%%EOF', text))
        metadata['page_count'] = text.count('/Type /Page')
    except Exception as e:
        errors.append(f"PDF metadata extraction failed for {file_path}: {str(e)}")
        metadata['error'] = str(e)
    return metadata, errors

def validate_png_chunks(data, file_path):
    """Validate PNG chunk CRCs and structure."""
    errors = []
    try:
        pos = 8
        seen_ihdr = False
        seen_idat = False
        seen_iend = False
        while pos < len(data):
            length = struct.unpack('>I', data[pos:pos+4])[0]
            if pos + 8 + length + 4 > len(data):
                errors.append(f"Truncated chunk detected in {file_path}")
                return False, errors
            chunk_type = data[pos+4:pos+8]
            chunk_data = data[pos+8:pos+8+length]
            stored_crc = struct.unpack('>I', data[pos+8+length:pos+12+length])[0]
            computed_crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
            if computed_crc != stored_crc:
                errors.append(f"Invalid CRC for {chunk_type.decode()} in {file_path}")
                return False, errors
            if chunk_type == b'IHDR':
                seen_ihdr = True
            elif chunk_type == b'IDAT':
                seen_idat = True
            elif chunk_type == b'IEND':
                seen_iend = True
            pos += 12 + length
        if not (seen_ihdr and seen_idat and seen_iend):
            errors.append(f"Missing critical chunks in {file_path}")
            return False, errors
        return True, errors
    except Exception as e:
        errors.append(f"PNG chunk validation failed for {file_path}: {str(e)}")
        return False, errors

def compute_lsb_entropy_bmp(data, file_path):
    """Compute entropy of LSB in BMP blue channel for stego detection."""
    errors = []
    try:
        pixel_offset = struct.unpack('<I', data[10:14])[0]
        width = struct.unpack('<i', data[18:22])[0]
        height = abs(struct.unpack('<i', data[22:26])[0])
        bpp = struct.unpack('<H', data[28:30])[0]
        if bpp != 24:
            errors.append(f"Only 24bpp BMP supported in {file_path}")
            return 0.0, errors
        pixel_data = data[pixel_offset:]
        row_size = ((width * 3 + 3) // 4) * 4
        lsbs = []
        for y in range(height):
            row_start = y * row_size if data[26:28] == b'\x01\x00' else (height - 1 - y) * row_size
            for x in range(width):
                px_start = row_start + x * 3
                if px_start + 3 > len(pixel_data):
                    errors.append(f"Truncated pixel data in {file_path}")
                    return 0.0, errors
                blue = pixel_data[px_start]
                lsb = blue & 1
                lsbs.append(lsb)
        total = len(lsbs)
        if total == 0:
            errors.append(f"No pixels found in {file_path}")
            return 0.0, errors
        p0 = lsbs.count(0) / total
        p1 = 1 - p0
        ent = 0
        if p0 > 0:
            ent -= p0 * math.log2(p0)
        if p1 > 0:
            ent -= p1 * math.log2(p1)
        return ent, errors
    except Exception as e:
        errors.append(f"BMP LSB entropy computation failed for {file_path}: {str(e)}")
        return 0.0, errors

def compute_lsb_entropy_jpeg(data, file_path):
    """Compute LSB entropy of JPEG DCT coefficients for stego detection."""
    errors = []
    try:
        dct_coeffs = []
        pos = data.find(b'\xFF\xDA')
        if pos == -1:
            errors.append(f"No SOS marker found in {file_path}")
            return 0.0, errors
        pos += 2
        while pos < len(data) and not (data[pos:pos+2] == b'\xFF\xD9'):
            coeff = data[pos]
            dct_coeffs.append(coeff & 1)
            pos += 1
        total = len(dct_coeffs)
        if total == 0:
            errors.append(f"No DCT coefficients found in {file_path}")
            return 0.0, errors
        p0 = dct_coeffs.count(0) / total
        p1 = 1 - p0
        ent = 0
        if p0 > 0:
            ent -= p0 * math.log2(p0)
        if p1 > 0:
            ent -= p1 * math.log2(p1)
        return ent, errors
    except Exception as e:
        errors.append(f"JPEG LSB entropy computation failed for {file_path}: {str(e)}")
        return 0.0, errors

def find_embedded_signatures(data, file_type, file_path):
    """Scan for embedded file signatures with validation."""
    signatures = {
        'PDF': b'%PDF-',
        'PNG': b'\x89PNG\r\n\x1A\n',
        'JPEG': b'\xFF\xD8\xFF',
        'GIF': b'GIF8',
        'BMP': b'BM',
        'ZIP': b'\x50\x4B\x03\x04',
        'ELF': b'\x7FELF',
        'PE': b'MZ'
    }
    found = []
    errors = []
    try:
        for name, sig in signatures.items():
            if file_type == name:
                continue
            pos = data.find(sig, 1)
            while pos != -1:
                valid = False
                if name == 'PDF' and pos + 8 < len(data):
                    valid = data[pos:pos+8].startswith(b'%PDF-1.')
                elif name == 'PNG' and pos + 8 < len(data):
                    valid = data[pos:pos+8] == b'\x89PNG\r\n\x1A\n'
                elif name == 'GIF' and pos + 6 < len(data):
                    valid = data[pos:pos+6] in [b'GIF87a', b'GIF89a']
                elif name == 'BMP' and pos + 14 < len(data):
                    try:
                        size = struct.unpack('<I', data[pos+2:pos+6])[0]
                        valid = size <= len(data) - pos
                    except:
                        errors.append(f"Invalid BMP signature at offset {hex(pos)} in {file_path}")
                elif name == 'ZIP' and pos + 30 < len(data):
                    try:
                        valid = data[pos+4:pos+6] in [b'\x03\x04', b'\x05\x06', b'\x07\x08']
                    except:
                        errors.append(f"Invalid ZIP signature at offset {hex(pos)} in {file_path}")
                if valid:
                    found.append({'type': name, 'offset': hex(pos)})
                pos = data.find(sig, pos + len(sig))
    except Exception as e:
        errors.append(f"Embedded signature detection failed for {file_path}: {str(e)}")
    return found, errors

def extract_printable_strings(data, file_path, min_len=6, max_display=2000):
    """Extract printable ASCII strings, truncating long strings."""
    strings = re.findall(b'[\\x09-\\x0D\\x20-\\x7E]{' + str(min_len).encode() + b',}', data)
    result = []
    errors = []
    try:
        for s in strings[:max_display]:
            decoded = s.decode('ascii', errors='ignore')
            if len(decoded) > 100:
                decoded = decoded[:97] + '...'
            result.append(decoded)
        if len(strings) > max_display:
            result.append(f"[Truncated: {len(strings) - max_display} more strings (total: {len(strings)})]")
    except Exception as e:
        errors.append(f"String extraction failed for {file_path}: {str(e)}")
    return result, errors

def detect_tampering_hints(file_info, file_type, data, file_path):
    """Enhanced tampering detection with refined heuristics."""
    hints = []
    errors = []
    suspicious_indicators = []
    try:
        meta = file_info.get('metadata', {})
        if 'creation_time' in meta and 'modification_time' in meta:
            try:
                ctime = datetime.datetime.fromisoformat(meta['creation_time'])
                mtime = datetime.datetime.fromisoformat(meta['modification_time'])
                if mtime < ctime:
                    suspicious_indicators.append('mtime_before_ctime')
                    hints.append('Modification time before creation time - may be due to file copying or system clock issues')
                    if len(suspicious_indicators) > 1:
                        hints.append('Modification time before creation time - suspicious in context of other anomalies')
            except:
                errors.append(f"Timestamp comparison failed for {file_path}")
        if not file_info['types']['signature_matches_extension']:
            hints.append('File signature does not match extension - possible file masquerading')
            suspicious_indicators.append('signature_mismatch')
        entropy = file_info.get('entropy', 0)
        magic = file_info['types'].get('magic')
        if magic in ['PNG', 'JPEG', 'GIF']:
            if entropy < 7.0:
                hints.append('Unusually low file entropy for compressed image format - possible incomplete compression or anomaly')
                suspicious_indicators.append('low_entropy')
        elif magic == 'BMP':
            if entropy > 7.0:
                hints.append('Unusually high file entropy for uncompressed image format - possible encryption or hidden data')
                suspicious_indicators.append('high_entropy')
        embedded = file_info.get('embedded_signatures', [])
        if embedded:
            hints.append(f'Embedded file signatures found at offsets: {[f["offset"] for f in embedded]} - possible appended data; manual carving recommended')
            suspicious_indicators.append('embedded_signatures')
        header_footer = file_info.get('header_footer_anomalies', [])
        if header_footer:
            hints.extend(header_footer)
            suspicious_indicators.append('header_footer_anomaly')
        if 'dimensions' in file_info and file_info['dimensions'].get('error'):
            hints.append(f"Failed to extract image dimensions: {file_info['dimensions']['error']} - possible corruption or non-standard format")
            suspicious_indicators.append('missing_dimensions')
        if magic == 'JPEG':
            if 'exif' in file_info and file_info['exif'].get('error'):
                hints.append(f"EXIF extraction failed: {file_info['exif']['error']} - possible tampering or missing metadata")
                suspicious_indicators.append('exif_failure')
            elif 'exif' in file_info and 'Software' in file_info['exif']:
                software = file_info['exif']['Software'].lower()
                if any(edit in software for edit in ['photoshop', 'gimp', 'paint', 'lightroom']):
                    hints.append(f"Edited with {software} - indicates potential modification")
                    suspicious_indicators.append('editing_software')
            if 'jpeg_lsb_entropy' in file_info and file_info['jpeg_lsb_entropy'] is not None and file_info['jpeg_lsb_entropy'] > 0.999:
                hints.append(f"High LSB entropy ({file_info['jpeg_lsb_entropy']:.4f}) in JPEG DCT coefficients - possible steganography, but may occur in high-detail images")
                suspicious_indicators.append('high_jpeg_lsb_entropy')
        elif magic == 'PDF':
            if 'pdf_metadata' in file_info:
                pdf_meta = file_info['pdf_metadata']
                if pdf_meta.get('revision_count', 0) > 1:
                    hints.append(f"Multiple revisions ({pdf_meta['revision_count']}) - may indicate edits")
                    suspicious_indicators.append('multiple_revisions')
                if pdf_meta.get('has_signature') and not pdf_meta.get('signature_valid', False):
                    hints.append("Invalid or unverifiable digital signature - possible tampering")
                    suspicious_indicators.append('invalid_signature')
                elif not pdf_meta.get('has_signature', False):
                    hints.append("No digital signature - integrity not cryptographically verified")
                    suspicious_indicators.append('no_signature')
        elif magic == 'PNG':
            if 'png_validation' in file_info and not file_info['png_validation'][0]:
                hints.append(f"PNG structure invalid: {file_info['png_validation'][1]} - tampering likely")
                suspicious_indicators.append('invalid_png')
            if 'compression_ratio' in file_info and file_info['compression_ratio'] is not None:
                ratio = file_info['compression_ratio']
                if ratio < 1.5:
                    hints.append(f"Low compression ratio ({ratio:.2f}) for PNG - possible hidden data")
                    suspicious_indicators.append('low_compression_ratio')
        elif magic == 'BMP':
            if 'lsb_entropy' in file_info and file_info['lsb_entropy'] is not None:
                ent = file_info['lsb_entropy']
                if ent > 0.99:
                    hints.append(f"High LSB entropy ({ent:.4f}) in blue channel - possible LSB steganography")
                    suspicious_indicators.append('high_lsb_entropy')
            if 'compression_ratio' in file_info and file_info['compression_ratio'] is not None:
                ratio = file_info['compression_ratio']
                if ratio < 1.0:
                    hints.append(f"Unexpected compression ratio ({ratio:.2f}) for uncompressed BMP - anomaly detected")
                    suspicious_indicators.append('unexpected_compression')
        if 'printable_strings' in file_info and file_info['printable_strings']:
            if any('password' in s.lower() or 'key' in s.lower() for s in file_info['printable_strings'] if not s.startswith('[Truncated')):
                hints.append('Sensitive strings (e.g., "password", "key") found - review for potential leaks')
                suspicious_indicators.append('sensitive_strings')
        if 'entropy_histogram' in file_info and file_info['entropy_histogram']:
            hist = file_info['entropy_histogram']
            if max(hist.values()) > 0.1:
                hints.append('Skewed byte frequency distribution - possible embedded data')
                suspicious_indicators.append('skewed_histogram')
    except Exception as e:
        errors.append(f"Tampering detection failed for {file_path}: {str(e)}")
    return hints, errors

def analyze_file(file_path, client_metadata=None):
    """Advanced single file forensic analysis."""
    result = {
        'path': os.path.abspath(file_path),
        'types': {},
        'hashes': {},
        'metadata': {},
        'entropy': 0.0,
        'tampering_hints': [],
        'embedded_signatures': [],
        'errors': [],
        'exif': {},
        'dimensions': {'width': 0, 'height': 0},
        'jpeg_lsb_entropy': 0.0
    }
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        result['types'], type_errors = detect_file_type(file_path)
        result['errors'].extend(type_errors)
        file_type = result['types']['mime_type'] or 'application/octet-stream'
        magic = result['types'].get('magic')
        result['hashes'], hash_errors = compute_hashes(file_path)
        result['errors'].extend(hash_errors)
        result['metadata'], meta_errors = get_file_metadata(file_path, client_metadata)
        result['errors'].extend(meta_errors)
        if data:
            count = defaultdict(int)
            for byte in data:
                count[byte] += 1
            total = len(data)
            probs = [count[b] / total for b in count]
            result['entropy'] = -sum(p * math.log2(p) for p in probs if p > 0)
        result['entropy_histogram'], hist_errors = compute_entropy_histogram(data)
        result['errors'].extend(hist_errors)
        result['embedded_signatures'], sig_errors = find_embedded_signatures(data, magic, file_path)
        result['errors'].extend(sig_errors)
        result['printable_strings'], str_errors = extract_printable_strings(data, file_path)
        result['errors'].extend(str_errors)
        result['header_footer_anomalies'], hf_errors = check_header_footer(data, magic)
        result['errors'].extend(hf_errors)
        result['compression_ratio'], comp_errors = compute_compression_ratio(file_path, magic, data)
        result['errors'].extend(comp_errors)
        result['dimensions'], dim_errors = get_image_dimensions(file_path, magic, data)
        result['errors'].extend(dim_errors)
        
        if magic == 'JPEG':
            result['exif'], exif_errors = extract_exif_jpeg(data, file_path)
            result['errors'].extend(exif_errors)
            result['jpeg_lsb_entropy'], jpeg_lsb_errors = compute_lsb_entropy_jpeg(data, file_path)
            result['errors'].extend(jpeg_lsb_errors)
        elif magic == 'PDF':
            result['pdf_metadata'], pdf_errors = extract_pdf_metadata(data, file_path)
            result['errors'].extend(pdf_errors)
        elif magic == 'PNG':
            result['png_validation'], png_errors = validate_png_chunks(data, file_path)
            result['errors'].extend(png_errors)
            pos = 8
            idats = b''
            while pos < len(data):
                length = struct.unpack('>I', data[pos:pos+4])[0]
                chunk_type = data[pos+4:pos+8]
                if chunk_type == b'IDAT':
                    idats += data[pos+8:pos+8+length]
                pos += 12 + length
                if chunk_type == b'IEND':
                    break
            if idats:
                try:
                    decompressed = zlib.decompress(idats)
                    result['decompressed_idat_size'] = len(decompressed)
                    result['decompressed_idat_readable'] = format_size(len(decompressed))
                    count_d = defaultdict(int)
                    for byte in decompressed:
                        count_d[byte] += 1
                    probs_d = [count_d[b] / len(decompressed) for b in count_d]
                    result['decompressed_entropy'] = -sum(p * math.log2(p) for p in probs_d if p > 0)
                except zlib.error as e:
                    result['decompression_error'] = str(e)
                    result['tampering_hints'].append('IDAT decompression failed - possible corruption or tampering')
                    result['errors'].append(f"PNG IDAT decompression failed for {file_path}: {str(e)}")
        elif magic == 'BMP':
            result['lsb_entropy'], bmp_lsb_errors = compute_lsb_entropy_bmp(data, file_path)
            result['errors'].extend(bmp_lsb_errors)
        if magic not in ['PNG', 'JPEG', 'GIF', 'BMP']:
            result['dimensions'] = {'width': 0, 'height': 0}
        
        result['tampering_hints'], tamper_errors = detect_tampering_hints(result, file_type, data, file_path)
        result['errors'].extend(tamper_errors)
    except Exception as e:
        result['errors'].append(f"File analysis failed for {file_path}: {str(e)}")
    return result

def compare_two_files(info1, info2):
    """Advanced comparison between two file infos."""
    comp = {
        'identical_hashes': False,
        'size_difference': abs(info1['metadata'].get('size_bytes', 0) - info2['metadata'].get('size_bytes', 0)),
        'size_difference_readable': format_size(abs(info1['metadata'].get('size_bytes', 0) - info2['metadata'].get('size_bytes', 0))),
        'entropy_difference': abs(info1['entropy'] - info2['entropy']),
        'metadata_diffs': {},
        'tampering_hints_combined': list(set(info1['tampering_hints'] + info2['tampering_hints']))
    }
    errors = []
    try:
        hash_checks = [
            info1['hashes'].get(h) == info2['hashes'].get(h)
            for h in ['md5', 'sha256']
            if h in info1['hashes'] and h in info2['hashes']
        ]
        comp['identical_hashes'] = all(hash_checks)
        for key in set(info1['metadata']) | set(info2['metadata']):
            if info1['metadata'].get(key) != info2['metadata'].get(key):
                comp['metadata_diffs'][key] = {'file1': info1['metadata'].get(key), 'file2': info2['metadata'].get(key)}
        if 'pdf_metadata' in info1 and 'pdf_metadata' in info2:
            pdf1, pdf2 = info1['pdf_metadata'], info2['pdf_metadata']
            if pdf1.get('page_count') != pdf2.get('page_count'):
                comp['metadata_diffs']['page_count'] = {'file1': pdf1.get('page_count'), 'file2': pdf2.get('page_count')}
        if 'dimensions' in info1 and 'dimensions' in info2 and info1['dimensions'] != info2['dimensions']:
            comp['metadata_diffs']['dimensions'] = {
                'file1': info1['dimensions'],
                'file2': info2['dimensions']
            }
        if 'exif' in info1 and 'exif' in info2 and info1['exif'] != info2['exif']:
            comp['metadata_diffs']['exif'] = {
                'file1': info1['exif'],
                'file2': info2['exif']
            }
        strings1 = set(s for s in info1.get('printable_strings', []) if not s.startswith('[Truncated'))
        strings2 = set(s for s in info2.get('printable_strings', []) if not s.startswith('[Truncated'))
        comp['unique_strings_file1'] = len(strings1 - strings2)
        comp['unique_strings_file2'] = len(strings2 - strings1)
        comp['common_strings'] = len(strings1 & strings2)
        comp['common_strings_list'] = list(strings1 & strings2)[:10]
        if len(strings1 & strings2) > 10:
            comp['common_strings_list'].append(f"[Truncated: {len(strings1 & strings2) - 10} more strings]")
        if not comp['identical_hashes']:
            with open(info1['path'], 'rb') as f1, open(info2['path'], 'rb') as f2:
                data1 = f1.read()
                data2 = f2.read()
            byte_diffs = sum(1 for a, b in zip(data1, data2) if a != b)
            extra = abs(len(data1) - len(data2))
            comp['byte_differences'] = byte_diffs + extra
            comp['similarity_percentage'] = (1 - (comp['byte_differences'] / max(len(data1), len(data2), 1))) * 100
        else:
            comp['byte_differences'] = 0
            comp['similarity_percentage'] = 100.0
    except Exception as e:
        errors.append(f"File comparison failed between {info1['path']} and {info2['path']}: {str(e)}")
    return comp, errors
def generate_verdict_summary(analyses, comparisons, duplicate_groups):
    """Generate a structured verdict summary for JavaScript querying."""
    summary = {
        'files_analyzed': len(analyses),
        'duplicates_found': len(duplicate_groups),
        'duplicate_groups': list(duplicate_groups.values()),
        'duplicate_file_pairs': [],
        'tampering_detected': any(info['tampering_hints'] for info in analyses.values()),
        'tampering_hints': list(set(hint for info in analyses.values() for hint in info['tampering_hints'])),
        'average_similarity': 0.0,
        'identical_files': False,
        'errors': []
    }
    if comparisons:
        sims = [comp['similarity_percentage'] for comp in comparisons.values()]
        summary['average_similarity'] = sum(sims) / len(sims) if sims else 0
        summary['identical_files'] = all(comp['identical_hashes'] for comp in comparisons.values())
        summary['duplicate_file_pairs'] = [
            pair for pair, comp in comparisons.items() if comp['identical_hashes']
        ]
    for info in analyses.values():
        summary['errors'].extend(info.get('errors', []))
    summary['errors'] = list(set(summary['errors']))
    return summary

def generate_overall_verdict(analyses, comparisons, duplicate_groups, input_files, duplicate_inputs):
    """Generate a comprehensive overall verdict as a list for JSON compatibility."""
    verdict_lines = []
    summary_table = ["Summary of Analyzed Files:", "-" * 50]
    summary_table.append(f"{'File':<30} {'Size':<10} {'Type':<10} {'SHA256':<20}")
    #summary_table.append(f"{key:<30} {info['metadata'].get('size_readable', 'N/A'):<10} {info['types'].get('magic', 'Unknown'):<10} {info['hashes'].get('sha256', 'N/A')[:16] + '...' if info['hashes'].get('sha256') else 'N/A':<20}")
    try:
        for key, info in analyses.items():
            sha = info['hashes'].get('sha256', 'N/A')[:16] + '...' if info['hashes'].get('sha256') else 'N/A'
            size = info['metadata'].get('size_readable', 'N/A')
            ftype = info['types'].get('magic', 'Unknown')
            summary_table.append(f"{key:<30} {size:<10} {ftype:<10} {sha:<20}")
        if duplicate_inputs:
            verdict_lines.append({
                'type': 'warning',
                'message': "Duplicate input file paths detected and skipped",
                'details': [f"Path: {path}, count: {count}" for path, count in duplicate_inputs.items()]
            })
        if duplicate_groups:
            verdict_lines.append({
                'type': 'duplicate',
                'message': "Duplicate files detected based on SHA256 and MD5 hashes",
                'details': [f"Group {i+1}: {', '.join(os.path.basename(f) for f in group)}" for i, group in enumerate(duplicate_groups.values())]
            })
        else:
            verdict_lines.append({
                'type': 'duplicate',
                'message': "No duplicate files found",
                'details': []
            })
        tampering = list(set(hint for info in analyses.values() for hint in info['tampering_hints']))
        if tampering:
            verdict_lines.append({
                'type': 'tampering',
                'message': "Potential anomalies detected",
                'details': tampering
            })
        else:
            verdict_lines.append({
                'type': 'tampering',
                'message': "No anomalies detected in individual files",
                'details': []
            })
        if comparisons:
            sims = [comp['similarity_percentage'] for comp in comparisons.values() if comp.get('similarity_percentage')]
            avg_sim = sum(sims) / len(sims) if sims else 0
            verdict_lines.append({
                'type': 'similarity',
                'message': f"Average similarity across pairs: {avg_sim:.2f}%",
                'details': []
            })
            if all(comp.get('identical_hashes', False) for comp in comparisons.values()):
                verdict_lines.append({
                    'type': 'similarity',
                    'message': "All files are identical",
                    'details': []
                })
            elif avg_sim > 90:
                verdict_lines.append({
                    'type': 'similarity',
                    'message': "Files are highly similar",
                    'details': []
                })
            elif avg_sim < 10:
                verdict_lines.append({
                    'type': 'similarity',
                    'message': "Files are significantly different",
                    'details': []
                })
            else:
                verdict_lines.append({
                    'type': 'similarity',
                    'message': "Files show moderate differences",
                    'details': []
                })
        else:
            verdict_lines.append({
                'type': 'comparison',
                'message': "Only one file provided - no comparisons possible",
                'details': []
            })
        narrative = "\n".join(summary_table) + "\n\n" + "\n".join(
            f"{item['message']}:\n" + "\n".join(f"- {detail}" for detail in item['details'])
            for item in verdict_lines if item['details'] or item['message']
        )
        return verdict_lines, narrative
    except Exception as e:
        return [{'type': 'error', 'message': f"Verdict generation failed: {str(e)}", 'details': []}], f"Verdict generation failed: {str(e)}"
def detect_file_type(file_path):
    """Detect file type using mimetypes, magic numbers, and extension verification."""
    mime_type, _ = mimetypes.guess_type(file_path)
    extension = os.path.splitext(file_path)[1].lower()
    magic = None
    signature_match = True
    errors = []
    try:
        with open(file_path, 'rb') as f:
            header = f.read(32)
            if header.startswith(b'%PDF-'):
                magic = 'PDF'
            elif header.startswith(b'\x89PNG\r\n\x1A\n'):
                magic = 'PNG'
            elif header.startswith(b'\xFF\xD8\xFF'):
                magic = 'JPEG'
            elif header.startswith(b'GIF87a') or header.startswith(b'GIF89a'):
                magic = 'GIF'
            elif header.startswith(b'BM'):
                magic = 'BMP'
            elif header.startswith(b'MZ'):
                magic = 'PE Executable'
            elif header.startswith(b'\x7FELF'):
                magic = 'ELF Executable'
            elif header.startswith(b'\x50\x4B\x03\x04'):
                magic = 'ZIP'
            elif header.startswith(b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'):
                magic = 'OLE (DOC, XLS, etc.)'
            elif re.match(b'#!/.*\n', header):
                magic = 'Script'
            elif header.startswith(b'\x00\x00\x01\xBA') or header.startswith(b'\x00\x00\x01\xB3'):  # MPEG video
                magic = 'MPEG'
            elif header.startswith(b'ftyp') and b'mp42' in header or b'mp4':
                magic = 'MP4' or "mp4"
            expected_extensions = {
                'PDF': ['.pdf'],
                'PNG': ['.png'],
                'JPEG': ['.jpg', '.jpeg'],
                'GIF': ['.gif'],
                'BMP': ['.bmp'],
                'PE Executable': ['.exe', '.dll'],
                'ELF Executable': [''],
                'ZIP': ['.zip', '.docx', '.xlsx', '.pptx', '.jar'],
                'OLE': ['.doc', '.xls', '.ppt','doc', 'docx','xls', 'ppt'],
                'MPEG': ['.mpg', '.mpeg', 'mpeg'],
                'mp4': ['.mp4', '.mp3', '.web', ".webm",'mp4'],
                'MP4': ['.MP4', '.mp4', '.mp', 'MP4'],
                'codes':[['.py', 'py', '.html', '.htm', 'htm','.js', 'js']]

            }
        if magic and extension not in (expected_extensions.get(magic, [] ) or expected_extensions.get(magic, [][0] | '')):
            signature_match = False
    except Exception as e:
        errors.append(f"File type detection failed for {file_path}: {str(e)}")
    return {'mime_type': mime_type, 'magic': magic, 'signature_matches_extension': signature_match}, errors
def forensic_multi_comparison(files, client_metadata=None):
    """Main function for advanced multi-file forensic analysis."""
    if len(files) < 1:
        return {'error': 'At least one file required'}
    analyses = {}
    errors = []
    unique_files = []
    duplicate_inputs = defaultdict(int)
    try:
        seen_paths = set()
        for f in files:
            abs_path = os.path.abspath(f)
            duplicate_inputs[abs_path] += 1
            if abs_path not in seen_paths:
                unique_files.append(f)
                seen_paths.add(abs_path)
        duplicate_inputs = {k: v for k, v in duplicate_inputs.items() if v > 1}
        
        for i, f in enumerate(unique_files):
            key = os.path.basename(f)
            if sum(1 for p in unique_files if os.path.basename(p) == key) > 1:
                key = f"{key}_{i}"
            analyses[key] = analyze_file(f, client_metadata)
            errors.extend(analyses[key].get('errors', []))
        comparisons = {}
        if len(unique_files) >= 2:
            for i in range(len(unique_files)):
                for j in range(i + 1, len(unique_files)):
                    key1 = f"{os.path.basename(unique_files[i])}_{i}" if sum(1 for p in unique_files if os.path.basename(p) == os.path.basename(unique_files[i])) > 1 else os.path.basename(unique_files[i])
                    key2 = f"{os.path.basename(unique_files[j])}_{j}" if sum(1 for p in unique_files if os.path.basename(p) == os.path.basename(unique_files[j])) > 1 else os.path.basename(unique_files[j])
                    pair = f"{os.path.basename(unique_files[i])} vs {os.path.basename(unique_files[j])}"
                    comparisons[pair], comp_errors = compare_two_files(analyses[key1], analyses[key2])
                    errors.extend(comp_errors)
        hash_groups = defaultdict(list)
        for i, f in enumerate(files):
            abs_path = os.path.abspath(f)
            info = analyses.get(f"{os.path.basename(f)}_{i}", analyses.get(os.path.basename(f)))
            sha = info['hashes'].get('sha256')
            if sha:
                hash_groups[sha].append(abs_path)
        duplicate_groups = {k: list(set(v)) for k, v in hash_groups.items() if len(set(v)) > 1}
        verdict_list, verdict_narrative = generate_overall_verdict(analyses, comparisons, duplicate_groups, unique_files, duplicate_inputs)
        verdict_summary = generate_verdict_summary(analyses, comparisons, duplicate_groups)
        result = {
            'individual_analyses': analyses,
            'pairwise_comparisons': comparisons,
            'duplicate_groups': duplicate_groups,
            'verdict_summary': verdict_summary,
            'overall_verdict': verdict_list,
            'overall_verdict_narrative': verdict_narrative,
            'errors': list(set(errors))
        }
        if duplicate_inputs:
            result['duplicate_inputs'] = duplicate_inputs
        return result
    except Exception as e:
        return {'error': f"Multi-file comparison failed: {str(e)}", 'errors': [str(e)]}
def ensure_response_dir(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def save_json(path, data, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_uuid = str(uuid.uuid4())
    report_file = os.path.join(output_dir, f'JSON-{timestamp}-{file_uuid}.json')
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return report_file

if __name__ == '__main__':
    if len(sys.argv) < 3: 
        print(json.dumps({'error': 'Usage: python comparator.py <output_dir> <file1> [file2 ...]'}))
        sys.exit(1)
    output_dir = sys.argv[1]  
    files = sys.argv[2:]      
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        print(json.dumps({'error': f'Missing files: {", ".join(missing)}'}))
        sys.exit(1)
    
    client_metadata = None
    if not sys.stdin.isatty():
        import json
        client_metadata_input = sys.stdin.read()
        if client_metadata_input:
            try:
                client_metadata = json.loads(client_metadata_input)
            except json.JSONDecodeError:
                client_metadata = {}
    comparison_result = forensic_multi_comparison(files, client_metadata)
    report_file = save_json(files[0], comparison_result, output_dir)
    response = {
        'status': 'success',
        'message': f'Report saved to: {report_file}',
        'report_path': report_file
    }
    print(json.dumps(response))