---
title: "Hidden Weights"
date: 2026-10-11T12:00:00+05:30
description: "Extracting covert weights from a quantized neural network model to generate adversarial classification."
category: "Reverse Engineering"
ctf: "ISFCR CryoVault Quals 2026"
difficulty: "Hard"
points: 450
flag: "isfcr{4dv3rs4r14l_w31ght_3xtr4ct10n_succ3ss}"
author: "Reshma Al (Coldcoffee)"
tools: "PyTorch, ONNX, Python 3"
tags:
  - "Reverse Engineering"
  - "ISFCR CryoVault Quals 2026"
  - "Coldcoffee Solves"
---

<div class="flag-callout">
  <span class="flag-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> Captured Flag</span>
  <code>isfcr{4dv3rs4r14l_w31ght_3xtr4ct10n_succ3ss}</code>
  <button class="flag-copy-btn" onclick="navigator.clipboard.writeText('isfcr{4dv3rs4r14l_w31ght_3xtr4ct10n_succ3ss}');this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
</div>


## 1. Model Inspection
The challenge provided an ONNX neural network model classified as a digit recognizer.
Inspecting the floating point weights of the final dense layer revealed non-random quantization patterns.

---

## 2. Weight Carving & Inversion
Mapping the weight mantissas back to ASCII recovered the flag encoded directly into the neural network's parameter tensors.

