"""
FastAPI backend for Huffman & Shannon-Fano Compression/Decompression.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

from huffman import huffman_compress, huffman_decompress
from shannonfano import shannon_fano_compress, shannon_fano_decompress
from utils import detect_file_type, get_mime_type, bytes_to_base64

app = FastAPI(title="Compression Mini-Project API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Compression API is running"}


@app.post("/api/compress")
async def compress(
    algorithm: str = Form(...),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Compress uploaded file or text using the chosen algorithm.

    - algorithm: 'huffman' or 'shannonfano'
    - text: plain text input (optional)
    - file: uploaded file — image or audio (optional)

    At least one of text or file must be provided.
    """
    if not text and not file:
        raise HTTPException(status_code=400, detail="Provide either text or a file.")

    if algorithm not in ("huffman", "shannonfano"):
        raise HTTPException(status_code=400, detail="Algorithm must be 'huffman' or 'shannonfano'.")

    # Determine input type and read data
    if file:
        file_bytes = await file.read()
        file_type = detect_file_type(file.filename)
        mime_type = get_mime_type(file.filename)
        filename = file.filename
        data = file_bytes
    else:
        file_type = "text"
        mime_type = "text/plain"
        filename = "input.txt"
        data = text.encode("utf-8")

    # Compress
    if algorithm == "huffman":
        result = huffman_compress(data)
    else:
        result = shannon_fano_compress(data)

    return {
        "algorithm": algorithm,
        "file_type": file_type,
        "mime_type": mime_type,
        "filename": filename,
        "bits": result["bits"],
        "code_table": result["code_table"],
        "original_size": result["original_size"],
        "compressed_size": result["compressed_size"],
        "compression_ratio": round(result["compressed_size"] / (result["original_size"] * 8) * 100, 2)
        if result["original_size"] > 0
        else 0,
    }


class DecompressRequest(BaseModel):
    algorithm: str
    bits: str
    code_table: dict
    original_size: int
    file_type: str  # 'text', 'image', 'audio'
    mime_type: str
    filename: str


class DecompressBitsRequest(BaseModel):
    encoded_string: str
    algorithm: str


def _do_decompress(algorithm: str, bits: str, code_table: dict,
                   original_size: int, file_type: str, mime_type: str, filename: str):
    """Shared decompression logic."""
    if algorithm not in ("huffman", "shannonfano"):
        raise HTTPException(status_code=400, detail="Algorithm must be 'huffman' or 'shannonfano'.")

    if algorithm == "huffman":
        raw_bytes = huffman_decompress(bits, code_table, original_size)
    else:
        raw_bytes = shannon_fano_decompress(bits, code_table, original_size)

    if file_type == "text":
        try:
            decoded_text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            decoded_text = raw_bytes.decode("latin-1")
        return {
            "file_type": "text",
            "data": decoded_text,
            "filename": filename,
        }
    else:
        return {
            "file_type": file_type,
            "data": bytes_to_base64(raw_bytes),
            "mime_type": mime_type,
            "filename": filename,
        }


@app.post("/api/decompress")
async def decompress(req: DecompressRequest):
    """
    Decompress a bit-string back to original data (full JSON package mode).

    For text: returns the plain string.
    For image/audio: returns base64-encoded data + mime type for download.
    """
    return _do_decompress(
        req.algorithm, req.bits, req.code_table,
        req.original_size, req.file_type, req.mime_type, req.filename
    )


@app.post("/api/decompress-bits")
async def decompress_bits(req: DecompressBitsRequest):
    """
    Decompress from a self-contained encoded string.

    The encoded_string is a base64-encoded JSON containing:
    bits, code_table, original_size, file_type, mime_type, filename.
    """
    import base64

    if req.algorithm not in ("huffman", "shannonfano"):
        raise HTTPException(status_code=400, detail="Algorithm must be 'huffman' or 'shannonfano'.")

    try:
        decoded = base64.b64decode(req.encoded_string)
        pkg = json.loads(decoded)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid encoded string. Please paste the full encoded output from compression.")

    required = ["bits", "code_table", "original_size", "file_type", "mime_type", "filename"]
    for key in required:
        if key not in pkg:
            raise HTTPException(status_code=400, detail=f'Missing field "{key}" in encoded data.')

    return _do_decompress(
        req.algorithm, pkg["bits"], pkg["code_table"],
        pkg["original_size"], pkg["file_type"], pkg["mime_type"], pkg["filename"]
    )
