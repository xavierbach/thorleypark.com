/* =========================================================================
   Thorley Park — Aquascape Studio (3D)
   A free in-browser freshwater & saltwater aquarium designer.
   Orbit the camera around a real 3D tank, drop in hardscape, plants,
   corals, livestock and equipment, then read a live stocking & care score.
   Three.js r160 is vendored locally — no external runtime dependency.
   ========================================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================================
   PART A — 2D SVG sprites (used only for the palette thumbnails)
   ========================================================================= */
const svg = (inner, vb) =>
    `<svg viewBox="${vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">${inner}</svg>`;

function bushPlant(c, d) {
    let p = `<ellipse cx="50" cy="96" rx="30" ry="8" fill="rgba(0,0,0,.12)"/>`;
    for (let i = 0; i < 11; i++) {
        const a = (i / 10 - 0.5) * 2.2, len = 34 + (i % 3) * 10;
        const x = 50 + Math.sin(a) * 26, y = 96 - Math.cos(a) * len;
        p += `<path d="M50 96 Q${(50 + x) / 2 + Math.sin(a) * 6} ${96 - len * 0.6} ${x} ${y}" stroke="${i % 2 ? d : c}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="5" fill="${i % 2 ? c : d}"/>`;
    }
    return svg(p);
}
function swordPlant(c, d) {
    let p = '';
    [[50, 8, 0], [40, 18, -18], [60, 18, 18], [33, 30, -34], [67, 30, 34], [46, 12, -8], [54, 12, 8]].forEach(([x, top], i) => {
        p += `<path d="M50 100 C${x - 10} 70 ${x - 6} 40 ${x} ${top} C${x + 6} 40 ${x + 10} 70 50 100 Z" fill="${i % 2 ? d : c}"/>`;
    });
    return svg(p);
}
function fernPlant(c, d) {
    let p = '';
    for (let s = -1; s <= 1; s++) {
        p += `<g transform="rotate(${s * 26} 50 100)"><path d="M50 100 Q48 50 50 16" stroke="${d}" stroke-width="4" fill="none"/>`;
        for (let i = 0; i < 7; i++) {
            const y = 92 - i * 11, w = 20 - i * 2;
            p += `<path d="M50 ${y} q-${w} -4 -${w} -10" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M50 ${y} q${w} -4 ${w} -10" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
        }
        p += `</g>`;
    }
    return svg(p);
}
function carpetPlant(c, d) {
    let p = '';
    for (let i = 0; i < 22; i++) {
        const x = 6 + i * 4.2, h = 14 + (i % 4) * 6;
        p += `<path d="M${x} 100 q-2 -${h * 0.6} ${(i % 2 ? 2 : -2)} -${h}" stroke="${i % 2 ? d : c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return svg(p);
}
function vallisPlant(c, d) {
    let p = '';
    for (let i = 0; i < 6; i++) {
        const x = 30 + i * 8, sway = (i % 2 ? 12 : -10);
        p += `<path d="M${x} 100 C${x + sway} 60 ${x + sway} 30 ${x + sway / 2} 6" stroke="${i % 2 ? d : c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    return svg(p);
}
function stemPlant(c, d) {
    let p = '';
    for (let s = 0; s < 4; s++) {
        const x = 30 + s * 13;
        p += `<path d="M${x} 100 Q${x + (s % 2 ? 8 : -8)} 55 ${x} 14" stroke="${d}" stroke-width="3" fill="none"/>`;
        for (let i = 0; i < 8; i++) {
            const y = 92 - i * 11;
            p += `<ellipse cx="${x - 7}" cy="${y}" rx="7" ry="3.5" fill="${c}" transform="rotate(-25 ${x - 7} ${y})"/><ellipse cx="${x + 7}" cy="${y}" rx="7" ry="3.5" fill="${c}" transform="rotate(25 ${x + 7} ${y})"/>`;
        }
    }
    return svg(p);
}
function mossBall(c, d) {
    let p = `<circle cx="50" cy="74" r="24" fill="${c}"/>`;
    for (let i = 0; i < 50; i++) {
        const a = (i / 50) * 6.28, r = 18 + (i % 5) * 1.6;
        p += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(74 + Math.sin(a) * r).toFixed(1)}" r="1.6" fill="${d}"/>`;
    }
    return svg(p);
}
function branchCoral(c, d) {
    let p = `<path d="M50 100 L50 60" stroke="${d}" stroke-width="10" stroke-linecap="round"/>`;
    [[50, 60, 30, 18], [50, 70, 70, 22], [50, 55, 50, 26], [50, 78, 36, 14], [50, 66, 64, 16]].forEach(([x, y, tx, ty]) => {
        p += `<path d="M${x} ${y} Q${(x + tx) / 2} ${y - 6} ${tx} ${ty}" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="${tx}" cy="${ty}" r="6" fill="${d}"/>`;
    });
    return svg(p);
}
function brainCoral(c, d) {
    let p = `<path d="M22 100 Q14 56 50 50 Q86 56 78 100 Z" fill="${c}"/>`;
    for (let i = 0; i < 7; i++) { const y = 96 - i * 6; p += `<path d="M${26 + (i % 2) * 4} ${y} Q50 ${y - 7} ${74 - (i % 2) * 4} ${y}" stroke="${d}" stroke-width="3" fill="none"/>`; }
    return svg(p);
}
function tableCoral(c, d) { return svg(`<path d="M48 100 L52 64 L56 100 Z" fill="${d}"/><ellipse cx="52" cy="60" rx="40" ry="12" fill="${c}"/><ellipse cx="52" cy="56" rx="40" ry="9" fill="${d}" opacity=".4"/>`); }
function mushroomCoral(c, d) {
    let p = '';
    [[34, 86, 16], [62, 80, 20], [48, 64, 18], [72, 92, 13]].forEach(([x, y, r]) => { p += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.6}" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="${r * 0.5}" ry="${r * 0.3}" fill="${d}"/>`; });
    return svg(p);
}
function zoaPolyps(c, d) {
    let p = '';
    [[30, 88], [44, 80], [58, 86], [70, 78], [38, 70], [54, 66], [66, 90], [48, 92]].forEach(([x, y]) => { p += `<circle cx="${x}" cy="${y}" r="9" fill="${d}"/><circle cx="${x}" cy="${y}" r="6" fill="${c}"/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff" opacity=".7"/>`; });
    return svg(p);
}
function anemoneArt(c, d) {
    let p = `<ellipse cx="50" cy="92" rx="22" ry="9" fill="${d}"/>`;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28, x = 50 + Math.cos(a) * 20, len = 30 + (i % 3) * 8; p += `<path d="M50 86 Q${x} ${86 - len * 0.6} ${x} ${86 - len}" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${x}" cy="${86 - len}" r="4" fill="${d}"/>`; }
    return svg(p);
}
function bubbleCoral(c, d) {
    let p = '';
    [[34, 86, 14], [54, 88, 16], [44, 70, 13], [66, 78, 14], [58, 64, 11]].forEach(([x, y, r]) => { p += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff" opacity=".5"/>`; });
    return svg(p);
}
function rockArt(c, d) { return svg(`<path d="M10 100 L18 54 L40 40 L66 46 L88 64 L92 100 Z" fill="${c}"/><path d="M18 54 L40 40 L46 70 Z" fill="${d}" opacity=".5"/><path d="M66 46 L88 64 L60 72 Z" fill="${d}" opacity=".35"/>`); }
function rockPileArt(c, d) { return svg(`<path d="M6 100 L14 70 L34 58 L52 70 L48 100 Z" fill="${c}"/><path d="M46 100 L54 60 L74 48 L94 66 L92 100 Z" fill="${d}"/>`); }
function driftwoodArt(c, d) { return svg(`<path d="M20 100 Q34 70 30 44 Q28 28 44 18" stroke="${c}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M32 56 Q52 50 70 30" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M30 70 Q50 72 78 60" stroke="${d}" stroke-width="7" fill="none" stroke-linecap="round"/>`); }
function spiderwoodArt(c, d) {
    let p = `<path d="M50 100 L50 60" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`;
    [[50, 60, 18, 30], [50, 60, 84, 26], [50, 68, 30, 14], [50, 64, 70, 40]].forEach(([x, y, tx, ty]) => { p += `<path d="M${x} ${y} Q${(x + tx) / 2} ${y - 10} ${tx} ${ty}" stroke="${tx % 2 ? d : c}" stroke-width="5" fill="none" stroke-linecap="round"/>`; });
    return svg(p);
}
function liveRockArt(c, d) {
    let p = `<path d="M12 100 L16 50 L44 36 L74 44 L90 70 L90 100 Z" fill="${c}"/>`;
    for (let i = 0; i < 14; i++) { const x = 20 + (i * 37 % 60), y = 50 + (i * 53 % 44); p += `<circle cx="${x}" cy="${y}" r="2.6" fill="${d}" opacity=".5"/>`; }
    return svg(p);
}
function sandMoundArt(c, d) { return svg(`<path d="M0 100 Q50 70 100 100 Z" fill="${c}"/><path d="M0 100 Q50 78 100 100" stroke="${d}" stroke-width="2" fill="none" opacity=".4"/>`); }
function fishArt(o) {
    o = o || {};
    const body = o.body || '#e8943a', fin = o.fin || body, tall = o.tall || 1, long = o.long || 1;
    const bx = 50, by = 50, rx = 34 * long, ry = 20 * tall;
    let p = `<path d="M${bx + rx - 6} ${by} L${bx + rx + 16} ${by - 16 * tall} L${bx + rx + 14} ${by + 16 * tall} Z" fill="${fin}"/>`;
    if (o.flow) p += `<path d="M${bx} ${by + ry} Q${bx - 4} ${by + ry + 22} ${bx + 18} ${by + ry + 4} Z" fill="${fin}" opacity=".9"/>`;
    p += `<ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="${body}"/>`;
    (o.stripes || []).forEach(s => { p += `<path d="M${bx + s.x} ${by - ry * s.h} Q${bx + s.x} ${by} ${bx + s.x} ${by + ry * s.h}" stroke="${s.c}" stroke-width="${s.w || 6}" fill="none"/>`; });
    if (o.lateral) p += `<rect x="${bx - rx}" y="${by - 2}" width="${rx * 1.6}" height="3" fill="${o.lateral}" rx="1.5"/>`;
    p += `<circle cx="${bx - rx + 8}" cy="${by - 3}" r="3.6" fill="#fff"/><circle cx="${bx - rx + 7}" cy="${by - 3}" r="2" fill="#111"/>`;
    return svg(p);
}
function shrimpArt(c, d) { return svg(`<path d="M70 60 Q40 50 24 64 Q16 70 22 78 Q40 84 64 76 Q78 70 78 60 Q78 52 70 56 Z" fill="${c}"/><circle cx="70" cy="58" r="2.4" fill="#111"/><path d="M30 76 l3 8 M40 78 l3 8 M50 78 l3 8" stroke="${d}" stroke-width="2"/>`); }
function snailArt(c, d) { return svg(`<path d="M30 86 Q24 86 24 80 L70 80 Q74 80 74 86 Z" fill="${d}"/><circle cx="56" cy="64" r="22" fill="${c}"/><circle cx="24" cy="62" r="2.5" fill="#111"/>`); }
function crabArt(c, d) { return svg(`<ellipse cx="50" cy="64" rx="24" ry="16" fill="${c}"/><path d="M30 60 Q16 56 12 46" stroke="${d}" stroke-width="4" fill="none"/><path d="M70 60 Q84 56 88 46" stroke="${d}" stroke-width="4" fill="none"/><circle cx="42" cy="56" r="3" fill="#111"/><circle cx="58" cy="56" r="3" fill="#111"/>`); }
function starArt(c, d) {
    let pts = '';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 - 1.57, r = i % 2 ? 12 : 32; pts += `${(50 + Math.cos(a) * r).toFixed(1)},${(56 + Math.sin(a) * r).toFixed(1)} `; }
    return svg(`<polygon points="${pts}" fill="${c}"/><circle cx="50" cy="56" r="4" fill="${d}"/>`);
}
function gearArt(label, body) { return svg(`<rect x="30" y="14" width="40" height="74" rx="8" fill="${body || '#566'}"/><text x="50" y="55" font-size="9" fill="#dfe" text-anchor="middle" font-family="sans-serif">${label}</text>`); }

/* =========================================================================
   PART B — 3D model builders
   Models are built in centimetres, with the base sitting at local y = 0,
   facing +Z where orientation matters (fish).
   ========================================================================= */
const animated = []; // {update(t)}

function mat(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.02 }, o || {})); }
function seat(group) { // drop so the lowest point rests on y=0
    const box = new THREE.Box3().setFromObject(group);
    group.position.y -= box.min.y;
    const wrap = new THREE.Group(); wrap.add(group); return wrap;
}
function noise(x, y, z) { return Math.sin(x * 1.7 + y * 0.6) * 0.5 + Math.sin(y * 2.1 + z * 1.1) * 0.3 + Math.sin(z * 1.6 + x * 0.9) * 0.2; }

