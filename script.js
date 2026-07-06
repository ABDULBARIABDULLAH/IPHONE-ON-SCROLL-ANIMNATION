(function () {
  'use strict';

  /* ==================================================
     CONFIG
     ================================================== */
  const CONFIG = {
    totalFrames: 244,
    framePrefix: 'frames/videoplayback_',
    frameExt: '.jpg',
    padDigits: 3,
    scrollDistance: 5,
    particleCount: 80,
    lenisDuration: 1.2,
    scrubDelay: 1,
  };

  /* ==================================================
     STATE
     ================================================== */
  const state = {
    frames: [],
    loaded: 0,
    ready: false,
    currentFrame: -1,
    lenis: null,
    particles: [],
  };

  /* ==================================================
     DOM REFS
     ================================================== */
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const DOM = {
    loadingScreen: $('#loadingScreen'),
    progressFill: $('#progressFill'),
    loadingPct: $('#loadingPct'),
    canvas: $('#frameCanvas'),
    ctx: null,
    particleCanvas: $('#particleCanvas'),
    particleCtx: null,
    cursor: $('#cursor'),
    cursorGlow: $('#cursorGlow'),
    body: document.body,
  };

  /* ==================================================
     UTILITY
     ================================================== */
  function pad(n, len) {
    return String(n).padStart(len, '0');
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ==================================================
     IMAGE PRELOADER
     ================================================== */
  function preloadImages() {
    return new Promise((resolve) => {
      const total = CONFIG.totalFrames;

      for (let i = 0; i < total; i++) {
        const img = new Image();
        img.src = CONFIG.framePrefix + pad(i, CONFIG.padDigits) + CONFIG.frameExt;

        img.onload = onLoad;
        img.onerror = function () {
          console.warn('Failed to load frame ' + i + ', using fallback');
          createFallback(img, i);
          onLoad();
        };

        state.frames.push(img);
      }

      function onLoad() {
        state.loaded++;
        updateLoading(state.loaded / total);
        if (state.loaded >= total) {
          resolve();
        }
      }
    });
  }

  function createFallback(img, index) {
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const ctx = c.getContext('2d');
    const hue = (index / CONFIG.totalFrames) * 280 + 220;
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', 960, 560);
    img._fallback = c;
  }

  function updateLoading(progress) {
    const pct = Math.round(progress * 100);
    DOM.progressFill.style.width = pct + '%';
    DOM.loadingPct.textContent = pct + '%';
  }

  /* ==================================================
     CANVAS SETUP
     ================================================== */
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = DOM.canvas.getBoundingClientRect();
    DOM.canvas.width = rect.width * dpr;
    DOM.canvas.height = rect.height * dpr;
    DOM.ctx = DOM.canvas.getContext('2d');
    DOM.ctx.scale(dpr, dpr);
    renderFrame(state.currentFrame);
  }

  function setupParticleCanvas() {
    const dpr = window.devicePixelRatio || 1;
    DOM.particleCanvas.width = window.innerWidth * dpr;
    DOM.particleCanvas.height = window.innerHeight * dpr;
    DOM.particleCtx = DOM.particleCanvas.getContext('2d');
    DOM.particleCtx.scale(dpr, dpr);
  }

  /* ==================================================
     FRAME RENDERER
     ================================================== */
  function renderFrame(index) {
    if (index < 0 || index >= CONFIG.totalFrames) return;
    const img = state.frames[index];
    if (!img) return;

    const ctx = DOM.ctx;
    if (!ctx) return;

    const rect = DOM.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    let srcW, srcH;
    if (img.complete && img.naturalWidth > 0) {
      srcW = img.naturalWidth;
      srcH = img.naturalHeight;
    } else if (img._fallback) {
      srcW = img._fallback.width;
      srcH = img._fallback.height;
    } else {
      return;
    }

    const imgAspect = srcW / srcH;
    const canvasAspect = w / h;

    let drawW, drawH, drawX, drawY;

    if (imgAspect > canvasAspect) {
      drawH = h;
      drawW = h * imgAspect;
      drawX = (w - drawW) / 2;
      drawY = 0;
    } else {
      drawW = w;
      drawH = w / imgAspect;
      drawX = 0;
      drawY = (h - drawH) / 2;
    }

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else if (img._fallback) {
      ctx.drawImage(img._fallback, drawX, drawY, drawW, drawH);
    }
  }

  /* ==================================================
     PARTICLES
     ================================================== */
  function initParticles() {
    const count = CONFIG.particleCount;
    const w = window.innerWidth;
    const h = window.innerHeight;
    state.particles = [];

    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.05,
      });
    }
  }

  function drawParticles() {
    const ctx = DOM.particleCtx;
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + p.opacity + ')';
      ctx.fill();
    }

    requestAnimationFrame(drawParticles);
  }

  /* ==================================================
     SPLIT TEXT
     ================================================== */
  function splitText() {
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim();
      const chars = text.split('');
      el.innerHTML = chars
        .map((c) => (c === ' ' ? ' ' : '<span class="split-char">' + c + '</span>'))
        .join('');
    });
  }

  /* ==================================================
     LENIS SMOOTH SCROLL
     ================================================== */
  function initLenis() {
    if (typeof Lenis === 'undefined') {
      console.warn('Lenis not loaded, falling back to native scroll');
      return;
    }

    state.lenis = new Lenis({
      duration: CONFIG.lenisDuration,
      easing: function (t) {
        return Math.min(1, 1 - Math.pow(1 - t, 3));
      },
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    state.lenis.on('scroll', function () {
      ScrollTrigger.update();
    });

    gsap.ticker.add(function (time) {
      state.lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  /* ==================================================
     GSAP + SCROLLTRIGGER
     ================================================== */
  function initScrollAnimation() {
    const heroTrigger = ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: function () {
        return '+=' + window.innerHeight * CONFIG.scrollDistance;
      },
      pin: true,
      scrub: CONFIG.scrubDelay,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        const progress = Math.min(self.progress, 1);
        const frameIndex = Math.round(progress * (CONFIG.totalFrames - 1));
        if (frameIndex !== state.currentFrame) {
          state.currentFrame = frameIndex;
          renderFrame(frameIndex);
        }
      },
    });

    gsap.to('.hero-title', {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: function () {
          return '+=' + window.innerHeight * CONFIG.scrollDistance * 0.25;
        },
        scrub: CONFIG.scrubDelay,
      },
      opacity: 0,
      y: -60,
      scale: 0.95,
      filter: 'blur(8px)',
      ease: 'power2.out',
    });

    gsap.to('.hero-subtitle', {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: function () {
          return '+=' + window.innerHeight * CONFIG.scrollDistance * 0.2;
        },
        scrub: CONFIG.scrubDelay,
      },
      opacity: 0,
      y: -40,
      filter: 'blur(5px)',
      ease: 'power2.out',
    });

    gsap.to('.scroll-indicator', {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: function () {
          return '+=' + window.innerHeight * CONFIG.scrollDistance * 0.1;
        },
        scrub: CONFIG.scrubDelay,
      },
      opacity: 0,
      ease: 'power2.out',
    });

    const animElements = $$('[data-animate]');
    animElements.forEach(function (el) {
      const dir = el.getAttribute('data-animate') || 'bottom';
      const yVal = dir === 'right' ? 40 : dir === 'left' ? -40 : 60;
      const xVal = dir === 'right' ? 40 : dir === 'left' ? -40 : 0;

      gsap.fromTo(
        el,
        { opacity: 0, y: yVal, x: xVal },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 30%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Hero split chars animation
    $$('.hero .split-char').forEach(function (char, i) {
      gsap.fromTo(
        char,
        { opacity: 0, y: 40, rotateX: -70 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: i * 0.02,
          scrollTrigger: {
            trigger: '#hero',
            start: 'top bottom',
            end: 'top top',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Section title split chars
    $$('.section .split-char').forEach(function (char, i) {
      gsap.fromTo(
        char,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          delay: i * 0.015,
          scrollTrigger: {
            trigger: char.closest('.section'),
            start: 'top 75%',
            end: 'top 40%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // CTA title chars
    $$('.cta .split-char').forEach(function (char, i) {
      gsap.fromTo(
        char,
        { opacity: 0, y: 30, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.5)',
          delay: i * 0.015,
          scrollTrigger: {
            trigger: '#cta',
            start: 'top 75%',
            end: 'top 40%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Counter animations
    $$('.counter').forEach(function (el) {
      const target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;
      gsap.fromTo(
        el,
        { textContent: 0 },
        {
          textContent: target,
          duration: 2.5,
          ease: 'power2.out',
          snap: { textContent: 1 },
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'bottom 40%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // Glow opacity animation
    gsap.to('.hero-glow', {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: function () {
          return '+=' + window.innerHeight * CONFIG.scrollDistance;
        },
        scrub: true,
      },
      opacity: 0.3,
      scale: 1.2,
    });

    return heroTrigger;
  }

  /* ==================================================
     CUSTOM CURSOR
     ================================================== */
  function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = DOM.cursor;
    const glow = DOM.cursorGlow;

    document.addEventListener('mousemove', function (e) {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.08,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      gsap.to(glow, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    // Magnetic buttons
    $$('.magnetic-btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, {
          x: x * 0.2,
          y: y * 0.2,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      });

      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)',
          overwrite: 'auto',
        });
      });
    });
  }

  /* ==================================================
     RESIZE HANDLER
     ================================================== */
  let resizeTimeout;
  function onResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      setupCanvas();
      setupParticleCanvas();
      initParticles();
      ScrollTrigger.refresh();
    }, 200);
  }

  /* ==================================================
     REDUCED MOTION
     ================================================== */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ==================================================
     INIT
     ================================================== */
  async function init() {
    try {
      setupCanvas();
      setupParticleCanvas();

      DOM.ctx = DOM.canvas.getContext('2d');
      DOM.particleCtx = DOM.particleCanvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      const rect = DOM.canvas.getBoundingClientRect();
      DOM.canvas.width = rect.width * dpr;
      DOM.canvas.height = rect.height * dpr;
      DOM.ctx.scale(dpr, dpr);

      const pw = window.innerWidth;
      const ph = window.innerHeight;
      DOM.particleCanvas.width = pw * dpr;
      DOM.particleCanvas.height = ph * dpr;
      DOM.particleCtx.scale(dpr, dpr);

      // Preload all 300 images
      await preloadImages();

      // Mark as ready
      state.ready = true;
      state.currentFrame = 0;
      renderFrame(0);

      // Hide loading screen
      DOM.loadingScreen.classList.add('hidden');
      DOM.body.classList.add('loaded');

      // Split text for animation
      splitText();

      // Init Lenis
      if (!prefersReducedMotion()) {
        initLenis();
      }

      // Init cursor
      initCursor();

      // Init particles
      initParticles();
      drawParticles();

      // Init GSAP ScrollTrigger animations
      initScrollAnimation();

      // Resize handler
      window.addEventListener('resize', onResize);

    } catch (err) {
      console.error('Init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
