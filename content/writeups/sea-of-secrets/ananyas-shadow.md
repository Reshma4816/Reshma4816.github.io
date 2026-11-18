---
title: "Ananya's Shadow"
date: 2026-11-01T01:00:00+05:30
description: "Follow mock social profiles, image metadata, and a deleted GitHub commit diff to recover the passphrase for a hidden cache archive."
category: "OSINT"
ctf: "Sea of Secrets CTF 2026"
difficulty: "Hard"
points: 900
flag: "Hack!tUp{sh4d0w_n0d3_unv31l3d_99}"
author: "Reshma Al (Coldcoffee)"
tools: "ExifTool, Base64, 7-Zip, browser devtools"
tags:
  - "OSINT"
  - "Sea of Secrets CTF 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>Hack!tUp{sh4d0w_n0d3_unv31l3d_99}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('Hack!tUp{sh4d0w_n0d3_unv31l3d_99}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Starting Point
The challenge hands over one link: a blog called "Shadow Notes" by a user `av_shadow01`, hosted on a Vercel deployment. The blog links out to an Instagram, a Twitter, and a GitHub — except none of those are real external accounts. All three are mock pages baked into the same app, and the real `github.com/av_shadow_dev` is a 404. The whole investigation has to happen inside this one site.

---

## 2. Walking the Mock Profiles
Each fake profile carries exactly one piece of evidence, and most of them are deliberately misleading on their own:

- **Instagram bio** — a short Base64 string. Decoding it gives `GitHub: av_shadow_dev`, confirming the handle to dig into on the mock GitHub page.
- **Cafe photo EXIF** — pulling the metadata with ExifTool surfaces an `ImageDescription` field reading `passphrase: Cyber_Shadow_01`. Looks like a password — it isn't the right one, but it's not a red herring either; it's meant to be tried and fail.
- **Twitter** — a decoy flag sitting right in a tweet, `flag{ananya_is_not_here}`. Obviously planted, since it doesn't match the platform's actual flag format at all.
- **Mock GitHub, a deleted commit** — titled "Remove hardcoded config," its diff in `scripts/db_sync.py` still shows the removed line: `PORTAL_KEY = "S3aTtl3_C0ff3e_L0v3r_99"`. A deleted commit that's still browsable in the history is exactly the kind of thing OSINT challenges love to hide real secrets in.
- **`blog_header.png`** — an RGB-LSB extraction just re-confirms the pointer to that same deleted commit, so it's corroborating evidence rather than a new lead. The PGP key published at `/public_key.asc` turned out to hide nothing.

---

## 3. Finding the Hidden Archive
The blog's README mentions that the important files were moved "offline and into the shadows," but none of the visible pages actually link anywhere. That phrasing reads like a prompt to guess a path rather than follow a link, so I tried the obvious one directly: `/cache.zip`. It resolves to a 477-byte WinZip AES-256 archive holding two files.

---

## 4. Picking the Right Passphrase
This is where the two candidate secrets split apart. The EXIF passphrase (`Cyber_Shadow_01`) does **not** open the archive — it's the decoy, there to catch anyone who stops at the first thing that looks like a password. The leaked `PORTAL_KEY` from the deleted commit does:

```bash
7z x -p'S3aTtl3_C0ff3e_L0v3r_99' cache.zip
```

---

## 5. Inside the Archive
Two files come out. `read_me.txt` holds a second decoy, `flag{y0u_m1ss3d_th3_r34l_0n3}` — by this point the challenge has planted three separate fake flags along the trail (Twitter, read_me.txt, and implicitly the EXIF path). `secrets.txt` holds the real one.

**Flag:** `Hack!tUp{sh4d0w_n0d3_unv31l3d_99}`

---

## 6. Takeaways
- Mock "external" profiles inside a single app are a common OSINT pattern — don't assume a linked Instagram or GitHub is actually off-site until you've checked.
- A deleted commit is not a secret; `git log` and diff history on a public repo (even a fictional one rendered in-app) are fair game and often where the real credential lives.
- When a challenge plants multiple flag-shaped strings, the format itself is the tiebreaker — check it matches the stated template before treating anything as the answer.
- A passphrase that looks legitimate (EXIF metadata, nicely formatted) isn't automatically the right one. Try it, and if it fails, keep looking rather than assuming you made an extraction error.
