/**
 * CompressX — Frontend Logic
 * Handles compression / decompression via FastAPI backend.
 */

const API_BASE = "http://localhost:8000";

// ─── State ───────────────────────────────────────────────
let currentInputType = "file"; // 'file' | 'text'
let lastCompressResult = null; // store last compression result for "Send to Decompress"

// Active code table for decoding (populated from compression or manual input)
let activeCodeTable = null; // { "byte_val_str": "bit_code", ... }
let activeAlgorithm = null; // 'huffman' | 'shannonfano'

// ─── Tab Switching ───────────────────────────────────────
function switchTab(tab) {
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });

  document.getElementById(`panel-${tab}`).classList.add("active");
  const btn = document.getElementById(`tab-${tab}-btn`);
  btn.classList.add("active");
  btn.setAttribute("aria-selected", "true");
}

// ─── Input Type Toggle (File vs Text) ───────────────────
function setInputType(type) {
  currentInputType = type;
  const toggleBtns = document.querySelectorAll("#compress-input-toggle button");
  toggleBtns.forEach((b) => b.classList.remove("active"));

  if (type === "file") {
    document.getElementById("toggle-file-btn").classList.add("active");
    document.getElementById("compress-file-group").style.display = "";
    document.getElementById("compress-text-group").style.display = "none";
  } else {
    document.getElementById("toggle-text-btn").classList.add("active");
    document.getElementById("compress-file-group").style.display = "none";
    document.getElementById("compress-text-group").style.display = "";
  }
}

