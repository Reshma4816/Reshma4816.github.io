---
title: "Permafrost Ci"
date: 2026-10-12T10:30:00+05:30
description: "Recover a deploy signing key one quarter at a time from a CI cache key that leaks XOR'd fragments of it, reconciling three different runner workspace histories to get the config digests right."
category: "Digital Forensics"
ctf: "ISFCR CryoVault Finals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{fl_kbux_67fg_8apg}"
author: "Reshma Al (Coldcoffee)"
tools: "Python 3, git, sha256"
tags:
  - "Digital Forensics"
  - "ISFCR CryoVault Finals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{fl_kbux_67fg_8apg}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{fl_kbux_67fg_8apg}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>

## 1. The Question Being Asked
This one's framed as an incident audit: who actually authorized a specific deploy pipeline's release to Hall B, and can that authorization be trusted? The deploy job signs releases using a secret `DEPLOY_KEY`, masked everywhere it's logged — but the *cache key* the job derives from it isn't treated as sensitive at all, and that turns out to be the whole vulnerability.

---

## 2. Spotting the Leak in the Cache Key
`ci/cachekey.py` builds its cache key like this:

```python
def deploy_tag(digest):
    key = bytes.fromhex(os.environ["DEPLOY_KEY"])
    pad = key[int(os.environ["FLOE_PIPELINE_SEQ"]) % 4::4]
    return bytes(a ^ b for a, b in zip(digest, pad)).hex()
# cache key = "deploy-hallb-" + deploy_tag(sha256 of config tree)
```

The masking tooling only redacts the literal secret value — it has no idea a derived, non-secret-looking cache key still leaks information *about* that secret. Since the digest being XORed is just a SHA-256 of the repo's config tree (fully recomputable), and the resulting tag appears unmasked in both the job log and `floe-cache-index.json`, each deploy run leaks exactly one quarter of `DEPLOY_KEY` — the 8 bytes at `key[seq % 4::4]`.

The cache evicts entries after 7 days, so only four pipelines' entries survive long enough to matter: 268, 274, 279, and 281, whose `seq % 4` values are 0, 2, 3, and 1 — between them, every single byte of the 32-byte key.

---

## 3. Recomputing the Digests Correctly (and Where I First Got It Wrong)
Recovering `key[seq%4::4] = digest XOR tag` requires recomputing each pipeline's config-tree digest *exactly* as that specific CI runner computed it at the time — and this is where line-ending and code-version differences matter enormously.

- Pipelines 268 and 274 ran older code that only hashed `.yaml`/`.yml` files, read in **text mode** — which silently normalizes CRLF to LF. Pipeline 268 had no `PYTHONUTF8` set, so it round-tripped through cp1252 before re-encoding to UTF-8; pipeline 274's second attempt (the first crashed on a decode error) had `PYTHONUTF8=1` set, decoding straight as UTF-8.
- Pipelines 279 and 281 ran a fixed version that hashes the **raw bytes** of every file under `config/` — meaning on-disk line endings now matter directly, since there's no text-mode normalization happening anymore.

My first pass assumed fresh checkouts with the current `.gitattributes` in effect everywhere, which would mean CRLF only survives on `README.md`. That produced a plausible-looking but wrong key, giving the incorrect candidate `FL-EHFB-Z88F-JWBQ`. The actual runner workspaces were **reused** across jobs rather than freshly cloned each time, and `git checkout` only ever rewrites a file whose blob actually changed — so files untouched since an earlier checkout kept whatever line endings they already had on disk, including CRLF, even after a `.gitattributes` rule (`*.yaml text eol=lf`, added partway through the timeline) would otherwise have normalized them going forward. Replaying each host's deploy history let me reconstruct the true on-disk state file-by-file for pipelines 279 and 281, which gave the correct digests and, from them, the correct key slices.

---

## 4. Assembling the Key and the Authorization
With all four quarter-slices correct, `DEPLOY_KEY` reassembles fully. From there, `ci/sign_release.py`'s `authorisation()` function is completely deterministic given the key, the commit hash, and two derived values — `build` (a `git rev-list --count HEAD`) and `lineage` (the first 16 hex characters of a SHA-256 over `git rev-list HEAD`) — both reproduced from a depth-20 shallow fetch of the exact commit the deploy job used, matching the job's own fetch behavior.

Re-deriving the authorization for `release = "hallb/281"` against commit `6027daf3b923a28917dfc7fff9e07f0141f0bdd4` gives:

**Flag:** `isfcr{fl_kbux_67fg_8apg}` (authorization code `FL-KBUX-67FG-8APG`)

---

## 5. Why This Matters Beyond the Flag
Having the key means *any* past authorization can be re-derived on demand — including, notably, a separate 02:56Z Hall B push that now has to be treated as potentially forged, since it's indistinguishable from a legitimately signed one once the signing key is known. That's a genuinely serious finding for an audit, not just a CTF flag: a masked secret that still lets its derived artifacts leak unmasked is effectively not protected at all.

---

## 6. Takeaways
- Masking tooling that only redacts a secret's literal value, and not values *derived* from it, provides much weaker protection than it looks like — any function of a secret that's printed, cached, or logged in the clear is a potential side channel for recovering that secret piece by piece.
- Multiple partial leaks across independent events, each covering a different slice of a larger secret, is a pattern worth actively watching for — four quarter-leaks across four pipeline runs reassembled into the full key here.
- Reconstructing historical file state exactly (line endings, encoding, workspace reuse vs. fresh clone) matters enormously for forensic recomputation — an assumption that's "almost right" (like assuming fresh checkouts) can still produce a completely wrong-looking-plausible result rather than an obvious failure.
- Persistent CI runner workspaces complicate forensic reconstruction in a way fresh-clone-per-job pipelines don't: a file's on-disk state can depend on that specific runner's entire job history, not just the current commit.
