---
title: "Carbon Without an Original"
date: 2026-10-12T14:00:00+05:30
description: "Hand-parse a SQLite WAL without destroying its uncommitted frames, untangle two competing author histories, and search for a lost CRDT interleaving to walk a five-stage key migration chain to its end."
category: "Mobile Security"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{eac74a3a5a212b7715684ffd0fd97c75420a4fb8}"
author: "Reshma Al (Coldcoffee)"
tools: "jadx, Python 3, manual SQLite WAL parsing"
tags:
  - "Mobile Security"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{eac74a3a5a212b7715684ffd0fd97c75420a4fb8}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{eac74a3a5a212b7715684ffd0fd97c75420a4fb8}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. What's Provided
Alongside the current `Carbon.apk` — which wants a 32-byte hex "recovery code" to decrypt a 96-byte archive — comes a full app-data export: two SQLite databases (one with its write-ahead log), a third database tracking a migration chain, encrypted object blobs, two older package versions, and a session/profile config. Every stage of a five-step key migration has to be reconstructed from this evidence, since none of the actual recovery code or any intermediate key is stored anywhere directly.

---

## 2. The Chain, End to End
`catalog.db` lays out the dependency order explicitly: a journal of deliveries produces a key `K2`; that key opens a sequence-data object, which replays into key `K23`; that key opens a second object holding a "dispatch script," which replays (given the right execution trace) into `K31` — the actual recovery code. Every stage shares an envelope format: a 16-byte IV, AES-CBC ciphertext, and a 32-byte HMAC tag, with separate AES and MAC keys both derived from the stage key via SHA-256.

---

## 3. Step 1 — Recovering "Slot Capsules" Without Destroying the Evidence
The first database's write-ahead log (WAL) holds history that the committed database file alone doesn't. **Opening the extracted `cache.db` with a normal SQLite client is destructive here** — SQLite will happily replay and then delete the WAL on open, erasing exactly the evidence that matters. Parsing the WAL by hand instead: of 149 frames, only the first 30 are committed; everything after that is uncommitted, and the very last frame is an uncommitted rewrite of the slots table page. Each row in that table is a 68-byte "capsule" — a constant-per-device body matrix plus a tag that differs per slot, per boot, and per generation. Walking only the *committed* frames in order reconstructs the legitimate row history; the final uncommitted frame adds a few generations that never actually took effect.

---

## 4. Step 2 — Decrypting the Journal
The journal's delivery records use the same envelope format, but the key for them is undocumented anywhere in the app. With no obvious candidate, I brute-forced it against a simple oracle: the correctly decrypted entry always starts with a fixed magic value. That search found that the key is simply the raw 32-byte tag of whichever slot capsule row matches a delivery's own slot and boot identifiers — and a short follow-up brute-force search over the MAC's additional-data layout found the exact field ordering it uses. Of 212 total delivery records, 210 decrypt and pass their MAC; the remaining two reference tags that never made it into this particular export and simply aren't needed.

---

## 5. Step 3 — Deriving K2 From the Journal
Re-implementing the journal's own key-derivation algorithm from the decompiled bytecode: filter the decrypted delivery entries down to one specific document, sort them by a "height" value (the sum of their vector clock), apply any erase-type entries in reverse, and fold everything into an accumulator using linear algebra over a finite field, where each author's own "basis matrix" comes directly from their slot capsule body.

The entries for the target document actually form **two separate, unrelated histories** — one belonging to the real document owner's lineage, and a second belonging to an entirely different user. Mixing them in produces a wrong key; the correct set is only the owner's own lineage, with exact duplicate entries (replayed by a restored profile) removed, and the entries sealed by the uncommitted WAL generations from Step 3 dropped, since those commits never actually took effect. Getting this filter right is confirmed the moment the resulting key successfully opens the next encrypted object with a valid MAC.

---

## 6. Step 4 — A Second CRDT, K23
The object `K2` opens holds another sequence-based CRDT — a base text plus a stream of insert/delete events with their own clocks. Replaying it needs one more unknown: a document identifier that the replay function also uses to validate itself against embedded "witness" digests of the visible document state at various points. Those witnesses only line up when the document identifier itself is supplied, which directly gives `K23`.

---

## 7. Step 5 — Dispatch: Recovering a Lost Execution Trace
The second encrypted object, opened with `K23`, holds a "dispatch script": six groups, each with a bit-width, a checkpoint value, and three separately-ordered lanes of operations. Replaying this script needs a *trace* — the specific interleaving of those three lanes — which isn't stored anywhere and has to be searched for. A depth-first search per group, pruned heavily by each step's parity precondition and checked against that group's final checkpoint observation, converges quickly on a single surviving candidate, confirmed as correct the moment it matches the script's own final commitment hash. That gives `K31`, the actual recovery code.

---

## 8. The Final Note
Opening the 96-byte archive with the recovered recovery code decrypts cleanly, with the MAC verifying, straight to the flag.

**Flag:** `isfcr{eac74a3a5a212b7715684ffd0fd97c75420a4fb8}`

---

## 9. Takeaways
- Never open an extracted SQLite database file with a normal client before you've examined its WAL — a routine open can silently replay and discard uncommitted frames that are exactly the evidence a forensic task needs.
- When a MAC or encryption context isn't documented anywhere, a plaintext magic value or fixed header is a reliable oracle for brute-forcing the missing key or context string, rather than guessing at the app's internal naming conventions.
- Multiple plausible-looking "histories" feeding into the same derivation is a common trap — the correct set is usually the one tied to the actual document or session under investigation, and an unrelated second lineage is there specifically to be ruled out.
- Not every secret in a chain like this is stored somewhere waiting to be found — sometimes, as with the dispatch trace here, it has to be reconstructed by a constrained search, with the program's own internal consistency checks (a parity precondition, a final checkpoint, a commitment hash) doing the work of confirming you found the right one.
