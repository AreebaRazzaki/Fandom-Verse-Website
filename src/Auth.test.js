import { fireEvent, render, waitFor, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Login from './pages/login';
import Signup from './pages/signup';

const CSS = fs.readFileSync(path.join(__dirname, 'pages/auth.css'), 'utf8');

const mountLogin = () => render(<Login />);
const mountSignup = () => render(<Signup />);
const field = (container, id) => container.querySelector(`#${id}`);
const submit = (container) => fireEvent.click(container.querySelector('.au-cta[type="submit"], form .au-cta'));

const fill = (container, values) => {
  Object.entries(values).forEach(([id, value]) => {
    fireEvent.change(field(container, id), { target: { value } });
  });
};

beforeEach(() => { window.localStorage.clear(); });

describe('sign in', () => {
  it('shows a form-only ENTER THE VERSE screen with a glitch fandom band', () => {
    const { container } = mountLogin();

    // The art panel and the split are gone; the form sits on its own.
    expect(container.querySelector('.au-split')).toBeNull();
    expect(container.querySelector('.au-art')).toBeNull();
    expect(container.querySelector('.au-strip .au-panel')).toBeInTheDocument();

    const glitch = container.querySelector('.au-glitch');
    expect(glitch).toBeInTheDocument();
    expect(glitch.querySelectorAll('img').length).toBe(14);
    expect(container.querySelector('.au-glitch-strip.is-dupe')).toBeInTheDocument();

    expect(container.querySelector('.au-title').textContent).toContain('ENTER THE');
    expect(container.querySelector('.au-title em').textContent).toBe('VERSE');
    expect(field(container, 'au-email')).toBeInTheDocument();
    expect(field(container, 'au-password')).toBeInTheDocument();
  });

  it('carry no nav and no footer', () => {
    expect(mountLogin().container.querySelector('.universal-nav')).toBeNull();
    expect(mountSignup().container.querySelector('.universal-nav')).toBeNull();
    expect(mountLogin().container.querySelector('footer')).toBeNull();
    expect(mountSignup().container.querySelector('footer')).toBeNull();
  });

  it('expose their own theme toggle instead of the nav one', () => {
    const { container } = mountLogin();
    const toggle = within(container.querySelector('.au-theme-toggle')).getByRole('button', { name: /switch to light theme/i });

    fireEvent.click(toggle);
    expect(container.querySelector('.au-page').className).toContain('theme-light');
  });

  it('use the seven fandom images from the home page in the band', () => {
    const sources = [...mountLogin().container.querySelectorAll('.au-glitch-strip:not(.is-dupe) img')]
      .map((node) => node.getAttribute('src'));

    expect(sources).toEqual([
      '/assets/images/anime.png',
      '/assets/images/gaming.png',
      '/assets/images/movie.png',
      '/assets/images/tv shows.png',
      '/assets/images/k-pop.png',
      '/assets/images/comics.png',
      '/assets/images/manga.png',
    ]);
    sources.forEach((src) => {
      expect(fs.existsSync(path.join(__dirname, '../public', src))).toBe(true);
    });
  });

  it('labels the sign-in fields and keeps the passwords masked', () => {
    const { container } = mountLogin();

    expect(container.querySelector('label[for="au-email"]').textContent).toMatch(/email or username/i);
    expect(container.querySelector('label[for="au-password"]').textContent).toMatch(/password/i);
    expect(field(container, 'au-password').getAttribute('type')).toBe('password');
    expect(field(container, 'au-email').getAttribute('autocomplete')).toBe('username');
  });

  it('blocks an empty or weak sign-in', () => {
    const { container } = mountLogin();
    submit(container);
    expect(container.querySelectorAll('.au-error')).toHaveLength(2);

    fill(container, { 'au-email': 'areeba@example.com', 'au-password': '123' });
    submit(container);
    expect(container.querySelector('#au-password-error').textContent).toMatch(/at least 6 characters/i);
    expect(container.querySelector('.au-done')).toBeNull();
  });

  it('rejects a malformed email but accepts a plain username', () => {
    const { container } = mountLogin();

    fill(container, { 'au-email': 'areeba@', 'au-password': 'verse123' });
    submit(container);
    expect(container.querySelector('#au-email-error').textContent).toMatch(/does not look right/i);

    fill(container, { 'au-email': 'areeba', 'au-password': 'verse123' });
    submit(container);
    expect(container.querySelector('.au-email, #au-email-error')).toBeNull();
  });

  it('signs in without sending anything anywhere', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;
    const { container } = mountLogin();
    fill(container, { 'au-email': 'areeba@example.com', 'au-password': 'verse123' });
    submit(container);

    const done = await waitFor(() => {
      const node = container.querySelector('.au-done');
      expect(node).toBeInTheDocument();
      return node;
    });
    expect(done.getAttribute('role')).toBe('status');
    expect(done.textContent).toContain('YOU ARE IN');
    expect(done.textContent).toContain('areeba@example.com');
    expect(fetchSpy).not.toHaveBeenCalled();
    // The password is never written down.
    expect(JSON.stringify(window.localStorage)).not.toContain('verse123');
    delete global.fetch;
  });

  it('offers a forgot-password panel and a route to sign up', async () => {
    const { container } = mountLogin();
    expect(container.querySelector('.au-note')).toBeNull();

    fireEvent.click(screen_getByText(container, /forgot password/i));
    expect(container.querySelector('.au-note')).toBeInTheDocument();
    expect(container.querySelector('.au-switch a').getAttribute('href')).toBe('#sign-up');
  });
});

