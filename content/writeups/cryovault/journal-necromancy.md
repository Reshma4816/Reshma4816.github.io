---
title: "Journal Necromancy"
date: 2026-10-11T12:00:00+05:30
description: "Carving 3-way XOR key shares from unallocated NTFS clusters and decrypting an AES-256-GCM container."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{mft_slack_dies_but_data_clusters_remember_1a2f}"
author: "Reshma Al (Coldcoffee)"
tools: "The Sleuth Kit (fls, icat, blkls), Python 3, pycryptodome"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{mft_slack_dies_but_data_clusters_remember_1a2f}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{mft_slack_dies_but_data_clusters_remember_1a2f}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Overview & Forensic Image Triage
We were provided with a 64 MiB raw disk image `evidence.img` captured from a compromised Windows workstation.

Inspecting filesystem structure using The Sleuth Kit (`fsstat`):
```bash
$ fsstat evidence.img
FILE SYSTEM INFORMATION
--------------------------------------------
File System Type: NTFS
OEM Name: NTFS
Volume Serial Number: 4A7B-9E12-003F
Cluster Size: 4096 bytes
Sector Size: 512 bytes
Total Cluster Count: 16384
```

Listing allocated files using `fls -r -p`:
```text
r/r 87-128-3:   Personal/vault/secure_archive.enc
r/r 88-128-6:   Personal/vault/readme.txt
```

Reading `readme.txt` using `icat evidence.img 88`:
> *"Archive encrypted with AES-256-GCM. Master key split across 3 memory shares using 3-way XOR with parity check before deletion. Clusters wiped from MFT, but memory writes flushed to raw disk clusters."*

---

## 2. Unallocated Space Analysis & Signature Carving
Since the Master File Table (MFT) records were zeroed out, we carved unallocated clusters using `blkls`.

Analyzing the raw binary patterns revealed that each key share begins with the 4-byte signature magic `0xDEAD5347` (`DEAD SG`):
- Offset +0: Magic `\xDE\xAD\x53\x47`
- Offset +4: Share Index ($1, 2,$ or $3$)
- Offset +5..37: 32-byte raw key share $S_i$
- Offset +37: 1-byte parity XOR checksum $\bigoplus_{j=4}^{36} \text{byte}[j]$

We wrote a Python scanner to carve and validate all cluster signatures:
```python
import re
from functools import reduce

img = open('evidence.img', 'rb').read()
shares = {}

for m in re.finditer(b'\xde\xad\x53\x47', img):
    pos = m.start()
    chunk = img[pos:pos+38]
    idx = chunk[4]
    share = chunk[5:37]
    parity = chunk[37]
    if reduce(lambda a, b: a ^ b, chunk[4:37], 0) == parity:
        print(f"[+] Found valid Share {idx} at byte offset {hex(pos)}")
        shares[idx] = share
```

The carver isolated valid shares at:
- Share 1: Cluster 10420 (Offset `0x28B4000`)
- Share 2: Cluster 12133 (Offset `0x2F65000`)
- Share 3: Cluster 13848 (Offset `0x3618000`)

---

## 3. Cryptographic Reconstruction & Decryption
Reconstructing the master AES key:
$$K_{\text{master}} = S_1 \oplus S_2 \oplus S_3$$

Carving the encrypted vault container `Personal/vault/secure_archive.enc` (Inode 87):
- Offset 0..4: Header tag `VENC`
- Offset 4..16: 12-byte GCM Nonce
- Offset 16..-16: Ciphertext payload
- Offset -16..end: 16-byte GCM Authentication Tag

```python
from Crypto.Cipher import AES

key = bytes(a ^ b ^ c for a, b, c in zip(shares[1], shares[2], shares[3]))
vault_data = open('secure_archive.enc', 'rb').read()
nonce = vault_data[4:16]
ct = vault_data[16:-16]
tag = vault_data[-16:]

cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
plaintext = cipher.decrypt_and_verify(ct, tag)
print(f"[+] Flag captured: {plaintext.decode()}")
```

---

## 4. Key Takeaways
- Deleting MFT entries on NTFS does not wipe underlying data clusters until overwritten by new allocations.
- Custom structured memory shares can be reliably carved by combining magic byte signatures with embedded parity verification.

