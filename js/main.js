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
    var revealTargets = document.querySelectorAll(
        '.essence-inner, .split-card, .location-inner, ' +
        '.feature-card, .project-card, .cta-box, .content-grid'
    );

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
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

    // =========================================================================
    // FOUNTAIN PARTICLE SYSTEM
    // Elegant water droplets that spout from the fountain logo on scroll
    // =========================================================================
    var canvas = document.querySelector('.hero-fountain-canvas');
    var logo = document.querySelector('.hero-logo-mark');

    if (canvas && logo) {
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var particles = [];
        var isScrolling = false;
        var scrollTimeout = null;
        var scrollVelocity = 0;
        var lastScrollY = 0;
        var animating = false;

        // Gold/water colour palette — translucent, classy
        var colours = [
            'rgba(196, 164, 74, 0.ALPHA)',   // gold
            'rgba(212, 185, 106, 0.ALPHA)',   // light gold
            'rgba(255, 255, 255, 0.ALPHA)',   // white shimmer
            'rgba(180, 150, 60, 0.ALPHA)',    // warm gold
            'rgba(220, 200, 140, 0.ALPHA)'    // pale gold
        ];

        function getColour(alpha) {
            var tpl = colours[Math.floor(Math.random() * colours.length)];
            return tpl.replace('ALPHA', alpha.toFixed(2));
        }

        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Get fountain spout position (top-centre of the logo image)
        function getSpoutPos() {
            var logoRect = logo.getBoundingClientRect();
            var heroRect = canvas.parentElement.getBoundingClientRect();
            return {
                x: logoRect.left + logoRect.width / 2 - heroRect.left,
                y: logoRect.top - heroRect.top + logoRect.height * 0.15
            };
        }

        function Particle(x, y, intensity) {
            // Spout upward then arc and fall
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
            var speed = 1.2 + Math.random() * 2.5 * Math.min(intensity, 1);

            this.x = x + (Math.random() - 0.5) * 6;
            this.y = y;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.gravity = 0.03 + Math.random() * 0.02;
            this.life = 1;
            this.decay = 0.004 + Math.random() * 0.006;
            this.radius = 1 + Math.random() * 2;
            this.baseAlpha = 0.15 + Math.random() * 0.25;
            this.colour = Math.floor(Math.random() * colours.length);
        }

        Particle.prototype.update = function () {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.995;
            this.life -= this.decay;
        };

        Particle.prototype.draw = function (ctx) {
            if (this.life <= 0) return;
            var alpha = this.life * this.baseAlpha;
            var tpl = colours[this.colour];
            ctx.fillStyle = tpl.replace('ALPHA', alpha.toFixed(3));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * this.life, 0, Math.PI * 2);
            ctx.fill();
        };

        function spawnBurst(count, intensity) {
            var pos = getSpoutPos();
            for (var i = 0; i < count; i++) {
                particles.push(new Particle(pos.x, pos.y, intensity));
            }
        }

        function tick() {
            if (!animating) return;

            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            // Update and draw particles
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.update();
                p.draw(ctx);

                if (p.life <= 0 || p.y > canvas.height / dpr + 20) {
                    particles.splice(i, 1);
                }
            }

            // Continuous gentle drip while scrolling
            if (isScrolling && window.scrollY < window.innerHeight) {
                var intensity = Math.min(Math.abs(scrollVelocity) / 40, 1);
                var count = Math.ceil(1 + intensity * 3);
                spawnBurst(count, intensity);
            }

            if (particles.length > 0 || isScrolling) {
                requestAnimationFrame(tick);
            } else {
                animating = false;
            }
        }

        function startAnimation() {
            if (!animating) {
                animating = true;
                tick();
            }
        }

        window.addEventListener('scroll', function () {
            scrollVelocity = window.scrollY - lastScrollY;
            lastScrollY = window.scrollY;

            // Only run particles while hero is in view
            if (window.scrollY > window.innerHeight) return;

            isScrolling = true;
            startAnimation();

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function () {
                isScrolling = false;
            }, 150);
        }, { passive: true });

        // Resize canvas on load and window resize
        resize();
        window.addEventListener('resize', resize);

        // Small initial burst after hero animation completes
        setTimeout(function () {
            spawnBurst(8, 0.4);
            startAnimation();
        }, 1800);
    }
})();