function rock3(color, size, rough) {
    const g = new THREE.IcosahedronGeometry(size * 0.5, 2);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = noise(v.x * 0.4, v.y * 0.4, v.z * 0.4) * (rough || 0.28);
        v.multiplyScalar(1 + n); v.y *= 0.82;
        p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color, { roughness: 0.95, flatShading: true }));
    m.castShadow = true; m.receiveShadow = true;
    return seat(m);
}
function rockPile3(color, size) {
    const grp = new THREE.Group();
    [[0, 0, size, 0], [size * 0.4, 0, size * 0.7, size * 0.3], [-size * 0.35, 0, size * 0.6, -size * 0.25]].forEach(([x, , s, z]) => {
        const r = rock3(color, s); r.position.set(x, 0, z || 0); grp.add(r);
    });
    return grp;
}
function leaf(h, w, color, curve, rough) {
    const seg = 6, g = new THREE.PlaneGeometry(w, h, 1, seg), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), t = (y + h / 2) / h;
        p.setX(i, p.getX(i) * (1 - t * 0.75));
        p.setZ(i, Math.sin(t * 1.57) * (curve || 0));
        p.setY(i, t * h);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide, roughness: rough ?? 0.65 }));
    m.castShadow = true;
    return m;
}
function plant3(color, dark, opt) {
    opt = opt || {};
    const grp = new THREE.Group();
    const pivot = new THREE.Group(); grp.add(pivot); // sways independently of user rotation
    const n = opt.blades || 9, H = opt.h || 18, W = opt.w || 3.4;
    for (let i = 0; i < n; i++) {
        const l = leaf(H * (0.7 + (i % 3) * 0.18), W, i % 2 ? dark : color, opt.curve ?? 5);
        l.rotation.y = (i / n) * Math.PI * 2;
        l.rotation.x = (opt.spread ?? 0.4) * (0.5 + (i % 2));
        l.position.y = 0.2;
        pivot.add(l);
    }
    const ph = Math.random() * 6.28;
    grp.userData.update = t => { pivot.rotation.z = Math.sin(t * 1.2 + ph) * (opt.sway ?? 0.05); pivot.rotation.x = Math.cos(t * 0.9 + ph) * (opt.sway ?? 0.05) * 0.7; };
    return grp;
}
function carpet3(color, dark) {
    const grp = new THREE.Group();
    for (let i = 0; i < 60; i++) {
        const l = leaf(3 + Math.random() * 2.5, 1.1, i % 2 ? dark : color, 0.6);
        l.position.set((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 14);
        l.rotation.y = Math.random() * 6.28; l.rotation.x = 0.2;
        grp.add(l);
    }
    return grp;
}
function mossBall3(color, dark) {
    const g = new THREE.IcosahedronGeometry(4.5, 2), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + noise(v.x, v.y, v.z) * 0.12); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color, { roughness: 1, flatShading: true })); m.castShadow = true;
    return seat(m);
}
function branchTo(grp, from, dir, len, rad, depth, color) {
    if (depth <= 0 || len < 1) return;
    const to = from.clone().addScaledVector(dir, len);
    const mid = from.clone().lerp(to, 0.5);
    const geo = new THREE.CylinderGeometry(rad * 0.7, rad, len, 6);
    const m = new THREE.Mesh(geo, mat(color, { roughness: 0.6 }));
    m.position.copy(mid);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.castShadow = true; grp.add(m);
    const nb = 2 + (depth > 1 ? 1 : 0);
    for (let i = 0; i < nb; i++) {
        const nd = dir.clone();
        nd.x += (Math.random() - 0.5) * 1.1; nd.z += (Math.random() - 0.5) * 1.1; nd.y += 0.3;
        branchTo(grp, to, nd.normalize(), len * 0.72, rad * 0.7, depth - 1, color);
    }
}
function coralBranch3(color, dark, size) {
    const grp = new THREE.Group();
    const pivot = new THREE.Group(); grp.add(pivot); // sways independently of user rotation
    branchTo(pivot, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), size * 0.5, size * 0.09, 3, color);
    pivot.traverse(o => { if (o.material) { o.material.emissive = new THREE.Color(color).multiplyScalar(0.18); } });
    const ph = Math.random() * 6.28;
    grp.userData.update = t => { pivot.rotation.z = Math.sin(t * 0.8 + ph) * 0.02; };
    return grp;
}
function coralBlob3(color, dark, size, folds) {
    const g = new THREE.SphereGeometry(size * 0.5, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const f = Math.sin(v.x * (folds || 1.4)) * Math.cos(v.z * (folds || 1.4)) * size * 0.06; v.multiplyScalar(1 + f / size); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color, { roughness: 0.5, emissive: new THREE.Color(color).multiplyScalar(0.12) })); m.castShadow = true;
    return seat(m);
}
function table3(color, dark, size) {
    const grp = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.06, size * 0.09, size * 0.4, 8), mat(dark));
    stalk.position.y = size * 0.2; grp.add(stalk);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.5, size * 0.5, size * 0.06, 24), mat(color, { emissive: new THREE.Color(color).multiplyScalar(0.12) }));
    top.position.y = size * 0.42; top.castShadow = true; grp.add(top);
    return seat(grp);
}
function polyps3(color, dark, size) {
    const grp = new THREE.Group();
    for (let i = 0; i < 16; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(size * 0.09, 10, 8), mat(color, { emissive: new THREE.Color(color).multiplyScalar(0.3) }));
        s.position.set((Math.random() - 0.5) * size * 0.8, size * 0.06, (Math.random() - 0.5) * size * 0.8);
        s.scale.y = 0.6; grp.add(s);
        const c = new THREE.Mesh(new THREE.SphereGeometry(size * 0.04, 8, 6), mat(dark));
        c.position.copy(s.position); c.position.y += size * 0.03; grp.add(c);
    }
    return grp;
}
function anemone3(color, dark, size) {
    const grp = new THREE.Group();
    const foot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.28, 16, 10), mat(dark)); foot.scale.y = 0.5; foot.position.y = size * 0.1; grp.add(foot);
    const tentacles = [];
    for (let i = 0; i < 26; i++) {
        const a = Math.random() * 6.28, r = Math.random() * size * 0.26;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.012, size * 0.03, size * 0.4, 5), mat(color, { emissive: new THREE.Color(color).multiplyScalar(0.25) }));
        t.position.set(Math.cos(a) * r, size * 0.28, Math.sin(a) * r);
        t.userData.bx = t.position.x; t.userData.bz = t.position.z; t.userData.ph = Math.random() * 6.28;
        grp.add(t); tentacles.push(t);
    }
    grp.userData.update = time => tentacles.forEach(t => {
        t.rotation.x = Math.sin(time * 2 + t.userData.ph) * 0.3;
        t.rotation.z = Math.cos(time * 1.7 + t.userData.ph) * 0.3;
    });
    return grp;
}
function bubbleColumn(grp, x, y, z, h, n, r) {
    const balls = [];
    for (let i = 0; i < (n || 10); i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(r || 0.4, 8, 6), new THREE.MeshStandardMaterial({ color: 0xeaffff, transparent: true, opacity: 0.5, roughness: 0.1 }));
        b.position.set(x + (Math.random() - 0.5) * 1.5, y + Math.random() * h, z + (Math.random() - 0.5) * 1.5);
        b.userData.sp = 6 + Math.random() * 6; grp.add(b); balls.push(b);
    }
    grp.userData.update = (t, dt) => balls.forEach(b => {
        b.position.y += b.userData.sp * (dt || 0.016);
        if (b.position.y > y + h) { b.position.y = y; b.position.x = x + (Math.random() - 0.5) * 1.5; }
    });
}

// --- Fish (faces +Z) ---
function fish3(o) {
    o = o || {};
    const grp = new THREE.Group();
    const len = o.len || 9, tall = o.tall || 1;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat(o.body, { roughness: 0.4, metalness: 0.05 }));
    body.scale.set(len * 0.2, len * 0.26 * tall, len * 0.5); body.castShadow = true; grp.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat(o.belly || 0xf4f4f0, { roughness: 0.5 }));
    belly.scale.set(len * 0.19, len * 0.18 * tall, len * 0.46); belly.position.y = -len * 0.07; grp.add(belly);
    // tail
    const tailPivot = new THREE.Group(); tailPivot.position.z = -len * 0.45; grp.add(tailPivot);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(len * 0.24 * tall, len * 0.34, 4), mat(o.fin || o.body, { side: THREE.DoubleSide, roughness: 0.5 }));
    tail.rotation.x = -Math.PI / 2; tail.scale.x = 0.15; tail.position.z = -len * 0.15; tailPivot.add(tail);
    // dorsal
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(len * 0.12, len * 0.3, 4), mat(o.fin || o.body, { side: THREE.DoubleSide }));
    dorsal.rotation.x = Math.PI; dorsal.scale.z = 0.1; dorsal.position.set(0, len * 0.22 * tall, 0); grp.add(dorsal);
    // bands
    (o.bands || []).forEach(b => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 8, 20), mat(b.c, { roughness: 0.5 }));
        ring.scale.set(len * 0.21, len * 0.27 * tall, 1); ring.position.z = b.z * len; grp.add(ring);
    });
    // eyes
    [-1, 1].forEach(s => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(len * 0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }));
        e.position.set(s * len * 0.13, len * 0.04, len * 0.34); grp.add(e);
    });
    grp.scale.setScalar(1);
    const sp = 0.35 + Math.random() * 0.4, ph = Math.random() * 6.28, rx = len + 5, rz = len + 6;
    const tmp = new THREE.Vector3();
    grp.userData.swim = true;
    const half = len * 0.55;
    grp.userData.update = t => {
        const home = grp.userData.home || grp.position;
        const a = t * sp + ph;
        let x = home.x + Math.cos(a) * rx, z = home.z + Math.sin(a) * rz, y = home.y + Math.sin(a * 0.8) * len * 0.25;
        let tx = home.x + Math.cos(a + 0.06) * rx, tz = home.z + Math.sin(a + 0.06) * rz;
        if (interior.ready) { // keep the whole fish inside the glass at all times
            const minX = interior.minX + half, maxX = interior.maxX - half;
            const minZ = interior.minZ + half, maxZ = interior.maxZ - half;
            x = Math.min(maxX, Math.max(minX, x)); z = Math.min(maxZ, Math.max(minZ, z));
            tx = Math.min(maxX, Math.max(minX, tx)); tz = Math.min(maxZ, Math.max(minZ, tz));
            y = Math.min(interior.waterTop - half * 0.7, Math.max(groundY(x, z) + half, y));
        }
        grp.position.set(x, y, z);
        tmp.set(tx, y, tz);
        grp.lookAt(tmp);
        tailPivot.rotation.y = Math.sin(t * 9 + ph) * 0.5;
    };
    return grp;
}
function shrimp3(color, dark) {
    const grp = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(color, { roughness: 0.4 }));
    b.scale.set(1.2, 1.4, 3); b.rotation.x = 0.3; grp.add(b);
    const ph = Math.random() * 6.28;
    grp.userData.update = t => { grp.position.y = (grp.userData.home ? grp.userData.home.y : 0) + Math.sin(t * 2 + ph) * 0.6; };
    return grp;
}
function snail3(color, dark) {
    const grp = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.TorusKnotGeometry(1.4, 0.7, 60, 8, 2, 3), mat(color, { roughness: 0.4 }));
    shell.scale.setScalar(1); shell.position.y = 1.6; grp.add(shell);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 3, 4, 8), mat(dark, { roughness: 0.6 })); foot.rotation.z = Math.PI / 2; foot.position.y = 0.6; grp.add(foot);
    return grp;
}
function crab3(color, dark) {
    const grp = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.SphereGeometry(2, 14, 10), mat(color, { roughness: 0.5 })); sh.scale.set(1.4, 0.7, 1); sh.position.y = 1.4; grp.add(sh);
    [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(color)); c.scale.set(1.4, 0.6, 0.8); c.position.set(s * 3.2, 1, 1.4); grp.add(c); });
    return grp;
}
function star3(color, dark) {
    const grp = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const arm = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 6), mat(color, { roughness: 0.6 }));
        arm.rotation.x = Math.PI / 2; arm.position.y = 0.8;
        const a = (i / 5) * Math.PI * 2; arm.position.x = Math.cos(a) * 3; arm.position.z = Math.sin(a) * 3; arm.rotation.z = -a;
        arm.scale.y = 0.4; grp.add(arm);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), mat(color)); core.scale.y = 0.4; core.position.y = 0.8; grp.add(core);
    return grp;
}

