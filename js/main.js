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
    // FOUNTAIN PARTICLE SYSTEM v2
    // Wide cascading arcs of luminous mist — like light catching water spray
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
        var MAX_PARTICLES = 300;

        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Fountain spout position — top of the fountain bowl
        function getSpoutPos() {
            var logoRect = logo.getBoundingClientRect();
            var heroRect = canvas.parentElement.getBoundingClientRect();
            return {
                x: logoRect.left + logoRect.width / 2 - heroRect.left,
                y: logoRect.top - heroRect.top + logoRect.height * 0.12,
                w: logoRect.width
            };
        }

        // --- Particle: a single luminous water droplet ---
        function Particle(cx, cy, fountainWidth) {
            // Wide fan spray — arcs out left and right like a real fountain
            // Pick a random arc from -150° to -30° (wide umbrella shape)
            var side = Math.random() < 0.5 ? -1 : 1;
            var spreadAngle = 0.3 + Math.random() * 1.0; // 17° to 74° from vertical
            var angle = -Math.PI / 2 + side * spreadAngle;

            // Some particles go nearly straight up (central jet)
            if (Math.random() < 0.25) {
                angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            }

            var speed = 1.8 + Math.random() * 3.0;

            // Spawn from a wider area across the fountain top
            var spawnSpread = fountainWidth * 0.3;
            this.x = cx + (Math.random() - 0.5) * spawnSpread;
            this.y = cy;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.gravity = 0.025 + Math.random() * 0.025;
            this.drag = 0.997;
            this.life = 1.0;
            this.decay = 0.003 + Math.random() * 0.005;
            this.baseAlpha = 0.08 + Math.random() * 0.18;

            // Vary sizes — mostly fine mist with occasional larger drops
            var sizeRoll = Math.random();
            if (sizeRoll < 0.6) {
                this.radius = 1.5 + Math.random() * 1.5; // fine mist
            } else if (sizeRoll < 0.9) {
                this.radius = 3 + Math.random() * 2;      // medium drops
            } else {
                this.radius = 5 + Math.random() * 3;      // large soft orbs
            }

            // Colour — mostly white/silver with hints of gold
            var colourRoll = Math.random();
            if (colourRoll < 0.45) {
                this.r = 255; this.g = 255; this.b = 255;  // pure white
            } else if (colourRoll < 0.7) {
                this.r = 230; this.g = 225; this.b = 210;  // warm white
            } else if (colourRoll < 0.85) {
                this.r = 210; this.g = 195; this.b = 140;  // soft gold
            } else {
                this.r = 196; this.g = 180; this.b = 120;  // richer gold
            }
        }

        Particle.prototype.update = function () {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= this.drag;
            this.vy *= this.drag;
            this.life -= this.decay;
        };

        Particle.prototype.draw = function () {
            if (this.life <= 0) return;

            // Fade in quickly, hold, then fade out
            var fadeIn = Math.min(1, (1 - this.life) * 8);
            var fadeOut = this.life;
            var alpha = fadeIn * fadeOut * this.baseAlpha;
            if (alpha < 0.005) return;

            var r = this.radius * (0.6 + this.life * 0.4);

            // Soft glow for larger particles
            if (r > 3) {
                ctx.globalAlpha = alpha * 0.3;
                ctx.fillStyle = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Core droplet
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();
        };

        function spawnWave(count) {
            if (particles.length > MAX_PARTICLES) return;
            var pos = getSpoutPos();
            for (var i = 0; i < count; i++) {
                particles.push(new Particle(pos.x, pos.y, pos.w));
            }
        }

        function tick() {
            if (!animating) return;

            var w = canvas.width / dpr;
            var h = canvas.height / dpr;
            ctx.clearRect(0, 0, w, h);
            ctx.globalAlpha = 1;

            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.update();
                p.draw();

                if (p.life <= 0 || p.y > h + 30 || p.x < -30 || p.x > w + 30) {
                    particles.splice(i, 1);
                }
            }

            ctx.globalAlpha = 1;

            // Spawn while scrolling within hero
            if (isScrolling && window.scrollY < window.innerHeight) {
                var intensity = Math.min(Math.abs(scrollVelocity) / 20, 1);
                var count = Math.ceil(3 + intensity * 8);
                spawnWave(count);
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

            if (window.scrollY > window.innerHeight) return;

            isScrolling = true;
            startAnimation();

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function () {
                isScrolling = false;
            }, 200);
        }, { passive: true });

        resize();
        window.addEventListener('resize', resize);

        // Gentle opening burst after hero animation settles
        setTimeout(function () {
            spawnWave(20);
            startAnimation();
        }, 2000);
    }
})();
