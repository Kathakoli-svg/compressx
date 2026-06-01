"""
Shannon-Fano Encoding & Decoding
---------------------------------
Implements Shannon-Fano compression and decompression on raw byte data.
"""

from collections import Counter


def _shannon_fano_split(symbols: list, codes: dict, prefix: str = ""):
    """
    Recursively partition a sorted list of (byte_val, freq) tuples
    and assign binary prefixes.

    symbols: list of (byte_val, freq) sorted by freq descending
    """
    if len(symbols) == 1:
        codes[symbols[0][0]] = prefix if prefix else "0"
        return

    if len(symbols) == 0:
        return

    # Find the split point where cumulative frequencies are most balanced
    total = sum(f for _, f in symbols)
    running = 0
    best_idx = 0
    best_diff = float("inf")

    for i in range(len(symbols) - 1):
        running += symbols[i][1]
        diff = abs(2 * running - total)
        if diff < best_diff:
            best_diff = diff
            best_idx = i

    left_group = symbols[: best_idx + 1]
    right_group = symbols[best_idx + 1 :]

    _shannon_fano_split(left_group, codes, prefix + "0")
    _shannon_fano_split(right_group, codes, prefix + "1")


def shannon_fano_compress(data: bytes) -> dict:
    """
    Compress raw bytes using Shannon-Fano coding.

    Returns a dict with:
      - bits: the compressed bit-string
      - code_table: {str(byte_val): code} for serialisation
      - original_size: length of original data in bytes
      - compressed_size: length of bit-string in bits
    """
    if not data:
        return {"bits": "", "code_table": {}, "original_size": 0, "compressed_size": 0}

    freq_map = Counter(data)

    # Sort by frequency descending
    sorted_symbols = sorted(freq_map.items(), key=lambda x: x[1], reverse=True)

    codes = {}
    _shannon_fano_split(sorted_symbols, codes)

    # Encode
    bit_string = "".join(codes[b] for b in data)

    # Serialise
    serialisable_table = {str(k): v for k, v in codes.items()}

    return {
        "bits": bit_string,
        "code_table": serialisable_table,
        "original_size": len(data),
        "compressed_size": len(bit_string),
    }


def shannon_fano_decompress(bit_string: str, code_table: dict, original_size: int) -> bytes:
    """
    Decompress a Shannon-Fano encoded bit-string back to raw bytes.

    code_table: {str(byte_val): code_string}
    """
    if not bit_string:
        return b""

    # Build reverse lookup: code_string -> byte_value
    reverse_table = {code: int(byte_val) for byte_val, code in code_table.items()}

    result = bytearray()
    current_code = ""
    for bit in bit_string:
        current_code += bit
        if current_code in reverse_table:
            result.append(reverse_table[current_code])
            current_code = ""

    return bytes(result[:original_size])