// --- Equipment ---
function glassMat(tint) {
    return new THREE.MeshPhysicalMaterial({
        color: tint || 0xeaf7fc, transmission: 1.0, thickness: 3.2,
        roughness: 0.015, metalness: 0, ior: 1.5, transparent: true, opacity: 1,
        clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 0.5,
        envMapIntensity: 1.5, attenuationColor: new THREE.Color(0x8fd4e6), attenuationDistance: 480
    });
}
function heater3() {
    const grp = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 22, 16), glassMat()); tube.position.y = 11; grp.add(tube);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 16, 8), new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xcc3010, emissiveIntensity: 0.6 })); coil.position.y = 9; grp.add(coil);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 16), mat(0xcfd8dd, { metalness: 0.3, roughness: 0.4 })); cap.position.y = 22; grp.add(cap);
    return grp;
}
function thermo3() {
    const grp = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 14, 12), glassMat()); t.position.y = 7; grp.add(t);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe0552a })); m.position.y = 5; grp.add(m);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0552a })); bulb.position.y = 1; grp.add(bulb);
    return grp;
}
function filterBox3() {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 6), mat(0x33383e, { roughness: 0.5 })); box.position.y = 6; grp.add(box);
    const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 12, 10), mat(0x44494f)); intake.position.set(-6, -1, 0); grp.add(intake);
    grp.userData.equipTop = true; return grp;
}
function spray3() {
    const grp = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 20, 10), mat(0x55595f)); bar.rotation.z = Math.PI / 2; grp.add(bar);
    grp.userData.equipTop = true; return grp;
}
function led3() {
    const grp = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(40, 2.4, 6), mat(0x26292e, { metalness: 0.4, roughness: 0.4 })); grp.add(bar);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(38, 0.6, 5), new THREE.MeshStandardMaterial({ color: 0xcdeaff, emissive: 0xbfe6ff, emissiveIntensity: 1.2 })); panel.position.y = -1.4; grp.add(panel);
    const light = new THREE.PointLight(0xcfeaff, 80, 120, 2); light.position.y = -4; grp.add(light);
    grp.userData.equipTop = true; return grp;
}
function airstone3() {
    const grp = new THREE.Group();
    const s = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 2), mat(0x888d93)); s.position.y = 0.8; grp.add(s);
    bubbleColumn(grp, 0, 1.6, 0, 30, 14, 0.35);
    return grp;
}
function co2_3() {
    const grp = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 2.6, 16), glassMat()); cup.position.y = 4; grp.add(cup);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 8), mat(0xb9c7cf)); stem.position.y = 1.5; grp.add(stem);
    bubbleColumn(grp, 0, 5, 0, 24, 12, 0.25);
    return grp;
}
function powerhead3() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 5), mat(0x32373d, { roughness: 0.5 })); body.position.y = 3; grp.add(body);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 12), mat(0x44494f)); nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, 3, 3); grp.add(nozzle);
    return grp;
}
function skimmer3() {
    const grp = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 26, 18), glassMat()); cyl.position.y = 13; grp.add(cyl);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3, 5, 18), mat(0xc8d2d8, { roughness: 0.4 })); cup.position.y = 27; grp.add(cup);
    bubbleColumn(grp, 0, 2, 0, 22, 18, 0.3);
    return grp;
}

// --- Decor ---
function amphora3(color) {
    const pts = [];
    [[0, 0], [2.2, 0.4], [3, 2], [2.2, 5], [3.2, 8], [3.4, 11], [2.4, 13.5], [1.6, 14.5], [1.8, 16], [2.4, 16.8], [1.6, 17.2], [0.6, 16.8]].forEach(([x, y]) => pts.push(new THREE.Vector2(x, y)));
    const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0.1, p.x), p.y)), 18);
    const m = new THREE.Mesh(g, mat(color || 0xb98a55, { roughness: 0.8 })); m.castShadow = true;
    const grp = new THREE.Group(); grp.add(m); grp.rotation.z = 0.35; return seat(grp);
}
function chest3() {
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 6), mat(0x6b4a2a, { roughness: 0.7 })); base.position.y = 2.5; grp.add(base);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 16, 1, false, 0, Math.PI), mat(0x7a5630)); lid.rotation.z = Math.PI / 2; lid.position.y = 5; grp.add(lid);
    const gold = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2c542, metalness: 0.7, roughness: 0.3, emissive: 0x4a3a00 })); gold.scale.y = 0.4; gold.position.y = 5.4; grp.add(gold);
    grp.traverse(o => o.castShadow = true); return grp;
}
function castle3() {
    const grp = new THREE.Group();
    const c = mat(0x9a9488, { roughness: 0.9 });
    const keep = new THREE.Mesh(new THREE.BoxGeometry(10, 14, 10), c); keep.position.y = 7; grp.add(keep);
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([x, z]) => {
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 18, 10), c); tw.position.set(x, 9, z); grp.add(tw);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 4, 10), mat(0x7a5630)); roof.position.set(x, 20, z); grp.add(roof);
    });
    grp.traverse(o => o.castShadow = true); return grp;
}
function shipwreck3() {
    const grp = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(5, 3.5, 22, 12, 1, false, 0, Math.PI), mat(0x5a4126, { roughness: 0.85, side: THREE.DoubleSide }));
    hull.rotation.z = Math.PI / 2; hull.rotation.x = Math.PI; hull.position.y = 4; grp.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 18, 8), mat(0x6b4a2a)); mast.position.set(2, 9, 0); mast.rotation.z = 0.4; grp.add(mast);
    grp.rotation.z = 0.12; grp.traverse(o => o.castShadow = true); return grp;
}
function shell3(color) {
    const g = new THREE.SphereGeometry(4, 18, 12, 0, Math.PI), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const r = 1 + Math.sin(Math.atan2(v.z, v.x) * 9) * 0.08; v.x *= r; v.z *= r; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(color || 0xe8d8c0, { roughness: 0.5, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.castShadow = true;
    const grp = new THREE.Group(); grp.add(m); return seat(grp);
}
function anchor3() {
    const grp = new THREE.Group(); const m = mat(0x55606a, { metalness: 0.5, roughness: 0.5 });
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 14, 10), m); shank.position.y = 7; grp.add(shank);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.5, 8, 16), m); ring.position.y = 14.5; grp.add(ring);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(5, 0.7, 8, 16, Math.PI), m); arc.position.y = 2; arc.rotation.z = Math.PI; grp.add(arc);
    grp.traverse(o => o.castShadow = true); return grp;
}

/* =========================================================================
   PART C — Item library
   ========================================================================= */
