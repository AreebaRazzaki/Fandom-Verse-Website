import { render, within } from '@testing-library/react';
import SiteFooter from './components/SiteFooter';

// The platform each circle claims to be, so a link that points somewhere else is
// a failure rather than a surprise: copying the four anchors around in a row is
// exactly how a YouTube link ends up under the Instagram one.
const HOST_FOR = {
  Instagram: 'instagram.com',
  X: 'x.com',
  Discord: 'discord.com',
  YouTube: 'youtube.com',
};

const mount = () => render(<SiteFooter />);
const socials = (container) => [...container.querySelectorAll('.social-links a')];
const host = (href) => new URL(href).hostname.replace(/^www\./, '');

describe('the social links in the footer', () => {
  it('sends each circle to the platform it names, not to this page', () => {
    const { container } = mount();
    const links = socials(container);

    expect(links).toHaveLength(4);

    for (const link of links) {
      const name = link.getAttribute('aria-label');
      const href = link.getAttribute('href');

      // A bare `#instagram` is an anchor to the current page: the click appears
      // to do nothing, which is what these were before.
      expect(href).not.toMatch(/^#/);
      expect(href.startsWith('https://')).toBe(true);
      // The bare host, so `www.instagram.com` and `instagram.com` both count as
      // the platform rather than one of them quietly drifting to a lookalike.
      expect(host(href)).toBe(HOST_FOR[name]);
    }
  });

  it('opens them in a new tab without handing over the opener or the referrer', () => {
    const { container } = mount();

    for (const link of socials(container)) {
      expect(link.getAttribute('target')).toBe('_blank');
      // Without noopener the opened page can reach back through window.opener and
      // navigate this one; noreferrer also keeps the visitor off their radar.
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('keeps the short glyphs, so the circles look the way they did', () => {
    const { container } = mount();
    const labels = socials(container).map((link) => link.textContent);

    // The design is a 31px circle around two letters; the accessible name comes
    // from aria-label instead, so the glyph is free to stay short.
    expect(labels).toEqual(['ig', 'x', 'dc', 'yt']);
    for (const link of socials(container)) {
      expect(link.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('leaves the in-page links in the footer alone', () => {
    const { container } = mount();
    const connect = container.querySelector('.footer-connect');

    // Only the social circles leave the site. Sign in, About and Contact are
    // still on the page, so they must not have picked up a new tab either.
    for (const link of within(connect).getAllByRole('link')) {
      // `social-links` sits on the wrapper, not on the circles inside it.
      if (link.closest('.social-links')) continue;
      const href = link.getAttribute('href');

      expect(href.startsWith('#')).toBe(true);
      expect(link.getAttribute('target')).toBeNull();
    }
  });
});
