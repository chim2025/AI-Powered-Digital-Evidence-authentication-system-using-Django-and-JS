import hashlib
import datetime
import zlib

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