import { fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import About from './pages/about';

const CSS = fs.readFileSync(path.join(__dirname, 'pages/about.css'), 'utf8');
// The shared footer is styled by its own stylesheet, and the About page is one
// of the pages that renders it, so its tokens are asserted from here.
const FOOTER_CSS = fs.readFileSync(path.join(__dirname, 'components/SiteFooter.css'), 'utf8');
const FANDOMS = ['Anime', 'Gaming', 'Movies', 'TV Shows', 'K-Pop', 'Comics', 'Manga'];

const mount = () => render(<About />);
const nodes = (container) => [...container.querySelectorAll('.ab-node')];
const detail = (container) => container.querySelector('.ab-chapter-detail');

beforeEach(() => { window.localStorage.clear(); });

describe('the about page', () => {
  it('leads with the story heading and a short intro', () => {
    const { container } = mount();
    const hero = container.querySelector('.ab-hero');

    expect(hero.querySelector('h1').textContent).toContain('THE STORY BEHIND');
    expect(hero.querySelector('h1 em').textContent).toBe('FANDOMVERSE');
    expect(hero.querySelector('.ab-lede').textContent.length).toBeLessThan(400);
    expect(container.querySelector('.universal-nav-about')).toBeInTheDocument();
  });

  it('sets the story heading as one line, in its own ink', () => {
    const { container } = mount();
    const h1 = container.querySelector('.ab-hero h1');

    expect(h1.textContent.replace(/\s+/g, ' ').trim()).toBe('THE STORY BEHIND FANDOMVERSE');
    // Another page ships a bare `h1` rule and puts --paper on :root, so an
    // unwritten `color` here would resolve to a cream that vanishes on the pale
    // light canvas.
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*color: var\(--ink\)/);
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*font-size: clamp\(/);
    // The outline has to scale with the text or a 2px stroke swallows it.
    expect(CSS).toMatch(/\.ab-hero h1 em \{[^}]*-webkit-text-stroke: 2px var\(--gold\)/);
    expect(CSS).toMatch(/\.theme-light \.ab-hero h1/);
  });

  it('opens with a story plate beside the copy, so the hero is not empty space', () => {
    const { container } = mount();
    const hero = container.querySelector('.ab-hero');

    // The layout pairs an illustrated plate with the copy, not a bare heading.
    expect(hero.querySelector('.ab-hero-layout')).toBeInTheDocument();
    expect(hero.querySelector('.ab-story-card')).toBeInTheDocument();
    expect(hero.querySelector('.ab-hero-copy')).toBeInTheDocument();
    expect(hero.querySelector('.ab-story-card img')).toBeInTheDocument();
    expect(hero.querySelector('.ab-kicker')).toBeInTheDocument();
    // Three stats under the lede.
    expect(hero.querySelectorAll('.ab-hero-stats > div')).toHaveLength(3);
    // Soft geometry dresses the opening, and the copy sits above it.
    expect(CSS).toMatch(/\.ab-hero-shapes \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.ab-shape\.is-ring \{/);
    expect(CSS).toMatch(/\.ab-shape\.is-shard \{/);
    expect(hero.querySelector('.ab-shape.is-dot')).toBeInTheDocument();
    expect(hero.querySelector('.ab-shape.is-ring')).toBeInTheDocument();
    expect(CSS).toMatch(/\.ab-hero-copy \{[^}]*z-index: 2/);
  });

  it('keeps every section the page is meant to have', () => {
    const { container } = mount();
    const headings = [...container.querySelectorAll('h2')].map((node) => node.textContent.replace(/\s+/g, ' ').trim());

    expect(headings).toEqual(expect.arrayContaining([
      'WHY FANDOMVERSE',
      'TURN THE PAGE.FIND YOUR WORLD.',
      'THE PEOPLE BEHIND IT',
      'KEEP THEFEELING ALIVE.',
    ]));
    expect(container.querySelectorAll('.ab-why-card')).toHaveLength(3);
    expect(container.querySelectorAll('.ab-member')).toHaveLength(4);
  });

  it('lays out seven chapters on a numbered rail', () => {
    const { container } = mount();
    const rail = container.querySelector('.ab-chapter-rail');

    // The rail carries a number, a name and a cue on every row, so it reads as
    // a table of contents rather than a row of anonymous tabs.
    expect(rail.querySelectorAll('.ab-node')).toHaveLength(7);
    expect(nodes(container).map((node) => node.querySelector('span').textContent)).toEqual(FANDOMS);
    expect(nodes(container).map((node) => node.querySelector('small').textContent))
      .toEqual(['01', '02', '03', '04', '05', '06', '07']);
    nodes(container).forEach((node) => { expect(node.querySelector('b')).toBeInTheDocument(); });
  });

  it('repaints the chapter panel when a different fandom is chosen', () => {
    const { container } = mount();

    expect(detail(container).querySelector('h3').textContent).toBe('Anime');
    expect(detail(container).querySelector('.ab-chapter-label').textContent).toBe('NOW READING');
    expect(detail(container).querySelector('.ab-chapter-image img')).toBeInTheDocument();

    fireEvent.click(nodes(container).find((node) => node.querySelector('span').textContent === 'K-Pop'));
    expect(detail(container).querySelector('h3').textContent).toBe('K-Pop');
    expect(detail(container).textContent).toContain('K-Pop');
    const chosen = nodes(container).find((node) => node.querySelector('span').textContent === 'K-Pop');
    const other = nodes(container).find((node) => node.querySelector('span').textContent === 'Anime');
    expect(chosen.getAttribute('aria-selected')).toBe('true');
    expect(other.getAttribute('aria-selected')).toBe('false');
  });

  it('marks the chapters up as a tab set for keyboard and screen readers', () => {
    const { container } = mount();
    const rail = container.querySelector('.ab-chapter-rail');

    expect(rail.getAttribute('role')).toBe('tablist');
    nodes(container).forEach((node) => {
      expect(node.getAttribute('role')).toBe('tab');
      expect(node.getAttribute('aria-controls')).toBe('ab-map-detail');
    });
    const panel = detail(container);
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('ab-tab-anime');
  });

  it('uses images that exist and repaints for the light theme', () => {
    const { container } = mount();

    container.querySelectorAll('img').forEach((node) => {
      expect(fs.existsSync(path.join(__dirname, '../public', node.getAttribute('src')))).toBe(true);
    });
    expect(container.querySelector('.ab-page').className).toContain('theme-dark');
    fireEvent.click(within(container.querySelector('.universal-nav')).getByRole('button', { name: /switch to light theme/i }));
    expect(container.querySelector('.ab-page').className).toContain('theme-light');
    expect(window.localStorage.getItem('about-theme')).toBe('light');

    // Every ink colour flips with the theme, so nothing stays unreadable. The
    // light stage is a pale lavender, not near-white, and it carries a pattern.
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--ink: #1a1030/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--muted: #6a5d84/);
    expect(CSS).toMatch(/\.theme-light \.ab-page::after \{[^}]*repeating-linear-gradient/);
    // The pale canvas cannot carry the bright dark-stage accents, so the light
    // theme steps gold and cyan down for text-sized use.
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--gold: #a9760a/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--cyan: #0d7f95/);
    // The story plate keeps dark ink on its own paper surface in both themes.
    expect(CSS).toMatch(/\.ab-story-card \{[^}]*color: #24152b/);
    expect(CSS).toMatch(/\.theme-light \.ab-story-card \{[^}]*color: #24152b/);
    // The footer no longer floats above an empty band at the bottom: the page
    // root carries no bottom padding, because the footer is its last child and
    // the padding showed up as a bare strip of page background under it. The
    // breathing room before the footer moved into the last block instead.
    expect(CSS).not.toMatch(/\.ab-page \{[^}]*padding-bottom:/);
    expect(CSS).toMatch(/\.ab-mission \{[^}]*padding: 112px 24px 80px/);
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('lets the sticky nav reach the viewport instead of trapping it', () => {
    mount();
    // `overflow: hidden` on the page root makes it a scrollport of its own, and
    // a sticky nav inside a box that never scrolls simply never sticks. `clip`
    // still contains the decorative glows that hang off both edges.
    expect(CSS).not.toMatch(/\.ab-page \{[^}]*overflow: hidden/);
    expect(CSS).toMatch(/\.ab-page \{[^}]*overflow-x: clip/);
    // The blanket layer rule must skip the nav and the footer, both of which
    // carry their own stacking and would otherwise be pinned to z-index 1.
    expect(CSS).toMatch(/\.ab-page > \*:not\(\.ab-glow\):not\(\.universal-nav\):not\(\.site-footer\)/);
  });

  it('colors the shared footer from its own tokens, not an undefined --accent', () => {
    mount();
    // Only a couple of pages define --accent, and they define it on their own
    // page root. Reading it unguarded made every accent rule invalid at
    // computed-value time, which silently cost the footer its top border, its
    // logo ring, the dashed spinner and its gold headings.
    expect(FOOTER_CSS).toMatch(/--foot-accent: var\(--accent, /);
    expect(FOOTER_CSS).not.toMatch(/color[^;]*var\(--accent\)/);
    expect(FOOTER_CSS).toMatch(/--foot-on-accent: #f7f1e6/);
  });

  it('offers a theme switch that reads as a control in the nav', () => {
    const NAV_CSS = fs.readFileSync(path.join(__dirname, 'components/SiteNav.css'), 'utf8');
    const { container } = mount();

    const toggle = container.querySelector('.universal-theme-button');
    expect(toggle).toBeInTheDocument();
    // It has to be a pill with its own surface, not a bare icon that reads as
    // decoration next to the real controls.
    expect(NAV_CSS).toMatch(/\.universal-theme-button \{[^}]*border-radius: 999px/);
    expect(NAV_CSS).toMatch(/\.universal-theme-button \{[^}]*border: 1px solid/);
    expect(NAV_CSS).toMatch(/\.universal-theme-button \{[^}]*background:/);
    expect(NAV_CSS).toMatch(/\.universal-theme-button:hover \{[^}]*border-color: var\(--nav-accent\)/);
    // The icon needs a fixed size, otherwise width:100% squashes it inside the pill.
    expect(NAV_CSS).toMatch(/\.universal-theme-button svg \{[^}]*width: 15px/);

    fireEvent.click(toggle);
    expect(container.querySelector('.ab-page').className).toContain('theme-light');
  });

  it('seats the shared footer under the mission band', () => {
    const { container } = mount();
    const footer = container.querySelector('.ab-page > .site-footer');

    expect(footer).toBeInTheDocument();
    // The mission band's surface runs to the end of its section, so the footer
    // needs a positive gap and a marked seam. A negative margin would drag the
    // footer up over the closing buttons.
    expect(CSS).not.toMatch(/\.ab-page > \.site-footer \{[^}]*margin-top: -/);
    expect(CSS).toMatch(/\.ab-page > \.site-footer \{[^}]*margin-top: 28px/);
    expect(CSS).toMatch(/\.ab-page > \.site-footer \{[^}]*border-top: 1px solid/);
    // The light seam has to be written `.ab-page.theme-light`, because the theme
    // class is applied to the page root itself. The older `.theme-light .ab-page`
    // form asks for a themed *ancestor* of the root, which never exists, so the
    // whole rule was inert; the light stage silently kept the dark-stage seam.
    expect(CSS).not.toMatch(/\.theme-light \.ab-page > \.site-footer/);
    expect(CSS).toMatch(/\.ab-page\.theme-light > \.site-footer \{[^}]*box-shadow/);
    // The scroll-to-top control lives in that footer on every page.
    expect(within(footer).getByRole('button', { name: /back to the beginning/i })).toBeInTheDocument();
  });

  it('keeps the text short and links onward', () => {
    const { container } = mount();
    const copy = container.textContent;

    expect(copy.length).toBeLessThan(3200);
    expect(container.querySelector('.ab-cta').getAttribute('href')).toBe('#shop');
    expect(screen.getAllByRole('link', { name: /talk to us/i })[0].getAttribute('href')).toBe('#contact');
  });
});