const ITEMS = [
    // Hardscape
    { id: 'seiryu', name: 'Seiryu Stone', cat: 'hardscape', mode: 'fresh', anchor: 'floor', w: 150, art: () => rockArt('#7d8a93', '#566169'), base: 16, make: () => rock3(0x7d8a93, 16) },
    { id: 'dragonstone', name: 'Dragon Stone', cat: 'hardscape', mode: 'fresh', anchor: 'floor', w: 150, art: () => rockArt('#c2a36b', '#8a7038'), base: 16, make: () => rock3(0xc2a36b, 16) },
    { id: 'lavarock', name: 'Lava Rock', cat: 'hardscape', mode: 'both', anchor: 'floor', w: 130, art: () => rockPileArt('#4a3a3a', '#2e2424'), base: 14, make: () => rockPile3(0x4a3a3a, 12) },
    { id: 'rockpile', name: 'Stone Pile', cat: 'hardscape', mode: 'both', anchor: 'floor', w: 160, art: () => rockPileArt('#808a8f', '#5a646a'), base: 16, make: () => rockPile3(0x808a8f, 14) },
    { id: 'driftwood', name: 'Driftwood', cat: 'hardscape', mode: 'fresh', anchor: 'floor', w: 160, art: () => driftwoodArt('#7a5230', '#553820'), base: 22, make: () => coralBranch3(0x7a5230, 0x553820, 24) },
    { id: 'spiderwood', name: 'Spider Wood', cat: 'hardscape', mode: 'fresh', anchor: 'floor', w: 170, art: () => spiderwoodArt('#8a6038', '#5e3f22'), base: 22, make: () => coralBranch3(0x8a6038, 0x5e3f22, 22) },
    { id: 'liverock', name: 'Live Rock', cat: 'hardscape', mode: 'salt', anchor: 'floor', w: 160, art: () => liveRockArt('#c9b48f', '#9a8460'), base: 18, make: () => rockPile3(0xc9b48f, 15) },
    { id: 'sandmound', name: 'Sand Mound', cat: 'hardscape', mode: 'both', anchor: 'floor', w: 200, art: () => sandMoundArt('#e3d4a8', '#c7b483'), base: 10, make: () => { const m = rock3(0xe3d4a8, 22, 0.12); m.scale.set(1, 0.4, 1); return m; } },

    // Freshwater plants
    { id: 'anubias', name: 'Anubias', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 110, art: () => bushPlant('#2f7d3e', '#1d5a2a'), base: 14, make: () => plant3(0x2f7d3e, 0x1d5a2a, { h: 13, w: 5, blades: 7, spread: 0.7, sway: 0.06 }) },
    { id: 'javafern', name: 'Java Fern', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 120, art: () => fernPlant('#367a3a', '#235024'), base: 18, make: () => plant3(0x367a3a, 0x235024, { h: 20, w: 3, blades: 9, spread: 0.3 }) },
    { id: 'amazonsword', name: 'Amazon Sword', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 130, art: () => swordPlant('#3a8a45', '#256b30'), base: 22, make: () => plant3(0x3a8a45, 0x256b30, { h: 24, w: 4.5, blades: 9, spread: 0.4 }) },
    { id: 'vallis', name: 'Vallisneria', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 120, art: () => vallisPlant('#3f9a4e', '#2a6e36'), base: 28, make: () => plant3(0x3f9a4e, 0x2a6e36, { h: 30, w: 2.6, blades: 8, spread: 0.12, curve: 2 }) },
    { id: 'ludwigia', name: 'Ludwigia (Red)', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 120, art: () => stemPlant('#b6452f', '#7d2b1c'), base: 18, make: () => plant3(0xb6452f, 0x7d2b1c, { h: 18, w: 3.4, blades: 10, spread: 0.5 }) },
    { id: 'rotala', name: 'Rotala', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 120, art: () => stemPlant('#5aa64a', '#3a7a30'), base: 18, make: () => plant3(0x5aa64a, 0x3a7a30, { h: 18, w: 3, blades: 10, spread: 0.45 }) },
    { id: 'carpet', name: 'Carpet (HC)', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 150, art: () => carpetPlant('#4caa52', '#2f7a38'), base: 5, make: () => carpet3(0x4caa52, 0x2f7a38) },
    { id: 'crypt', name: 'Cryptocoryne', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 110, art: () => bushPlant('#7a5a3a', '#553d26'), base: 14, make: () => plant3(0x7a5a3a, 0x553d26, { h: 14, w: 4, blades: 8, spread: 0.5 }) },
    { id: 'mossball', name: 'Marimo Moss Ball', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 80, art: () => mossBall('#3f8a3a', '#2a6526'), base: 9, make: () => mossBall3(0x3f8a3a, 0x2a6526) },
    { id: 'bucephalandra', name: 'Bucephalandra', cat: 'plants', mode: 'fresh', anchor: 'floor', w: 90, art: () => bushPlant('#2b6b6b', '#194a4a'), base: 10, make: () => plant3(0x2b6b6b, 0x194a4a, { h: 10, w: 4, blades: 8, spread: 0.7 }) },

    // Saltwater corals
    { id: 'acropora', name: 'Acropora (SPS)', cat: 'corals', mode: 'salt', anchor: 'floor', w: 120, art: () => branchCoral('#a86bd8', '#6e3f9a'), base: 14, make: () => coralBranch3(0xa86bd8, 0x6e3f9a, 15) },
    { id: 'staghorn', name: 'Staghorn Coral', cat: 'corals', mode: 'salt', anchor: 'floor', w: 130, art: () => branchCoral('#e0a23a', '#a87020'), base: 16, make: () => coralBranch3(0xe0a23a, 0xa87020, 17) },
    { id: 'brain', name: 'Brain Coral', cat: 'corals', mode: 'salt', anchor: 'floor', w: 110, art: () => brainCoral('#3fae8a', '#247a5d'), base: 12, make: () => coralBlob3(0x3fae8a, 0x247a5d, 13, 1.8) },
    { id: 'table', name: 'Table Coral', cat: 'corals', mode: 'salt', anchor: 'floor', w: 140, art: () => tableCoral('#d98a4a', '#a86230'), base: 16, make: () => table3(0xd98a4a, 0xa86230, 16) },
    { id: 'mushroom', name: 'Mushroom Coral', cat: 'corals', mode: 'salt', anchor: 'floor', w: 110, art: () => mushroomCoral('#cf4a6a', '#9a2f49'), base: 11, make: () => coralBlob3(0xcf4a6a, 0x9a2f49, 12, 1.2) },
    { id: 'zoa', name: 'Zoanthids', cat: 'corals', mode: 'salt', anchor: 'floor', w: 110, art: () => zoaPolyps('#46c66e', '#2a8a47'), base: 9, make: () => polyps3(0x46c66e, 0x1d5a30, 11) },
    { id: 'zoa2', name: 'Rainbow Zoas', cat: 'corals', mode: 'salt', anchor: 'floor', w: 110, art: () => zoaPolyps('#e0b13a', '#b5651a'), base: 9, make: () => polyps3(0xe0b13a, 0x8a3a10, 11) },
    { id: 'bubblecoral', name: 'Bubble Coral', cat: 'corals', mode: 'salt', anchor: 'floor', w: 110, art: () => bubbleCoral('#d9c7a0', '#b39e72'), base: 11, make: () => coralBlob3(0xd9c7a0, 0xb39e72, 12, 0.9) },
    { id: 'anemone', name: 'Sea Anemone', cat: 'corals', mode: 'salt', anchor: 'floor', w: 120, art: () => anemoneArt('#d98ab0', '#a8527d'), base: 12, make: () => anemone3(0xd98ab0, 0xa8527d, 13) },
    { id: 'greenanemone', name: 'GBTA Anemone', cat: 'corals', mode: 'salt', anchor: 'floor', w: 120, art: () => anemoneArt('#4cc46a', '#2a8a47'), base: 12, make: () => anemone3(0x4cc46a, 0x2a8a47, 13) },

    // Freshwater livestock
    { id: 'neon', name: 'Neon Tetra', cat: 'fish', mode: 'fresh', anchor: 'float', w: 70, bioload: 1, art: () => fishArt({ body: '#9fb6c4', long: 1, tall: 0.7, lateral: '#2aa0d8', stripes: [{ x: 0, h: 0.5, c: '#d83a3a', w: 5 }] }), make: () => fish3({ len: 6, body: 0x2aa0d8, belly: 0xd83a3a, fin: 0x9fc4d4, tall: 0.8 }) },
    { id: 'cardinal', name: 'Cardinal Tetra', cat: 'fish', mode: 'fresh', anchor: 'float', w: 70, bioload: 1, art: () => fishArt({ body: '#9fb6c4', long: 1, tall: 0.7, lateral: '#1f8fd8', stripes: [{ x: -2, h: 0.7, c: '#d22', w: 8 }] }), make: () => fish3({ len: 6.5, body: 0x1f8fd8, belly: 0xd22222, fin: 0x9fc4d4, tall: 0.8 }) },
    { id: 'guppy', name: 'Guppy', cat: 'fish', mode: 'fresh', anchor: 'float', w: 70, bioload: 1, art: () => fishArt({ body: '#e0913a', fin: '#d8553a', flow: true }), make: () => fish3({ len: 5.5, body: 0xe0913a, fin: 0xd8553a, belly: 0xf0c060, tall: 0.85 }) },
    { id: 'betta', name: 'Betta', cat: 'fish', mode: 'fresh', anchor: 'float', w: 95, bioload: 2, art: () => fishArt({ body: '#c23a52', fin: '#8a2440', tall: 1, flow: true }), make: () => fish3({ len: 8, body: 0xc23a52, fin: 0x8a2440, belly: 0xc23a52, tall: 1.1 }) },
    { id: 'angelfish', name: 'Angelfish', cat: 'fish', mode: 'fresh', anchor: 'float', w: 100, bioload: 4, art: () => fishArt({ body: '#d6d2c4', tall: 1.7, stripes: [{ x: -8, h: 1, c: '#3a3a3a', w: 5 }, { x: 8, h: 1, c: '#3a3a3a', w: 5 }] }), make: () => fish3({ len: 10, body: 0xd6d2c4, fin: 0xc8c4b4, belly: 0xe6e2d4, tall: 1.7, bands: [{ z: 0.1, c: 0x3a3a3a }, { z: -0.15, c: 0x3a3a3a }] }) },
    { id: 'discus', name: 'Discus', cat: 'fish', mode: 'fresh', anchor: 'float', w: 100, bioload: 6, art: () => fishArt({ body: '#d96a2a', lateral: '#2a6ed8', tall: 1.6 }), make: () => fish3({ len: 11, body: 0xd96a2a, fin: 0xb5481a, belly: 0xe89a4a, tall: 1.7 }) },
    { id: 'goldfish', name: 'Goldfish', cat: 'fish', mode: 'fresh', anchor: 'float', w: 90, bioload: 8, art: () => fishArt({ body: '#e8852a', fin: '#e8a24a', flow: true }), make: () => fish3({ len: 10, body: 0xe8852a, fin: 0xf0a850, belly: 0xf4b060, tall: 1.1 }) },
    { id: 'molly', name: 'Black Molly', cat: 'fish', mode: 'fresh', anchor: 'float', w: 80, bioload: 2, art: () => fishArt({ body: '#2b2b30', fin: '#3a3a40' }), make: () => fish3({ len: 7, body: 0x2b2b30, fin: 0x3a3a40, belly: 0x303036, tall: 0.95 }) },
    { id: 'danio', name: 'Zebra Danio', cat: 'fish', mode: 'fresh', anchor: 'float', w: 70, bioload: 1, art: () => fishArt({ body: '#c7cdd2', stripes: [{ x: -10, h: 0.9, c: '#3a5a8a', w: 3 }, { x: 0, h: 0.9, c: '#3a5a8a', w: 3 }, { x: 10, h: 0.9, c: '#3a5a8a', w: 3 }] }), make: () => fish3({ len: 5.5, body: 0xc7cdd2, fin: 0x9aa6b0, belly: 0xdfe4e8, tall: 0.75, bands: [{ z: 0.15, c: 0x3a5a8a }, { z: -0.05, c: 0x3a5a8a }, { z: -0.25, c: 0x3a5a8a }] }) },
    { id: 'gourami', name: 'Gourami', cat: 'fish', mode: 'fresh', anchor: 'float', w: 90, bioload: 3, art: () => fishArt({ body: '#3a7ec4', tall: 1.2 }), make: () => fish3({ len: 9, body: 0x3a7ec4, fin: 0x2a5e9a, belly: 0x6aa0d4, tall: 1.2 }) },
    { id: 'pleco', name: 'Pleco', cat: 'fish', mode: 'fresh', anchor: 'floor', w: 110, bioload: 8, art: () => fishArt({ body: '#5a4a38', fin: '#3e3326', long: 1.2, tall: 0.8 }), make: () => { const f = fish3({ len: 12, body: 0x5a4a38, fin: 0x3e3326, belly: 0x4a3e2e, tall: 0.7 }); f.userData.update = null; return f; } },
    { id: 'cory', name: 'Corydoras', cat: 'fish', mode: 'fresh', anchor: 'floor', w: 75, bioload: 1, art: () => fishArt({ body: '#c2b89a', fin: '#9a8e70' }), make: () => { const f = fish3({ len: 6, body: 0xc2b89a, fin: 0x9a8e70, belly: 0xd8d0b8, tall: 0.9 }); f.userData.update = null; return f; } },
    { id: 'shrimp', name: 'Cherry Shrimp', cat: 'fish', mode: 'fresh', anchor: 'floor', w: 50, bioload: 0.2, art: () => shrimpArt('#d33a3a', '#8a2020'), make: () => shrimp3(0xd33a3a, 0x8a2020) },
    { id: 'nerite', name: 'Nerite Snail', cat: 'fish', mode: 'both', anchor: 'floor', w: 45, bioload: 0.2, art: () => snailArt('#c0922a', '#6e521a'), make: () => snail3(0xc0922a, 0x6e521a) },

    // Saltwater livestock
    { id: 'clownfish', name: 'Clownfish', cat: 'fish', mode: 'salt', anchor: 'float', w: 75, bioload: 2, art: () => fishArt({ body: '#e87722', stripes: [{ x: -10, h: 1, c: '#fff', w: 6 }, { x: 4, h: 1, c: '#fff', w: 7 }] }), make: () => fish3({ len: 7, body: 0xe87722, fin: 0xd8651a, belly: 0xf0913a, tall: 1, bands: [{ z: 0.2, c: 0xffffff }, { z: -0.05, c: 0xffffff }] }) },
    { id: 'bluetang', name: 'Blue Tang', cat: 'fish', mode: 'salt', anchor: 'float', w: 95, bioload: 6, art: () => fishArt({ body: '#2a6ed8', fin: '#e8c83a', tall: 1.2 }), make: () => fish3({ len: 11, body: 0x2a6ed8, fin: 0xe8c83a, belly: 0x4a8ae8, tall: 1.2 }) },
    { id: 'yellowtang', name: 'Yellow Tang', cat: 'fish', mode: 'salt', anchor: 'float', w: 90, bioload: 5, art: () => fishArt({ body: '#f1c322', fin: '#e0ad1a', tall: 1.3 }), make: () => fish3({ len: 10, body: 0xf1c322, fin: 0xe0ad1a, belly: 0xf6d452, tall: 1.3 }) },
    { id: 'gramma', name: 'Royal Gramma', cat: 'fish', mode: 'salt', anchor: 'float', w: 75, bioload: 2, art: () => fishArt({ body: '#9a4ad8', stripes: [{ x: 2, h: 1, c: '#e8c83a', w: 14 }] }), make: () => fish3({ len: 6.5, body: 0x9a4ad8, fin: 0xe8c83a, belly: 0xe8c83a, tall: 0.95, bands: [{ z: -0.05, c: 0xe8c83a }] }) },
    { id: 'mandarin', name: 'Mandarin Dragonet', cat: 'fish', mode: 'salt', anchor: 'floor', w: 80, bioload: 2, art: () => fishArt({ body: '#2a9a7a', lateral: '#e0853a' }), make: () => fish3({ len: 7, body: 0x2a9a7a, fin: 0xe0853a, belly: 0x3ab090, tall: 0.9 }) },
    { id: 'firefish', name: 'Firefish', cat: 'fish', mode: 'salt', anchor: 'float', w: 80, bioload: 1, art: () => fishArt({ body: '#f0e4d0', fin: '#d8452a', long: 1.2, stripes: [{ x: 10, h: 1, c: '#d8452a', w: 16 }] }), make: () => fish3({ len: 7, body: 0xf0e4d0, fin: 0xd8452a, belly: 0xf6ecdc, tall: 0.7, bands: [{ z: -0.2, c: 0xd8452a }] }) },
    { id: 'chromis', name: 'Green Chromis', cat: 'fish', mode: 'salt', anchor: 'float', w: 70, bioload: 1, art: () => fishArt({ body: '#5ad0c0' }), make: () => fish3({ len: 6, body: 0x5ad0c0, fin: 0x3ab0a0, belly: 0x9ae8dc, tall: 0.9 }) },
    { id: 'wrasse', name: 'Six Line Wrasse', cat: 'fish', mode: 'salt', anchor: 'float', w: 80, bioload: 2, art: () => fishArt({ body: '#d86a3a', lateral: '#2a6ed8', long: 1.2 }), make: () => fish3({ len: 8, body: 0xd86a3a, fin: 0x2a6ed8, belly: 0xe88a5a, tall: 0.7 }) },
    { id: 'cleanershrimp', name: 'Cleaner Shrimp', cat: 'fish', mode: 'salt', anchor: 'floor', w: 55, bioload: 0.3, art: () => shrimpArt('#d33a3a', '#e8c83a'), make: () => shrimp3(0xd33a3a, 0xe8c83a) },
    { id: 'hermit', name: 'Hermit Crab', cat: 'fish', mode: 'salt', anchor: 'floor', w: 55, bioload: 0.3, art: () => crabArt('#c2562a', '#8a3a1a'), make: () => crab3(0xc2562a, 0x8a3a1a) },
    { id: 'starfish', name: 'Starfish', cat: 'fish', mode: 'salt', anchor: 'floor', w: 70, bioload: 0.5, art: () => starArt('#e0853a', '#b5651a'), make: () => star3(0xe0853a, 0xb5651a) },

    // Equipment
    { id: 'heater', name: 'Heater', cat: 'equipment', mode: 'both', anchor: 'wall', w: 50, art: () => gearArt('HEAT', '#556'), make: heater3, req: 'heat' },
    { id: 'thermometer', name: 'Thermometer', cat: 'equipment', mode: 'both', anchor: 'wall', w: 36, art: () => gearArt('°C', '#566'), make: thermo3 },
    { id: 'filterbox', name: 'HOB Filter', cat: 'equipment', mode: 'both', anchor: 'rim', w: 90, art: () => gearArt('FILTER', '#3a4048'), make: filterBox3, req: 'filter' },
    { id: 'spraybar', name: 'Spray Bar', cat: 'equipment', mode: 'both', anchor: 'rim', w: 120, art: () => gearArt('SPRAY', '#55595f'), make: spray3 },
    { id: 'led', name: 'LED Light', cat: 'equipment', mode: 'both', anchor: 'rim', w: 180, art: () => gearArt('LED', '#26292e'), make: led3, req: 'light' },
    { id: 'airstone', name: 'Air Stone', cat: 'equipment', mode: 'both', anchor: 'floor', w: 50, art: () => gearArt('AIR', '#888'), make: airstone3 },
    { id: 'co2', name: 'CO₂ Diffuser', cat: 'equipment', mode: 'fresh', anchor: 'wall', w: 45, art: () => gearArt('CO₂', '#557'), make: co2_3 },
    { id: 'powerhead', name: 'Powerhead', cat: 'equipment', mode: 'both', anchor: 'wall', w: 70, art: () => gearArt('FLOW', '#32373d'), make: powerhead3, req: 'flow' },
    { id: 'skimmer', name: 'Protein Skimmer', cat: 'equipment', mode: 'salt', anchor: 'wall', w: 60, art: () => gearArt('SKIM', '#46505a'), make: skimmer3, req: 'skimmer' },

    // Decor
    { id: 'castle', name: 'Castle', cat: 'decor', mode: 'both', anchor: 'floor', w: 90, emoji: '🏰', make: castle3 },
    { id: 'shipwreck', name: 'Shipwreck', cat: 'decor', mode: 'both', anchor: 'floor', w: 100, emoji: '🚢', make: shipwreck3 },
    { id: 'amphora', name: 'Amphora', cat: 'decor', mode: 'both', anchor: 'floor', w: 55, emoji: '🏺', make: () => amphora3(0xb98a55) },
    { id: 'chest', name: 'Treasure Chest', cat: 'decor', mode: 'both', anchor: 'floor', w: 55, emoji: '🧰', make: chest3 },
    { id: 'anchor', name: 'Anchor', cat: 'decor', mode: 'both', anchor: 'floor', w: 55, emoji: '⚓', make: anchor3 },
    { id: 'shell', name: 'Shell', cat: 'decor', mode: 'both', anchor: 'floor', w: 50, emoji: '🐚', make: () => shell3(0xe8d8c0) }
];
const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const CATS = [
    { id: 'all', label: 'All' },
    { id: 'hardscape', label: 'Hardscape' },
    { id: 'plants', label: 'Plants', mode: 'fresh' },
    { id: 'corals', label: 'Corals', mode: 'salt' },
    { id: 'fish', label: 'Livestock' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'decor', label: 'Decor' }
];
const TANKS = {
    nano:     { label: 'Nano',     litres: 35,  W: 36, H: 24, D: 24 },
    standard: { label: 'Standard', litres: 110, W: 60, H: 36, D: 32 },
    large:    { label: 'Large',    litres: 240, W: 120, H: 50, D: 42 },
    xl:       { label: 'XL Reef',  litres: 450, W: 150, H: 60, D: 52 }
};
/* Substrate looks — base colour + a few grain tints + grain size + roughness.
   `mode` hints which water type it suits (used by the randomizer). */
