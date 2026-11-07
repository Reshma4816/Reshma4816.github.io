---
title: "Sugriva's Covenant - The Divided Oath"
date: 2026-11-02T11:00:00+05:30
description: "Recovering Shamir secret shares partitioned across multiple document revisions with corrupted threshold weights."
category: "Cryptography"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 300
flag: "PINAKA{sugriva_divided_oath_seals_scattered_across_revisions}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, SymPy, Galois Field arithmetic"
tags:
  - "Cryptography"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{sugriva_divided_oath_seals_scattered_across_revisions}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{sugriva_divided_oath_seals_scattered_across_revisions}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. I downloaded the challenge files

Inside the zip were four files: `covenant.py`, `params.json`, `covenant_log.json`, and a `README.md`. The README said the server needs **3 out of 5 commanders** to sign off on an order before it accepts it — a "3-of-5 threshold signature." My goal was to get it to accept an order it was never supposed to approve: the **forbidden order**.

## 2. I read the signing code first

I opened `covenant.py` and found the one line that mattered most — the exact text each commander actually signs:

```python
def oath_token(command_id, epoch):
    return f"PINAKA-K02-OATH|cmd={command_id}|epoch={epoch}".encode()
```

I stared at this for a bit. It only uses two things: the command's **name** (`strike-order`) and the **epoch** (a version number). It never touches the **body** (the actual order text) or the **revision** number.

That felt like the bug immediately — a commander isn't really signing "what the order says," just "which slot it's in."

## 3. I checked the public ledger for leftover signatures

Next I opened `covenant_log.json`. It had a history of old proposals that never got enough votes — things like "send scouts to the lake" — each with 1 or 2 commander signatures attached, but never the full 3 needed.

Four individual signatures were sitting right there in that log.

## 4. I realized those old signatures still work on the new order

Since the signed text never includes the body, a commander's signature for "send scouts to the lake" is *mathematically identical* to what they'd have produced for the forbidden order. The signature was never really about the message — just the slot name and epoch, both of which match the forbidden order too.

So those 4 leftover signatures were secretly valid for **any** message on that slot, including the one I wasn't supposed to get approved.

## 5. I combined 3 of them myself

I only needed 3 to hit the threshold, and I had 4 to pick from. I grabbed 3 (Hanuman, Nala, Tara) and combined them using the same public combine function from `covenant.py` — plain math, no secrets involved:

```python
quorum = {1: seal_hanuman, 2: seal_nala, 4: seal_tara}
forged_signature = combine(quorum)
```

I ran it locally and checked it against the real council public key — it verified. At that point I knew I had a working forgery.

## 6. I sent it to the server

I POSTed this to `/covenant/ratify`:

```json
{
  "command_id": "strike-order",
  "revision": 10,
  "body": "UNSEAL THE DIVIDED OATH: MARCH ON KISHKINDHA AT DAWN AND SEIZE THE THRONE OF VALI",
  "signature": "a6c927d5974ea254018ac3abe5ff53b2de1e07fd71d0999ea0ce1772d4f6f675dadf3343c8b538b0aad05ed389b574bb0465054a5a068539aba46e4c02383b694fba7847d862929f24989a53c35b8b5cb16b8ce38ae84c20f591ff2ffe8ccf4d"
}
```

The server has no way to know this signature came from old, harmless votes instead of a real vote on this exact order — the math checks out either way.

## 7. It worked

```json
{
  "command_id": "strike-order",
  "result": "ratified",
  "revision": 10,
  "proclamation": "The divided oath is unsealed; Kishkindha answers a command the council never gave.",
  "flag": "PINAKA{sugriva_divided_oath_seals_scattered_across_revisions}"
}
```

