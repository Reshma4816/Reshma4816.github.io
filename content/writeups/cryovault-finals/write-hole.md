---
title: "Write Hole"
date: 2026-10-11T12:00:00+05:30
description: "Reconstructing torn RAID-5 ext4 array and repairing corrupt blocks through journal analysis."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 500
flag: "isfcr{p4r1ty_n3v3r_l13s_wr1t3_h0l3_r3m3mb3rs}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, debugfs, e2fsck, losetup, mdadm"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{p4r1ty_n3v3r_l13s_wr1t3_h0l3_r3m3mb3rs}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{p4r1ty_n3v3r_l13s_wr1t3_h0l3_r3m3mb3rs}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Incident Scenario & Disk Artifacts
We were provided with three 17 MiB raw image files (`bay0.raw`, `bay1.raw`, `bay2.raw`) extracted from a crashed 3-disk enterprise NAS appliance. The system suffered a sudden power outage during heavy synchronous database transactions, resulting in a classic **RAID-5 write hole** where parity and data blocks fell out of sync.

---

## 2. RAID Geometry Identification
To assemble the array, we first identified the striping parameters:
1. **Disk Ordering:** Testing all permutations ($3! = 6$) against the ext4 superblock signature (`0xEF53` at byte offset 1080 of the assembled array).
2. **Chunk Size:** Tested chunk sizes 16 KiB, 32 KiB, 64 KiB, and 128 KiB.
3. The valid superblock resolved cleanly with:
   - Bay Order: `[bay1, bay2, bay0]`
   - Chunk Size: 32 KiB (64 sectors)
   - Layout: Left-Symmetric (standard Linux mdadm default)

---

## 3. Ext4 Journal Analysis & Write-Hole Repair
Mounting the reconstructed loop device failed with:
```text
EXT4-fs (loop0): checksum invalid in block 4098
EXT4-fs (loop0): mount failed
```

The filesystem was mounted with `data=journal`. Parsing the ext4 JBD2 journal buffer:
- The journal contains complete transaction descriptors, commit blocks, and revoked block lists.
- We located transaction commit block 454 containing the keyslot header `KSLT`.
- Comparing the raw data block against the journal transaction showed that Block 4098 suffered a single-bit parity inversion due to a torn write on `bay2`.

We wrote a Python corrector to verify block checksums against the JBD2 transaction log:
```python
# Compute crc32c of journaled buffer to locate flipped bit
target_crc = 0x8a92f03b
corrupt_block = bytearray(array_data[4098*4096 : 4099*4096])

for byte_idx in range(len(corrupt_block)):
    for bit_idx in range(8):
        corrupt_block[byte_idx] ^= (1 << bit_idx)
        if crc32c(corrupt_block) == target_crc:
            print(f"[+] Fixed bit flip at offset {byte_idx}, bit {bit_idx}")
            break
        corrupt_block[byte_idx] ^= (1 << bit_idx)
```

Writing the corrected block back to the array allowed clean mounting with `mount -o ro,noload`. Carving the uncorrupted file revealed the verified capture flag.

---

## 4. Key Takeaways
- RAID-5 without battery-backed write cache or journaling across disks is vulnerable to inconsistent state during power failure.
- When file system metadata is corrupt on a RAID volume, ext4's JBD2 journal frequently preserves clean historical images of blocks prior to crash.

