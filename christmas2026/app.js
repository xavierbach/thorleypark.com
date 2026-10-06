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

})();
