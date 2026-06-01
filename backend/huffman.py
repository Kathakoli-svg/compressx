"""
Huffman Encoding & Decoding
---------------------------
Implements Huffman compression and decompression on raw byte data.
"""

import heapq
import json
from collections import Counter


class HuffmanNode:
    """A node in the Huffman tree."""

    def __init__(self, byte_val=None, freq=0, left=None, right=None):
        self.byte_val = byte_val  # None for internal nodes
        self.freq = freq
        self.left = left
        self.right = right

    # Comparison operators for heapq
    def __lt__(self, other):
        return self.freq < other.freq

    def __eq__(self, other):
        if not isinstance(other, HuffmanNode):
            return False
        return self.freq == other.freq


def _build_tree(freq_map: dict) -> HuffmanNode:
    """Build a Huffman tree from a frequency map {byte_value: count}."""
    if not freq_map:
        return None

    heap = [HuffmanNode(byte_val=b, freq=f) for b, f in freq_map.items()]
    heapq.heapify(heap)

    # Edge case: single unique byte
    if len(heap) == 1:
        node = heapq.heappop(heap)
        return HuffmanNode(freq=node.freq, left=node)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(freq=left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)

    return heap[0]


def _generate_codes(node: HuffmanNode, prefix: str = "", code_map: dict = None) -> dict:
    """Traverse the Huffman tree to build the code table {byte_value: bit_string}."""
    if code_map is None:
        code_map = {}

    if node is None:
        return code_map

    if node.byte_val is not None:
        code_map[node.byte_val] = prefix if prefix else "0"
        return code_map

    _generate_codes(node.left, prefix + "0", code_map)
    _generate_codes(node.right, prefix + "1", code_map)
    return code_map


def huffman_compress(data: bytes) -> dict:
    """
    Compress raw bytes using Huffman coding.

    Returns a dict with:
      - bits: the compressed bit-string
      - code_table: {str(byte_val): code} for serialisation
      - original_size: length of original data in bytes
      - compressed_size: length of bit-string in bits
    """
    if not data:
        return {"bits": "", "code_table": {}, "original_size": 0, "compressed_size": 0}

    freq_map = dict(Counter(data))
    tree = _build_tree(freq_map)
    code_map = _generate_codes(tree)

    # Encode
    bit_string = "".join(code_map[b] for b in data)

    # Serialise code table as {str(byte_val): code_string}
    serialisable_table = {str(k): v for k, v in code_map.items()}

    return {
        "bits": bit_string,
        "code_table": serialisable_table,
        "original_size": len(data),
        "compressed_size": len(bit_string),
    }


def huffman_decompress(bit_string: str, code_table: dict, original_size: int) -> bytes:
    """
    Decompress a Huffman-encoded bit-string back to raw bytes.

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
