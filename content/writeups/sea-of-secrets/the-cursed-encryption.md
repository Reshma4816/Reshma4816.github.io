---
title: "The Cursed Encryption Oracle"
date: 2026-11-01T08:30:00+05:30
description: "Exploit an AES-ECB oracle that prepends attacker input to a secret, recovering it one byte at a time by aligning controlled padding against repeated ciphertext blocks."
category: "Cryptography"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Easy"
points: 200
flag: "flag{d3ad_m3ns_t3ll_n0_ta1l5_but_ECB_d03s}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, requests, ThreadPoolExecutor"
tags:
  - "Cryptography"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>flag{d3ad_m3ns_t3ll_n0_ta1l5_but_ECB_d03s}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('flag{d3ad_m3ns_t3ll_n0_ta1l5_but_ECB_d03s}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What the Oracle Does
The challenge is a live web oracle. Its `/info` endpoint documents exactly what it's doing: encrypting `user_input || secret_flag` with AES-128-ECB and PKCS#7 padding, hex-encoded, capped at 256 input bytes. `/encrypt` takes `{"plaintext": "..."}` and returns `{"ciphertext": "<hex>"}`. Having that much of the implementation documented up front makes this a straightforward byte-at-a-time ECB recovery rather than a guessing game about the server's internals.

---

## 2. Why ECB Makes This Recoverable
Attacker-controlled bytes placed in front of a fixed secret, under ECB mode specifically, is about as textbook as this class of attack gets. Because ECB encrypts each 16-byte block completely independently, identical plaintext blocks always produce identical ciphertext blocks — which means the secret can be deliberately shifted across block boundaries, one byte at a time, and tested against a saved reference block.

---

## 3. Measuring the Secret's Length
Before recovering any bytes, I needed the exact secret length `S`. For `n` bytes of input, the ciphertext length works out to `16 * (floor((n + S) / 16) + 1)`. Sending an empty input returns 48 bytes, and that length stays flat at 48 all the way through `n = 1` to `n = 5`, before jumping to 64 bytes exactly at `n = 6`. That jump pins down `S + 5 < 48 ≤ S + 6`, which solves to `S = 42`.

---

## 4. Recovering the Secret Byte by Byte
To recover secret byte `k` (0-indexed), given every byte already found before it:

1. Send `n = (15 - k) mod 16` bytes of a filler character. This positions the unknown target byte, `secret[k]`, as the very last byte of ciphertext block `b = (n + k) // 16`. Save that block as the reference.
2. For every printable character `c`, send `"A"*n + known_bytes_so_far + c` and check whether block `b` of the response matches the saved reference exactly — it will, precisely when `c == secret[k]`.

```python
def recover_secret(S):
    secret = ""
    for k in range(S):
        n = (15 - k) % 16
        pad = "A" * n
        b = (n + k) // 16
        target = encrypt(pad)[b*16:(b+1)*16]
        for c in map(chr, range(32, 127)):
            if encrypt(pad + secret + c)[b*16:(b+1)*16] == target:
                secret += c
                break
    return secret
```

`encrypt()` is just a thin wrapper posting to `/encrypt` and hex-decoding the response. Since the hosted endpoint was fairly slow to respond, I fired all 95 printable-character candidates for each byte position in parallel through a thread pool (60 workers) and retried any requests that failed outright, rather than waiting on each guess sequentially.

That recovers the secret directly as:

```
flag{d3ad_m3ns_t3ll_n0_ta1l5_but_ECB_d03s}
```

**Flag:** `flag{d3ad_m3ns_t3ll_n0_ta1l5_but_ECB_d03s}`

---

## 5. Takeaways
- "Attacker input placed before a secret, encrypted under ECB" is one of the most reliable patterns to recognize instantly — ECB's lack of chaining between blocks is exactly what turns it into an oracle.
- Measuring the secret's exact length first, through the ciphertext-length jump point, avoids wasted guesses later — knowing when to stop recovering bytes matters as much as the recovery technique itself.
- Parallelizing the per-byte candidate requests is a practical necessity against a slow remote endpoint; 42 bytes × up to 95 candidates each adds up fast if done one request at a time.
- A well-documented `/info` endpoint isn't a trap here — taking the challenge's own description of its implementation at face value saved time that would otherwise go into reverse-engineering the server's behavior from scratch.
