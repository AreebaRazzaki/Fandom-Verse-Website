import { fireEvent, render, waitFor, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Contact from './pages/contact';

const CSS = fs.readFileSync(path.join(__dirname, 'pages/contact.css'), 'utf8');

const mount = () => render(<Contact />);
const field = (container, name) => container.querySelector(`#ct-${name}`);

const fill = (container, values) => {
  Object.entries(values).forEach(([name, value]) => {
    fireEvent.change(field(container, name), { target: { value } });
  });
};

const submit = (container) => {
  fireEvent.click(container.querySelector('.ct-send'));
};

beforeEach(() => { window.localStorage.clear(); });

describe('the contact page', () => {
  it('greets with the heading and shows how to reach the studio', () => {
    const { container } = mount();

    expect(container.querySelector('.ct-hero h1').textContent).toContain('TALK TO THE');
    expect(container.querySelector('.ct-hero h1 em').textContent).toBe('FANDOMVERSE');

    const details = container.querySelector('.ct-details');
    expect(details.querySelector('a[href^="mailto:"]')).toBeInTheDocument();
    expect(details.querySelector('a[href^="tel:"]')).toBeInTheDocument();
    expect(details.textContent).toMatch(/Karachi/i);
    expect(details.querySelectorAll('.ct-socials li')).toHaveLength(4);
    expect(container.querySelector('.universal-nav-contact')).toBeInTheDocument();
  });

  it('labels every field instead of relying on placeholders', () => {
    const { container } = mount();
    ['name', 'email', 'subject', 'message'].forEach((name) => {
      const label = container.querySelector(`label[for="ct-${name}"]`);
      expect(label).toBeInTheDocument();
      expect(label.textContent.trim().length).toBeGreaterThan(0);
      expect(field(container, name)).toBeInTheDocument();
    });
    expect(field(container, 'email').getAttribute('type')).toBe('email');
  });

  it('refuses an empty form and says what is missing', () => {
    const { container } = mount();
    submit(container);

    expect(container.querySelectorAll('.ct-error')).toHaveLength(4);
    ['name', 'email', 'subject', 'message'].forEach((name) => {
      expect(field(container, name).getAttribute('aria-invalid')).toBe('true');
      expect(field(container, name).getAttribute('aria-describedby')).toBe(`ct-${name}-error`);
    });
    expect(container.querySelector('.ct-sent')).toBeNull();
  });

  it('catches a malformed email and a too-short message', () => {
    const { container } = mount();
    fill(container, { name: 'Areeba', email: 'areeba@', subject: 'Order', message: 'hi' });
    submit(container);

    expect(container.querySelector('#ct-email-error').textContent).toMatch(/does not look right/i);
    expect(container.querySelector('#ct-message-error').textContent).toMatch(/more detail/i);
    expect(container.querySelector('.ct-sent')).toBeNull();
  });

  it('clears a complaint as soon as the field is fixed', () => {
    const { container } = mount();
    submit(container);
    expect(container.querySelector('#ct-name-error')).toBeInTheDocument();

    fill(container, { name: 'Areeba' });
    expect(container.querySelector('#ct-name-error')).toBeNull();
    expect(field(container, 'name').getAttribute('aria-invalid')).toBeNull();
  });

  it('confirms with a transmission animation instead of an alert', async () => {
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = mount();
    fill(container, { name: 'Areeba Khan', email: 'areeba@example.com', subject: 'Vault order', message: 'I want to ask about the Demon Slayer print run.' });
    submit(container);

    const sent = await waitFor(() => {
      const node = container.querySelector('.ct-sent');
      expect(node).toBeInTheDocument();
      return node;
    });
    expect(sent.getAttribute('role')).toBe('status');
    expect(sent.querySelector('h2').textContent).toBe('TRANSMISSION SENT');
    expect(sent.querySelector('.ct-sent-mark').textContent).toContain('✓');
    expect(sent.textContent).toContain('Areeba');
    expect(alert).not.toHaveBeenCalled();

    // The success state can be cleared for another message.
    fireEvent.click(within(sent).getByRole('button', { name: /send another message/i }));
    expect(container.querySelector('.ct-sent')).toBeNull();
    expect(field(container, 'message').value).toBe('');
    alert.mockRestore();
  });

  it('embeds a map and offers GPS on request', async () => {
    const getCurrentPosition = jest.fn((success) => success({ coords: { latitude: 24.86, longitude: 67.01 } }));
    Object.defineProperty(window.navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });

    const { container } = mount();
    const map = container.querySelector('.ct-map iframe');
    expect(map.getAttribute('title')).toMatch(/map/i);
    expect(map.getAttribute('src')).toContain('google.com/maps');
    expect(container.querySelector('.ct-directions').getAttribute('href')).toContain('google.com/maps/dir');

    fireEvent.click(container.querySelector('.ct-gps-button'));
    await waitFor(() => expect(container.querySelector('.ct-gps-note').textContent).toMatch(/24\.86/));
    expect(getCurrentPosition).toHaveBeenCalled();
  });

  it('keeps the page usable when location is refused', async () => {
    Object.defineProperty(window.navigator, 'geolocation', {
      value: { getCurrentPosition: (success, failure) => failure(new Error('denied')) },
      configurable: true,
    });

    const { container } = mount();
    fireEvent.click(container.querySelector('.ct-gps-button'));

    await waitFor(() => expect(container.querySelector('.ct-gps-note').textContent).toMatch(/could not read your location/i));
    expect(container.querySelector('.ct-gps-button').textContent).toBe('Use my location');
  });

  it('repaints for the light theme with its own ink', () => {
    const { container } = mount();
    fireEvent.click(within(container.querySelector('.universal-nav')).getByRole('button', { name: /switch to light theme/i }));

    expect(container.querySelector('.ct-page').className).toContain('theme-light');
    expect(window.localStorage.getItem('contact-theme')).toBe('light');
    // The light stage is a deep lavender, not near-white, and it carries a pattern.
    expect(CSS).toMatch(/\.ct-page\.theme-light \{[^}]*--ink: #1a1030/);
    expect(CSS).toMatch(/\.ct-page\.theme-light \{[^}]*--danger: #b3261e/);
    expect(CSS).toMatch(/\.ct-page\.theme-light \{[^}]*#e7dcff/);
    expect(CSS).toMatch(/\.theme-light \.ct-page::after \{[^}]*repeating-linear-gradient/);
    expect(CSS).toMatch(/\.theme-light \.ct-field input,[^{]*\{[^}]*background: rgba\(255, 255, 255/);
    // The heading sits at the top with geometry around it, not a bare band.
    expect(CSS).toMatch(/\.ct-hero-shapes \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.ct-shape\.is-ring \{/);
    expect(CSS).toMatch(/\.ct-shape\.is-shard \{/);
    expect(container.querySelectorAll('.ct-shape').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelector('.ct-shape.is-dot')).toBeInTheDocument();
    expect(container.querySelector('.ct-lede').textContent.length).toBeGreaterThan(40);
    // The footer no longer floats above an empty band at the bottom: the page
    // root carries no bottom padding, because the footer is its last child and
    // the padding showed up as a bare strip of page background under it. The
    // gap above the footer belongs to .ct-map's own padding.
    expect(CSS).not.toMatch(/\.ct-page \{[^}]*padding-bottom:/);
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('joins the page to the shared footer without covering the map', () => {
    const { container } = mount();

    expect(container.querySelector('.ct-page > .site-footer')).toBeInTheDocument();
    // A negative margin here dragged the footer up over the map section and hid
    // the directions button, so the seam is a hairline and a shadow instead and
    // the space belongs to .ct-map.
    expect(CSS).not.toMatch(/\.ct-page > \.site-footer \{[^}]*margin-top: -/);
    expect(CSS).toMatch(/\.ct-map \{[^}]*padding: 84px 24px 40px/);
    expect(CSS).toMatch(/\.ct-page > \.site-footer \{[^}]*border-top: 1px solid/);
    expect(CSS).toMatch(/\.theme-light \.ct-page > \.site-footer \{[^}]*border-top-color/);
  });

  it('gives the directions link the full treatment of a control', () => {
    const { container } = mount();
    const link = container.querySelector('.ct-directions');

    // It opens a new tab, so it is marked as such for screen readers too.
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.querySelector('.ct-directions-arrow')).toBeInTheDocument();
    expect(CSS).toMatch(/\.ct-directions \{[^}]*display: inline-flex/);
    expect(CSS).toMatch(/\.ct-directions \{[^}]*border-radius: 999px/);
    expect(CSS).toMatch(/\.ct-directions \{[^}]*transition:/);
    expect(CSS).toMatch(/\.ct-directions:focus-visible \{[^}]*outline:/);
  });

  it('frames the hero copy with a signal row above and below it', () => {
    const { container } = mount();

    // The geometry sits behind the words, and the words are bracketed by the
    // studio signal rows rather than floating in an empty band.
    const shapes = container.querySelector('.ct-hero-shapes');
    const meta = container.querySelector('.ct-hero-meta');
    const signal = container.querySelector('.ct-hero-signal');
    expect(shapes).toBeInTheDocument();
    expect(meta).toBeInTheDocument();
    expect(signal).toBeInTheDocument();
    expect(shapes.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(meta.compareDocumentPosition(signal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(meta.textContent).toMatch(/FV \/ OPEN CHANNEL/);
    expect(signal.querySelector('b').textContent).toBe('MESSAGE CHANNEL ONLINE');
    // The signal line is a gradient rule, so the row is a real control-looking
    // element rather than a bare word.
    expect(CSS).toMatch(/\.ct-hero-signal span \{[^}]*linear-gradient/);
    expect(CSS).toMatch(/\.ct-hero-meta \{[^}]*justify-content: space-between/);
    // The orbit and the crosshair are what the heading is dressed with.
    expect(CSS).toMatch(/\.ct-shape\.is-orbit-line \{/);
    expect(CSS).toMatch(/\.ct-shape\.is-crosshair \{/);
    expect(container.querySelector('.ct-shape.is-orbit-line')).toBeInTheDocument();
    expect(container.querySelector('.ct-shape.is-crosshair')).toBeInTheDocument();
  });

  it('sets the studio name as one horizontal line instead of a wrapped stack', () => {
    const { container } = mount();
    const h1 = container.querySelector('.ct-hero h1');

    expect(h1.textContent.replace(/\s+/g, ' ').trim()).toBe('TALK TO THE FANDOMVERSE');
    // nowrap plus a viewport-scaled size: the name stays on one line at any width
    // instead of breaking into a three-word column.
    expect(CSS).toMatch(/\.ct-hero h1 \{[^}]*white-space: nowrap/);
    expect(CSS).toMatch(/\.ct-hero h1 \{[^}]*font-size: clamp\(/);
    // The only width where the clamp minimum cannot fit is a phone, so that is
    // the one breakpoint where the line is allowed to wrap.
    expect(CSS).toMatch(/@media \(max-width: 720px\) \{[^@]*\.ct-hero h1 \{ white-space: normal; \}/);
    // The outlined half is stroked rather than filled, which is what separates
    // FANDOMVERSE from the words before it.
    expect(CSS).toMatch(/\.ct-hero h1 em \{[^}]*-webkit-text-stroke: 2px var\(--cyan\)/);
  });

  it('sends "Back to the beginning" to the top of this page, not to home', () => {
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    const { container } = mount();

    const button = within(container.querySelector('.footer-bottom')).getByRole('button', { name: /back to the beginning/i });
    fireEvent.click(button);

    // It is an action, not a link, so it must not navigate away to #home.
    expect(button.tagName).toBe('BUTTON');
    expect(container.querySelector('.footer-bottom a')).toBeNull();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('leaves the nav bar something to stick to', () => {
    // A <body> that scrolls is the nearest scrollport for the sticky nav, and a
    // body sized by its own content never scrolls, so the bar rides away with
    // the page. `hidden` on either axis forces the other to auto and does
    // exactly that; `clip` cuts the overflow off without becoming a scrollport.
    const bodyRule = CSS.match(/body:has\(\.ct-page\)\s*\{([^}]*)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule[1]).toMatch(/overflow-x:\s*clip/);
    expect(bodyRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*hidden/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/);
  });

  it('does not make the page root its own scrollport', () => {
    // `overflow: hidden` on the page root turned it into a scrollport, and a
    // sticky nav inside a box that never scrolls simply never sticks. It also
    // clipped the split section, the form and the map off the bottom.
    // The fix is commented with the value it replaced, so drop comments first.
    const page = CSS.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.ct-page\s*\{([^}]*)\}/)[1];
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/overflow-x:\s*clip/);
    expect(page).toMatch(/overflow-y:\s*visible/);
  });
});
