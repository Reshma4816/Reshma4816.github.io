---
title: "Memory Dump: Credential Extraction"
date: 2024-08-20
description: "Extract plaintext credentials from a Windows memory dump using Volatility 3 and LSASS process analysis."
category: "Digital Forensics"
ctf: "H7CTF"
difficulty: "Medium"
points: 400
tags: ["volatility", "memory-forensics", "lsass", "windows", "mimikatz"]
---

## Challenge Overview

We're handed a raw Windows 10 memory image (`memdump.raw`). Goal: extract the user credentials before the forensic window closes.

## Solution

### Step 1: Identify OS profile

```bash
$ vol3 -f memdump.raw windows.info
Kernel Base: 0xf80002a52000
DTB: 0x1aa000
...
NtBuildLab: 7601.win7sp1_rtm.101119-1850
```

### Step 2: List processes — find LSASS

```bash
$ vol3 -f memdump.raw windows.pslist | grep -i lsass
PID 504   lsass.exe   2024-08-20 09:14:32
```

### Step 3: Dump LSASS memory and extract secrets

```bash
$ vol3 -f memdump.raw windows.lsadump
```

Output included NTLM hashes and, because WDigest was enabled, cleartext passwords:

```
Username: Administrator
  NT: a87f3a337d73085c45f9416be5787d86
  Password: Sup3rS3cr3tP4ss!
```

### Step 4: Locate the flag

The flag was embedded in one of the credential comments in the SAM database:

```
Description: FLAG{m3m0ry_n3v3r_f0rg3ts_s3cr3ts}
```

## Flag

`FLAG{m3m0ry_n3v3r_f0rg3ts_s3cr3ts}`

## Key Takeaways

WDigest authentication caches plaintext passwords in LSASS memory on older Windows builds. Always check `HKLMSYSTEMCurrentControlSetControlSecurityProvidersWDigest — UseLogonCredential` when analyzing memory dumps.