describe('sign up', () => {
  it('asks for a name, email, password and a confirmation', () => {
    const { container } = mountSignup();

    expect(container.querySelector('.au-title').textContent).toContain('CREATE YOUR');
    ['au-name', 'au-email', 'au-password', 'au-confirm'].forEach((id) => {
      expect(container.querySelector(`label[for="${id}"]`).textContent.trim().length).toBeGreaterThan(0);
      expect(field(container, id)).toBeInTheDocument();
    });
    expect(field(container, 'au-confirm').getAttribute('type')).toBe('password');
  });

  it('checks every field, including that the passwords match', () => {
    const { container } = mountSignup();
    submit(container);
    expect(container.querySelectorAll('.au-error')).toHaveLength(4);

    fill(container, { 'au-name': 'A', 'au-email': 'nope', 'au-password': 'short', 'au-confirm': 'other' });
    submit(container);
    expect(container.querySelector('#au-name-error').textContent).toMatch(/too short/i);
    expect(container.querySelector('#au-email-error').textContent).toMatch(/does not look right/i);
    expect(container.querySelector('#au-password-error').textContent).toMatch(/at least 8 characters/i);
    expect(container.querySelector('#au-confirm-error').textContent).toMatch(/do not match/i);
    expect(container.querySelector('.au-done')).toBeNull();
  });

  it('welcomes the new member by name instead of using an alert', async () => {
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = mountSignup();
    fill(container, {
      'au-name': 'Areeba Khan',
      'au-email': 'areeba@example.com',
      'au-password': 'verse1234',
      'au-confirm': 'verse1234',
    });
    submit(container);

    const done = await waitFor(() => {
      const node = container.querySelector('.au-done');
      expect(node).toBeInTheDocument();
      return node;
    });
    expect(done.getAttribute('role')).toBe('status');
    expect(done.querySelector('h1').textContent).toBe('WELCOME TO THE VERSE, AREEBA!');
    expect(done.querySelector('.au-done-mark').textContent).toContain('✓');
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('points existing members at sign in', () => {
    const { container } = mountSignup();
    expect(container.querySelector('.au-switch a').getAttribute('href')).toBe('#sign-in');
  });
});

describe('both auth screens', () => {
  it('offer a way in as a guest, without touching storage', () => {
    [mountLogin, mountSignup].forEach((mount) => {
      const { container } = mount();
      const guest = container.querySelector('.au-guest-btn');

      expect(guest).toBeInTheDocument();
      expect(guest.textContent).toMatch(/continue as a guest/i);
      // Guests land on the site itself, and the button is a link rather than a
      // submit so it can never trip the form validation.
      expect(guest.getAttribute('href')).toBe('#home');
      expect(container.querySelector('form .au-guest-btn')).toBeNull();
      expect(container.querySelector('.au-divider').textContent).toBe('or');
      expect(container.querySelector('.au-guest-note').textContent).toMatch(/no account needed/i);
    });

    expect(JSON.stringify(window.localStorage)).not.toMatch(/guest/i);
  });

  it('style the guest route as a ghost button under a hairline divider', () => {
    const btnRule = CSS.match(/\.au-guest-btn \{[^}]*\}/)[0];
    expect(btnRule).toMatch(/border: 1px solid var\(--line-strong\)/);
    expect(btnRule).toMatch(/background: transparent/);
    // A link has to carry its own focus ring.
    expect(CSS).toMatch(/\.au-guest-btn:focus-visible \{[^}]*outline: 2px solid var\(--cyan\)/);
    expect(CSS).toMatch(/\.au-divider::before,[^{]*\.au-divider::after \{[^}]*height: 1px/);
  });

  it('centre one panel over a lavender light stage', () => {
    const { container } = mountLogin();

    expect(container.querySelector('.au-page-strip')).toBeInTheDocument();
    expect(container.querySelector('.au-strip .au-panel')).toBeInTheDocument();
    expect(CSS).toMatch(/\.au-strip \{[^}]*place-items: center/);
    expect(CSS).toMatch(/\.au-page-strip\.theme-light::after \{[^}]*repeating-linear-gradient/);
    expect(CSS).toMatch(/\.au-page\.theme-light \{[^}]*--ink: #140a1c/);
    expect(CSS).toMatch(/\.au-page\.theme-light \{[^}]*--muted: #5f5470/);
  });

  it('lift the panel above the glitch scrim in both themes', () => {
    // .au-panel is a grandchild of .au-page, so the `.au-page > *` rule never
    // reaches it. Without position/z-index of its own it paints underneath the
    // z-index:0 .au-glitch layer and the form disappears entirely.
    const panelRule = CSS.match(/\.au-strip \.au-panel \{[^}]*\}/)[0];
    expect(panelRule).toMatch(/position: relative/);
    expect(panelRule).toMatch(/z-index: 2/);

    // Each theme needs its own opaque surface, otherwise the scrim shows
    // straight through the card and the fields become unreadable.
    expect(CSS).toMatch(/\.au-strip \.au-panel \{[^}]*background: rgba\(/);
    expect(CSS).toMatch(/\.theme-light \.au-strip \.au-panel \{[^}]*background: rgba\(255, 255, 255/);
  });

  it('recolor for the light theme and remember the choice', () => {
    const { container } = mountSignup();
    fireEvent.click(within(container.querySelector('.au-theme-toggle')).getByRole('button', { name: /switch to light theme/i }));

    expect(container.querySelector('.au-page').className).toContain('theme-light');
    expect(window.localStorage.getItem('signup-theme')).toBe('light');
  });

  it('run the glitch band and respect reduced motion', () => {
    expect(CSS).toMatch(/@keyframes au-drift \{[\s\S]{0,160}?translate\(-114%/);
    expect(CSS).toMatch(/@keyframes au-glitch-shift \{[\s\S]{0,320}?hue-rotate/);
    expect(CSS).toMatch(/\.au-glitch-strip\.is-dupe \{[^}]*animation-direction: reverse/);
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,200}?au-glitch-strip/);
  });
});

function screen_getByText(container, matcher) {
  return [...container.querySelectorAll('button')].find((node) => matcher.test(node.textContent));
}