const SUBSTRATES = {
    aquasoil:    { label: 'Aqua Soil',      mode: 'fresh', base: '#3a2c20', grains: ['#2a1f15', '#4c3a2a', '#241a12'], grain: 2.0, rough: 0.96 },
    natgravel:   { label: 'Natural Gravel', mode: 'fresh', base: '#b49a68', grains: ['#8c724a', '#cdb486', '#6f5836', '#d8c89a'], grain: 3.2, rough: 0.9 },
    rivergravel: { label: 'River Gravel',   mode: 'fresh', base: '#9aa0a2', grains: ['#6f7678', '#b9bfc0', '#7e6f57', '#c9c2b2'], grain: 3.6, rough: 0.85 },
    blacksand:   { label: 'Black Sand',     mode: 'both',  base: '#26282c', grains: ['#16181b', '#34373c', '#1d1f22'], grain: 1.6, rough: 0.95 },
    whitesand:   { label: 'White Sand',     mode: 'both',  base: '#e9e3cf', grains: ['#d8cfb4', '#f3eedd', '#cfc6a8'], grain: 1.5, rough: 0.8 },
    coralsand:   { label: 'Coral Sand',     mode: 'salt',  base: '#ece3d2', grains: ['#dccdb2', '#f6efe0', '#cbb999', '#e0d0bb'], grain: 1.8, rough: 0.82 },
    pinksand:    { label: 'Pink Sand',      mode: 'salt',  base: '#e6cabb', grains: ['#d6b0a0', '#f1ddd1', '#cf9f8e'], grain: 1.7, rough: 0.82 },
    crushedcoral:{ label: 'Crushed Coral',  mode: 'salt',  base: '#dad2c0', grains: ['#bfb49b', '#efe9da', '#a89a7c', '#cabfa6'], grain: 4.2, rough: 0.88 }
};

/* =========================================================================
   PART D — State
   ========================================================================= */
const SAVE_KEY = 'tp_aquascape_3d_v1';
const state = { mode: 'fresh', tank: 'standard', substrate: 18, subType: 'aquasoil', slope: 0, slopeDir: 'back', water: 92, bubbles: true, placed: [], sel: null };
let uidSeq = 1;
const placedMap = new Map(); // uid -> { p, group, item }

const $ = s => document.querySelector(s);

/* =========================================================================
   PART E — Three.js scene
   ========================================================================= */
const container = $('#stage3d');
let renderer, scene, camera, controls, dirLight, tankGroup, waterMesh, floorMesh, causticTex, selBox, hemi;
let godrays = [];
const clock = new THREE.Clock();
const interior = { x: 0, zNeg: 0, zPos: 0, subTop: 0, waterTop: 0, floatY: 0, H: 0,
    minX: 0, maxX: 0, minZ: 0, maxZ: 0, slopeTan: 0, dx: 0, dz: 0, sMin: 0, ready: false };

/* Height of the substrate surface at a given x,z (accounts for the slope). */
function groundY(x, z) {
    if (!interior.slopeTan) return interior.subTop;
    const proj = x * interior.dx + z * interior.dz;
    return interior.subTop + (proj - interior.sMin) * interior.slopeTan;
}

function dims() { return TANKS[state.tank]; }

function makeGradientTex(top, bottom) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d').createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    const ctx = c.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeCaustics() {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d'), img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const u = x / s * Math.PI * 2, v = y / s * Math.PI * 2;
        let n = Math.sin(u * 3 + Math.cos(v * 2)) + Math.sin(v * 4 + Math.cos(u * 3)) + Math.sin((u + v) * 2.5);
        n = Math.pow(Math.max(0, n / 3), 3.2);
        const val = 40 + n * 215, i = (y * s + x) * 4;
        img.data[i] = val * 0.8; img.data[i + 1] = val; img.data[i + 2] = val; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    return t;
}

/* Build a colour map + matching normal map for a substrate spec by stippling
   thousands of little grains, then deriving surface normals from brightness. */
