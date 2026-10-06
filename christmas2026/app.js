(() => {
  const SUPABASE_URL = 'https://jvgpiioicsqsdeurypli.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IreojMVZ_J-crM4aKx-sKw_XZeA7NcM';
  const DUPLICATE = '23505';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);

  const say = (id, text, ok) => { const el = $(id); el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  // RSVP
  $('rsvp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('rsvp-name').value.trim();
    const email = $('rsvp-email').value.trim();
    const adults = parseInt($('rsvp-adults').value, 10);
    const kids = parseInt($('rsvp-kids').value, 10) || 0;
    const dietary = $('rsvp-dietary').value.trim() || null;
    if (!name || !validEmail(email) || !adults) {
      say('rsvp-msg', 'Please add your name, a valid email and the number of adults.', false);
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
    say('rsvp-msg', error ? 'We already have your RSVP. See you on Christmas Day.' : `Thank you, ${name}. See you on Christmas Day.`, true);
    btn.textContent = 'Received';
  });

  // Secret Santa
  $('santa-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('santa-name').value.trim();
    const email = $('santa-email').value.trim();
    if (!name || !validEmail(email)) {
      say('santa-msg', 'Please add your name and a valid email.', false);
      return;
    }
    const btn = $('santa-submit');
    btn.disabled = true; btn.textContent = 'Joining';
    const { error } = await sb.from('xmas26_santa').insert({ name, email });
    if (error && error.code !== DUPLICATE) {
      console.error('Santa error', error);
      say('santa-msg', 'Something went wrong. Please try again.', false);
      btn.disabled = false; btn.textContent = 'Join the draw';
      return;
    }
    say('santa-msg', error ? 'You are already in the draw.' : `You're in, ${name}. Xavier will be in touch in December.`, true);
    btn.textContent = 'Joined';
  });

  // Admin draw: built only when the draw parameter is present
  if (new URLSearchParams(location.search).get('draw') !== 'thorleypark2026') return;

  const slot = $('admin-slot');
  slot.innerHTML = '<div class="admin"><label>Admin</label><button class="btn" id="draw-btn" type="button">Run the draw</button><p class="msg" id="draw-msg"></p><div id="draw-result"></div></div>';

  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  $('draw-btn').addEventListener('click', async () => {
    const btn = $('draw-btn');
    btn.disabled = true; btn.textContent = 'Drawing';
    const { data: list, error } = await sb.from('xmas26_santa').select('name, email').order('created_at', { ascending: true });
    if (error) {
      console.error('Draw load error', error);
      say('draw-msg', 'Could not load participants.', false);
      btn.disabled = false; btn.textContent = 'Run the draw';
      return;
    }
    if (!list || list.length < 3) {
      say('draw-msg', `Need at least 3 participants (currently ${list ? list.length : 0}).`, false);
      btn.disabled = false; btn.textContent = 'Run the draw';
      return;
    }
    let shuffled;
    do { shuffled = shuffle(list); } while (shuffled.some((p, i) => p.email === list[i].email));
    $('draw-result').innerHTML = list.map((g, i) =>
      `<div class="pair"><strong>${esc(g.name)}</strong><span>gives to</span><strong>${esc(shuffled[i].name)}</strong><span class="email">${esc(g.email)}</span></div>`
    ).join('');
    say('draw-msg', `${list.length} pairings. Send each person only their own row.`, true);
    btn.textContent = 'Run again';
    btn.disabled = false;
  });
})();
