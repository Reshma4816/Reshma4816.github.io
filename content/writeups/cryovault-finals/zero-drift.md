---
title: "Zero Drift"
date: 2026-10-12T12:00:00+05:30
description: "Reconstruct a flash controller's record order across six crash-cleared tick resets by following a fixed lane rotation, then calibrate real crystal drift against the manufacture-spec formula to recover the escrow's uptime value."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{hpat392mv7v8qjerbxgjk5jy}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, CRC-32C, least-squares fitting"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{hpat392mv7v8qjerbxgjk5jy}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{hpat392mv7v8qjerbxgjk5jy}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Documentation Describes the Wrong Revision
The handout documentation (`HOLDOVER.md`) describes a rev-1 flash layout — a 16-byte page header, 24-byte records, and uptime-in-milliseconds timestamps. The actual image's superblock reports rev 2, running a newer firmware version than the doc covers. The real layout, pulled from that firmware's own release notes instead, keeps the same header offsets as rev 1 but adds a lane number, a per-lane sequence counter, and a base tick value — and each 32-byte record now stores a *delta* tick relative to its page's base tick, rather than an absolute timestamp.

Parsing the image against this corrected layout checks out exactly: every page's CRC-32C is valid, the superblock and tail-page checksums are valid, and the total live record count and byte usage both match the superblock's own stated totals precisely — strong confirmation the corrected format, not the documented one, is right.

---

## 2. Timestamps Can't Be Trusted Across Resets
The capture ends with a cascade of six reset records in a row — the standby power rail collapsed repeatedly near the end of the run, and each collapse zeroed the device's always-on tick counter. That means pages written in the same logical write-round, just on opposite sides of one of these resets, can have wildly different `base_tick` values that don't reflect their actual write order at all. Sorting purely by timestamp across a reset boundary gives the wrong order.

---

## 3. Recovering True Order From the Lane Rotation
The flash controller writes across 8 lanes in a fixed round-robin rotation, and that rotation holds steady throughout the entire pre-reset portion of the capture — `5, 0, 3, 4, 1, 2, 7, 6`, repeating identically for hundreds of rounds. Since that fixed order is independent of any clock, it survives the reset cascade intact and can be used to reconstruct true write order even where timestamps can't be trusted.

The last clean round before the resets began ends partway through, on lane 6, with that page closed early. The very next round picks up the same rotation exactly where it left off — `5 → 0 → 3 → 4 → 1 → 2 → 7` — except now each lane's page in this round starts with its own reset record, because a fresh collapse cut off the one before it. The final lane in this sequence, lane 2, is the one whose page records the interlock actually unlatching, followed cleanly by lane 7's page continuing in the same final (post-cascade) epoch.

A second, independent check confirms this ordering: spare pages in this device get allocated from the top of the page pool downward, and the order in which six specific spare pages were allocated lines up exactly with the lane-rotation-based ordering above — two unrelated allocation mechanisms agreeing is strong evidence neither is a coincidence.

---

## 4. Assembling the Marks
Reading each page's records in their on-disk write order (which, unlike timestamps, is never disturbed by a reset) and following the reconstructed page sequence across the crash cascade reveals a short embedded message, assembled piece by piece across ten pages spanning both the clean pre-reset epoch and six consecutive crash-interrupted ones:

```
d4ya259jyvhfp9c5kkrr2_fd
```

24 characters total, pulled directly from the recorder's own write order rather than inferred from timing.

---

## 5. The Real Trick: Calibrating the Clock Instead of Trusting It
The thaw-interlock latch event sits at a specific tick value — `base_tick + delta`, computed directly from the record. Converting that raw tick count into seconds is where the challenge's actual trap lives. The device's own service-manual formula for converting ticks to real time (based on the chip's manufacture-time calibration constant) gives one answer. But starting from a certain firmware version, the tick counter is actually driven by a real, external 60-second reference pulse — not the manufacture-spec oscillator rate at all. All ~17,800 of these reference pulses in the capture are consecutive with no gaps, and a least-squares fit across the entire recorded lifetime gives a tick-per-minute rate measurably different from the manufacture constant — meaning the crystal has drifted roughly 100 parts per million from its nominal spec over the device's service life.

Using the *manufacture formula* instead of this *measured calibration* gives a result that's off by nearly two real minutes — which, given the challenge's own title, is exactly the trap being pointed at: trusting a device's nominal spec instead of measuring its actual behavior.

---

## 6. Opening the Escrow
```bash
python escrow.py release.lock FL-d4ya259jyvhfp9c5kkrr2_fd-1105131.42
```

**Flag:** `isfcr{hpat392mv7v8qjerbxgjk5jy}`

---

## 7. Takeaways
- Hardware documentation can describe an earlier revision than the device you're actually looking at — always check the superblock or header's own version field before trusting an included doc's byte layout, and look for a more specific release note if the two disagree.
- A hard power-cycle or crash can reset a relative clock without resetting physical write order — when timestamps become untrustworthy across a boundary like that, look for *any* clock-independent sequencing signal (a fixed round-robin schedule, an allocation order) that survives the same event unaffected.
- Two independent structural signals agreeing on the same ordering (here, lane rotation and spare-page allocation order) is much stronger evidence than either alone — it's worth looking for a second, unrelated confirmation before trusting a reconstructed sequence.
- A device's manufacture-time calibration constant is a starting assumption, not a guarantee — real crystals drift with age and temperature, and where a system has its own independent time reference available (like a true periodic pulse), measuring the actual rate against it beats trusting the nominal spec.
