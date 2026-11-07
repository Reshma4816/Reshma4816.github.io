---
title: "Ahalya - The Petrified Memory"
date: 2026-11-01T09:49:00+05:30
description: "Volatile memory analysis of frozen kernel structures to reconstruct committed heap states."
category: "Digital Forensics"
ctf: "Pinaka CTF 2026"
difficulty: "Medium"
points: 200
flag: "PINAKA{ahalya_awakens_when_her_last_committed_memory_is_read_back_whole}"
author: "Reshma Al (Coldcoffee)"
tools: "Volatility 3, GDB, Python 3"
tags:
  - "Digital Forensics"
  - "Pinaka CTF"
  - "Pinaka 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>PINAKA{ahalya_awakens_when_her_last_committed_memory_is_read_back_whole}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('PINAKA{ahalya_awakens_when_her_last_committed_memory_is_read_back_whole}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


**Flag:** `PINAKA{ahalya_awakens_when_her_last_committed_memory_is_read_back_whole}`

## What the challenge was
We got three files from a fake memory device that lost power while it was writing. We had to find the **one real, latest, committed record** and send proof to the validator. The device never overwrites old data, so old versions, half-written versions and never-finished versions were all still sitting in the dump.

## Step 1: Look at the files
- `archive.nvm` is the actual memory. It is a long list of small blocks (frames).
- `archive.log` is a diary of what the device was doing. It says which writes finished (committed) or were cancelled (aborted).
- `l2p.map` is a map and a checkpoint. It also has some settings.

## Step 2: Understand one frame
Each frame is 235 bytes. I opened it in hex and found:
- the word `PNKPMEM1` at the start
- the record id (lid), the version number (epoch) and the transaction number (txn)
- a flag saying whether the frame was sealed
- a text payload like `AHALYA-STONE:3155:v3:scribe36516....`
- the word `PNKSEAL1` at the end

If the end is `ff ff ff...` instead of `PNKSEAL1`, the write was cut off. That is a **torn write**.

## Step 3: Understand the log
Every log entry starts with `LREC`. There are three kinds:
- **write**: "I am writing a new version of this record"
- **commit**: "that transaction is finished and final"
- **abort**: "forget that transaction"

Some entries were damaged, and the end of the log was wiped. So I only trusted entries whose checksum (CRC) was correct.

## Step 4: Find where each version sits
The task says the device scatters its blocks around memory. I compared each write's txn number with the slot it actually landed in. They followed a simple pattern:

```
slot = (29510 + 18791 × txn) mod 47189
```

A few exceptions came from the 16-entry relocation table in `l2p.map`. With those added, the pattern matched every frame, so I could locate any version by its txn.

## Step 5: Find the target record
The header of `l2p.map` has some numbers. At first I used **5801**, but it led to record 2320, which had no tricks in it. The number that actually names the target is **3155**. Record 3155 had every trap the README described:

| Version | Txn | Frame | What the log says | Use it? |
|---|---|---|---|---|
| 1, 2 | old | fine | old versions | no, too old |
| **3** | **36516** | **sealed** | **committed** | **yes** |
| 4 | 38017 | torn | committed, but the data is broken | no |
| 5 | 39518 | sealed | never committed | no |
| 6 | 41019 | torn | log entry lost | no |

So the real record is version 3, txn 36516, in slot 26417.

## Step 6: Rebuild the whole archive
The validator also wants a count and a hash of the entire archive. I kept a version for each of the 5,000 records only if all of these were true:
1. It is from the checkpoint, or the log has a good commit for it.
2. The frame is sealed.
3. Both checksums are good.

For each record I took the highest version that passed. That gave **5000 records**.

## Step 7: The hashing problem
Both digests needed a SHA-256 of the "payload", but the payload was ambiguous. My first guesses were the 80-byte text and the text with the dots removed. The validator said only `record_digest` and `archive_digest` were wrong. That told me my record, slot and count were right, and only the hashing was off.

I wrote a script that tried 10 possible definitions of the payload and sent each one to the validator. The one that worked was **bytes 23 to 222 of the frame**. That is the repeated header, the payload and the filler.

The archive digest was built like this:
```
for each record id in sorted order: "lid:epoch:sha256(bytes 23..222)"
join them with ";" and take sha256 of the result
```

## Step 8: Submit
```json
{"target_lid":3155,"committed_epoch":3,"committed_txn":36516,"physical_slot":26417,
 "record_digest":"b3ef6fd95676c067ef3b46df05a0601d27ee27978ced72842771616ff13e92a8",
 "committed_record_count":5000,
 "archive_digest":"ea05aa9e0f487c43f680e51f4f06758149b345f3822dbed55ec080b1c37cc6bc"}
```

The validator replied "memory-restored" and gave the flag.