let _subTexCache = {};
function makeSubstrateTextures(spec) {
    if (_subTexCache[spec._key]) return _subTexCache[spec._key];
    const s = 512, col = document.createElement('canvas'); col.width = col.height = s;
    const cx = col.getContext('2d');
    cx.fillStyle = spec.base; cx.fillRect(0, 0, s, s);
    const grains = spec.grains, gr = spec.grain || 2.5;
    const N = Math.round(26000 / gr);
    for (let i = 0; i < N; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        const r = gr * (0.5 + Math.random());
        cx.fillStyle = grains[(Math.random() * grains.length) | 0];
        cx.globalAlpha = 0.55 + Math.random() * 0.45;
        cx.beginPath(); cx.ellipse(x, y, r, r * (0.7 + Math.random() * 0.5), Math.random() * 3.14, 0, 6.28); cx.fill();
    }
    cx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(col); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace;

    // derive a normal map from the luminance of the colour map (grains => bumps)
    const src = cx.getImageData(0, 0, s, s).data;
    const nrm = document.createElement('canvas'); nrm.width = nrm.height = s;
    const nctx = nrm.getContext('2d'), nimg = nctx.createImageData(s, s);
    const lum = (x, y) => { const i = ((y & (s - 1)) * s + (x & (s - 1))) * 4; return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255; };
    const str = 2.2;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const dx = (lum(x - 1, y) - lum(x + 1, y)) * str;
        const dy = (lum(x, y - 1) - lum(x, y + 1)) * str;
        const nz = 1, inv = 1 / Math.hypot(dx, dy, nz);
        const i = (y * s + x) * 4;
        nimg.data[i] = (dx * inv * 0.5 + 0.5) * 255;
        nimg.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
        nimg.data[i + 2] = (nz * inv * 0.5 + 0.5) * 255;
        nimg.data[i + 3] = 255;
    }
    nctx.putImageData(nimg, 0, 0);
    const normalMap = new THREE.CanvasTexture(nrm); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    const out = { map, normalMap };
    _subTexCache[spec._key] = out;
    return out;
}

function initThree() {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    // environment for glass/fish reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = makeGradientTex('#bfe6ff', '#10314a'); envTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(envTex).texture;

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.5; controls.minDistance = 30; controls.maxDistance = 600;

    hemi = new THREE.HemisphereLight(0xbfe6ff, 0x20303a, 0.7); scene.add(hemi);
    dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(40, 130, 60); dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0006; dirLight.shadow.normalBias = 0.4; dirLight.shadow.radius = 3;
    const sc = dirLight.shadow.camera; sc.near = 10; sc.far = 500; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140;
    scene.add(dirLight);
    // cool fill from the opposite side to soften shadows like room light through glass
    const fill = new THREE.DirectionalLight(0x9fc4e0, 0.5); fill.position.set(-70, 50, -40); scene.add(fill);
    scene.add(new THREE.AmbientLight(0x88aacc, 0.28));

    selBox = new THREE.BoxHelper(new THREE.Object3D(), 0x3fb6c9); selBox.visible = false; scene.add(selBox);

    tankGroup = new THREE.Group(); scene.add(tankGroup);
    causticTex = makeCaustics();

    buildTank();
    frameCamera();
    window.addEventListener('resize', onResize); onResize();
    setupPointer();
    animate();
}

// direction unit vector for the substrate's "high" side
function slopeVector(dir) {
    const m = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0],
        bl: [-1, -1], br: [1, -1], fl: [-1, 1], fr: [1, 1] }[dir] || [0, -1];
    const L = Math.hypot(m[0], m[1]) || 1; return [m[0] / L, m[1] / L];
}

function buildTank() {
    while (tankGroup.children.length) { const c = tankGroup.children.pop(); c.traverse(o => { o.geometry && o.geometry.dispose(); }); }
    godrays = [];
    const d = dims();
    const W = d.W, H = d.H, D = d.D, t = 0.6;
    interior.H = H;
    interior.x = W / 2 - 3; interior.zNeg = -D / 2 + 3; interior.zPos = D / 2 - 3;
    interior.minX = -(W / 2 - t - 0.4); interior.maxX = W / 2 - t - 0.4;
    interior.minZ = -(D / 2 - t - 0.4); interior.maxZ = D / 2 - t - 0.4;
    interior.subTop = (state.substrate / 100) * H;
    interior.waterTop = (state.water / 100) * H;
    interior.floatY = interior.subTop + (interior.waterTop - interior.subTop) * 0.55;

    // slope set-up (high toward slopeDir; low edge stays at subTop)
    const [dx, dz] = slopeVector(state.slopeDir);
    interior.dx = dx; interior.dz = dz;
    interior.slopeTan = state.slope ? Math.tan(state.slope * Math.PI / 180) : 0;
    const hx = W / 2 - t, hz = D / 2 - t;
    let sMin = Infinity, sMax = -Infinity;
    [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([x, z]) => { const p = x * dx + z * dz; sMin = Math.min(sMin, p); sMax = Math.max(sMax, p); });
    interior.sMin = sMin;
    interior.ready = true;

    const isSalt = state.mode === 'salt';
    const spec = SUBSTRATES[state.subType] || SUBSTRATES.aquasoil; spec._key = state.subType;

    // background + fog
    scene.background = makeGradientTex(isSalt ? '#0a3f72' : '#1d5b62', isSalt ? '#04172e' : '#0a2528');
    scene.fog = new THREE.Fog(isSalt ? 0x0a4f86 : 0x16545c, W * 1.4, W * 4.2);

    // base / stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 4, D + 6), mat(0x16191e, { roughness: 0.55, metalness: 0.1 }));
    stand.position.y = -2; stand.receiveShadow = true; tankGroup.add(stand);

    // bottom glass
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), glassMat(0xbfe3ef)); bottom.position.y = -t / 2; tankGroup.add(bottom);

    // substrate — a box whose top surface follows the slope, textured per type
    const tex = makeSubstrateTextures(spec);
    const rep = Math.max(2, Math.round(W / 22));
    tex.map.repeat.set(rep, rep * D / W); tex.normalMap.repeat.set(rep, rep * D / W);
    const subMat = new THREE.MeshStandardMaterial({
        map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(0.8, 0.8),
        roughness: spec.rough, metalness: 0.02,
        emissive: 0xffffff, emissiveIntensity: 0.16, emissiveMap: causticTex
    });
    const sw = W - t, sd = D - t;
    const sg = new THREE.BoxGeometry(sw, interior.subTop, sd, 40, 1, 40);
    const sp = sg.attributes.position, sv = new THREE.Vector3(), topY = interior.subTop / 2;
    for (let i = 0; i < sp.count; i++) {
        sv.fromBufferAttribute(sp, i);
        if (sv.y > topY - 0.001) { // top vertices follow the slope + a little dune noise
            const off = (sv.x * dx + sv.z * dz - sMin) * interior.slopeTan + noise(sv.x * 0.12, 0, sv.z * 0.12) * (interior.subTop * 0.05);
            sp.setY(i, sv.y + off);
        }
    }
    sg.computeVertexNormals();
    floorMesh = new THREE.Mesh(sg, subMat);
    floorMesh.position.y = interior.subTop / 2; floorMesh.receiveShadow = true; tankGroup.add(floorMesh);
    // scattered pebbles sitting on the (possibly sloped) surface
    const peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.6, 0), mat(isSalt ? 0xcdbf9a : 0xc2ad7d, { flatShading: true }), 60);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) {
        const px = (Math.random() - 0.5) * (W - 6), pz = (Math.random() - 0.5) * (D - 6);
        m4.makeTranslation(px, groundY(px, pz) + 0.2, pz); m4.scale(new THREE.Vector3(1, 0.5, 1)); peb.setMatrixAt(i, m4);
    }
    peb.receiveShadow = true; tankGroup.add(peb);

    // glass walls
    const gm = glassMat(0xeaf7fc);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), gm); back.position.set(0, H / 2, -D / 2); tankGroup.add(back);
    const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), gm); front.position.set(0, H / 2, D / 2); tankGroup.add(front);
    const left = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), gm); left.position.set(-W / 2, H / 2, 0); tankGroup.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), gm); right.position.set(W / 2, H / 2, 0); tankGroup.add(right);

    // silicone rim frame
    const rimMat = mat(0x0d0f12, { roughness: 0.6 });
    [[0, H, -D / 2], [0, H, D / 2]].forEach(([x, y, z]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 1.4, 1.6), rimMat); r.position.set(x, y, z); tankGroup.add(r); });
    [[-W / 2, H, 0], [W / 2, H, 0]].forEach(([x, y, z]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, D + 1), rimMat); r.position.set(x, y, z); tankGroup.add(r); });

    // god rays — faint additive shafts of light from the surface
    const rayMat = new THREE.MeshBasicMaterial({ color: isSalt ? 0xbfe6ff : 0xcfeede, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const nRays = Math.max(3, Math.round(W / 26));
    for (let i = 0; i < nRays; i++) {
        const rayH = interior.waterTop * 0.95;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(W * 0.05, rayH, 4, 1, true), rayMat);
        cone.position.set((i / (nRays - 1) - 0.5) * W * 0.8, interior.waterTop - rayH / 2, (Math.random() - 0.5) * D * 0.5);
        cone.rotation.z = 0.12; cone.userData.ph = Math.random() * 6.28; tankGroup.add(cone); godrays.push(cone);
    }

    // water surface
    const wg = new THREE.PlaneGeometry(W - t, D - t, 28, 28); wg.rotateX(-Math.PI / 2);
    waterMesh = new THREE.Mesh(wg, new THREE.MeshPhysicalMaterial({
        color: isSalt ? 0x1f7fc8 : 0x2a9ca0, transparent: true, opacity: 0.14, roughness: 0.06,
        metalness: 0, transmission: 0.6, ior: 1.33, thickness: 4, envMapIntensity: 1.4, side: THREE.DoubleSide
    }));
    waterMesh.position.y = interior.waterTop; tankGroup.add(waterMesh);
    waterMesh.geometry.userData.base = Float32Array.from(wg.attributes.position.array);

    hemi.color.set(isSalt ? 0xbfe6ff : 0xcdeecc);
}

function frameCamera() {
    const d = dims();
    controls.target.set(0, d.H * 0.45, 0);
    camera.position.set(d.W * 0.35, d.H * 0.95, d.W * 1.15);
    controls.minDistance = d.W * 0.5; controls.maxDistance = d.W * 4;
    controls.update();
}

function onResize() {
    const w = container.clientWidth, h = container.clientHeight || w * 0.6;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    controls.update();
    // water ripple
    if (waterMesh) {
        const pos = waterMesh.geometry.attributes.position, base = waterMesh.geometry.userData.base;
        for (let i = 0; i < pos.count; i++) {
            const x = base[i * 3], z = base[i * 3 + 2];
            pos.setY(i, Math.sin(x * 0.15 + t * 1.5) * 0.4 + Math.cos(z * 0.2 + t * 1.2) * 0.4 + Math.sin((x + z) * 0.08 + t * 0.8) * 0.3);
        }
        pos.needsUpdate = true; waterMesh.geometry.computeVertexNormals();
    }
    if (causticTex) { causticTex.offset.x = t * 0.012; causticTex.offset.y = t * 0.008; }
    for (let i = 0; i < godrays.length; i++) { const g = godrays[i]; g.material.opacity = 0.035 + Math.sin(t * 0.6 + g.userData.ph) * 0.02; g.rotation.z = 0.12 + Math.sin(t * 0.3 + g.userData.ph) * 0.05; }
    placedMap.forEach(rec => { const u = rec.group.userData.update; if (u) u(t, dt); });
    if (state.sel != null) { const r = placedMap.get(state.sel); if (r) selBox.setFromObject(r.group); }
    renderer.render(scene, camera);
}

/* =========================================================================
   PART F — Placing items
   ========================================================================= */
// Plants, hardscape and decor may rise up out of the water; everything else stays wet.
function canExitWater(item) { return item.cat === 'plants' || item.cat === 'hardscape' || item.cat === 'decor'; }

