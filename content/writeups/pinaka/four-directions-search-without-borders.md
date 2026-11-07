---
title: "The Four Directions - Search Without Borders"
date: 2026-11-01T09:00:00+05:30
description: "Exploiting ciphertext length oracle against ECB mode responses across inconsistent archive nodes."
category: "Digital Forensics"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{himalaya_survey_portal_four_quadrants_aligned}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, requests, urllib3"
tags:
  - "Digital Forensics"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{himalaya_survey_portal_four_quadrants_aligned}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{himalaya_survey_portal_four_quadrants_aligned}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Category:** Forensic (technique: length oracle against ECB)
**Goal:** Recover the hidden flag from the portal
**Method:** Guess the secret one character at a time with a Python script (`solve.py`)

> **Status:** Incomplete. The script crashed with a connection error part-way through, so only the prefix below was recovered. The remainder of the flag still needs to be recovered by re-running or resuming the script.

## 1. The challenge

The challenge is presented as a web page called the Himalaya Botanical Survey Archive Portal. It shows a table of plant specimens (IDs like 1000, 1001, 1002...) stored across three storage nodes, A, B and C. Each cell shows values like `sp=0x0040 gen=1`.

The page also says the archive is degraded: the snapshots are stale and inconsistent, and the page is not authoritative. A few cells disagree with the others (for example `gen=2` on only one node), which is a hint that the data on the page is not fully trustworthy.

## 2. The idea

The portal never shows the secret directly. It does, however, return encrypted data, and the size of that encrypted data changes depending on what we send. So the secret can be learned from sizes alone, without breaking the encryption.

In simple terms, the attack works like a guessing game:

1. Send a request and note the size of the encrypted reply. This is the baseline.
2. Add one guessed character next to the secret part and send it again.
3. If the guess is right, the reply size behaves differently from a wrong guess.
4. Keep the right character, then move on to the next one.

## 3. Measuring the secret

Before guessing, the script measures two things (they are in the first lines of the screenshot below):

```
[*] baseline ciphertext length: 48
[*] secret length (incl. padding): ~42
```

So the encrypted reply is 48 bytes long when nothing extra is added, and the secret is about 42 bytes including padding. That tells us how many characters we need to recover.

## 4. Recovering the flag

The script then ran the guessing game over and over. Each line starting with `[+]` in the screenshot is one more correct character. The flag grows from `f` to `fl`, `fla`, `flag` and so on:

![solve.py recovering the flag one character at a time](images/solve_output.png)

*Screenshot: solve.py recovering the flag one character at a time.*

The last line recovered in the screenshot is:

```
flag{d3ad_m3ns_t3ll_n0_ta1l5_but_EC
```

Read in plain English this is "dead men tell no tales, but EC...". After that point the script stopped with a connection error (the Python traceback at the bottom of the screenshot), so the rest of the flag is not visible there.

## 5. Final flag

Re-run `solve.py`, or resume it from the prefix above, until it finishes. The completed flag goes here:

```
flag{d3ad_m3ns_t3ll_n0_ta1l5_but_EC....................}
```

