---
title: "Map Beneath the Ink"
date: 2026-11-01T05:00:00+05:30
description: "Cross-reference a historical survey chart against an annotated forgery, extract a blue-channel LSB message, and assemble a three-part vault code from image metadata and a dispatch note."
category: "Digital Forensics"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Medium"
points: 250
flag: "FLAG{DEAD_MANS_SHALLOWS_14_FATHOMS_OT-7729-CARIB}"
author: "Reshma Al (Coldcoffee)"
tools: "ExifTool, Python 3, numpy, Pillow"
tags:
  - "Digital Forensics"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>FLAG{DEAD_MANS_SHALLOWS_14_FATHOMS_OT-7729-CARIB}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('FLAG{DEAD_MANS_SHALLOWS_14_FATHOMS_OT-7729-CARIB}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Image Set
The archive holds five images and a checksum file: `old_map.jpg` (a 1718 survey chart), `treasure_map.png` (Captain Vance's annotated copy of it), `captain_portrait.jpg`, `ship_photograph.png`, and `historical_document.png` (a quartermaster's deposition). `sha256sum -c checksums.sha256` passes cleanly for all five, which rules out any tampering-detection angle and points the investigation purely at content and metadata.

---

## 2. What the Metadata Gives Up
Running `exiftool` across every image surfaces the real clues fast:

- `historical_document.png` has the actual instructions embedded in its own text: the deposition says to inspect the **least significant bits of the blue channel**, and that the vault code is built from three tokens — the reef name at the inverted anchor marked on `old_map.jpg`, the sounding depth recorded at that same reef, and a vessel registry key found on `ship_photograph.png`.
- `ship_photograph.png` carries `Registry_Key: OT-7729-CARIB` directly in its PNG text chunks — no extraction needed, just metadata reading.
- `captain_portrait.jpg` carries a "DECOY LEAD NOTE" claiming Gallows Rock was already dug up back in 1892 and found empty — a built-in signal that that location is a dead end, not a path forward.

Comparing `treasure_map.png` against the original `old_map.jpg` side by side confirms the big red "X / TREASURE BURIED HERE" marking on Vance's copy is the decoy the portrait note was warning about. The maps also disagree on the anchor symbol's orientation: Vance's forged copy has it flipped upright, while the original 1718 survey has it inverted — ring at the bottom — marking "Dead Man's Shallows, Depth 14 Fathoms, Submerged Reef." That's the real location, and the forged map was altered specifically to hide it.

---

## 3. Extracting the LSB Message
The deposition's instructions point squarely at `treasure_map.png`'s blue channel. The bits are stored row-major, but packed **LSB-first** within each byte — reading them MSB-first (the default for `np.packbits`) produces pure noise, so each group of 8 bits needs reversing before packing:

```python
import numpy as np
from PIL import Image

im = np.asarray(Image.open("treasure_map.png").convert("RGB"))
bits = (im[:, :, 2] & 1).flatten().reshape(-1, 8)[:, ::-1]
print(np.packbits(bits).tobytes().decode("latin1"))
```

---

## 4. Assembling the Flag
The extracted text is a "VANCE DISPATCH" instructing the reader to trust the original 1718 survey over the forged copy, and it directly gives the three tokens: `DEAD_MANS_SHALLOWS`, `14_FATHOMS`, and `OT-7729-CARIB`, along with the exact template `FLAG{<REEF_NAME>_<DEPTH>_<REGISTRY_KEY>}`. Each of these three tokens matches what's independently printed on the original survey chart and in the ship photo's own metadata, confirming the dispatch note rather than having to trust it blindly.

**Flag:** `FLAG{DEAD_MANS_SHALLOWS_14_FATHOMS_OT-7729-CARIB}`

---

## 5. Takeaways
- When two near-identical images are provided side by side, the differences between them are usually the point — compare annotations, symbol orientation, and markings pixel-for-pixel rather than treating either one as simply "the map."
- A note that explicitly flags something as a decoy (here, the portrait's "already dug up" note) deserves to be trusted; challenge authors plant these to save solvers time, not to mislead them further.
- `np.packbits`' default bit order is MSB-first — if an LSB extraction produces noise instead of readable text on the first try, reversing the bit order within each byte before packing is the first thing worth checking.
- A flag built from multiple independently-verifiable tokens is a built-in integrity check: if each piece matches a separate source in the evidence set, that's strong confirmation the format and ordering are both right.
