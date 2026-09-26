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
const detail = (container) => container.querySelector('.ab-map-detail');

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

  it('keeps every section the page is meant to have', () => {
    const { container } = mount();
    const headings = [...container.querySelectorAll('h2')].map((node) => node.textContent);

    expect(headings).toEqual(expect.arrayContaining([
      'WHY FANDOMVERSE',
      'FANDOM UNIVERSE MAP',
      'THE PEOPLE BEHIND IT',
      'OUR MISSION',
    ]));
    expect(container.querySelectorAll('.ab-why-card')).toHaveLength(3);
    expect(container.querySelectorAll('.ab-member')).toHaveLength(4);
  });

  it('connects the seven fandoms in one universe map', () => {
    const { container } = mount();
    const map = container.querySelector('.ab-map');

    expect(nodes(container).map((node) => node.textContent)).toEqual(FANDOMS);
    // One hub with every fandom orbiting it, so the map reads as a system.
    expect(map.querySelector('.ab-hub-core').textContent).toBe('FANDOMVERSE');
    expect(map.querySelectorAll('.ab-satellite')).toHaveLength(7);
    FANDOMS.forEach((fandom) => {
      expect(map.querySelector(`.ab-satellite`).textContent).toBe('Anime');
      expect([...map.querySelectorAll('.ab-satellite')].some((node) => node.textContent === fandom)).toBe(true);
    });
    expect(detail(container).textContent).toContain('Anime');
  });

  it('redraws the map when a different fandom is chosen', () => {
    const { container } = mount();

    fireEvent.click(nodes(container).find((node) => node.textContent === 'K-Pop'));
    expect(detail(container).textContent).toContain('K-Pop');
    expect(detail(container).querySelector('h3').textContent).toBe('K-Pop');
    expect(nodes(container).find((node) => node.textContent === 'K-Pop').getAttribute('aria-selected')).toBe('true');
    expect(nodes(container).find((node) => node.textContent === 'Anime').getAttribute('aria-selected')).toBe('false');
    // Only the chosen node lights up on the ring.
    expect(container.querySelectorAll('.ab-satellite.is-active')).toHaveLength(1);
  });

  it('marks the map up as a tab set for keyboard and screen readers', () => {
    const { container } = mount();
    const map = container.querySelector('.ab-map');

    expect(map.querySelector('[role="tablist"]')).toBeInTheDocument();
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
    // light stage is a deep lavender, not near-white, and it carries a pattern.
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--ink: #1a1030/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--muted: #6a5d84/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*#e7dcff/);
    expect(CSS).toMatch(/\.theme-light \.ab-page::after \{[^}]*repeating-linear-gradient/);
    // The hero is dressed with geometry and a stat strip instead of empty space.
    expect(CSS).toMatch(/\.ab-hero-shapes \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.ab-shape\.is-ring \{/);
    expect(CSS).toMatch(/\.ab-shape\.is-shard \{/);
    expect(CSS).toMatch(/\.ab-hero-stats \{[^}]*grid-template-columns: repeat\(3/);
    expect(container.querySelectorAll('.ab-shape').length).toBeGreaterThanOrEqual(6);
    expect(container.querySelector('.ab-shape.is-dot')).toBeInTheDocument();
    // The footer no longer floats above an empty band at the bottom.
    expect(CSS).toMatch(/\.ab-page \{[^}]*padding-bottom: 80px/);
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('sets the story heading as one horizontal line on a readable veil', () => {
    const { container } = mount();
    const h1 = container.querySelector('.ab-hero h1');

    expect(h1.textContent.replace(/\s+/g, ' ').trim()).toBe('THE STORY BEHIND FANDOMVERSE');
    // A long name set in a viewport-scaled size stays on one line instead of
    // breaking into a three-word column.
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*white-space: nowrap/);
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*font-size: clamp\(/);
    // The outline has to scale with the text or a 2px stroke swallows it.
    expect(CSS).toMatch(/\.ab-hero h1 em \{[^}]*-webkit-text-stroke: clamp\(/);
    // The copy sits on its own veil, above the geometry, in both themes.
    expect(container.querySelector('.ab-hero-inner')).toBeInTheDocument();
    expect(CSS).toMatch(/\.ab-hero-inner \{[^}]*z-index: 1/);
    expect(CSS).toMatch(/\.ab-page \{[^}]*--veil: rgba\(10, 7, 16/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--veil: rgba\(255, 255, 255/);
  });

  it('states its own ink and measure, so no other page can repaint the heading', () => {
    mount();
    // Another page ships a bare `h1` rule and puts --paper on :root, so an
    // unwritten `color` here resolves to a cream that vanishes on the pale
    // light canvas. The heading also has to drop the inherited max-width, or
    // `nowrap` overflows the measure it was given.
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*color: var\(--ink\)/);
    expect(CSS).toMatch(/\.ab-hero h1 \{[^}]*max-width: none/);
    expect(CSS).toMatch(/\.theme-light \.ab-hero h1 \{[^}]*color:/);
  });

  it('keeps the light stage readable rather than reusing the dark inks', () => {
    mount();
    // The pale lavender canvas cannot carry the bright dark-stage accents, so
    // the light theme steps gold and cyan down for text-sized use.
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--gold: #7a5104/);
    expect(CSS).toMatch(/\.ab-page\.theme-light \{[^}]*--cyan: #0a6b7e/);
    // Surfaces that paint dark ink on top of gold keep the light fill, so the
    // gold text token can stay dark.
    expect(CSS).toMatch(/\.ab-page \{[^}]*--gold-fill: /);
    expect(CSS).toMatch(/\.ab-cta \{[^}]*background: var\(--gold-fill\)/);
    expect(CSS).toMatch(/\.ab-hub-core \{[^}]*var\(--gold-fill\)/);
    // A solid cyan node needs dark ink on the dark stage; the deep light-stage
    // cyan flips it back to white.
    expect(CSS).toMatch(/\.ab-node\.is-active \{[^}]*color: #1a0b16/);
    expect(CSS).toMatch(/\.theme-light \.ab-node\.is-active \{[^}]*color: #fff/);
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

  it('numbers each band so the page reads as an ordered story', () => {
    const { container } = mount();
    const eyebrows = [...container.querySelectorAll('.ab-eyebrow')];

    expect(eyebrows).toHaveLength(4);
    expect(eyebrows.map((node) => node.querySelector('b').textContent)).toEqual(['01', '02', '03', '04']);
    // Every eyebrow sits inside the band it labels.
    ['.ab-why', '.ab-map', '.ab-team', '.ab-mission'].forEach((section) => {
      expect(container.querySelector(`${section} .ab-eyebrow`)).toBeInTheDocument();
    });
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

    expect(copy.length).toBeLessThan(2600);
    expect(container.querySelector('.ab-cta').getAttribute('href')).toBe('#shop');
    expect(screen.getAllByRole('link', { name: /talk to us/i })[0].getAttribute('href')).toBe('#contact');
  });
});
