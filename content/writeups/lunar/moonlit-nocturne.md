---
title: "Moonlit Nocturne"
date: 2026-09-20T11:07:00+05:30
description: "Three-layer steganography inside a MIDI file: a velocity hint, a rest-timing ciphertext, and a Vigenère key hidden in a silent track."
category: "Cryptography"
ctf: "Lunar CTF Quals"
difficulty: "Easy"
points: 50
flag: "Lun4R{TH3_M00N_S1NGS_WH4T_TH3_N1GHT_H1D3S}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, mido"
tags:
  - "Cryptography"
  - "Lunar CTF Quals"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Lun4R{TH3_M00N_S1NGS_WH4T_TH3_N1GHT_H1D3S}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Lun4R{TH3_M00N_S1NGS_WH4T_TH3_N1GHT_H1D3S}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Recon
We're given a single file, `nocturne.mid`, and a riddle: *"Something is hiding between the sounds,"* and *"not everything you need to hear is part of the music."* Both lines matter later — the first points at timing, the second at a silent track.

```
$ file nocturne.mid
nocturne.mid: Standard MIDI data (format 1) using 4 tracks at 1/480

$ strings -n 4 nocturne.mid
Moonlit Nocturne
Silver Echoes
Night Pulse
Khonshu's Shadow
```

Parsing the file with `mido` shows four named tracks: a 281-note melody (`Moonlit Nocturne`), a 64-note track (`Silver Echoes`), a 128-note drum track (`Night Pulse`), and `Khonshu's Shadow`, which carries **zero notes** — only a name and a text event. Khonshu is the Egyptian moon god, fitting the theme, and a track that plays nothing is the "not part of the music" clue.

The odd note count also stands out: 281 notes produce 280 *gaps* between them, and 280 bits is exactly 35 bytes — a strong sign the melody track carries a hidden payload.

---

## 2. Layer 1 — Velocity Hint
Printing the first velocities of the melody track shows only two values, 72 and 73 — a one-unit difference that's inaudible but easy to encode as bits:

```python
bits = ''.join('1' if n['vel'] == 73 else '0' for n in notes[:128])
text = bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))
print(text)   # b'TIMING IS THE KEY'
```

This layer doesn't hold the flag — it tells us where to look next.

---

## 3. Layer 2 — Timing Ciphertext
Each note has a fixed rhythm (`240, 240, 480, 240, ...`), but subtracting each note's own duration from the gap until the next note's start leaves a clean two-valued residue: either `0` or `120` ticks of silence.

```python
gap_minus_dur = [(b['start'] - a['start']) - a['dur']
                 for a, b in zip(notes, notes[1:])]
bits = ''.join('1' if g == 120 else '0' for g in gap_minus_dur)
data = bytes(int(bits[i:i+8], 2) for i in range(0, len(bits), 8))
print(data.decode())
# DO3_A00A_K1UAC_DV4G_LO3_H1QOH_U1V3Z
```

That's exactly 280 bits → 35 characters, with no offset or bit-order guessing needed. It reads like a leetspeak flag shape with the letters scrambled — a classic sign of a Vigenère cipher that only shifts alphabetic characters.

---

## 4. Layer 3 — The Key
A brute-force Caesar shift never produces anything readable, so the cipher needs a keyword. The silent fourth track supplies it: `Khonshu's Shadow` → key `KHONSHU`. The riddle text embedded in that track ("the moon remembers what the night forgets") all but states it directly.

```python
ct, key = 'DO3_A00A_K1UAC_DV4G_LO3_H1QOH_U1V3Z', 'KHONSHU'
out, i = '', 0
for ch in ct:
    if ch.isalpha():
        shift = ord(key[i % len(key)]) - ord('A')
        out += chr((ord(ch) - ord('A') - shift) % 26 + ord('A'))
        i += 1          # key only advances on letters
    else:
        out += ch        # digits and underscores pass through untouched
print(out)
# TH3_M00N_S1NGS_WH4T_TH3_N1GHT_H1D3S
```

The key index advancing only on letters (not digits or underscores) is what makes the decode line up — the first two words resolve to `TH3` and `M00N` immediately, confirming the key is right.

---

## 5. Flag
```
Lun4R{TH3_M00N_S1NGS_WH4T_TH3_N1GHT_H1D3S}
```

---

## 6. Takeaways
- Read metadata first — `strings` exposed every track name and text event, including the final Vigenère key, in seconds.
- An odd note count against otherwise power-of-two tracks is a strong signal of a hidden bit-length payload.
- Near-identical values (72 vs 73, a 120-tick rest) are a classic covert channel: inaudible to a listener, exact in the file.
- When a signal looks multi-valued, check whether it's really two overlapping signals — the apparent four-valued timing gaps were just rhythm plus a one-bit channel.
