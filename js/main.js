// Thorley Park — Main JS

(function () {
    'use strict';

    // --- Nav scroll effect ---
    const nav = document.querySelector('.nav');
    function updateNav() {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // --- Mobile menu toggle ---
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', function () {
            links.classList.toggle('open');
        });

        links.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                links.classList.remove('open');
            });
        });
    }

    // --- Scroll reveal animations ---
    // Targets both homepage and subpage elements
    var revealTargets = document.querySelectorAll(
        '.essence-inner, .split-card, .location-inner, ' +
        '.feature-card, .project-card, .cta-box, .content-grid'
    );

    if ('IntersectionObserver' in window) {
        var delay = 0;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // Stagger siblings slightly
                    var el = entry.target;
                    var siblings = el.parentElement.querySelectorAll('.reveal, .fade-in');
                    var idx = Array.prototype.indexOf.call(siblings, el);
                    var stagger = Math.max(0, idx) * 80;

                    setTimeout(function () {
                        el.classList.add('visible');
                    }, stagger);

                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.12 });

        revealTargets.forEach(function (el) {
            // Use 'reveal' for homepage elements, 'fade-in' for subpage elements
            if (el.classList.contains('essence-inner') ||
                el.classList.contains('split-card') ||
                el.classList.contains('location-inner')) {
                el.classList.add('reveal');
            } else {
                el.classList.add('fade-in');
            }
            observer.observe(el);
        });
    }
})();
