---
title: "Special"
date: 2026-10-12T09:30:00+05:30
description: "Follow a chain of public accounts from an admin's game profile through YouTube and Reddit to a Discord handle described, not written, inside an innocuous-looking GitHub repo."
category: "OSINT"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Medium"
points: 250
flag: "isfcr{abs0lut3_c1n3m4!?}"
author: "Reshma Al (Coldcoffee)"
tools: "Browser, git, grep"
tags:
  - "OSINT"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{abs0lut3_c1n3m4!?}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{abs0lut3_c1n3m4!?}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. Starting Point: the Admin's Profile
The challenge points at a public profile belonging to an admin, "Deva." The profile's game activity section shows a flag-shaped string right away — a decoy, since it doesn't hold up once you start actually tracing the account forward. The one genuinely useful thing on the profile is a link out to a YouTube channel.

---

## 2. YouTube → Reddit
The YouTube channel's page carries a hidden string buried in its details: `septicboomerpart2`. That's not a normal username you'd stumble on by browsing — it reads like a handle meant to be searched elsewhere, so I tried exactly that on Reddit and found a matching account under the same name. That Reddit profile's own description mentions a GitHub account and links to it.

---

## 3. GitHub: 16 Repos, Mostly Noise
The linked GitHub account, `DevaOnL`, has 16 public repositories — mostly coursework and forks (`Chat-app`, `CN-Mini-Project`, `CN-SDN-Orange-Problem`, `OS-Jackfruit`, `ThisChord`, `whytui`, `Distraction`, `ue-utilities`, and others). My first pass was a blunt one: clone every repo and grep the full commit history and every branch for anything flag-shaped (`flag{`, `ctf{`, `septic`, `discord`, and similar terms). That search came back empty across the board — which is itself a useful signal that the real clue isn't written as an obvious string anywhere in the history.

---

## 4. The Repo That Actually Mattered
`ue-utilities` — a small set of Unreal Engine Python helper scripts — stood out mainly for being the smallest, most recently touched repo: just 3 commits, all pushed the same day. The last commit's message was "Add workbench notes and contact details," which is a far more direct signal than anything the keyword search turned up.

`docs/workbench.md` in that commit has a section titled "Getting in touch":

> Easier to reach me on Discord than through GitHub notifications. Send a friend request. My handle is the first word of the engine's name, followed by the file extension of the scripts in `tools/`. All lowercase; keep the dot.

This is exactly why the grep came up empty — the handle was *described*, not written literally anywhere in the repo. Working it out: the engine is Unreal Engine, so the first word is `unreal`; the scripts inside `tools/` are `export_assets.py` and `audit_assets.py`, so the shared extension is `.py`. Handle: `unreal.py`.

---

## 5. Getting the Flag
Sending a friend request to `unreal.py` (display name "Quid") on Discord and following through from there gets the actual flag.

**Flag:** `isfcr{abs0lut3_c1n3m4!?}`

---

## 6. Takeaways
- Each hop in this chain unlocked exactly one new platform — a profile, a channel description, a bio field, a commit message — so the right habit is checking every field on a platform for an outbound pointer before giving up on it.
- A brute-force keyword search of a git repository's full history is good at finding secrets that are *written down*, but it will never find one that's *described in prose* instead — reading a repo's actual docs still matters even after an automated search comes up clean.
- A decoy flag planted at the very first step of a chain is a strong signal not to stop there; if a challenge clearly expects a multi-hop investigation, a flag-shaped string on hop one is almost certainly bait.
- The smallest, most recently modified repository in an otherwise large list of forks and coursework is worth checking first — commit recency and size are both decent heuristics for where a planted clue is likely to live.
