---
title: "CryoVault 2: Cold Label"
date: 2026-10-12T11:00:00+05:30
description: "Simulate a 24-pin dot-matrix printer's ESC/P2 command stream byte-for-byte to reconstruct a release code that was never printed as readable text, then burn through a deliberately slow time-locked escrow."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{aryj_wvc8_jc34_2np4}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, Pillow, gmpy2"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{aryj_wvc8_jc34_2np4}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{aryj_wvc8_jc34_2np4}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Setup
A pod thaw at CryoVault 2 needs a printed release label, generated on an old 24-pin impact printer — and someone tapped its parallel port during the 04:12 release and kept the raw print job (`dispatch_0412.prn`). A time-locked escrow (`escrow.py` plus `release.lock`) will open and reveal the real flag given the correct release code, but each guess costs several minutes of sequential squaring, so the code has to be read correctly from the capture on essentially the first real attempt.

---

## 2. Why Brute-Forcing the Escrow Isn't an Option
`escrow.py` hashes the candidate code with a stored salt to get `x`, then computes `x^(2^T) mod N` for `T = 480,000,000` — a classic time-lock puzzle. There's no way to parallelize or shortcut that chain without factoring the 2048-bit `N`, and each attempt genuinely costs minutes even with `gmpy2` accelerating the modular squaring. That makes correctly recovering the printed code from the capture the entire challenge; the escrow step itself is just patient arithmetic once the code is right.

---

## 3. Reading an ESC/P2 Stream
`dispatch_0412.prn` is a raw ESC/P2 (24-pin Epson) command stream. The surrounding label text — shipment ID, pod number, crate number, release window — comes through as plain readable bytes immediately. The release code section, though, has no text at all where the code should be: it's built entirely from printer commands.

The relevant command set: `ESC ( U` sets the measurement unit; `ESC & 0` loads custom "download" glyph bitmaps into RAM, overriding specific ASCII character codes; `ESC : 0` copies the existing ROM font into RAM first, so only the characters that get redefined actually change; `ESC * 39` draws 24-pin, 180-dpi bit-image graphics column by column; `ESC $` and `ESC \` move the print head to an absolute or signed-relative horizontal position; `ESC J`, `ESC ( v`, and the line-spacing commands (`ESC 3` / `ESC +`) move it vertically; and `ESC % 1` / `ESC % 0` toggle between the redefined custom character set and the normal ROM font.

---

## 4. Why the Code Isn't Readable Directly
The code is deliberately scattered across the stream in a way that defeats a naive "just read the ASCII bytes" approach:

- The glyph bitmaps themselves are built from many short, out-of-order `ESC * 39` fragments, stitched together by the head jumping back and forth with relative and absolute horizontal moves.
- The rows are sliced into thin vertical bands using small vertical-advance commands between fragments, rather than being drawn as one continuous pass.
- Some bytes *are* printed as plain text — but only while `ESC % 1` is active, meaning those text bytes draw the **redefined glyph bitmaps**, not their normal ROM-font shapes. A printed `Y` byte, for instance, doesn't actually look like the letter Y on the label at all.

There's no shortcut here: the only way to recover the real code is to simulate the print head's full behavior and render the final image exactly as the physical printer would have.

---

## 5. Rendering the Job
I built a small ESC/P2 interpreter that tracks head position in 1/360-inch units and draws onto a 360-dpi canvas: `ESC * 39` plots each column's 24 bits (MSB at the top pin) at 2 canvas pixels per 1/180 inch; horizontal moves update `x` (with carriage return resetting it to 0); vertical-advance and line-spacing commands update `y`; and `ESC &` stores each downloaded glyph's bitmap so that, while `ESC % 1` is active, a printable byte draws its custom bitmap at the correct horizontal spacing instead of falling back to the ROM character.

```bash
python3 parse.py dispatch_0412.prn > ops.txt
python3 render.py dispatch_0412.prn      # -> out.png
```

Cropping and zooming into the rendered release-code region, the scattered fragments and redefined glyphs line up cleanly into one readable line: `FL-D4R7-HRPN-RM3F`.

---

## 6. Opening the Escrow
```bash
python3 escrow.py release.lock "FL-D4R7-HRPN-RM3F"
```

With `gmpy2` available, the squaring runs at roughly a million operations per second, so the full 480-million-step chain takes about 8 minutes — progress saves incrementally to a `.progress` file, so the run can be interrupted and resumed safely if needed. Once the tag check passes, the sealed payload decrypts straight to the flag.

**Flag:** `isfcr{aryj_wvc8_jc34_2np4}`

---

## 7. Takeaways
- A legacy dot-matrix printer's command stream is a full, faithfully reproducible rendering pipeline — if the final output matters, the only reliable way to recover it is simulating the print head rather than pattern-matching on raw bytes.
- Custom downloaded glyphs that override standard ASCII codes are a deliberate trap for naive text extraction: a byte that reads as `Y` in a hex dump may print as something else entirely once the redefinition is accounted for.
- A genuine time-lock puzzle (sequential squaring with no shortcut short of factoring the modulus) changes the entire approach to a challenge — it turns "try candidates until one works" into "get the one real candidate right the first time," which pushes all the actual difficulty into careful reconstruction rather than guessing.
- Scattering a message's fragments out of spatial order only works as obfuscation against someone reading raw bytes; a full simulation of the rendering process reassembles everything in its correct final position for free.
