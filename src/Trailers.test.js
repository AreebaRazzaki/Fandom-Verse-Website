import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import Trailers from './pages/trailers';
import SiteNav from './components/SiteNav';

const VAULT = require('../public/assets/json data/trailers.json');
const TRAILERS = VAULT.trailers;
const FANDOM_IDS = ['anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga'];

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const readJsx = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(VAULT) });

const mount = async (ui = <Trailers />, fetchImpl = okFetch) => {
  global.fetch = jest.fn(fetchImpl);
  const view = render(ui);
  await waitFor(() => expect(view.container.querySelector('.vault-collection')).not.toBeNull());
  return view;
};

// The vault never opens on a fetch failure, so this waits on the error state instead.
const mountBroken = async (fetchImpl) => {
  global.fetch = jest.fn(fetchImpl);
  const view = render(<Trailers />);
  await waitFor(() => expect(view.container.querySelector('.vault-note-error')).not.toBeNull());
  return view;
};

// Fandom chips read "Gaming 6" because the count is part of the button, hence a pattern.
const fandomChip = (container, name) =>
  within(container.querySelector('.vault-fandom-bar')).getByRole('button', { name });

// Relative luminance, so contrast is checked on real numbers rather than vibes.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

beforeEach(() => window.localStorage.clear());

describe('trailers.json', () => {
  it('ships 6 trailers for each of the 7 fandoms', () => {
    expect(TRAILERS).toHaveLength(42);
    FANDOM_IDS.forEach((id) => {
      expect(TRAILERS.filter((t) => t.category === id)).toHaveLength(6);
    });
  });

  it('covers all 7 fandoms with no empty section', () => {
    expect(new Set(TRAILERS.map((t) => t.category)).size).toBe(7);
  });

  it('gives every trailer the fields the player and card need', () => {
    TRAILERS.forEach((t) => {
      expect(typeof t.id).toBe('string');
      expect(t.title.length).toBeGreaterThan(4);
      expect(t.blurb.length).toBeGreaterThan(40);
      expect(t.studio).toBeTruthy();
      expect(t.badge).toBeTruthy();
      expect(t.runtime).toMatch(/^\d+:\d{2}$/);
      expect(Number.isNaN(new Date(`${t.releaseDate}T00:00:00`).getTime())).toBe(false);
      expect(['upcoming', 'released']).toContain(t.status);
    });
  });

  it('uses unique ids so no two trailers share a slot', () => {
    expect(new Set(TRAILERS.map((t) => t.id)).size).toBe(TRAILERS.length);
  });

  it('gives every trailer a real YouTube video id', () => {
    TRAILERS.forEach((t) => expect(t.videoId).toMatch(/^[\w-]{11}$/));
  });

  it('has both released and upcoming entries so the status filter has something to show', () => {
    expect(TRAILERS.filter((t) => t.status === 'released').length).toBeGreaterThan(0);
    expect(TRAILERS.filter((t) => t.status === 'upcoming').length).toBeGreaterThan(0);
  });

  it('lives in the projects json data folder next to the articles file', () => {
    const path = require('path');
    expect(require('fs').existsSync(path.join(__dirname, '..', 'public', 'assets', 'json data', 'trailers.json'))).toBe(true);
  });
});

describe('routing', () => {
  it('opens the vault on #trailers', async () => {
    window.location.hash = '#trailers';
    global.fetch = jest.fn(okFetch);
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.vault-collection')).not.toBeNull());
    expect(container.querySelector('nav.universal-nav')).not.toBeNull();
  });

  it('is reachable from the nav discover menu', () => {
    render(<SiteNav theme="dark" setTheme={() => {}} active="discover" />);
    fireEvent.click(screen.getByRole('button', { name: /discover/i }));
    expect(screen.getByRole('link', { name: 'Trailers' })).toHaveAttribute('href', '#trailers');
  });
});

