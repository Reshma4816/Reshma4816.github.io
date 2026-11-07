/* ═══════════════════════════════════════════════════════════════
   C01DC0FF33 — Main JS
   Cinematic intro reveal + site interactions
═══════════════════════════════════════════════════════════════ */

/* ─── CINEMATIC INTRO REVEAL ────────────────────────────────── */
(function () {
  const overlay  = document.getElementById('intro-overlay');
  if (!overlay) return; // only on home page

  // Respect reduced-motion — overlay already hidden via CSS
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Check if user already saw it this session
  if (sessionStorage.getItem('intro-seen')) {
    overlay.style.display = 'none';
    return;
  }

  const curtain  = document.getElementById('intro-curtain');
  const bar      = document.getElementById('intro-bar');
  const skipBtn  = document.getElementById('intro-skip');

  let barProgress = 0;
  let barTimer;

  // Animate loading bar
  function tickBar() {
    barProgress = Math.min(barProgress + 1.1, 100);
    if (bar) bar.style.width = barProgress + '%';
    if (barProgress < 100) {
      barTimer = setTimeout(tickBar, 18);
    } else {
      // bar full → wipe up the curtain to reveal photo
      setTimeout(revealPhoto, 120);
    }
  }

  // Wipe curtain up (slide from covering → gone)
  function revealPhoto() {
    if (!curtain) { dismissAfterDelay(); return; }
    curtain.style.transition = 'transform 0.85s cubic-bezier(0.76, 0, 0.24, 1)';
    curtain.style.transform  = 'scaleY(0)';
    curtain.addEventListener('transitionend', dismissAfterDelay, { once: true });
  }

  // After showing the photo for ~1.2 s, fade the whole overlay out
  function dismissAfterDelay() {
    setTimeout(dismiss, 1200);
  }

  function dismiss() {
    overlay.classList.add('done');
    overlay.addEventListener('transitionend', function () {
      overlay.style.display = 'none';
    }, { once: true });
    sessionStorage.setItem('intro-seen', '1');
    clearTimeout(barTimer);
  }

  // Start the bar after a short pause
  setTimeout(tickBar, 300);

  // Skip button
  if (skipBtn) skipBtn.addEventListener('click', function () {
    clearTimeout(barTimer);
    dismiss();
  });
})();

/* ─── ABOUT POSTER CURTAIN REVEAL ──────────────────────────── */
(function () {
  var curtain = document.getElementById('poster-curtain');
  if (!curtain) return;
  setTimeout(function () {
    curtain.style.transition = 'transform 1.1s cubic-bezier(0.77, 0, 0.175, 1)';
    curtain.style.transform = 'scaleY(0)';
    setTimeout(function () {
      curtain.style.display = 'none';
    }, 1200);
  }, 250);
})();

/* ─── SECTION REVEAL (Intersection Observer) ────────────────── */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.02, rootMargin: '0px 0px 80px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    // If element is already within or near viewport, mark visible immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 80 && rect.bottom > -80) {
      el.classList.add('visible');
    } else {
      io.observe(el);
    }
  });
} else {
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    el.classList.add('visible');
  });
}

/* ─── CARD CURSOR GLOW ──────────────────────────────────────── */
document.querySelectorAll('.writeup-card, .event-tile').forEach(function (card) {
  card.addEventListener('mousemove', function (e) {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
    const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
    card.style.backgroundImage =
      'radial-gradient(circle at ' + x + '% ' + y + '%, rgba(90,15,38,.2) 0%, transparent 62%)';
  });
  card.addEventListener('mouseleave', function () { card.style.backgroundImage = ''; });
});

/* ─── MOBILE NAV TOGGLE ─────────────────────────────────────── */
var toggle = document.querySelector('.menu-toggle');
var nav    = document.getElementById('primary-navigation');
if (toggle && nav) {
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('open', !open);
  });
}

/* ─── COUNT-UP for archive summary ──────────────────────────── */
document.querySelectorAll('[data-count]').forEach(function (el) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var target = parseInt(el.dataset.count, 10);
      var prefix = el.dataset.prefix || '';
      var last = 0;
      var run = function (ts) {
        if (!last) last = ts;
        var p = Math.min((ts - last) / 1400, 1);
        el.textContent = prefix + Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(run);
        else el.textContent = prefix + target;
      };
      requestAnimationFrame(run);
      io.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  io.observe(el);
});