// ─── File Drop Zone Enhancements ─────────────────────────
function setupDropZone(dropId, inputId, infoId) {
  const zone = document.getElementById(dropId);
  const input = document.getElementById(inputId);

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event("change"));
    }
  });

  if (infoId) {
    input.addEventListener("change", () => {
      const info = document.getElementById(infoId);
      if (input.files.length) {
        const f = input.files[0];
        const size =
          f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`;
        info.textContent = `📎 ${f.name} (${size})`;
      } else {
        info.textContent = "";
      }
    });
  }
}

// ─── Toast ───────────────────────────────────────────────
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── Spinner ─────────────────────────────────────────────
function showSpinner() {
  document.getElementById("spinner").classList.add("visible");
}
function hideSpinner() {
  document.getElementById("spinner").classList.remove("visible");
}

// ─── Format Helpers ──────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatBits(bits) {
  if (bits < 1024) return `${bits} b`;
  if (bits < 1024 * 1024) return `${(bits / 1024).toFixed(1)} Kb`;
  return `${(bits / (1024 * 1024)).toFixed(2)} Mb`;
}

// ─── COMPRESS ────────────────────────────────────────────
async function handleCompress() {
  const algo = document.getElementById("compress-algo").value;
  const formData = new FormData();
  formData.append("algorithm", algo);

  if (currentInputType === "file") {
    const fileInput = document.getElementById("compress-file-input");
    if (!fileInput.files.length) {
      showToast("Please select a file first.", "error");
      return;
    }
    formData.append("file", fileInput.files[0]);
  } else {
    const text = document.getElementById("compress-text-input").value.trim();
    if (!text) {
      showToast("Please enter some text.", "error");
      return;
    }
    formData.append("text", text);
  }

  showSpinner();
  try {
    const res = await fetch(`${API_BASE}/api/compress`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Compression failed.");
    }

    const data = await res.json();
    lastCompressResult = data;
    displayCompressResult(data);
    showToast("Compression complete!");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    hideSpinner();
  }
}

function displayCompressResult(data) {
  // Auto-store code table so bits can be decoded immediately
  activeCodeTable = data.code_table;
  activeAlgorithm = data.algorithm;
  document.getElementById("decode-bits-algo").value = data.algorithm;

  // Stats
  document.getElementById("stat-original").textContent = formatBytes(
    data.original_size,
  );
  document.getElementById("stat-compressed").textContent = formatBits(
    data.compressed_size,
  );
  document.getElementById("stat-ratio").textContent =
    `${data.compression_ratio}%`;

  // Bits preview (truncate display at 5000 chars)
  const bitsEl = document.getElementById("bits-output");
  if (data.bits.length > 5000) {
    bitsEl.textContent =
      data.bits.substring(0, 5000) +
      `\n\n… [${data.bits.length - 5000} more bits — use "Copy All" to get the full string]`;
  } else {
    bitsEl.textContent = data.bits;
  }

  // Show result section
  document.getElementById("compress-result").classList.add("visible");
}

// ─── Copy Bits ───────────────────────────────────────────
async function copyBits() {
  if (!lastCompressResult) return;
  try {
    await navigator.clipboard.writeText(lastCompressResult.bits);
    showToast("Bit-string copied to clipboard!");
  } catch {
    showToast("Failed to copy.", "error");
  }
}

// ─── Download Compressed Package as JSON ─────────────────
function downloadCompressedData() {
  if (!lastCompressResult) return;
  const pkg = {
    algorithm: lastCompressResult.algorithm,
    bits: lastCompressResult.bits,
    code_table: lastCompressResult.code_table,
    original_size: lastCompressResult.original_size,
    file_type: lastCompressResult.file_type,
    mime_type: lastCompressResult.mime_type,
    filename: lastCompressResult.filename,
  };

  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `compressed_${lastCompressResult.filename || "data"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Package downloaded!");
}

// ─── Send to Decompress Tab ─────────────────────────────
function sendToDecompress() {
  if (!lastCompressResult) return;

  // Store the code table for bit decoding
  activeCodeTable = lastCompressResult.code_table;
  activeAlgorithm = lastCompressResult.algorithm;

  // Set the algorithm dropdown to match
  document.getElementById("decode-bits-algo").value =
    lastCompressResult.algorithm;

  switchTab("decompress");
  showToast("Code table loaded — enter bits to decode!");
}

// ═══════════════════════════════════════════════════════════
// ─── DECOMPRESS — Client-Side Bit Decoding ───────────────
// ═══════════════════════════════════════════════════════════

/**
 * Decode raw binary bits using the active code table (client-side).
 * This is a simple prefix-matching decoder.
 */
function decodeBits(bitString, codeTable) {
  // Build reverse lookup: code → byte value
  const reverseTable = {};
  for (const [byteVal, code] of Object.entries(codeTable)) {
    reverseTable[code] = parseInt(byteVal);
  }

  const decodedBytes = [];
  let currentCode = "";
  let matchPositions = []; // track where each character was decoded from

  for (let i = 0; i < bitString.length; i++) {
    currentCode += bitString[i];
    if (reverseTable.hasOwnProperty(currentCode)) {
      decodedBytes.push({
        byte: reverseTable[currentCode],
        code: currentCode,
        startBit: i - currentCode.length + 1,
        endBit: i,
      });
      currentCode = "";
    }
  }

  return {
    decodedBytes,
    remainingBits: currentCode,
    text: decodedBytes.map(d => String.fromCharCode(d.byte)).join(""),
  };
}

/**
 * Handle the "Decode Bits" button click.
 */
function handleDecodeBits() {
  if (!activeCodeTable || Object.keys(activeCodeTable).length === 0) {
    showToast("No code table loaded. Compress something first or load a table manually.", "error");
    return;
  }

  const bitsInput = document.getElementById("decompress-bits-input").value.trim();
  if (!bitsInput) {
    showToast("Please enter some binary bits to decode.", "error");
    return;
  }

  // Validate input is only 0s and 1s
  if (!/^[01]+$/.test(bitsInput)) {
    showToast("Invalid input — only 0s and 1s are allowed.", "error");
    return;
  }

  const result = decodeBits(bitsInput, activeCodeTable);
  displayDecodeResult(result, bitsInput);
}

/**
 * Display the decoded output with detailed breakdown.
 */
function displayDecodeResult(result, originalBits) {
  const container = document.getElementById("decompress-output");
  container.innerHTML = "";

  if (result.decodedBytes.length === 0) {
    const noMatch = document.createElement("div");
    noMatch.className = "text-output decode-no-match";
    noMatch.textContent = `No matching codes found for "${originalBits}". Check your bits against the code table.`;
    container.appendChild(noMatch);
    document.getElementById("decompress-result").classList.add("visible");
    return;
  }

  // Decoded text output
  const textBox = document.createElement("div");
  textBox.className = "text-output";
  textBox.innerHTML = `<span class="decode-label">Decoded Text</span>\n${result.text}`;
  container.appendChild(textBox);

  // Step-by-step breakdown
  const breakdownTitle = document.createElement("div");
  breakdownTitle.className = "decode-breakdown-title";
  breakdownTitle.textContent = "Step-by-Step Breakdown";
  container.appendChild(breakdownTitle);

  const breakdownGrid = document.createElement("div");
  breakdownGrid.className = "decode-breakdown";

  // Header
  const headers = ["#", "Bits", "→", "Char", "Byte"];
  for (const h of headers) {
    const hEl = document.createElement("div");
    hEl.className = "db-header";
    hEl.textContent = h;
    breakdownGrid.appendChild(hEl);
  }

  // Rows
  result.decodedBytes.forEach((d, i) => {
    const charDisplay = (d.byte >= 32 && d.byte <= 126)
      ? String.fromCharCode(d.byte)
      : `0x${d.byte.toString(16).padStart(2, "0")}`;

    const cells = [
      { text: `${i + 1}`, cls: "db-cell db-step" },
      { text: d.code, cls: "db-cell db-bits" },
      { text: "→", cls: "db-cell db-arrow" },
      { text: charDisplay, cls: "db-cell db-char" },
      { text: `${d.byte}`, cls: "db-cell db-byte" },
    ];

    for (const c of cells) {
      const el = document.createElement("div");
      el.className = c.cls;
      el.textContent = c.text;
      breakdownGrid.appendChild(el);
    }
  });

  container.appendChild(breakdownGrid);

  // Show remaining unmatched bits if any
  if (result.remainingBits) {
    const remaining = document.createElement("div");
    remaining.className = "decode-remaining";
    remaining.innerHTML = `⚠️ Remaining unmatched bits: <code>${result.remainingBits}</code>`;
    container.appendChild(remaining);
  }

  document.getElementById("decompress-result").classList.add("visible");
  showToast(`Decoded ${result.decodedBytes.length} character${result.decodedBytes.length !== 1 ? "s" : ""}!`);
}

/**
 * Clear the bits input and results.
 */
function clearBitsInput() {
  document.getElementById("decompress-bits-input").value = "";
  document.getElementById("bits-count").textContent = "0 bits";
  document.getElementById("bits-input-hint").textContent = "";
  document.getElementById("decompress-result").classList.remove("visible");
}

// ─── Download base64 data as file ────────────────────────
function downloadBase64(b64, mimeType, filename) {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.click();
  URL.revokeObjectURL(url);
  showToast("File downloaded!");
}

// ─── Live bits input validation ──────────────────────────
function setupBitsInput() {
  const input = document.getElementById("decompress-bits-input");
  const countEl = document.getElementById("bits-count");
  const hintEl = document.getElementById("bits-input-hint");

  input.addEventListener("input", () => {
    const raw = input.value;
    const clean = raw.replace(/[^01]/g, "");

    // If user typed non-binary chars, strip them
    if (raw !== clean) {
      input.value = clean;
      hintEl.textContent = "⚠️ Only 0s and 1s allowed — invalid characters removed.";
      hintEl.className = "bits-input-hint warn";
    } else {
      // Live preview if code table is loaded
      if (activeCodeTable && clean.length > 0) {
        const result = decodeBits(clean, activeCodeTable);
        if (result.decodedBytes.length > 0) {
          hintEl.innerHTML = `<span class="hint-preview">Preview: <strong>${result.text}</strong></span>`;
          if (result.remainingBits) {
            hintEl.innerHTML += ` <span class="hint-remaining">(+${result.remainingBits.length} unmatched bits)</span>`;
          }
          hintEl.className = "bits-input-hint preview";
        } else {
          hintEl.textContent = "No matches yet — keep typing bits…";
          hintEl.className = "bits-input-hint";
        }
      } else {
        hintEl.textContent = "";
        hintEl.className = "bits-input-hint";
      }
    }

    countEl.textContent = `${clean.length} bit${clean.length !== 1 ? "s" : ""}`;
  });
}

// ─── DECOMPRESS (JSON Package Mode) ──────────────────────
async function handleDecompress() {
  let pkgText = document.getElementById("decompress-json-input").value.trim();

  if (!pkgText) {
    const fileInput = document.getElementById("decompress-file-input");
    if (fileInput.files.length) {
      pkgText = await fileInput.files[0].text();
    }
  }

  if (!pkgText) {
    showToast(
      "Please paste a JSON package or upload a .json file.",
      "error",
    );
    return;
  }

  let payload;
  try {
    payload = JSON.parse(pkgText);
    const required = [
      "algorithm",
      "bits",
      "code_table",
      "original_size",
      "file_type",
      "mime_type",
      "filename",
    ];
    for (const key of required) {
      if (!(key in payload)) {
        throw new Error(`Missing field: "${key}" in JSON package.`);
      }
    }
  } catch (e) {
    showToast(e.message, "error");
    return;
  }

  showSpinner();
  try {
    const res = await fetch(`${API_BASE}/api/decompress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Decompression failed.");
    }

    const data = await res.json();
    displayDecompressResult(data);
    showToast("Decompression complete!");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    hideSpinner();
  }
}

function displayDecompressResult(data) {
  const container = document.getElementById("decompress-output");
  container.innerHTML = "";

  if (data.file_type === "text") {
    const pre = document.createElement("div");
    pre.className = "text-output";
    pre.textContent = data.data;
    container.appendChild(pre);
  } else if (data.file_type === "image") {
    const img = document.createElement("img");
    img.src = `data:${data.mime_type};base64,${data.data}`;
    img.alt = "Decompressed image";
    container.appendChild(img);

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.style.marginTop = "16px";
    btn.textContent = "⬇️ Download Image";
    btn.onclick = () =>
      downloadBase64(data.data, data.mime_type, data.filename);
    container.appendChild(btn);
  } else if (data.file_type === "audio") {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = `data:${data.mime_type};base64,${data.data}`;
    container.appendChild(audio);

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.style.marginTop = "16px";
    btn.textContent = "⬇️ Download Audio";
    btn.onclick = () =>
      downloadBase64(data.data, data.mime_type, data.filename);
    container.appendChild(btn);
  }

  document.getElementById("decompress-result").classList.add("visible");
}

// ─── JSON file drop zone for decompress ──────────────────
function setupJsonDropZone() {
  const zone = document.getElementById("json-file-drop-zone");
  const input = document.getElementById("decompress-file-input");

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      loadJsonFile(input.files[0]);
    }
  });

  input.addEventListener("change", () => {
    if (input.files.length) {
      loadJsonFile(input.files[0]);
    }
  });
}

async function loadJsonFile(file) {
  try {
    const text = await file.text();
    document.getElementById("decompress-json-input").value = text;
    showToast(`Loaded ${file.name}`);
  } catch {
    showToast("Failed to read file.", "error");
  }
}

// ─── Initialise ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupDropZone("file-drop-zone", "compress-file-input", "file-info");
  setupBitsInput();
  setupJsonDropZone();
});

