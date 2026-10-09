(() => {
  const SUPABASE_URL = 'https://jvgpiioicsqsdeurypli.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IreojMVZ_J-crM4aKx-sKw_XZeA7NcM';
  const DUPLICATE = '23505';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);

  const say = (id, text, ok) => { const el = $(id); el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // Highlight the nav link for the section in view
  const links = [...document.querySelectorAll('nav a')];
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section').forEach(s => io.observe(s));

  // Map: the house (parking is on site)
  if (window.L && $('map')) {
    const house = [-37.3963739, 144.5856755];
    const map = L.map('map', { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    const pin = (cls, label) => L.divIcon({ className: '', html: `<div class="pin ${cls}"><span>${label}</span><i></i></div>`, iconSize: [140, 40], iconAnchor: [70, 38] });
    L.marker(house, { icon: pin('house', 'Thorley Park, park here') }).addTo(map);
    map.setView(house, 16);
  }

  // Secret Santa opt in inside the RSVP
  const santaBox = $('rsvp-santa');
  const santaWrap = $('santa-names');
  const santaList = $('santa-list');
  const addNameRow = (value = '') => {
    const row = document.createElement('div');
    row.className = 'name-row';
    row.innerHTML = '<input type="text" aria-label="Name for the draw" autocomplete="off"><button type="button" aria-label="Remove name">&times;</button>';
    row.querySelector('input').value = value;
    row.querySelector('button').addEventListener('click', () => { row.remove(); if (!santaList.children.length) addNameRow(); });
    santaList.appendChild(row);
    return row;
  };
  santaBox.addEventListener('change', () => {
    santaWrap.hidden = !santaBox.checked;
    if (santaBox.checked && !santaList.children.length) {
      const people = (parseInt($('rsvp-adults').value, 10) || 1) + (parseInt($('rsvp-kids').value, 10) || 0);
      addNameRow($('rsvp-name').value.trim());
      for (let i = 1; i < people; i++) addNameRow();
      santaList.querySelector('input').focus();
    }
  });
  $('santa-add').addEventListener('click', () => addNameRow().querySelector('input').focus());

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const joinNames = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

  // RSVP
  $('rsvp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('rsvp-name').value.trim();
    const email = $('rsvp-email').value.trim();
    const adults = parseInt($('rsvp-adults').value, 10);
    const kids = parseInt($('rsvp-kids').value, 10) || 0;
    const dietary = $('rsvp-dietary').value.trim() || null;
    const santaNames = santaBox.checked
      ? [...new Set([...santaList.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean))]
      : [];
    if (!name || !validEmail(email) || !adults) {
      say('rsvp-msg', 'Please add your name, a valid email and the number of adults.', false);
      return;
    }
    if (santaBox.checked && !santaNames.length) {
      say('rsvp-msg', 'Add at least one name for the Secret Santa, or untick the box.', false);
      return;
    }
    const btn = $('rsvp-submit');
    btn.disabled = true; btn.textContent = 'Sending';
    const { error } = await sb.from('xmas26_rsvps').insert({ name, email, adults, kids, dietary });
    if (error && error.code !== DUPLICATE) {
      console.error('RSVP error', error);
      say('rsvp-msg', 'Something went wrong. Please try again or text Xavier.', false);
      btn.disabled = false; btn.textContent = 'Send RSVP';
      return;
    }
    const already = !!error;
    const failed = [];
    for (const n of santaNames) {
      const r = await sb.from('xmas26_santa').insert({ name: n, email });
      if (r.error && r.error.code !== DUPLICATE) { console.error('Santa error', r.error); failed.push(n); }
    }
    const inDraw = santaNames.filter(n => !failed.includes(n));
    const people = `${adults} ${adults === 1 ? 'adult' : 'adults'}` + (kids ? ` and ${kids} ${kids === 1 ? 'child' : 'children'}` : '');
    let html = `<h3>Thank you, ${esc(name.split(' ')[0])}.</h3>`;
    html += already
      ? `<p>We already had your RSVP, so your original details stand. Text Xavier if anything has changed.</p>`
      : `<p>We have you down for ${people}. See you on Christmas Day.</p>`;
    if (inDraw.length) html += `<p>${esc(joinNames(inDraw))} ${inDraw.length === 1 ? 'is' : 'are'} in the Secret Santa. Your match arrives by email in early December.</p>`;
    if (failed.length) html += `<p>We couldn't add ${esc(joinNames(failed))} to the Secret Santa. Please try again or text Xavier.</p>`;
    html += `<button type="button" class="text-btn" id="rsvp-again">Send another RSVP</button>`;
    const panel = document.createElement('div');
    panel.className = 'confirm';
    panel.setAttribute('role', 'status');
    panel.innerHTML = html;
    const form = $('rsvp-form');
    form.hidden = true;
    form.after(panel);
    panel.querySelector('#rsvp-again').addEventListener('click', () => {
      panel.remove(); form.reset(); santaWrap.hidden = true; santaList.innerHTML = '';
      say('rsvp-msg', '', true); btn.disabled = false; btn.textContent = 'Send RSVP'; form.hidden = false;
    });
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

})();
