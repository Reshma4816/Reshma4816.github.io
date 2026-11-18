---
title: "Captain's Last Assembly: Sector 7 Protocol"
date: 2026-11-01T02:30:00+05:30
description: "Parse a Unity Mono assembly's IL-level static arrays directly and reproduce a repeating-key XOR to decrypt the flag without ever launching the game."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 500
flag: "ICTF{QUANTUM_COLLISION_GATEWAY_BYPASS}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, dnfile"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>ICTF{QUANTUM_COLLISION_GATEWAY_BYPASS}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('ICTF{QUANTUM_COLLISION_GATEWAY_BYPASS}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Why Playing the Game Isn't the Point
This challenge is a Unity Mono build, which means all the actual game logic lives as plain IL bytecode inside `CaptainsLastAssembly_Data/Managed/Assembly-CSharp.dll`. The in-game gates — grinding to a million credits at one per minute, a barrier blocking a corridor — only matter if you're actually trying to play through it. The flag itself is produced by a single method, `VaultCoreTerminal.DecryptFlag`, and everything that method needs is sitting statically in the assembly. There's no reason to touch the game client at all.

---

## 2. Reading the Assembly Without a Decompiler
I didn't have a .NET decompiler available in this environment, so instead of reaching for one I parsed the assembly's metadata directly with Python's `dnfile` and read the IL byte sequences by hand. The static constructor for the relevant class fills two fields through `RuntimeHelpers.InitializeArray` — a pattern that embeds the array's raw bytes directly in the metadata blob rather than building it with a loop, which makes it trivial to pull out once you know where to look:

- `CipherKey` — 7 bytes, decoding to the ASCII string `SECTOR7`
- `EncryptedPayload` — 38 bytes, starting `1a 06 17 12 34 03 62 ...`

---

## 3. Reproducing the Decryption
Reading `DecryptFlag`'s IL (a simple `ldelem` / `rem` / `ldelem` / `xor` / `stelem` loop) shows it's nothing more exotic than a repeating-key XOR between `EncryptedPayload` and `CipherKey`:

```python
p = bytes.fromhex('1a061712340362120b1701020d741c090f1d1c1b781d1a04151b1760121c1c1616027600163e')
k = b'SECTOR7'
print(bytes(c ^ k[i % 7] for i, c in enumerate(p)))
```

The decoded prefix is `ICTF{`, not the `FLAG{` format most of this event's other challenges use — easy to second-guess at first glance, since it looks like the wrong challenge's output. I never actually launched the game to watch this string print on screen, but the decryption logic is completely unambiguous from the IL alone, and the platform confirmed the flag as correct.

**Flag:** `ICTF{QUANTUM_COLLISION_GATEWAY_BYPASS}`

---

## 4. Takeaways
- A Unity **Mono** build keeps its gameplay logic as readable IL in a managed DLL — that's a very different reversing target from an IL2CPP build, and it means a metadata parser can substitute for a full decompiler when one isn't available.
- `RuntimeHelpers.InitializeArray` is worth recognizing on sight: it's the compiler's way of embedding a static array's literal bytes directly in the module's data section, which makes extracting "hidden" constants as simple as reading the right metadata blob.
- A flag format that doesn't match the rest of an event's challenges isn't necessarily wrong — if the decryption logic is unambiguous and self-consistent, trust the math over a surface-level pattern mismatch.
- Gameplay gates (grinds, locked doors, timers) are often decoupled entirely from where the actual flag logic lives — check whether the answer can be reached by reading the binary before investing time in playing through the client.
