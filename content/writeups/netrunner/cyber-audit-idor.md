---
title: "Netrunner Portal: Broken Access Control & IDOR Token Forgery"
date: 2026-10-28T16:00:00+05:30
description: "Auditing custom CTFd instance to discover unauthenticated REST endpoints and manipulate integer IDOR parameters."
category: "Web Exploitation"
ctf: "Netrunner Gaultnet CTF"
difficulty: "Medium"
points: 300
flag: "NR{1d0r_br0k3n_4cc3ss_c0ntr0l_p0rt4l}"
author: "Reshma Al (Coldcoffee)"
tools: "Burp Suite, Python 3, curl"
tags:
  - "Web Exploitation"
  - "Netrunner Gaultnet CTF"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>NR{1d0r_br0k3n_4cc3ss_c0ntr0l_p0rt4l}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('NR{1d0r_br0k3n_4cc3ss_c0ntr0l_p0rt4l}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Web Reconnaissance & Flaw Discovery
Auditing the Netrunner challenge portal:
1. When downloading challenge attachment files, the request route is:
   `GET /api/v1/files/download?file_id=142`
2. The endpoint checks whether the authenticated user belongs to an active team.
3. However, inspecting the request headers revealed that adding `X-Original-URL: /api/v1/internal/export` bypassed the middleware authentication hook entirely.

---

## 2. Parameter Manipulation & Extraction
Sweeping the `file_id` parameter from 1 to 200 uncovered internal backup zip `file_id=19`:
```bash
curl -s "http://netrunner.portal/api/v1/files/download?file_id=19"   -H "X-Original-URL: /api/v1/internal/export" -o backup.zip
```

Unzipping `backup.zip` disclosed the administrative database seed holding the flag.

