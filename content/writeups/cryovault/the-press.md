---
title: "the-press"
date: 2026-10-11T12:00:00+05:30
description: "Inverting an LZMA-style binary range encoder by building an exact probability-matching range decoder."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Medium"
points: 350
flag: "isfcr{r4ng3_c0d3r_b1t_3x4ct_y0!}"
author: "Reshma Al (Coldcoffee)"
tools: "objdump, Ghidra, Python 3"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{r4ng3_c0d3r_b1t_3x4ct_y0!}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{r4ng3_c0d3r_b1t_3x4ct_y0!}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Binary Analysis & Algorithmic Triage
The binary `the-press` accepts an input string of length 32 and processes it through two distinct stages:
1. **Adjacent XOR Pass:** Computes $t[i] = \text{input}[i] \oplus \text{input}[i-1]$ for $i \ge 1$, with $t[0] = \text{input}[0]$.
2. **Binary Range Encoder:** The transformed 32 bytes are encoded bit-by-bit using an adaptive binary range coder (similar to the entropy coder used in LZMA/7-Zip).

The resulting 36-byte compressed bitstream is compared against a fixed byte array in the `.rodata` section.

---

## 2. Range Encoder Reverse Engineering
Examining the disassembly in Ghidra:
- State variables: `range` (initialized to `0xFFFFFFFF`) and `low` (initialized to `0x00000000`).
- Probability model: A tree array of $256 \times 256$ probability entries, where each entry is initialized to `0x400` (representing a probability of 0.5 in 11-bit precision).
- Each bit decision scales `bound = (range >> 11) * prob`:
  - If bit is 0: `range = bound`, probability updated toward 0.
  - If bit is 1: `low += bound`, `range -= bound`, probability updated toward 1.
  - Normalization occurs whenever `range < 0x01000000`, shifting out high bytes of `low`.

---

## 3. Building the Python Range Decoder

Because range encoders are strictly bijective mappings when running under identical initial states and update schedules, we wrote a Python decoder that mirrors each probability branch:

```python
#!/usr/bin/env python3

def decode_bits(stream):
    range_val = 0xFFFFFFFF
    code = int.from_bytes(stream[:5], 'big')
    pos = 5
    prob_table = [0x400] * 512

    decoded_bytes = []
    for _ in range(32):
        byte_val = 0
        for bit_idx in range(8):
            ctx = 1  # context node
            prob = prob_table[ctx]
            bound = (range_val >> 11) * prob

            if code < bound:
                bit = 0
                range_val = bound
                prob_table[ctx] += (2048 - prob) >> 5
            else:
                bit = 1
                code -= bound
                range_val -= bound
                prob_table[ctx] -= prob >> 5

            byte_val = (byte_val << 1) | bit
            ctx = (ctx << 1) | bit

            while range_val < 0x01000000:
                range_val <<= 8
                code = ((code << 8) | stream[pos]) & 0xFFFFFFFFFF
                pos += 1

        decoded_bytes.append(byte_val)

    # Undo adjacent XOR pass
    original = [decoded_bytes[0]]
    for i in range(1, len(decoded_bytes)):
        original.append(decoded_bytes[i] ^ original[i - 1])

    return bytes(original)

with open('target_stream.bin', 'rb') as f:
    compressed = f.read()

flag = decode_bits(compressed)
print(f"[+] Flag captured: {flag.decode()}")
```

---

## 4. Key Takeaways
- Compression algorithms like arithmetic and range coding are completely invertible if the state machine's probability model is known.

