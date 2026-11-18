---
title: "The Captain's Last Log"
date: 2026-11-01T07:30:00+05:30
description: "Parse an E01 disk image's chunk table directly without EWF tooling, recover a deleted log entry from NTFS free space, and derive a Vigenère key from the ship's own watchword and volume label."
category: "Digital Forensics"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 200
flag: "FLAG{v4nc3_s1l4s_d34d_m4ns_c4y_s3cr3t_1723}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, zlib, 7z, strings"
tags:
  - "Digital Forensics"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{v4nc3_s1l4s_d34d_m4ns_c4y_s3cr3t_1723}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{v4nc3_s1l4s_d34d_m4ns_c4y_s3cr3t_1723}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Recovering the Disk Image Without EWF Tools
The only file provided is `captain_disk.E01`, an EnCase evidence file. My environment had no EWF-aware tools installed (no `ewfmount`, no `libewf`), so rather than trying to install anything, I read the format directly: the volume section gives 64 sectors per chunk at 512 bytes each, and the table section lists zlib-compressed chunk offsets. Inflating every chunk in order reconstructs the full 64 MiB raw image:

```python
for o, compressed in table:
    out.write(zlib.decompress(raw) if compressed else raw)
```

---

## 2. Finding the Deleted Entry
The reconstructed image has a single NTFS partition starting at sector 2048, with the volume label `BLACK_TIDE`. Listing it with `7z l` shows the expected normal files — journals, a crew roster, ship logs — but nothing resembling the captain's actual final entry. Running `strings` across the raw partition data (rather than through the filesystem) still finds it sitting in free space, confirming it was deleted from the directory structure but never actually overwritten on disk. The recovered text says the entry is Vigenère-encrypted, with the key built as:

```
KEY = <NIGHT_WATCHWORD><VOLUME_LABEL>
```

---

## 3. Deriving the Vigenère Key
The watchword for 23 November 1723 comes straight from `Navigation_and_Logs/ship_logs_autumn_1723.txt`: `LEVIATHAN`. The volume label, read earlier from the partition's own metadata, is `BLACK_TIDE`. Since the label contains an underscore, the full key string (letters only matter for Vigenère, but I kept the literal concatenation) becomes `LEVIATHANBLACKTIDE`.

---

## 4. Decrypting and Verifying
Decrypting with the key advancing **only** on alphabetic characters — leaving case and punctuation completely untouched — produces a clean confession, including the coordinates 18°21'44"N, 64°31'18"W, and the flag itself. Getting this wrong in the obvious way (advancing the key index on every character, including spaces and punctuation) produces garbage after the very first word, which is an easy trap to fall into if you don't check the output immediately. The first few decrypted letters resolving cleanly to "The" was the quick sanity check that confirmed the key was right before trusting the rest of the output.

**Flag:** `FLAG{v4nc3_s1l4s_d34d_m4ns_c4y_s3cr3t_1723}`

---

## 5. Takeaways
- A proprietary forensic image format isn't a dead end just because the standard tooling (EWF libraries) isn't installed — the format's own chunk table and compression scheme are usually documented enough to parse by hand.
- `DELETE`-style operations at the filesystem level (removing a directory entry) don't erase the underlying data — a raw `strings` pass across partition bytes, bypassing the filesystem layer entirely, can still surface content the directory structure no longer references.
- When a Vigenère key is built by concatenating two named values, read each value from its own correct source rather than guessing — the watchword came from a dated log file, and the volume label came from the filesystem's own metadata, not from anywhere in the log text itself.
- Vigenère implementations that advance the key index on every character, rather than only on letters, are a common and easy mistake — verify the first few decrypted characters make sense before assuming the key is wrong.
