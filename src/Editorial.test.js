import { fireEvent, render, waitFor, within } from '@testing-library/react';
import App from './App';
import Editorial from './pages/editorial';
import { resyncBookmarks } from './bookmarks';

const ISSUE = require('../public/assets/json data/featuredArticles.json');
const ARTICLES = ISSUE.articles;
const CATEGORY_IDS = ['all', 'anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga'];
const NEWEST = [...ARTICLES].sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))[0];
const COMICS = ARTICLES.filter((a) => a.category === 'comics').sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(ISSUE) });

// Cards also carry category names in their labels, so chips are always scoped to the strip.
const chip = (container, name) => within(container.querySelector('.filter-strip')).getByRole('button', { name });

// Relative luminance, so contrast is checked on real numbers rather than vibes.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const mount = async (ui = <Editorial />, fetchImpl = okFetch) => {
  global.fetch = jest.fn(fetchImpl);
  const view = render(ui);
  await waitFor(() => expect(view.container.querySelector('.card-grid')).not.toBeNull());
  return view;
};

const openReader = async () => {
  fireEvent.click(document.querySelector('.story-card .card-hit'));
  await waitFor(() => expect(document.querySelector('.reader')).not.toBeNull());
  return document.querySelector('.reader');
};

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
});

describe('featuredArticles.json', () => {
  it('ships 3 stories for each of the 7 fandoms', () => {
    expect(ARTICLES).toHaveLength(21);
    CATEGORY_IDS.filter((id) => id !== 'all').forEach((id) => {
      expect(ARTICLES.filter((a) => a.category === id)).toHaveLength(3);
    });
  });

  it('covers all 7 fandoms with no empty section', () => {
    expect(new Set(ARTICLES.map((a) => a.category)).size).toBe(7);
    CATEGORY_IDS.filter((id) => id !== 'all').forEach((id) => {
      expect(ARTICLES.filter((a) => a.category === id).length).toBeGreaterThan(0);
    });
  });

  it('gives every story the fields the reader needs', () => {
    ARTICLES.forEach((a) => {
      expect(typeof a.slug).toBe('string');
      expect(a.title.length).toBeGreaterThan(10);
      expect(a.excerpt.length).toBeGreaterThan(40);
      expect(a.body.length).toBeGreaterThanOrEqual(3);
      a.body.forEach((p) => expect(typeof p).toBe('string'));
      expect(a.image).toMatch(/^\/assets\/images\//);
      expect(a.imageAlt).toBeTruthy();
      expect(a.author).toBeTruthy();
      expect(a.tags.length).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(`${a.date}T00:00:00`).getTime())).toBe(false);
      expect(a.readTime).toBeGreaterThan(0);
    });
  });

  it('uses unique slugs so no two stories share a popup', () => {
    expect(new Set(ARTICLES.map((a) => a.slug)).size).toBe(ARTICLES.length);
  });

  it('gives every featured story a pull quote', () => {
    ARTICLES.filter((a) => a.featured).forEach((a) => expect(a.pullQuote).toBeTruthy());
  });

  it('only points at images that exist in the public folder', () => {
    const fs = require('fs');
    const path = require('path');
    ARTICLES.forEach((a) => {
      expect(fs.existsSync(path.join(__dirname, '..', 'public', decodeURIComponent(a.image)))).toBe(true);
    });
  });

  it('lives in the projects json data folder, with no stray lib folder', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'assets', 'json data', 'featuredArticles.json'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'data'))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, 'lib'))).toBe(false);
  });
});

describe('routing', () => {
  it('opens the editorial page on #featured-articles', async () => {
    window.location.hash = '#featured-articles';
    const { container } = await mount(<App />);
    expect(container.querySelector('.editorial-page')).not.toBeNull();
    expect(container.querySelector('.editorial-head h1').textContent.replace(/\s+/g, ' ')).toBe('THE FANDOM EDIT');
  });

  it('opens a category filter from the hash', async () => {
    window.location.hash = '#featured-articles/manga';
    const { container } = await mount(<App />);
    await waitFor(() => expect(chip(container, /manga/i)).toHaveAttribute('aria-pressed', 'true'));
    expect(container.querySelectorAll('.story-card')).toHaveLength(ARTICLES.filter((a) => a.category === 'manga').length);
  });

  it('never sends an article link to its own page', async () => {
    window.location.hash = '#article/anything';
    const { container } = await mount(<App />);
    expect(container.querySelector('.editorial-page')).not.toBeNull();
    expect(container.querySelectorAll('a[href^="#article/"]')).toHaveLength(0);
  });

  it('keeps the existing fandom routes working', async () => {
    window.location.hash = '#gaming';
    global.fetch = jest.fn(okFetch);
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.gaming-page')).not.toBeNull());
  });
});

