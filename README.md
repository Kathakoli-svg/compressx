# CompressX — Huffman & Shannon-Fano Compression Mini-Project

A full-stack web app for compressing and decompressing **images, audio, and text** using **Huffman** and **Shannon-Fano** encoding algorithms.

## Tech Stack

| Layer    | Technology            |
|----------|-----------------------|
| Frontend | HTML + CSS + JavaScript |
| Backend  | Python + FastAPI      |

## Project Structure

```
compdecomminiproject/
├── backend/
│   ├── main.py              # FastAPI app & endpoints
│   ├── huffman.py            # Huffman encoding/decoding
│   ├── shannonfano.py        # Shannon-Fano encoding/decoding
│   ├── utils.py              # Shared helpers
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── index.html            # Main page
│   ├── style.css             # Styling
│   └── script.js             # Frontend logic
└── README.md
```

## Setup & Run

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be running at `http://localhost:8000`.

### 3. Open the Frontend

Open `frontend/index.html` in your browser. You can also serve it with any HTTP server:

```bash
cd frontend
python -m http.server 5500
```

Then visit `http://localhost:5500`.

## Features

- **Compress** images, audio files, or text using Huffman or Shannon-Fano encoding
- **Decompress** bit-strings back to the original data
- View compression statistics (original size, compressed size, ratio)
- Download compressed data as a JSON package
- Download decompressed images and audio files
- Copy compressed bit-strings to clipboard
- Seamless "Send to Decompress" workflow between tabs
