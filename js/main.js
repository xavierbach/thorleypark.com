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
    // FOUNTAIN STRINGS
    // Thin luminous threads that cascade from the fountain and drift toward
    // the cursor — elegant, slow, like silk caught in a breeze
    // =========================================================================
    var canvas = document.querySelector('.hero-fountain-canvas');
    var logo = document.querySelector('.hero-logo-mark');

    if (canvas && logo) {
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var strands = [];
        var isScrolling = false;
        var scrollTimeout = null;
        var animating = false;
        var time = 0;
        var MAX_STRANDS = 14;

        // Mouse position relative to hero (null when cursor is outside)
        var mouse = { x: null, y: null, active: false };

        function resize() {
            var rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function getSpoutPos() {
            var logoRect = logo.getBoundingClientRect();
            var heroRect = canvas.parentElement.getBoundingClientRect();
            return {
                x: logoRect.left + logoRect.width / 2 - heroRect.left,
                y: logoRect.top - heroRect.top + logoRect.height * 0.1,
                w: logoRect.width
            };
        }

        // Track mouse within the hero section
        var hero = canvas.parentElement;
        hero.addEventListener('mousemove', function (e) {
            var rect = hero.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            mouse.active = true;
        });
        hero.addEventListener('mouseleave', function () {
            mouse.active = false;
        });

        // --- Strand: a flowing thread of water ---
        function Strand(cx, cy, fountainWidth) {
            var side = Math.random() < 0.5 ? -1 : 1;

            var spread;
            if (Math.random() < 0.3) {
                spread = side * (Math.random() * 0.3);
            } else {
                spread = side * (0.2 + Math.random() * 0.8);
            }

            this.points = [];
            this.originX = cx + (Math.random() - 0.5) * fountainWidth * 0.25;
            this.originY = cy;
            this.driftX = spread * 0.5;
            this.fallSpeed = 0.3 + Math.random() * 0.35;
            this.swaySeed = Math.random() * Math.PI * 2;
            this.swayAmount = 0.15 + Math.random() * 0.25;
            this.swaySpeed = 0.008 + Math.random() * 0.012;
            this.life = 1.0;
            this.decay = 0.0018 + Math.random() * 0.0018;
            this.maxPoints = 70 + Math.floor(Math.random() * 50);
            this.age = 0;
            this.lineWidth = 0.8 + Math.random() * 1.2;

            // How strongly this strand is attracted to the cursor
            this.cursorAffinity = 0.01 + Math.random() * 0.025;

            var roll = Math.random();
            if (roll < 0.5) {
                this.colour = [255, 255, 255];
            } else if (roll < 0.75) {
                this.colour = [235, 230, 215];
            } else {
                this.colour = [210, 195, 150];
            }

            this.baseAlpha = 0.15 + Math.random() * 0.2;
        }

        Strand.prototype.update = function () {
            this.age++;
            this.life -= this.decay;

            if (this.points.length < this.maxPoints && this.life > 0.2) {
                var lastX, lastY;
                if (this.points.length === 0) {
                    lastX = this.originX;
                    lastY = this.originY;
                } else {
                    var last = this.points[this.points.length - 1];
                    lastX = last.x;
                    lastY = last.y;
                }

                // Gentle sway
                var sway = Math.sin(this.swaySeed + this.age * this.swaySpeed) * this.swayAmount;

                // Cursor attraction — strand tips drift toward mouse
                var cursorPull = 0;
                if (mouse.active && mouse.x !== null) {
                    var dx = mouse.x - lastX;
                    var dy = mouse.y - lastY;
                    var dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 10 && dist < 400) {
                        // Gentle pull scaled by distance — stronger when closer
                        var strength = this.cursorAffinity * (1 - dist / 400);
                        cursorPull = dx * strength;

                        // Also subtly pull downward toward cursor y
                        this.fallSpeed += dy * strength * 0.003;
                    }
                }

                var newX = lastX + this.driftX + sway + cursorPull;
                var newY = lastY + this.fallSpeed;

                // Gentle gravity acceleration
                this.fallSpeed += 0.004;
                // Clamp so strands don't fall too fast
                if (this.fallSpeed > 1.8) this.fallSpeed = 1.8;

                this.points.push({ x: newX, y: newY });
            }
        };

        Strand.prototype.draw = function () {
            if (this.points.length < 3 || this.life <= 0) return;

            var pts = this.points;
            var r = this.colour[0];
            var g = this.colour[1];
            var b = this.colour[2];

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (var i = 1; i < pts.length - 1; i++) {
                var progress = i / pts.length;

                // Fade in from origin, hold, taper at tail
                var fadeIn = Math.min(1, i / 10);
                var fadeTail = 1 - Math.pow(progress, 1.5);
                var alpha = fadeIn * fadeTail * this.life * this.baseAlpha;

                if (alpha < 0.003) continue;

                // Taper width along length
                var width = this.lineWidth * (1 - progress * 0.5);

                ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
                ctx.lineWidth = width;
                ctx.beginPath();
                ctx.moveTo(pts[i - 1].x, pts[i - 1].y);

                var cpx = (pts[i].x + pts[i + 1].x) / 2;
                var cpy = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpx, cpy);
                ctx.stroke();
            }
        };

        function spawnStrand() {
            if (strands.length >= MAX_STRANDS) return;
            var pos = getSpoutPos();
            strands.push(new Strand(pos.x, pos.y, pos.w));
        }

        var spawnAccumulator = 0;

        function tick() {
            if (!animating) return;
            time++;

            var w = canvas.width / dpr;
            var h = canvas.height / dpr;
            ctx.clearRect(0, 0, w, h);

            for (var i = strands.length - 1; i >= 0; i--) {
                var s = strands[i];
                s.update();
                s.draw();

                if (s.life <= 0 || (s.points.length > 0 && s.points[s.points.length - 1].y > h + 20)) {
                    strands.splice(i, 1);
                }
            }

            // Spawn strands gradually while scrolling
            if (isScrolling && window.scrollY < window.innerHeight) {
                spawnAccumulator += 0.12;
                while (spawnAccumulator >= 1) {
                    spawnStrand();
                    spawnAccumulator -= 1;
                }
            }

            if (strands.length > 0 || isScrolling) {
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
            if (window.scrollY > window.innerHeight) return;

            isScrolling = true;
            startAnimation();

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function () {
                isScrolling = false;
            }, 300);
        }, { passive: true });

        resize();
        window.addEventListener('resize', resize);

        // Opening: a few strands cascade after hero entrance
        setTimeout(function () {
            for (var i = 0; i < 4; i++) {
                setTimeout(spawnStrand, i * 500);
            }
            startAnimation();
        }, 2200);
    }
})();