function measureHalf(group) {
    const box = new THREE.Box3().setFromObject(group);
    if (!isFinite(box.min.x)) return { hx: 2, hz: 2, hy: 4 };
    return { hx: (box.max.x - box.min.x) / 2, hz: (box.max.z - box.min.z) / 2, hy: box.max.y - box.min.y };
}

// Keep a placed item fully inside the glass (and the right height for its anchor).
function contain(p, item, rec) {
    const s = p.scale || 1;
    const hx = (rec ? rec.hx : 1.5) * s, hz = (rec ? rec.hz : 1.5) * s;
    const minX = interior.minX + hx, maxX = interior.maxX - hx;
    const minZ = interior.minZ + hz, maxZ = interior.maxZ - hz;
    p.x = minX > maxX ? 0 : Math.min(maxX, Math.max(minX, p.x));
    p.z = minZ > maxZ ? 0 : Math.min(maxZ, Math.max(minZ, p.z));
    const gy = groundY(p.x, p.z);
    const top = canExitWater(item) ? interior.H + (rec ? rec.hy * s : 6) : interior.waterTop - 1;
    if (item.anchor === 'rim') p.y = interior.waterTop;
    else if (item.anchor === 'floor') p.y = (p.y > gy + 0.5) ? Math.min(top, Math.max(gy, p.y)) : gy; // rests on the substrate, or floats if raised
    else {
        const bottom = gy + (item.anchor === 'wall' ? 2 : 1);
        p.y = Math.min(top, Math.max(bottom, p.y));
    }
}

function defaultPos(item) {
    const rx = (Math.random() - 0.5) * (interior.maxX - interior.minX) * 0.8;
    const rz = (Math.random() - 0.5) * (interior.maxZ - interior.minZ) * 0.7;
    if (item.anchor === 'rim') return { x: rx, y: interior.waterTop, z: interior.minZ + 1 };
    if (item.anchor === 'wall') return { x: rx, y: groundY(rx, interior.minZ + 2) + 4, z: interior.minZ + 2 };
    if (item.anchor === 'float') return { x: rx, y: interior.floatY, z: rz };
    return { x: rx, y: groundY(rx, rz), z: rz };
}

function addItem(itemId, pos) {
    const item = ITEM_BY_ID[itemId];
    if (!item) return;
    const group = item.make();
    group.userData.root = true;
    group.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
    const h = measureHalf(group);
    const p = { uid: uidSeq++, itemId, x: 0, y: 0, z: 0, scale: 1, rotX: 0, rotY: Math.random() * Math.PI * 2 };
    group.userData.uid = p.uid;
    const rec = { p, group, item, hx: h.hx, hz: h.hz, hy: h.hy };
    const start = pos || defaultPos(item);
    p.x = start.x; p.y = start.y; p.z = start.z;
    contain(p, item, rec);
    applyTransform(group, p, item);
    scene.add(group);
    placedMap.set(p.uid, rec);
    state.placed.push(p);
    select(p.uid);
    updateReadout(); persist();
}

function applyTransform(group, p, item) {
    group.position.set(p.x, p.y, p.z);
    // actively-swimming fish are oriented by their swim update; everything else uses user rotation
    if (!(group.userData.swim && group.userData.update)) group.rotation.set(p.rotX || 0, p.rotY || 0, 0);
    group.scale.setScalar(p.scale);
    (group.userData.home || (group.userData.home = new THREE.Vector3())).set(p.x, p.y, p.z);
}

function rebuildItem(rec) { contain(rec.p, rec.item, rec); applyTransform(rec.group, rec.p, rec.item); }

/* =========================================================================
   PART G — Selection & item toolbar
   ========================================================================= */
function select(uid) {
    state.sel = uid;
    const rec = placedMap.get(uid);
    const bar = $('#itembar');
    if (!rec) { bar.classList.remove('on'); selBox.visible = false; return; }
    bar.classList.add('on'); selBox.visible = true; selBox.setFromObject(rec.group);
    $('#itembarName').textContent = rec.item.name;
    $('#scaleSlider').value = rec.p.scale;
    $('#rotSlider').value = rec.p.rotY;
    $('#tiltSlider').value = rec.p.rotX || 0;
}
function deselect() { state.sel = null; $('#itembar').classList.remove('on'); selBox.visible = false; }
function selRec() { return placedMap.get(state.sel); }

function removeSel() {
    const rec = selRec(); if (!rec) return;
    scene.remove(rec.group); placedMap.delete(rec.p.uid);
    state.placed = state.placed.filter(x => x !== rec.p);
    deselect(); updateReadout(); persist();
}
function duplicateSel() {
    const rec = selRec(); if (!rec) return;
    const p = rec.p;
    addItem(p.itemId, { x: p.x + 6, y: p.y, z: p.z + 5 });
    const np = placedMap.get(state.sel); np.p.scale = p.scale; np.p.rotX = p.rotX; np.p.rotY = p.rotY; rebuildItem(np); persist();
}
function clampX(x) { return Math.max(interior.minX, Math.min(interior.maxX, x)); }
function clampZ(z) { return Math.max(interior.minZ, Math.min(interior.maxZ, z)); }

/* =========================================================================
   PART H — Pointer interaction (select + drag, vs orbit)
   ========================================================================= */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let dragging = null, dragPlane = new THREE.Plane(), dragHit = new THREE.Vector3(), dragOff = new THREE.Vector3();

function setNdc(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
}
function rootFrom(obj) { while (obj && !obj.userData.root) obj = obj.parent; return obj; }

function setupPointer() {
    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', e => {
        setNdc(e); ray.setFromCamera(ndc, camera);
        const roots = [...placedMap.values()].map(r => r.group);
        const hits = ray.intersectObjects(roots, true);
        if (hits.length) {
            const root = rootFrom(hits[0].object);
            const rec = placedMap.get(root.userData.uid);
            if (rec) {
                select(rec.p.uid);
                controls.enabled = false;
                dragging = rec;
                dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), root.position);
                ray.ray.intersectPlane(dragPlane, dragHit);
                dragOff.copy(root.position).sub(dragHit);
                dom.setPointerCapture(e.pointerId);
            }
        }
    });
    dom.addEventListener('pointermove', e => {
        if (!dragging) return;
        setNdc(e); ray.setFromCamera(ndc, camera);
        if (ray.ray.intersectPlane(dragPlane, dragHit)) {
            const np = dragHit.add(dragOff);
            dragging.p.x = np.x; dragging.p.z = np.z;
            rebuildItem(dragging); // contain() clamps to the glass and rides the slope
        }
    });
    const end = e => { if (dragging) { dragging = null; controls.enabled = true; persist(); } };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    // click empty space to deselect (pointerdown that hit nothing)
    dom.addEventListener('pointerdown', e => {
        setNdc(e); ray.setFromCamera(ndc, camera);
        const roots = [...placedMap.values()].map(r => r.group);
        if (!ray.intersectObjects(roots, true).length) deselect();
    });
}

/* =========================================================================
   PART I — Palette + categories
   ========================================================================= */
let activeCat = 'all';
function buildCats() {
    const el = $('#cats'); el.innerHTML = '';
    CATS.filter(c => !c.mode || c.mode === state.mode).forEach(c => {
        const b = document.createElement('button');
        b.className = 'cat' + (c.id === activeCat ? ' on' : ''); b.textContent = c.label;
        b.onclick = () => { activeCat = c.id; buildCats(); buildPalette(); };
        el.appendChild(b);
    });
}
function buildPalette() {
    const q = ($('#search').value || '').toLowerCase(), el = $('#palette'); el.innerHTML = '';
    const list = ITEMS.filter(it => (it.mode === 'both' || it.mode === state.mode) && (activeCat === 'all' || it.cat === activeCat) && (!q || it.name.toLowerCase().includes(q)));
    if (!list.length) { el.innerHTML = '<p class="empty">No items match.</p>'; return; }
    list.forEach(it => {
        const card = document.createElement('button');
        card.className = 'pal-item'; card.title = 'Add ' + it.name;
        card.innerHTML = `<span class="pal-art">${it.emoji ? `<span class="emoji">${it.emoji}</span>` : it.art()}</span><span class="pal-name">${it.name}</span>`;
        card.onclick = () => addItem(it.id);
        el.appendChild(card);
    });
}

/* =========================================================================
   PART J — Stocking / care readout
   ========================================================================= */
function updateReadout() {
    const t = dims();
    const items = state.placed.map(p => ITEM_BY_ID[p.itemId]);
    const livestock = items.filter(i => i.cat === 'fish');
    const plants = items.filter(i => i.cat === 'plants' || i.cat === 'corals');
    const equip = new Set(items.filter(i => i.cat === 'equipment').map(i => i.req).filter(Boolean));
    const bioload = livestock.reduce((s, i) => s + (i.bioload || 1), 0);
    const capacity = t.litres / 4, pct = capacity ? bioload / capacity : 0;

    let label, cls;
    if (bioload === 0) { label = 'Empty'; cls = 'ok'; }
    else if (pct < 0.55) { label = 'Understocked'; cls = 'ok'; }
    else if (pct < 0.85) { label = 'Well stocked'; cls = 'good'; }
    else if (pct <= 1.05) { label = 'Near capacity'; cls = 'warn'; }
    else { label = 'Overstocked'; cls = 'bad'; }

    $('#stockBar').style.width = Math.min(100, pct * 100).toFixed(0) + '%';
    $('#stockBar').className = 'bar-fill ' + cls;
    $('#stockLabel').textContent = label; $('#stockLabel').className = 'badge ' + cls;
    $('#countFish').textContent = livestock.length;
    $('#countPlants').textContent = plants.length;
    $('#countHard').textContent = items.filter(i => i.cat === 'hardscape').length;

    const checks = [], need = (l, ok, tip) => checks.push({ l, ok, tip });
    need('Lighting', equip.has('light'), 'Add an LED light so plants/corals can grow.');
    need('Filtration', equip.has('filter') || equip.has('skimmer'), 'Add a filter to keep water clean.');
    if (state.mode === 'salt') {
        need('Protein skimmer', equip.has('skimmer'), 'Reef tanks need a skimmer to export waste.');
        need('Flow / powerhead', equip.has('flow'), 'Corals need water movement.');
        need('Live rock', items.some(i => i.id === 'liverock'), 'Live rock provides biological filtration.');
    } else {
        need('Heater', equip.has('heat'), 'Most tropical fish need a heater.');
        if (plants.length) need('CO₂ (for carpets)', items.some(i => i.id === 'co2'), 'Demanding plants grow best with CO₂.');
    }
    if (livestock.length) need('Stocking level', cls !== 'bad', 'Tank is overstocked — remove livestock or size up.');

    const ul = $('#checks'); ul.innerHTML = ''; let score = 0;
    checks.forEach(c => {
        if (c.ok) score++;
        const li = document.createElement('li'); li.className = c.ok ? 'ok' : 'todo';
        li.innerHTML = `<span class="tick">${c.ok ? '✓' : '○'}</span><span>${c.l}</span>${c.ok ? '' : `<span class="tip">${c.tip}</span>`}`;
        ul.appendChild(li);
    });
    const pctScore = checks.length ? Math.round(score / checks.length * 100) : 100;
    $('#careScore').textContent = pctScore + '%';
    $('#careRing').style.background = `conic-gradient(var(--aq-accent) ${pctScore * 3.6}deg, rgba(255,255,255,.12) 0)`;

    const counts = {}; livestock.forEach(i => counts[i.name] = (counts[i.name] || 0) + 1);
    const sl = $('#stockList'); sl.innerHTML = '';
    if (!livestock.length) sl.innerHTML = '<li class="muted">No livestock yet</li>';
    Object.entries(counts).forEach(([n, c]) => { const li = document.createElement('li'); li.innerHTML = `<span>${n}</span><span class="qty">×${c}</span>`; sl.appendChild(li); });
}

