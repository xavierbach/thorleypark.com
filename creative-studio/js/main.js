/* TA Creative Studio — motion & interactions */
(function () {
  'use strict';

  document.documentElement.classList.add('js');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('reduced-motion');

  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- reveal animations ---------- */
  if (hasGsap && !reduced) {
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%' }
        });
    });

    /* hero title lines */
    gsap.from('.hero-title .line', {
      yPercent: 110,
      opacity: 0,
      duration: 1.05,
      stagger: 0.14,
      ease: 'power4.out',
      delay: 0.15
    });
    gsap.from('.hero-logo', { opacity: 0, y: 16, duration: 0.8, delay: 0.8 });

    /* marker highlight sweep */
    gsap.utils.toArray('.marker').forEach(function (el) {
      gsap.fromTo(el, { '--marker-x': 0 }, {
        '--marker-x': 1,
        duration: 0.7,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: el, start: 'top 82%' }
      });
    });

    /* torn edges gentle parallax */
    gsap.utils.toArray('.torn').forEach(function (el) {
      gsap.fromTo(el, { yPercent: -12 }, {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  } else {
    /* no GSAP or reduced motion: show everything */
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

  /* ---------- count-up stats ---------- */
  function formatNum(val, decimals) {
    if (decimals > 0) return val.toFixed(decimals);
    return Math.round(val).toLocaleString('en-AU');
  }

  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    if (isNaN(target)) return;
    if (reduced || !hasGsap) {
      el.textContent = prefix + formatNum(target, decimals) + suffix;
      return;
    }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: function () {
        el.textContent = prefix + formatNum(obj.v, decimals) + suffix;
      },
      onComplete: function () {
        el.textContent = prefix + formatNum(target, decimals) + suffix;
      }
    });
  }

  var counted = new WeakSet();
  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !counted.has(entry.target)) {
        counted.add(entry.target);
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    statObserver.observe(el);
  });

  /* ---------- autoplay case videos when visible ---------- */
  var vidObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target;
      if (entry.isIntersecting) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('.case-media video').forEach(function (v) {
    vidObserver.observe(v);
  });

  /* ---------- case study filters ---------- */
  var filterBtns = document.querySelectorAll('.filter');
  var cases = document.querySelectorAll('.case');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var f = btn.dataset.filter;
      cases.forEach(function (c) {
        var show = f === 'all' || c.dataset.cat === f;
        if (show && c.classList.contains('is-hidden')) {
          c.classList.remove('is-hidden');
          if (hasGsap && !reduced) {
            gsap.fromTo(c, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
          }
        } else if (!show) {
          c.classList.add('is-hidden');
        }
      });
      if (hasGsap) ScrollTrigger.refresh();
    });
  });

  /* ---------- chapter nav active state ---------- */
  var navLinks = document.querySelectorAll('.chapter-nav a');
  var sections = [];
  navLinks.forEach(function (a) {
    var sec = document.getElementById(a.dataset.chapter);
    if (sec) sections.push({ link: a, sec: sec });
  });
  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.dataset.chapter === id);
        });
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach(function (s) { navObserver.observe(s.sec); });
})();