describe('editorial page layout', () => {
  it('stacks nav, heading, marquee, filter bar and then the cards', async () => {
    const { container } = await mount();
    const order = ['nav.universal-nav', '.editorial-head', '.head-marquee', '.filter-strip', '.card-grid']
      .map((selector) => container.querySelector(selector));

    order.forEach((node) => expect(node).not.toBeNull());
    order.forEach((node, index) => {
      if (index === 0) return;
      expect(order[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('drops the old hero block for a compact heading', async () => {
    const { container } = await mount();
    expect(container.querySelector('.editorial-masthead')).toBeNull();
    expect(container.querySelector('.editorial-feature')).toBeNull();
    expect(container.querySelector('.editorial-row')).toBeNull();
    expect(container.querySelectorAll('.editorial-head')).toHaveLength(1);
  });

  it('runs the horizontal band as an animation', async () => {
    const { container } = await mount();
    const marquee = container.querySelector('.head-marquee');
    expect(marquee.querySelectorAll('.head-marquee-group')).toHaveLength(2);
    ['anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga']
      .forEach((id) => expect(marquee.textContent.toLowerCase()).toContain(id === 'kpop' ? 'k-pop' : id));
    expect(readCss('pages/editorial.css')).toMatch(/\.head-marquee-track\s*\{[^}]*animation:\s*marquee-slide/);
    expect(readCss('pages/editorial.css')).toMatch(/@keyframes marquee-slide/);
    expect(readCss('pages/editorial.css')).toMatch(/prefers-reduced-motion/);
  });

  it('builds the filter bar as a twin of the nav bar', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');
    const navClip = readCss('components/SiteNav.css').match(/clip-path:\s*polygon\([^;]+/)[0];

    expect(css).toMatch(/\.filter-strip::before/);
    expect(css).toMatch(/\.filter-strip::after/);
    expect(css).toContain('linear-gradient(135deg, var(--nav-accent)');
    expect(css.match(/clip-path:\s*polygon\([^;]+/g).length).toBeGreaterThanOrEqual(2);
    expect(navClip).toMatch(/clip-path/);
    expect(container.querySelector('.filter-strip')).toHaveAttribute('aria-label', 'Filter stories by fandom');
  });

  it('makes the cards glowy and interactive', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');
    expect(card.querySelector('.card-glow')).not.toBeNull();
    expect(card.querySelector('.card-shine')).not.toBeNull();
    expect(card.querySelector('.card-shape')).not.toBeNull();
    expect(card.querySelector('.card-hit')).toHaveAttribute('aria-label', expect.stringMatching(/^Read /));

    const css = readCss('pages/editorial.css');
    expect(css).toMatch(/\.story-card:hover/);
    expect(css).toMatch(/\.card-glow\s*\{[^}]*radial-gradient/);
    expect(css).toMatch(/transition:[^;]*box-shadow/);
  });

  it('keeps text readable in the light theme', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');
    const light = css.match(/\.editorial-page\s*\{([\s\S]*?)\}/)[1];
    const paper = light.match(/--paper:\s*(#[0-9a-f]{6})/i)[1];
    const cardInk = css.match(/--card-ink:\s*(#[0-9a-f]{6})/i)[1];

    expect(container.querySelector('.editorial-page.theme-light')).not.toBeNull();
    expect(paper).toBe('#171820');
    expect(cardInk).toBe('#14161d');
    expect(luminance(paper)).toBeLessThan(0.2);
    expect(luminance(cardInk)).toBeLessThan(0.2);
  });

  it('keeps text readable in the dark theme too', async () => {
    const { container } = await mount();
    fireEvent.click(container.querySelector('.universal-theme-button'));
    await waitFor(() => expect(container.querySelector('.editorial-page.theme-dark')).not.toBeNull());

    const css = readCss('pages/editorial.css');
    const dark = css.match(/\.editorial-page\.theme-dark\s*\{([\s\S]*?)\}/)[1];
    const paper = dark.match(/--paper:\s*(#[0-9a-f]{6})/i)[1];
    const cardInk = dark.match(/--card-ink:\s*(#[0-9a-f]{6})/i)[1];

    expect(luminance(paper)).toBeGreaterThan(0.6);
    expect(luminance(cardInk)).toBeGreaterThan(0.6);
  });

  it('gives the background depth instead of a flat pale wash', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');

    expect(container.querySelectorAll('.crystal').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll('.crystal-shape').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('.crystal-dots')).not.toBeNull();
    expect(container.querySelector('.crystal-vignette')).not.toBeNull();
    expect(css).toMatch(/repeating-linear-gradient/);
    expect(css).toMatch(/radial-gradient/);
  });

  it('centres the heading as one unbroken line', async () => {
    const { container } = await mount();
    const heading = container.querySelector('.editorial-head h1');
    const css = readCss('pages/editorial.css');

    expect(heading.textContent.replace(/\s+/g, ' ')).toBe('THE FANDOM EDIT');
    expect(heading.querySelector('br')).toBeNull();
    // The accent word stays an inline span, so the line can never break.
    expect(heading.querySelectorAll('em')).toHaveLength(1);
    expect(css).toMatch(/\.editorial-head h1\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.editorial-head h1\s*\{[^}]*justify-content:\s*center/);
    expect(css).toMatch(/\.editorial-head h1\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(css).toMatch(/\.editorial-head h1\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(/\.editorial-head h1\s*\{[^}]*font-size:\s*clamp\(/);
  });

  it('aligns the grid perfectly with no card overlapping another', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');
    const base = css.match(/\.story-card\s*\{([\s\S]*?)\n\}/)[1];

    // No per-card vertical nudge anywhere, so rows stay flush.
    expect(base).not.toMatch(/translateY/);
    expect(css).not.toMatch(/--card-offset/);
    expect(css).toMatch(/\.card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);

    // Every card is the same height, so the rows line up.
    const heights = [...container.querySelectorAll('.story-card')].map((card) => card);
    expect(heights).toHaveLength(ARTICLES.length);
    expect(readCss('pages/editorial.css')).toMatch(/\.story-card\s*\{[^}]*height:\s*452px/);
  });

  it('never crops artwork at the top of a card', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');

    // Artwork lives in its own centred box and is capped, not stretched.
    expect(css).toMatch(/\.card-media\s*\{[^}]*place-items:\s*center/);
    expect(css).toMatch(/\.card-media img\s*\{[^}]*max-height:\s*100%/);
    expect(css).toMatch(/\.card-media img\s*\{[^}]*object-fit:\s*contain/);
    expect(css).not.toMatch(/\.card-media img\s*\{[^}]*object-fit:\s*cover/);

    const card = container.querySelector('.story-card');
    expect(card.querySelector('.card-media img')).not.toBeNull();
  });

  it('frames opaque poster images instead of floating them', async () => {
    const { container } = await mount();
    const photo = ARTICLES.find((a) => /\.(jpe?g|webp)$/i.test(a.image));
    expect(photo).toBeDefined();

    const card = [...container.querySelectorAll('.story-card')]
      .find((node) => node.querySelector('.card-media img').getAttribute('src') === photo.image);

    expect(card.classList.contains('has-photo')).toBe(true);
    expect(readCss('pages/editorial.css')).toMatch(/\.has-photo \.card-media img\s*\{[^}]*border-radius/);

    const cutout = [...container.querySelectorAll('.story-card')]
      .find((node) => node.querySelector('.card-media img').getAttribute('src') === ARTICLES[0].image);
    expect(cutout.classList.contains('has-photo')).toBe(false);
  });

  it('gives every fandom its own card pattern and shape', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');

    ['anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga'].forEach((id) => {
      expect(container.querySelector(`.story-card.is-${id}`)).not.toBeNull();
      expect(css).toMatch(new RegExp(`\\.is-${id} \\.card-pattern\\s*\\{`));
      expect(css).toMatch(new RegExp(`\\.is-${id} \\.card-shape\\s*\\{`));
    });
  });

  it('dresses the cards with a watermark, pattern and glow', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');
    expect(card.querySelector('.card-pattern')).not.toBeNull();
    expect(card.querySelector('.card-watermark').textContent).toBe('01');
    expect(card.querySelector('.card-glow')).not.toBeNull();
  });

  it('gives the footer its own readable tokens and the nav logo', async () => {
    const { container } = await mount();
    const footer = container.querySelector('footer.site-footer');
    const css = readCss('components/SiteFooter.css');

    expect(footer.querySelector('.footer-logo img').getAttribute('src')).toBe('/assets/images/logo.png');
    expect(footer.querySelector('.footer-brand-text strong').textContent).toBe('FANDOMVERSE');

    // The footer must not depend on the page tokens for its own contrast.
    const dark = css.match(/\.site-footer\s*\{([\s\S]*?)\}/)[1];
    const light = css.match(/\.theme-light \.site-footer\s*\{([\s\S]*?)\}/)[1];
    expect(dark).toMatch(/--foot-ink:\s*#[0-9a-f]{6}/i);
    expect(light).toMatch(/--foot-ink:\s*#[0-9a-f]{6}/i);
    expect(luminance(dark.match(/--foot-ink:\s*(#[0-9a-f]{6})/i)[1])).toBeGreaterThan(0.6);
    expect(luminance(light.match(/--foot-ink:\s*(#[0-9a-f]{6})/i)[1])).toBeLessThan(0.2);
    expect(css).not.toMatch(/\.footer-column a\s*\{[^}]*var\(--muted\)/);
  });

  it('centres the heading block on the page', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');

    expect(css).toMatch(/\.editorial-head\s*\{[^}]*text-align:\s*center/);
    expect(css).toMatch(/\.head-kicker\s*\{[^}]*justify-content:\s*center/);
    expect(css).toMatch(/\.head-tagline\s*\{[^}]*margin:\s*0 auto/);

    const head = container.querySelector('.editorial-head');
    expect(head).toBeInTheDocument();
    expect(head.querySelector('.head-kicker')).toBeInTheDocument();
  });

  it('gives the filter strip a taller bar with roomier chips', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');
    const strip = css.match(/\.filter-strip\s*\{([\s\S]*?)\n\}/)[1];

    // 62px was too thin to read as a bar of its own.
    expect(strip).toMatch(/min-height:\s*96px/);
    expect(css).toMatch(/\.filter-strip-options button\s*\{[^}]*padding:\s*15px 24px/);
    expect(css).toMatch(/\.filter-strip-options button\s*\{[^}]*font-size:\s*13px/);
    expect(container.querySelector('.filter-strip')).toBeInTheDocument();
  });

  it('puts the filter strip directly under the nav', async () => {
    const { container } = await mount();
    const nav = container.querySelector('nav.universal-nav');
    const strip = container.querySelector('.filter-strip');
    expect(nav).not.toBeNull();
    expect(strip).not.toBeNull();
    expect(nav.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lays the cards out in a three column grid', async () => {
    const { container } = await mount();
    expect(container.querySelector('.card-grid').children).toHaveLength(ARTICLES.length);
    expect(readCss('pages/editorial.css')).toMatch(/\.card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  });

  it('uses the crystal grey canvas with shapes and a pattern', async () => {
    const { container } = await mount();
    const css = readCss('pages/editorial.css');

    expect(container.querySelector('.editorial-page.theme-light')).not.toBeNull();
    expect(css).toMatch(/background:\s*#c7cfd8/);
    expect(container.querySelectorAll('.crystal').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll('.crystal-shape').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('.crystal-facets')).not.toBeNull();
    expect(container.querySelector('.crystal-rings')).not.toBeNull();
    expect(container.querySelector('.crystal-dots')).not.toBeNull();
    expect(container.querySelector('.crystal-vignette')).not.toBeNull();
    expect(css).toMatch(/conic-gradient/);
    expect(css).toMatch(/repeating-radial-gradient/);
    expect(css).toMatch(/repeating-linear-gradient/);
  });

  it('shows the compact heading, tagline and every filter option', async () => {
    const { container } = await mount();
    expect(container.querySelector('.editorial-head h1').textContent.replace(/\s+/g, ' ')).toBe('THE FANDOM EDIT');
    expect(within(container.querySelector('.editorial-head')).getByText(/stories, culture & moments from every universe/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.filter-strip-options button')).toHaveLength(CATEGORY_IDS.length);
  });

  it('gives every card an index, category, image, date and read time', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');
    expect(card.querySelector('.card-index').textContent).toBe('01');
    expect(card.querySelector('.card-label').textContent).toBe(NEWEST.category);
    expect(card.querySelector('.card-media img').getAttribute('src')).toBe(NEWEST.image);
    expect(card.querySelector('.card-foot b').textContent).toBe(NEWEST.title);
    expect(card.querySelector('.card-meta').textContent).toContain(`${NEWEST.readTime} min`);
  });

  it('renders the shared nav and the shared footer component', async () => {
    const { container } = await mount();
    expect(container.querySelector('nav.universal-nav')).not.toBeNull();
    expect(container.querySelector('footer.site-footer .footer-brand-block')).not.toBeNull();
    expect(container.querySelector('footer.site-footer .footer-bottom')).not.toBeNull();
  });
});

describe('filter strip', () => {
  it('filters the grid in place without a reload', async () => {
    const { container } = await mount();
    expect(container.querySelectorAll('.story-card')).toHaveLength(ARTICLES.length);

    fireEvent.click(chip(container, /comics/i));

    await waitFor(() => expect(container.querySelectorAll('.story-card')).toHaveLength(COMICS.length));
    expect([...container.querySelectorAll('.card-label')].every((label) => label.textContent === 'comics')).toBe(true);
    expect(chip(container, /comics/i)).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a live count and goes back to everything', async () => {
    const { container } = await mount();

    fireEvent.click(chip(container, /manga/i));
    await waitFor(() => expect(container.querySelector('.filter-strip-count').textContent).toContain(`${ARTICLES.filter((a) => a.category === 'manga').length} /`));

    fireEvent.click(chip(container, /all stories/i));
    await waitFor(() => expect(container.querySelectorAll('.story-card')).toHaveLength(ARTICLES.length));
  });
});

describe('theme switch', () => {
  it('starts on the light crystal theme and flips to dark', async () => {
    const { container } = await mount();
    expect(container.querySelector('.editorial-page.theme-light')).not.toBeNull();

    fireEvent.click(container.querySelector('.universal-theme-button'));

    await waitFor(() => expect(container.querySelector('.editorial-page.theme-dark')).not.toBeNull());
    expect(window.localStorage.getItem('editorial-theme')).toBe('dark');
  });
});

describe('popup reader', () => {
  it('opens the article in a popup instead of navigating away', async () => {
    await mount();
    const dialog = await openReader();
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { level: 2 }).textContent).toBe(NEWEST.title);
  });

  it('renders hero, body, pull quote, tags and related stories', async () => {
    await mount();
    const dialog = await openReader();

    expect(dialog.querySelector('.reader-hero img').getAttribute('src')).toBe(NEWEST.image);
    expect([...dialog.querySelectorAll('.reader-copy p')].map((p) => p.textContent)).toEqual(NEWEST.body);
    expect(dialog.querySelector('blockquote').textContent).toBe(NEWEST.pullQuote);
    expect(dialog.querySelectorAll('.reader-tags li')).toHaveLength(NEWEST.tags.length);
    expect(dialog.querySelectorAll('.reader-related-grid button')).toHaveLength(3);
  });

  it('shows author, date and reading time', async () => {
    await mount();
    const dialog = await openReader();
    const meta = dialog.querySelector('.reader-meta').textContent;
    expect(meta).toContain(NEWEST.author);
    expect(meta).toContain(String(NEWEST.readTime));
    expect(meta).toContain('2026');
  });

  it('locks page scroll while open and restores it after closing', async () => {
    const { container } = await mount();
    await openReader();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(document.querySelector('.reader-close'));

    await waitFor(() => expect(document.querySelector('.reader')).toBeNull());
    expect(document.body.style.overflow).toBe('');
    expect(container.querySelector('.story-card')).not.toBeNull();
  });

  it('closes on the close button', async () => {
    await mount();
    await openReader();
    fireEvent.click(document.querySelector('.reader-close'));
    await waitFor(() => expect(document.querySelector('.reader')).toBeNull());
  });

  it('closes on a backdrop click', async () => {
    await mount();
    await openReader();
    fireEvent.mouseDown(document.querySelector('.reader-overlay'));
    await waitFor(() => expect(document.querySelector('.reader')).toBeNull());
  });

  it('closes on the escape key', async () => {
    await mount();
    await openReader();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.reader')).toBeNull());
  });

  it('swaps to another story from the related list without closing', async () => {
    await mount();
    await openReader();
    const firstTitle = document.querySelector('.reader h2').textContent;

    fireEvent.click(document.querySelectorAll('.reader-related-grid button')[0]);

    await waitFor(() => expect(document.querySelector('.reader h2').textContent).not.toBe(firstTitle));
    expect(document.querySelector('.reader')).not.toBeNull();
  });

  it('suggests same fandom stories first', async () => {
    const { container } = await mount();
    const cards = [...container.querySelectorAll('.story-card')];
    const target = cards.find((card) => card.querySelector('.card-label').textContent === 'comics');

    fireEvent.click(target.querySelector('.card-hit'));
    await waitFor(() => expect(document.querySelector('.reader')).not.toBeNull());

    expect(document.querySelector('.reader-kicker').textContent).toMatch(/comics/i);

    // Only two other comics stories exist, so the third slot is filled by tag overlap.
    const suggested = [...document.querySelectorAll('.reader-related-grid b')].map((node) => node.textContent);
    const sameFandom = COMICS.filter((a) => a.title !== target.querySelector('.card-foot b').textContent).map((a) => a.title);
    expect(suggested.slice(0, sameFandom.length)).toEqual(sameFandom);
    expect(suggested).toHaveLength(3);
  });
});

describe('states', () => {
  it('shows a retry state when the data cannot be fetched', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { container, getByRole } = render(<Editorial />);

    await waitFor(() => expect(getByRole('alert')).toBeInTheDocument());
    expect(container.querySelector('.reader')).toBeNull();
    expect(within(getByRole('alert')).getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('recovers when the retry succeeds', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { container, getByRole } = render(<Editorial />);
    await waitFor(() => expect(getByRole('alert')).toBeInTheDocument());

    global.fetch = jest.fn(okFetch);
    fireEvent.click(within(getByRole('alert')).getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(container.querySelector('.card-grid')).not.toBeNull());
    expect(container.querySelectorAll('.story-card')).toHaveLength(ARTICLES.length);
  });

  it('does not open a popup while still loading', async () => {
    // Held open on purpose, then released, so the pending promise never leaks
    // into the next test in this file.
    let release;
    global.fetch = jest.fn(() => new Promise((resolve) => {
      release = () => resolve({ ok: true, json: () => Promise.resolve(ISSUE) });
    }));

    const { container } = render(<Editorial />);
    expect(container.querySelector('.editorial-note').textContent).toMatch(/tuning the signal/i);
    expect(document.querySelector('.reader')).toBeNull();

    release();
    await waitFor(() => expect(container.querySelector('.card-grid')).not.toBeNull());
  });
});

describe('centred band and contained card art', () => {
  it('drops the plate above the filters and keeps the band as a plain ticker', async () => {
    const { container } = await mount();

    expect(container.querySelector('.head-marquee-plate')).toBeNull();
    expect(container.querySelector('.filter-strip')).not.toBeNull();
    // The ticker itself stays aria-hidden, since the plate used to carry the label.
    expect(container.querySelector('.head-marquee').getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the ticker mask clean now that no plate sits on top of it', () => {
    const css = readCss('pages/editorial.css');
    const track = css.match(/\.head-marquee-track\s*\{([^}]*)\}/)[1];

    expect(track).toMatch(/animation:\s*marquee-slide/);
    expect(css).not.toContain('.head-marquee-plate');
    expect(css).not.toMatch(/\.head-marquee-track\s*\{[^}]*mask-image/);
  });

  it('clips the media box so hovering art can never reach the text', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');

    expect(card.querySelector('.card-media')).not.toBeNull();
    expect(card.querySelector('.card-media img')).not.toBeNull();

    const css = readCss('pages/editorial.css');
    const media = css.match(/\.card-media\s*\{([^}]*)\}/)[1];
    const img = css.match(/\.card-media img\s*\{([^}]*)\}/)[1];

    expect(media).toMatch(/overflow:\s*hidden/);
    expect(media).toMatch(/place-items:\s*center/);
    expect(img).toMatch(/max-width:\s*100%/);
    expect(img).toMatch(/max-height:\s*100%/);
    expect(img).toMatch(/object-fit:\s*contain/);
    // The zoom is now small enough that clipping reads as a frame, not a crop.
    expect(css).toMatch(/\.story-card:hover \.card-media img[^{]*\{[^}]*scale\(1\.0[0-4]\)/);
  });

  it('saves an article with an optional note from its own control', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');
    const title = card.querySelector('.card-foot b').textContent;
    const safe = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    fireEvent.click(within(card).getByRole('button', { name: new RegExp(`^Save ${safe}`, 'i') }));

    const stored = JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: 'article', title, note: '' });
    expect(stored[0].id).toBe(`article:${ARTICLES[0].slug}`);

    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /skip/i }));
    await waitFor(() => expect(card.querySelector('.bookmark-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'))[0].note).toBe('');
  });

  it('keeps the save control from opening the reader', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');

    fireEvent.click(within(card).getByRole('button', { name: /save/i }));
    await waitFor(() => expect(card.querySelector('.bookmark-note')).not.toBeNull());
    expect(document.querySelector('.reader')).toBeNull();
  });

  it('shows saved articles in the nav panel with a note', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');
    const title = card.querySelector('.card-foot b').textContent;

    fireEvent.click(within(card).getByRole('button', { name: /save/i }));
    fireEvent.change(card.querySelector('.bookmark-note input'), { target: { value: 'rewrite the outro' } });
    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /save note/i }));

    fireEvent.click(within(container.querySelector('nav.universal-nav')).getByRole('button', { name: /saved bookmarks/i }));
    const panel = container.querySelector('.universal-saved');

    expect(within(panel).getByText(title)).toBeInTheDocument();
    expect(panel.querySelector('.universal-saved-link em').textContent).toMatch(/rewrite the outro/);
    expect(within(panel).getByRole('link').getAttribute('href')).toMatch(/^#featured-articles/);
  });

  it('edits and clears a note straight from the nav panel', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');

    fireEvent.click(within(card).getByRole('button', { name: /save/i }));
    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /skip/i }));

    fireEvent.click(within(container.querySelector('nav.universal-nav')).getByRole('button', { name: /saved bookmarks/i }));
    fireEvent.click(within(container.querySelector('.universal-saved-item')).getByRole('button', { name: /add a note/i }));

    const field = container.querySelector('.universal-saved-note input');
    fireEvent.change(field, { target: { value: 'check the source' } });
    fireEvent.click(within(container.querySelector('.universal-saved-note')).getByRole('button', { name: /save note/i }));
    await waitFor(() => expect(container.querySelector('.universal-saved-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'))[0].note).toBe('check the source');

    fireEvent.click(within(container.querySelector('.universal-saved-item')).getByRole('button', { name: /add a note to/i }));
    fireEvent.click(within(container.querySelector('.universal-saved-note')).getByRole('button', { name: /clear/i }));
    await waitFor(() => expect(container.querySelector('.universal-saved-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'))[0].note).toBe('');
  });

  it('empties the whole book and closes on Escape', async () => {
    const { container } = await mount();
    const card = container.querySelector('.story-card');

    fireEvent.click(within(card).getByRole('button', { name: /save/i }));
    fireEvent.click(within(card.querySelector('.bookmark-note')).getByRole('button', { name: /skip/i }));

    fireEvent.click(within(container.querySelector('nav.universal-nav')).getByRole('button', { name: /saved bookmarks/i }));
    expect(container.querySelector('.universal-saved-clear')).not.toBeNull();

    fireEvent.click(container.querySelector('.universal-saved-clear'));
    await waitFor(() => expect(container.querySelector('.universal-saved-empty')).not.toBeNull());
    expect(JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'))).toHaveLength(0);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('.universal-saved')).toBeNull());
  });

  it('leaves the nav bar and the filter strip something to stick to', () => {
    // A <body> that scrolls is the nearest scrollport for the sticky nav, and a
    // body sized by its own content never scrolls, so the bar rides away with
    // the page. `hidden` on either axis forces the other to auto and does
    // exactly that; `clip` cuts the overflow off without becoming a scrollport.
    const css = readCss('pages/editorial.css');
    const bodyRule = css.match(/body:has\(\.editorial-page\)\s*\{([^}]*)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule[1]).toMatch(/overflow-x:\s*clip/);
    expect(bodyRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*hidden/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/);
  });

  it('does not make the page root its own scrollport', () => {
    // `overflow: hidden` on the page root turned it into a scrollport, and a
    // sticky element inside a box that never scrolls simply never sticks — the
    // nav and the filter strip both ride off the top together. It also clipped
    // the filter strip and the card grid off the bottom of the page.
    // The page-root fix is commented with the exact value it replaced, so the
    // comments are dropped before the declarations are asserted on.
    const page = readCss('pages/editorial.css')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .match(/\.editorial-page\s*\{([^}]*)\}/)[1];
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/overflow-x:\s*clip/);
    expect(page).toMatch(/overflow-y:\s*visible/);
  });
});