describe('vault hero', () => {
  it('leads with the TRAILER VAULT name and the tagline', async () => {
    const { container } = await mount();
    expect(container.querySelector('.vault-hero h1').textContent.replace(/\s+/g, ' ')).toBe('TRAILER VAULT');
    expect(container.querySelector('.vault-tagline').textContent).toBe(VAULT.tagline);
    expect(VAULT.tagline).toBe('Watch what’s coming to your universe.');
  });

  it('hangs blurred movie frames behind the hero', async () => {
    const { container } = await mount();
    const frames = container.querySelectorAll('.vault-frame');
    expect(frames.length).toBeGreaterThanOrEqual(6);
    frames.forEach((frame) => expect(frame.style.getPropertyValue('--frame')).toMatch(/url\(/));

    const css = readCss('pages/trailers.css');
    expect(css).toMatch(/\.vault-frames\s*\{[^}]*filter:\s*blur\(/);
  });

  it('runs the thin progress line under the hero', async () => {
    const { container } = await mount();
    expect(container.querySelector('.vault-progress')).not.toBeNull();
    expect(readCss('pages/trailers.css')).toMatch(/@keyframes vault-sweep/);
  });

  it('stacks hero, featured player, timeline, filters then the collection', async () => {
    const { container } = await mount();
    const nodes = ['.vault-hero', '.vault-featured', '.vault-timeline', '.vault-filters', '.vault-collection']
      .map((name) => container.querySelector(name));

    nodes.forEach((node) => expect(node).not.toBeNull());
    nodes.slice(1).forEach((node, index) => {
      expect(nodes[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});

describe('featured trailer', () => {
  it('embeds one YouTube player beside a 35% info column', async () => {
    const { container } = await mount();
    const lead = TRAILERS.find((t) => t.id === VAULT.featuredId);
    const frame = container.querySelector('.vault-embed iframe');
    expect(frame).not.toBeNull();
    expect(frame.getAttribute('src')).toContain(`/embed/${lead.videoId}`);

    const css = readCss('pages/trailers.css');
    expect(css).toMatch(/\.vault-featured\s*\{[^}]*grid-template-columns:\s*65fr\s+35fr/);
  });

  it('keeps exactly one iframe on the page so 42 videos are not loaded at once', async () => {
    const { container } = await mount();
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('shows category, status, title, blurb and the release date', async () => {
    const { container } = await mount();
    const info = container.querySelector('.vault-featured-info');
    const flags = info.querySelector('.vault-featured-flags').textContent;
    expect(flags).toMatch(/anime|gaming|movies|tv|k-pop|comics|manga/i);
    expect(flags).toMatch(/upcoming|released/i);
    expect(info.querySelector('h2').textContent.length).toBeGreaterThan(4);
    expect(info.querySelector('.vault-featured-blurb').textContent.length).toBeGreaterThan(40);
    expect(info.textContent).toMatch(/Release Date/);
    expect(within(info).getByRole('button', { name: /watch trailer/i })).toBeInTheDocument();
  });

  it('promotes a clicked card into the featured player', async () => {
    const { container } = await mount();
    const target = container.querySelectorAll('.trailer-card')[4];
    const title = target.querySelector('.trailer-title').textContent;

    fireEvent.click(within(target).getByRole('button', { name: /in the featured player/i }));

    await waitFor(() => expect(container.querySelector('.vault-featured-info h2').textContent).toBe(title));
    expect(container.querySelector('.trailer-card.is-featured')).not.toBeNull();
    expect(container.querySelector('.vault-embed iframe').getAttribute('src')).toContain('autoplay=1');
  });
});

describe('trailer timeline', () => {
  it('runs released, today and upcoming along one rail', async () => {
    const { container } = await mount();
    const rail = container.querySelector('.vault-rail');
    expect(rail).not.toBeNull();
    expect(rail.querySelector('.vault-rail-done')).not.toBeNull();
    expect(within(rail).getByText(/today/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.vault-tick').length).toBe(TRAILERS.length);
    expect(container.querySelector('.vault-timeline-ends').textContent).toMatch(/Released/);
    expect(container.querySelector('.vault-timeline-ends').textContent).toMatch(/Upcoming/);
  });

  it('parks the today marker inside the rail', async () => {
    const { container } = await mount();
    const at = parseFloat(container.querySelector('.vault-rail-now').style.left);
    expect(at).toBeGreaterThanOrEqual(1);
    expect(at).toBeLessThanOrEqual(99);
  });
});

describe('filters', () => {
  it('offers every fandom plus an all option', async () => {
    const { container } = await mount();
    const bar = container.querySelector('.vault-fandom-bar');
    ['All', ...FANDOM_IDS.map((id) => id === 'tv' ? 'TV' : id === 'kpop' ? 'K-Pop' : id[0].toUpperCase() + id.slice(1))]
      .forEach((label) => expect(within(bar).getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument());
  });

  it('offers all status, upcoming and released', async () => {
    const { container } = await mount();
    const bar = container.querySelector('.vault-status-bar');
    expect(within(bar).getByRole('button', { name: /All Status/i })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Upcoming/i })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Released/i })).toBeInTheDocument();
  });

  it('narrows the collection in place without a reload', async () => {
    const { container } = await mount();
    fireEvent.click(fandomChip(container, /gaming/i));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(6));
    container.querySelectorAll('.trailer-card').forEach((card) => expect(card.className).toContain('is-gaming'));
  });

  it('stacks the fandom and status filters', async () => {
    const { container } = await mount();
    fireEvent.click(fandomChip(container, /anime/i));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(6));
    fireEvent.click(within(container.querySelector('.vault-status-bar')).getByRole('button', { name: /Upcoming/i }));
    const left = container.querySelectorAll('.trailer-card').length;
    expect(left).toBe(TRAILERS.filter((t) => t.category === 'anime' && t.status === 'upcoming').length);
    expect(left).toBeGreaterThan(0);
  });

  it('goes back to everything', async () => {
    const { container } = await mount();
    fireEvent.click(fandomChip(container, /manga/i));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card').length).toBeLessThan(42));
    fireEvent.click(fandomChip(container, /^all/i));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(9));
  });
});

describe('trailer cards', () => {
  it('cuts the silhouette on the sides instead of rounding it', async () => {
    await mount();
    const css = readCss('pages/trailers.css');
    const card = css.match(/\.trailer-card\s*\{([\s\S]*?)\n\}/)[1];
    const edge = css.match(/\.trailer-card::after\s*\{([\s\S]*?)\n\}/)[1];

    // The blade is painted, not clipped, so the note panel can hang past the card.
    expect(card).not.toMatch(/clip-path/);
    expect(edge).toMatch(/clip-path:\s*var\(--blade\)/);
    // The blade itself is a polygon with real corner cuts and side notches.
    expect(css).toMatch(/--blade:\s*polygon\(/);
    expect(css).toMatch(/calc\(100% - 38px\) 38%/);
    expect(css).not.toMatch(/\.trailer-card[^{]*\{[^}]*border-radius/);
    expect(css).not.toMatch(/\.trailer-inner[^{]*\{[^}]*border-radius/);
  });

  it('gives every card a vertical category label down its left rail', async () => {
    const { container } = await mount();
    const rail = container.querySelector('.trailer-rail i');
    expect(rail).not.toBeNull();
    expect(readCss('pages/trailers.css')).toMatch(/\.trailer-rail i\s*\{[^}]*writing-mode:\s*vertical-rl/);
    container.querySelectorAll('.trailer-card').forEach((card) => {
      expect(card.querySelector('.trailer-rail i').textContent.length).toBeGreaterThan(1);
    });
  });

  it('shows the thumbnail, title, category, status, date and a watch cue', async () => {
    const { container } = await mount();
    const card = container.querySelector('.trailer-card');
    expect(card.querySelector('.trailer-thumb img').getAttribute('src')).toMatch(/i\.ytimg\.com\/vi\/[\w-]{11}\//);
    expect(card.querySelector('.trailer-title').textContent.length).toBeGreaterThan(4);
    expect(card.querySelector('.trailer-flags').textContent).toMatch(/•/);
    expect(card.querySelector('.trailer-date').textContent).toMatch(/Release Date/);
    expect(card.querySelector('.trailer-cta').textContent).toMatch(/Watch/);
  });

  it('links every card straight to its YouTube video', async () => {
    const { container } = await mount();
    container.querySelectorAll('.trailer-card').forEach((card) => {
      const link = within(card).getByRole('link');
      expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('falls back to local art if the thumbnail host is blocked', async () => {
    const { container } = await mount();
    const image = container.querySelector('.trailer-thumb img');
    fireEvent.error(image);
    expect(image.getAttribute('src')).toMatch(/^\/assets\/images\//);
  });

  it('zooms the frame, darkens the overlay, shows the play button and glows on hover', async () => {
    await mount();
    const css = readCss('pages/trailers.css');
    const hover = css.slice(css.indexOf('.trailer-card:hover'));

    expect(hover).toMatch(/\.trailer-thumb img\s*\{[^}]*transform:\s*scale\(/);
    expect(hover).toMatch(/\.trailer-veil\s*\{[^}]*opacity:/);
    expect(hover).toMatch(/\.trailer-play\s*\{[^}]*opacity:\s*1/);
    expect(hover).toMatch(/drop-shadow\(0 0 26px color-mix\(in srgb, var\(--magenta\)/);
    expect(hover).toMatch(/drop-shadow\(0 0 46px color-mix\(in srgb, var\(--cyan\)/);
  });

  it('keeps a keyboard focus ring on the cut shape', async () => {
    await mount();
    expect(readCss('pages/trailers.css')).toMatch(/\.trailer-hit:focus-visible\s*\{[^}]*outline:/);
  });
});

describe('load more', () => {
  it('starts at nine cards and grows the reel on demand', async () => {
    const { container } = await mount();
    expect(container.querySelectorAll('.trailer-card')).toHaveLength(9);

    fireEvent.click(within(container.querySelector('.vault-more')).getByRole('button', { name: /more trailers from the universe/i }));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(18));

    fireEvent.click(within(container.querySelector('.vault-more')).getByRole('button', { name: /more trailers from the universe/i }));
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(27));
  });

  it('hides the button once the whole reel is out', async () => {
    const { container } = await mount();
    const more = () => within(container.querySelector('.vault-more')).getByRole('button', { name: /more trailers from the universe/i });

    // 42 is not a multiple of 9, so the last page is short and the button goes away.
    for (const expected of [18, 27, 36]) {
      fireEvent.click(more());
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(expected));
    }
    fireEvent.click(more());
    await waitFor(() => expect(container.querySelectorAll('.trailer-card')).toHaveLength(42));
    expect(container.querySelector('.vault-more')).toBeNull();
  });
});

describe('theme and readability', () => {
  it('opens dark and keeps magenta and cyan as the only accents', async () => {
    const { container } = await mount();
    expect(container.querySelector('.trailers-page').className).toContain('theme-dark');
    const css = readCss('pages/trailers.css');
    expect(css).toMatch(/--magenta:\s*#ff2d95/i);
    expect(css).toMatch(/--cyan:\s*#00e5ff/i);
  });

  it('flips to the light theme and back', async () => {
    const { container } = await mount();
    fireEvent.click(container.querySelector('.universal-theme-button'));
    await waitFor(() => expect(container.querySelector('.trailers-page').className).toContain('theme-light'));
    fireEvent.click(container.querySelector('.universal-theme-button'));
    await waitFor(() => expect(container.querySelector('.trailers-page').className).toContain('theme-dark'));
  });

  it('keeps body text readable in the dark theme', async () => {
    await mount();
    const dark = readCss('pages/trailers.css').match(/\.trailers-page\.theme-dark\s*\{([\s\S]*?)\}/)[1];
    expect(luminance(dark.match(/--ink:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThan(0.6);
    expect(luminance(dark.match(/--bg:\s*(#[0-9a-f]{6})/i)[1])).toBeLessThan(0.1);
    expect(luminance(dark.match(/--muted:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThan(0.2);
  });

  it('keeps body text readable in the light theme', async () => {
    await mount();
    const light = readCss('pages/trailers.css').match(/\.trailers-page\.theme-light\s*\{([\s\S]*?)\}/)[1];
    expect(luminance(light.match(/--ink:\s*(#[0-9a-f]{6})/i)[1])).toBeLessThan(0.1);
    expect(luminance(light.match(/--bg:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThan(0.6);
    expect(luminance(light.match(/--muted:\s*(#[0-9a-f]{6})/i)[1])).toBeLessThan(0.3);
  });

  it('never leaves the backdrop a flat wash', async () => {
    await mount();
    const css = readCss('pages/trailers.css');
    expect(css).toMatch(/\.vault-beams\s*\{[^}]*conic-gradient/);
    expect(css).toMatch(/\.vault-perf\s*\{[^}]*radial-gradient/);
    expect(css).toMatch(/\.vault-scan\s*\{[^}]*repeating-linear-gradient/);
    expect(css).toMatch(/\.vault-grain\s*\{[^}]*radial-gradient/);
    expect(css.match(/filter:\s*blur\(\d+px\)/g).length).toBeGreaterThanOrEqual(3);
  });
});

describe('states', () => {
  it('shows a retry state when the vault cannot be opened', async () => {
    const { container } = await mountBroken(() => Promise.reject(new Error('offline')));
    expect(within(container).getByRole('alert')).toBeInTheDocument();
    expect(container.querySelector('.vault-collection')).toBeNull();
  });

  it('recovers when the retry succeeds', async () => {
    const { container } = await mountBroken(() => Promise.reject(new Error('offline')));
    global.fetch = jest.fn(okFetch);
    fireEvent.click(within(container).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(container.querySelector('.vault-collection')).not.toBeNull());
  });

  it('shares the site footer so the page is never a dead end', async () => {
    const { container } = await mount();
    expect(container.querySelector('footer.site-footer .footer-logo img')).not.toBeNull();
  });
});

describe('hero and bookmarks', () => {
  it('keeps the wordmark on one horizontal line', async () => {
    const { container } = await mount();
    const heading = container.querySelector('.vault-hero h1');

    expect(heading.textContent.replace(/\s+/g, ' ')).toBe('TRAILER VAULT');
    expect(heading.querySelector('br')).toBeNull();
    expect(readCss('pages/trailers.css')).toMatch(/\.vault-hero h1 em\s*\{[^}]*}/);
    expect(readCss('pages/trailers.css')).not.toMatch(/\.vault-hero h1 em\s*\{[^}]*display:\s*block/);
    expect(readCss('pages/trailers.css')).toMatch(/\.vault-hero h1\s*\{[^}]*white-space:\s*nowrap/);
  });

  it('drops the cyan hero accent in favour of a warm gold that survives the light stage', () => {
    const css = readCss('pages/trailers.css');
    const hero = css.slice(css.indexOf('.vault-hero {'), css.indexOf('.vault-letterbox {'));

    // The hero sits on a cream stage now, so its gold is darkened to stay readable.
    expect(hero).toMatch(/--gold: #b9791a/);
    expect(hero).not.toMatch(/var\(--cyan\)/);
    expect(hero).not.toMatch(/#00e5ff/i);
    expect(hero).toMatch(/color: #1c1030/);
    expect(css).toMatch(/\.vault-progress-rail::after[^}]*var\(--gold\)/);
  });

  it('lifts the hero block into a centred light stage that reads in both themes', () => {
    const css = readCss('pages/trailers.css');
    const hero = css.slice(css.indexOf('.vault-hero {'), css.indexOf('.vault-letterbox {'));

    expect(hero).toMatch(/text-align: center/);
    // The wordmark sits near the top of the page, not pushed down by a tall stage.
    expect(hero).toMatch(/align-items: flex-start/);
    expect(hero).toMatch(/padding: 100px/);
    expect(hero).not.toMatch(/min-height: 74vh/);
    // A cream stage on the dark theme too, so the dark ink above stays legible.
    expect(hero).toMatch(/#fffaf3/);
    expect(css).toMatch(/\.vault-hero-canvas \{[^}]*z-index: -1/);
    expect(css).toMatch(/\.theme-light \.vault-hero-canvas \{[^}]*opacity: \.45/);
    expect(css).toMatch(/\.vault-hero-inner \{[^}]*text-align: center/);
    expect(css).toMatch(/\.vault-hero-stats \{[^}]*margin: 30px auto 0/);
  });

  it('weaves only the gallery, so the page stage keeps the original backdrop', () => {
    const css = readCss('pages/trailers.css');

    // The lattice is a child of the shelf, never of the full page backdrop.
    const source = readJsx('pages/trailers.js');
    const collection = source.slice(source.indexOf('vault-collection'));
    expect(collection.slice(0, collection.indexOf('</section>'))).toMatch(/vault-weave/);

    // Nothing ties the weave to the page stage.
    expect(css).not.toMatch(/\.vault-bg[^{]*\.vault-weave/);
    const backdrop = css.slice(css.indexOf('.vault-bg {'), css.indexOf('}', css.indexOf('.vault-bg {')));
    expect(backdrop).not.toMatch(/vault-weave/);

    // It is stacked behind the cards rather than laid over them.
    expect(css).toMatch(/\.vault-collection \{[^}]*position: relative; z-index: 2/);
    const weave = css.slice(css.indexOf('.vault-weave {'), css.indexOf('.theme-light .vault-weave {'));
    expect(weave).toMatch(/position: absolute/);
    expect(weave).toMatch(/z-index: 0/);
    expect(weave).toMatch(/pointer-events: none/);
    expect(css).toMatch(/\.theme-light \.vault-weave \{[^}]*repeating-linear-gradient/);
  });

  it('never clips the card, so the save note always opens', () => {
    const css = readCss('pages/trailers.css');
    const card = css.match(/\.trailer-card\s*\{([\s\S]*?)\n\}/)[1];
    const edge = css.match(/\.trailer-card::after\s*\{([\s\S]*?)\n\}/)[1];

    expect(card).not.toMatch(/clip-path/);
    expect(edge).toMatch(/clip-path: var\(--blade\)/);
    expect(edge).toMatch(/pointer-events: none/);

    // BookmarkButton folds the className onto its own root, so the anchor has to
    // live on `.trailer-save` itself. A descendant selector here would never match
    // and the control would drift back to the left edge of the card.
    const save = css.slice(css.indexOf('.trailer-save {'), css.indexOf('@media', css.indexOf('.trailer-save {')));
    expect(save).toMatch(/\.trailer-save \{[^}]*position: absolute/);
    expect(save).toMatch(/\.trailer-save \{[^}]*top: 24px;\s*right: 10px;/);
    expect(save).toMatch(/\.trailer-save \{[^}]*pointer-events: auto/);
    expect(save).not.toMatch(/\.trailer-save \.bookmark \{/);
    expect(save).toMatch(/\.trailer-save \.bookmark-note \{[^}]*top: calc\(100% \+ 10px\); right: 0; bottom: auto; left: auto; \}/);
    // The YouTube fallback sits under the save control, so the two never collide.
    expect(css).toMatch(/\.trailer-yt \{[^}]*top: 62px;\s*right: 10px;/);
    expect(readCss('components/BookmarkButton.css')).not.toMatch(/\.trailer-save/);
  });

  it('follows the pointer with a spotlight and resets on leave', async () => {
    const { container } = await mount();
    const hero = container.querySelector('.vault-hero');

    expect(container.querySelector('.vault-spotlight')).not.toBeNull();
    expect(readCss('pages/trailers.css')).toMatch(/\.vault-frames[^}]*--mx/);

    hero.getBoundingClientRect = () => ({ width: 1000, height: 600, left: 0, top: 0 });
    // jsdom has no PointerEvent, so a MouseEvent carries the coordinates.
    fireEvent(hero, new MouseEvent('pointermove', { clientX: 250, clientY: 150, bubbles: true }));
    await waitFor(() => expect(hero.style.getPropertyValue('--mx')).toBe('25.00%'));
    expect(hero.style.getPropertyValue('--my')).toBe('25.00%');
    expect(hero.className).toMatch(/is-lit/);

    fireEvent(hero, new MouseEvent('pointerleave', { bubbles: true }));
    await waitFor(() => expect(hero.className).not.toMatch(/is-lit/));
    expect(hero.style.getPropertyValue('--mx')).toBe('50%');

    // An event with no coordinates is ignored instead of poisoning the style.
    fireEvent(hero, new Event('pointermove'));
    expect(hero.style.getPropertyValue('--mx')).toBe('50%');
  });

  it('saves a trailer with an optional note', async () => {
    const { container } = await mount();
    const card = container.querySelector('.trailer-card');
    const title = card.querySelector('.trailer-title').textContent;

    const save = within(card).getByRole('button', { name: new RegExp(`^Save ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') });
    fireEvent.click(save);

    const stored = JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: 'trailer', note: '' });
    expect(stored[0].id.startsWith('trailer:')).toBe(true);
    expect(card.querySelector('.bookmark-note input')).not.toBeNull();

    fireEvent.change(card.querySelector('.bookmark-note input'), { target: { value: 'watch with the group' } });
    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /save note/i }));
    await waitFor(() => expect(card.querySelector('.bookmark-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'))[0].note).toBe('watch with the group');
  });

  it('lists saved trailers in the nav panel', async () => {
    const { container } = await mount();
    const card = container.querySelector('.trailer-card');
    const title = card.querySelector('.trailer-title').textContent;

    fireEvent.click(within(card).getByRole('button', { name: new RegExp(`^Save ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }));
    await waitFor(() => expect(container.querySelector('.bookmark-note')).not.toBeNull());
    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /skip/i }));

    fireEvent.click(within(container.querySelector('nav.universal-nav')).getByRole('button', { name: /saved bookmarks/i }));
    const panel = container.querySelector('.universal-saved');

    expect(panel).not.toBeNull();
    expect(within(panel).getByText(title)).toBeInTheDocument();
    expect(container.querySelector('.universal-saved-count').textContent).toBe('1');
    expect(within(panel).getByRole('link').getAttribute('href')).toBe('#trailers');
  });

  it('leaves the nav bar something to stick to', () => {
    // A <body> that scrolls is the nearest scrollport for the sticky nav, and a
    // body sized by its own content never scrolls, so the bar rides away with
    // the page. `hidden` on either axis forces the other to auto and does
    // exactly that; `clip` cuts the overflow off without becoming a scrollport.
    const bodyRule = readCss('pages/trailers.css').match(/body:has\(\.trailers-page\)\s*\{([^}]*)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule[1]).toMatch(/overflow-x:\s*clip/);
    expect(bodyRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*hidden/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/);
  });

  it('does not make the page root its own scrollport', () => {
    // `overflow: hidden` on the page root turned it into a scrollport, and a
    // sticky nav inside a box that never scrolls simply never sticks. It also
    // clipped the collection grid and everything below it off the bottom.
    // The fix is commented with the value it replaced, so drop comments first.
    const page = readCss('pages/trailers.css')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .match(/\.trailers-page\s*\{([^}]*)\}/)[1];
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/overflow-x:\s*clip/);
    expect(page).toMatch(/overflow-y:\s*visible/);
  });
});
