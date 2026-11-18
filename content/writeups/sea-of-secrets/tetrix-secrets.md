---
title: "Tetrix Secrets"
date: 2026-11-01T07:00:00+05:30
description: "Identify an embedded Godot data pack inside a Windows exe, then distinguish a placeholder flag string packed inside a game scene from the real one appended after the pack's trailer."
category: "Reverse Engineering"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Easy"
points: 150
flag: "Hack!tUp{A9xK2LmP0QrT7vW4YzB8cD1eF6gH3J5N0U2X9s}"
author: "Reshma Al (Coldcoffee)"
tools: "strings, grep"
tags:
  - "Reverse Engineering"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Hack!tUp{A9xK2LmP0QrT7vW4YzB8cD1eF6gH3J5N0U2X9s}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Hack!tUp{A9xK2LmP0QrT7vW4YzB8cD1eF6gH3J5N0U2X9s}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Identifying What We're Looking At
The file is a 93 MB Windows executable. Running `strings` over it immediately surfaces Godot engine text — `GDPC`, `--remote-debug` — which identifies it as a Godot export with its entire data pack embedded directly inside the exe rather than shipped as a separate `.pck` file. The challenge description itself says the secret is "just waiting to be read," which is a pretty direct hint not to bother launching the game at all.

---

## 2. Searching for Flag-Shaped Strings
A byte-level search for anything matching a typical CTF flag pattern across the whole binary:

```bash
grep -a -o -E '[A-Za-z0-9_!]{3,12}\{[A-Za-z0-9_]{12,}\}' tetrix.exe
```

turns up exactly two candidates:

- `THM{I_CAN_READ_IT_ALL}` — found at one offset, sitting inside a packed game scene right next to the game-over menu's text labels. The format prefix (`THM`) doesn't match this event's convention at all, which is a strong sign it's a leftover placeholder string from whatever template the game was built from.
- `Hack!tUp{A9xK2L...9s}` — found at a second, much later offset, positioned right after the final `GDPC` trailer — meaning it sits **after** the end of the embedded data pack entirely. Nobody accidentally places a string there; appending something past a file format's own trailer is a deliberate placement, and the prefix matches this CTF's actual flag format.

---

## 3. What I Didn't Need to Do
I never launched the game or unpacked the embedded `GDPC` archive, so I can't speak to what else might be inside it beyond these two strings — but I didn't need to. The `Hack!tUp{...}` string was confirmed correct against the platform directly; the `THM{...}` placeholder was never submitted and wasn't needed.

**Flag:** `Hack!tUp{A9xK2LmP0QrT7vW4YzB8cD1eF6gH3J5N0U2X9s}`

---

## 4. Takeaways
- "Just waiting to be read" is as direct a hint as a challenge description gets — try a plain string search across the whole binary before reaching for a decompiler or a game engine unpacker.
- A game engine's own file-format trailer (here, Godot's `GDPC` marker) is a reliable anchor point — content appended *after* it was placed there deliberately, since the engine's own loader stops reading at that boundary.
- When a search turns up multiple flag-shaped candidates, check each one's prefix against the actual event's flag format before assuming either is correct — a mismatched prefix is often a leftover from a shared template rather than a real answer.
- Not fully exploring every embedded resource (here, the packed scene data) is fine once you have independent confirmation of the right answer — thoroughness is good, but it isn't always necessary to reach the flag.