/* =========================================================================
   PART K — Mode / tank settings
   ========================================================================= */
function setMode(mode) {
    if (state.mode === mode) return;
    const conflict = state.placed.some(p => { const it = ITEM_BY_ID[p.itemId]; return it.mode !== 'both' && it.mode !== mode; });
    if (conflict && !confirm(`Switching to ${mode === 'salt' ? 'saltwater' : 'freshwater'} will remove items that don't belong in that water type. Continue?`)) return;
    [...placedMap.values()].forEach(rec => {
        if (rec.item.mode !== 'both' && rec.item.mode !== mode) {
            scene.remove(rec.group); placedMap.delete(rec.p.uid);
            state.placed = state.placed.filter(x => x !== rec.p);
        }
    });
    state.mode = mode;
    // swap to a fitting substrate if the current one belongs to the other water type
    if (SUBSTRATES[state.subType].mode === (mode === 'salt' ? 'fresh' : 'salt')) state.subType = mode === 'salt' ? 'coralsand' : 'aquasoil';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    if ((activeCat === 'plants' && mode === 'salt') || (activeCat === 'corals' && mode === 'fresh')) activeCat = 'all';
    buildTank(); buildCats(); buildPalette(); deselect(); updateReadout(); syncControls(); persist();
}

/* =========================================================================
   PART K2 — Auto-scape randomizer
   ========================================================================= */
const pick = arr => arr[(Math.random() * arr.length) | 0];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function randomScape() {
    placedMap.forEach(rec => scene.remove(rec.group)); placedMap.clear(); state.placed = []; deselect();
    const salt = state.mode === 'salt', tank = dims();
    // substrate look + a gentle natural slope
    const subOpts = Object.keys(SUBSTRATES).filter(k => { const m = SUBSTRATES[k].mode; return m === 'both' || m === state.mode; });
    state.subType = pick(subOpts);
    state.slope = randInt(5, 16);
    state.slopeDir = pick(['back', 'back', 'bl', 'br', 'left', 'right']);
    state.substrate = randInt(15, 26);
    state.water = randInt(90, 97);
    syncControls(); buildTank();

    const spanX = interior.maxX - interior.minX, spanZ = interior.maxZ - interior.minZ;
    const placeFloor = (id, xf, zf, scale) => {
        const x = interior.minX + spanX * xf + (Math.random() - 0.5) * 4;
        const z = interior.minZ + spanZ * zf + (Math.random() - 0.5) * 4;
        addItem(id, { x, y: groundY(x, z), z });
        if (scale) { const r = selRec(); if (r) { r.p.scale = scale; r.p.rotY = Math.random() * 6.28; rebuildItem(r); } }
    };
    // hardscape spine
    const hard = ITEMS.filter(i => i.cat === 'hardscape' && (i.mode === 'both' || i.mode === state.mode)).map(i => i.id);
    const nHard = randInt(2, 3);
    for (let i = 0; i < nHard; i++) placeFloor(pick(hard), 0.22 + i * 0.28 + Math.random() * 0.08, 0.32 + Math.random() * 0.4, 0.8 + Math.random() * 0.8);
    // planting / corals
    const flora = ITEMS.filter(i => (salt ? i.cat === 'corals' : i.cat === 'plants') && (i.mode === 'both' || i.mode === state.mode)).map(i => i.id);
    const nFlora = randInt(6, 10);
    for (let i = 0; i < nFlora; i++) placeFloor(pick(flora), 0.06 + Math.random() * 0.88, 0.12 + Math.random() * 0.74, 0.7 + Math.random() * 0.7);
    // essential gear for a "ready" tank
    const gear = salt ? ['led', 'skimmer', 'powerhead', 'heater'] : ['led', 'filterbox', 'heater'];
    if (!salt && Math.random() < 0.6) gear.push('co2');
    gear.forEach(id => addItem(id));
    if (salt) addItem('liverock');
    // livestock up to ~75% of capacity, schooling the small ones
    const fishPool = ITEMS.filter(i => i.cat === 'fish' && (i.mode === 'both' || i.mode === state.mode));
    const capacity = tank.litres / 4; let load = 0, guard = 0;
    while (load < capacity * 0.7 && guard++ < 40) {
        const f = pick(fishPool), shoal = (f.bioload || 1) <= 1 ? randInt(3, 6) : 1;
        for (let k = 0; k < shoal && load < capacity * 0.82; k++) { addItem(f.id); load += f.bioload || 1; }
    }
    deselect(); frameCamera(); buildCats(); buildPalette(); updateReadout(); persist();
}

function changeTank() {
    state.tank = $('#tankSize').value;
    buildTank(); frameCamera(); repositionAll(); $('#tankMeta').textContent = `${dims().label} · ~${dims().litres} L`; updateReadout(); persist();
}
function repositionAll() {
    placedMap.forEach(rec => { contain(rec.p, rec.item, rec); applyTransform(rec.group, rec.p, rec.item); });
}

/* =========================================================================
   PART L — Persistence, import/export, PNG
   ========================================================================= */
function snapshot() { return { mode: state.mode, tank: state.tank, substrate: state.substrate, subType: state.subType, slope: state.slope, slopeDir: state.slopeDir, water: state.water, bubbles: state.bubbles, placed: state.placed.map(p => ({ itemId: p.itemId, x: p.x, y: p.y, z: p.z, scale: p.scale, rotX: p.rotX || 0, rotY: p.rotY })) }; }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch (e) {} }

function syncControls() {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
    $('#tankSize').value = state.tank; $('#subSlider').value = state.substrate; $('#waterSlider').value = state.water; $('#bubbleToggle').checked = state.bubbles;
    if ($('#subType')) $('#subType').value = state.subType;
    if ($('#slopeSlider')) $('#slopeSlider').value = state.slope;
    if ($('#slopeDir')) $('#slopeDir').value = state.slopeDir;
    if ($('#slopeVal')) $('#slopeVal').textContent = state.slope + '°';
}

function loadFrom(data) {
    if (!data) return false;
    placedMap.forEach(rec => scene.remove(rec.group)); placedMap.clear(); state.placed = [];
    state.mode = data.mode || 'fresh'; state.tank = data.tank || 'standard';
    state.substrate = data.substrate ?? 18; state.subType = SUBSTRATES[data.subType] ? data.subType : 'aquasoil';
    state.slope = data.slope ?? 0; state.slopeDir = data.slopeDir || 'back';
    state.water = data.water ?? 92; state.bubbles = data.bubbles ?? true;
    syncControls();
    buildTank(); frameCamera();
    (data.placed || []).forEach(d => {
        if (!ITEM_BY_ID[d.itemId]) return;
        const item = ITEM_BY_ID[d.itemId];
        const group = item.make(); group.userData.root = true;
        const h = measureHalf(group);
        const p = { uid: uidSeq++, itemId: d.itemId, x: d.x, y: d.y, z: d.z, scale: d.scale ?? 1, rotX: d.rotX ?? 0, rotY: d.rotY ?? 0 };
        group.userData.uid = p.uid;
        const rec = { p, group, item, hx: h.hx, hz: h.hz, hy: h.hy };
        applyTransform(group, p, item); scene.add(group); placedMap.set(p.uid, rec); state.placed.push(p);
    });
    $('#tankMeta').textContent = `${dims().label} · ~${dims().litres} L`;
    buildCats(); buildPalette(); deselect(); updateReadout();
    return true;
}
function clearAll() { if (!state.placed.length || confirm('Clear the whole tank?')) { placedMap.forEach(rec => scene.remove(rec.group)); placedMap.clear(); state.placed = []; deselect(); updateReadout(); persist(); } }

function download(name, type, data) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJSON() { download('aquascape.json', 'application/json', JSON.stringify(snapshot(), null, 2)); }
function importJSON(file) { const fr = new FileReader(); fr.onload = () => { try { loadFrom(JSON.parse(fr.result)); persist(); } catch (e) { alert('Could not read that file.'); } }; fr.readAsText(file); }
function exportPNG() { selBox.visible = false; renderer.render(scene, camera); renderer.domElement.toBlob(b => { download('aquascape.png', 'image/png', b); if (state.sel != null) selBox.visible = true; }, 'image/png'); }

/* =========================================================================
   PART M — Wire up DOM
   ========================================================================= */
function populateSubstrate() {
    const sel = $('#subType'); if (!sel) return;
    sel.innerHTML = '';
    Object.entries(SUBSTRATES).forEach(([id, s]) => {
        const o = document.createElement('option'); o.value = id; o.textContent = s.label; sel.appendChild(o);
    });
    sel.value = state.subType;
}

function wire() {
    document.querySelectorAll('.mode-btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    $('#tankSize').onchange = changeTank;
    $('#subSlider').oninput = e => { state.substrate = +e.target.value; buildTank(); repositionAll(); persist(); };
    $('#waterSlider').oninput = e => { state.water = +e.target.value; buildTank(); repositionAll(); persist(); };
    $('#bubbleToggle').onchange = e => { state.bubbles = e.target.checked; persist(); };
    $('#subType').onchange = e => { state.subType = e.target.value; buildTank(); repositionAll(); persist(); };
    $('#slopeSlider').oninput = e => { state.slope = +e.target.value; $('#slopeVal').textContent = state.slope + '°'; buildTank(); repositionAll(); persist(); };
    $('#slopeDir').onchange = e => { state.slopeDir = e.target.value; buildTank(); repositionAll(); persist(); };
    $('#search').oninput = buildPalette;
    $('#btnRandom').onclick = () => { if (!state.placed.length || confirm('Generate a fresh random scape? This replaces the current tank.')) randomScape(); };
    $('#btnClear').onclick = clearAll;
    $('#btnPng').onclick = exportPNG;
    $('#btnJson').onclick = exportJSON;
    $('#fileJson').onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
    $('#btnReset').onclick = frameCamera;

    $('#scaleSlider').oninput = e => { const r = selRec(); if (r) { r.p.scale = +e.target.value; rebuildItem(r); persist(); } };
    $('#rotSlider').oninput = e => { const r = selRec(); if (r) { r.p.rotY = +e.target.value; rebuildItem(r); persist(); } };
    $('#tiltSlider').oninput = e => { const r = selRec(); if (r) { r.p.rotX = +e.target.value; rebuildItem(r); persist(); } };
    $('#btnRaise').onclick = () => { const r = selRec(); if (r) { r.p.y += 3; rebuildItem(r); persist(); } };
    $('#btnLower').onclick = () => { const r = selRec(); if (r) { r.p.y -= 3; rebuildItem(r); persist(); } };
    $('#btnDup').onclick = duplicateSel;
    $('#btnDel').onclick = removeSel;

    window.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        const r = selRec();
        if ((e.key === 'Delete' || e.key === 'Backspace') && r) { e.preventDefault(); removeSel(); }
        else if (e.key === 'd' && r) duplicateSel();
    });

    document.querySelectorAll('.side-tab').forEach(t => t.onclick = () => {
        document.querySelectorAll('.side-tab').forEach(x => x.classList.toggle('on', x === t));
        document.querySelectorAll('.side-pane').forEach(x => x.classList.toggle('on', x.id === t.dataset.pane));
        onResize();
    });
}

/* =========================================================================
   PART N — Boot
   ========================================================================= */
function boot() {
    wire();
    initThree();
    populateSubstrate();
    let saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (!loadFrom(saved)) { syncControls(); buildCats(); buildPalette(); updateReadout(); }
    populateSubstrate();
    // auto-generate a fully ready sample scape on first ever visit
    if (!saved && !state.placed.length) randomScape();
}
boot();
