"""
Shared utility helpers for the compression backend.
"""

import base64

# MIME type mapping for common file extensions
MIME_MAP = {
    # Images
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    # Audio
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
    ".webm": "audio/webm",
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".webm"}


def detect_file_type(filename: str) -> str:
    """Return 'image', 'audio', or 'text' based on file extension."""
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    return "text"


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension."""
    import os
    ext = os.path.splitext(filename)[1].lower()
    return MIME_MAP.get(ext, "application/octet-stream")


def bytes_to_base64(data: bytes) -> str:
    """Encode bytes as a base64 string."""
    return base64.b64encode(data).decode("utf-8")


def base64_to_bytes(b64_string: str) -> bytes:
    """Decode a base64 string to bytes."""
    return base64.b64decode(b64_string)
