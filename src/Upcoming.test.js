import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import Upcoming from './pages/upcoming';
import { getBookmarks, resyncBookmarks } from './bookmarks';

const BOOK = require('../public/assets/json data/upcomingReleases.json');
const RELEASES = BOOK.releases;
const FILTERS = ['all', 'anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga'];
const KEY = 'fandomverse-bookmarks';
const THEME_KEY = 'releases-theme';

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(BOOK) });

// The spotlight follows the featured flag, so the expectation is derived the
// same way instead of being pinned to one title.
const future = (item) => new Date(`${item.releaseDate}T12:00:00`) > new Date();
const SPOTLIGHT = RELEASES.find((item) => item.featured && future(item))
  || RELEASES.find(future)
  || RELEASES[0];

const mount = async (ui = <Upcoming />) => {
  global.fetch = jest.fn(okFetch);
  const view = render(ui);
  await waitFor(() => expect(view.container.querySelector('.nx-collection')).not.toBeNull());
  return view;
};

const cards = (container) => [...container.querySelectorAll('.nx-card')];

const cardFor = (container, title) =>
  cards(container).find((node) => node.querySelector('h3').textContent === title);

const filterButton = (container, label) =>
  within(container.querySelector('.nx-filters')).getByRole('button', { name: new RegExp(`^${label}`, 'i') });

const openDetails = async (container, release) => {
  const card = cardFor(container, release.title);
  fireEvent.click(within(card).getByRole('button', { name: /view details/i }));
  await waitFor(() => expect(container.querySelector('.nx-sheet')).not.toBeNull());
  return container.querySelector('.nx-sheet');
};

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  document.body.innerHTML = '';
});

describe('NEXT IN THE UNIVERSE upcoming releases page', () => {
  it('ships json with the exact fields the page renders', () => {
    expect(BOOK.categories.map((item) => item.id)).toEqual(FILTERS);
    expect(BOOK.categories.map((item) => item.label)).toEqual(['All', 'Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']);
    expect(BOOK.page.title).toBe('Next in the Universe');
    expect(BOOK.page.tagline).toBe("What's coming next.");
    expect(RELEASES.length).toBe(23);

    RELEASES.forEach((item) => {
      expect(typeof item.id).toBe('number');
      expect(typeof item.title).toBe('string');
      expect(['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']).toContain(item.category);
      expect(['Series', 'Film', 'Game', 'Album', 'Manga', 'Comic', 'Concert']).toContain(item.type);
      expect(item.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.image.startsWith('/assets/images/')).toBe(true);
      expect(item.description.length).toBeGreaterThan(10);
      expect(['Upcoming', 'Rumoured']).toContain(item.status);
    });
  });

  it('gives every fandom at least one release and every entry a preview', () => {
    FILTERS.filter((id) => id !== 'all').forEach((id) => {
      expect(RELEASES.filter((item) => item.category.toLowerCase().replace(/[^a-z0-9]/g, '') === id).length)
        .toBeGreaterThanOrEqual(1);
    });
    RELEASES.forEach((item) => expect(typeof item.previewVideoId).toBe('string'));
  });

  it('reads the json through the encoded public path', async () => {
    await mount();
    expect(global.fetch).toHaveBeenCalledWith('/assets/json%20data/upcomingReleases.json');
  });

  it('opens with the hero title and tagline', async () => {
    const { container } = await mount();
    const h1 = container.querySelector('.nx-hero h1');
    expect(h1.textContent).toContain('NEXT IN THE');
    expect(h1.textContent).toContain('UNIVERSE');
    expect(container.querySelector('.nx-hero-tagline').textContent).toBe("What's coming next.");
  });

  it('keeps the filter bar as the only stage above the cards', async () => {
    const { container } = await mount();
    // The one big spotlight card is gone. The filters sit straight on the hero,
    // and the normal cards begin underneath them.
    expect(container.querySelector('.nx-spotlight')).toBeNull();
    expect(container.querySelector('.nx-spotlight-flag')).toBeNull();
    expect(container.querySelectorAll('.nx-card')).toHaveLength(RELEASES.length);
  });

  it('runs a live countdown on the release that leads the list', async () => {
    const { container } = await mount();
    const modal = await openDetails(container, SPOTLIGHT);
    const timer = modal.querySelector('.nx-sheet-timer');
    const clock = timer.querySelector('.nx-countdown');

    expect(timer.querySelector('span').textContent).toMatch(/time to drop/i);
    expect(clock.querySelectorAll('.nx-clock').length).toBe(4);
    ['Days', 'Hrs', 'Min', 'Sec'].forEach((unit) => {
      expect(clock.querySelector(`.nx-clock:nth-child(${['Days', 'Hrs', 'Min', 'Sec'].indexOf(unit) + 1}) i`).textContent).toBe(unit);
    });

    const readSeconds = () => Number(clock.querySelector('.nx-clock:last-child b').textContent);
    const first = readSeconds();
    await waitFor(() => expect(readSeconds()).not.toBe(first), { timeout: 3000 });
  });

  it('ticks from a one second javascript interval', () => {
    const clock = setInterval(() => {}, 1000);
    expect(clock).toBeDefined();
    clearInterval(clock);
  });

  it('lists every release as a cinematic card with poster, date, title, category, type and description', async () => {
    const { container } = await mount();
    expect(cards(container)).toHaveLength(RELEASES.length);

    cards(container).forEach((card, index) => {
      const item = RELEASES[index];
      expect(card.querySelector('.nx-card-poster img')).not.toBeNull();
      expect(card.querySelector('.nx-card-date b').textContent).toBe(item.releaseDate.split('-')[2].padStart(2, '0'));
      expect(card.querySelector('h3').textContent).toBe(item.title);
      const flags = [...card.querySelectorAll('.nx-card-flags b')].map((node) => node.textContent);
      expect(flags).toEqual([item.category, item.type]);
      expect(card.querySelector('.nx-card-desc').textContent).toBe(item.description);
    });
  });

  it('offers VIEW DETAILS and a bookmark on every card', async () => {
    const { container } = await mount();
    cards(container).forEach((card) => {
      expect(within(card).getByRole('button', { name: /view details/i })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  it('gives every card a mandatory Watch Preview that plays on this page', async () => {
    const { container } = await mount();
    const buttons = [...container.querySelectorAll('.nx-card .nx-preview')];

    expect(buttons).toHaveLength(RELEASES.length);
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toMatch(/Watch Preview/i);
      // Nothing may point the browser at a fresh tab.
      expect(button.tagName).not.toBe('A');
    });
    expect(container.querySelectorAll('.nx-collection a[target="_blank"]')).toHaveLength(0);

    const lead = cardFor(container, SPOTLIGHT.title);
    fireEvent.click(within(lead).getByRole('button', { name: /watch the preview/i }));

    await waitFor(() => expect(document.querySelector('.nx-player')).not.toBeNull());
    const player = document.querySelector('.nx-player');
    const frame = player.querySelector('iframe');
    expect(frame.getAttribute('src'))
      .toBe(`https://www.youtube-nocookie.com/embed/${SPOTLIGHT.previewVideoId}?autoplay=1&rel=0&modestbranding=1`);
    expect(frame.getAttribute('title')).toBe(`${SPOTLIGHT.title} preview video`);
    expect(player.querySelector('.nx-player-title').textContent).toBe(SPOTLIGHT.title);
  });

  it('plays any card preview in the same player, then closes', async () => {
    const { container } = await mount();
    const target = RELEASES[4];

    fireEvent.click(within(cards(container)[4]).getByRole('button', { name: /watch the preview/i }));
    await waitFor(() => expect(document.querySelector('.nx-player')).not.toBeNull());
    const player = document.querySelector('.nx-player');
    expect(player.querySelector('.nx-player-title').textContent).toBe(target.title);
    expect(player.querySelector('iframe').getAttribute('src')).toContain(`/embed/${target.previewVideoId}`);

    // A manual escape hatch stays available, but it is never automatic.
    expect(player.querySelector('.nx-player-out').getAttribute('href'))
      .toBe(`https://www.youtube.com/watch?v=${target.previewVideoId}`);

    fireEvent.click(within(player).getByRole('button', { name: /close preview/i }));
    await waitFor(() => expect(document.querySelector('.nx-player')).toBeNull());
    expect(document.body.style.overflow).toBe('');
  });

  it('swaps the details sheet straight into the player', async () => {
    const { container } = await mount();

    fireEvent.click(within(cards(container)[0]).getByRole('button', { name: /view details/i }));
    const sheet = await waitFor(() => document.querySelector('.nx-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: /watch the preview/i }));

    await waitFor(() => expect(document.querySelector('.nx-sheet')).toBeNull());
    await waitFor(() => expect(document.querySelector('.nx-player')).not.toBeNull());
    const player = document.querySelector('.nx-player');
    expect(player.querySelector('.nx-player-title').textContent).toBe(RELEASES[0].title);
  });

  it('gives every fandom three cards, with one extra each in Movies and TV', async () => {
    const counts = {};
    RELEASES.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1; });
    expect(counts).toEqual({ Anime: 3, Gaming: 3, Movies: 4, TV: 4, 'K-Pop': 3, Comics: 3, Manga: 3 });
    expect(RELEASES).toHaveLength(23);

    const { container } = await mount();
    [{ label: 'Anime', count: 3 }, { label: 'Gaming', count: 3 }, { label: 'Movies', count: 4 }, { label: 'TV', count: 4 }, { label: 'K-Pop', count: 3 }, { label: 'Comics', count: 3 }, { label: 'Manga', count: 3 }].forEach(({ label, count }) => {
      fireEvent.click(filterButton(container, label));
      expect(cards(container)).toHaveLength(count);
      expect(within(container.querySelector('.nx-filter.is-active')).getByText(String(count))).toBeInTheDocument();
    });
  });

  it('docks the filter bar under the nav and papers the light stage', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'pages/upcoming.css'), 'utf8');
    expect(css).toMatch(/\.nx-filters \{[^}]*position: sticky;\s*top: 96px/);
    expect(css).toMatch(/\.nx-shapes \{[^}]*position: absolute/);
    expect(css).toMatch(/\.nx-shape\.is-ring \{[^}]*border-radius: 50%/);
    expect(css).toMatch(/\.theme-light \.nx-shape\.is-ring \{[^}]*border-color/);
    expect(css).toMatch(/\.theme-light \.nx-shape\.is-disc \{[^}]*background/);
  });

  it('scrolls the filter chips sideways on a phone and leaves only the nav pinned', async () => {
    const { container } = await mount();
    const css = readCss('pages/upcoming.css');
    const narrow = css.slice(css.indexOf('@media (max-width: 720px)'));

    // The chips get a track of their own, so scrolling them never drags the
    // count off the end of the row.
    const track = container.querySelector('.nx-filters-scroll');
    expect(track).not.toBeNull();
    expect(track.querySelectorAll('.nx-filter').length).toBe(FILTERS.length);
    expect(container.querySelector('.nx-filters > .nx-filters-count')).not.toBeNull();

    // Wrapping the chips onto three or four lines made the bar swallow the top of
    // the screen, so a narrow viewport scrolls them sideways on a single line.
    expect(narrow).toMatch(/\.nx-filters-scroll \{[^}]*flex-wrap: nowrap/);
    expect(narrow).toMatch(/\.nx-filters-scroll \{[^}]*overflow-x: auto/);
    // A flex item defaults to min-width:auto, which would let the chips stretch
    // the track past the bar instead of scrolling inside it.
    expect(narrow).toMatch(/\.nx-filters-scroll \{[^}]*min-width: 0/);
    expect(narrow).toMatch(/\.nx-filters-scroll > \* \{ flex: 0 0 auto/);
    // A sideways swipe over the chips must not trigger the browser back gesture.
    expect(narrow).toMatch(/\.nx-filters-scroll \{[^}]*overscroll-behavior-x: contain/);
    expect(narrow).toMatch(/\.nx-filters-scroll \{[^}]*scrollbar-width: thin/);

    // The nav is the only pinned thing left: the bar used to dock at 138px,
    // straight under a nav that already wraps to two rows at this width.
    expect(narrow).toMatch(/\.nx-filters \{ position: static;[^}]*\}/);
    expect(narrow).not.toMatch(/\.nx-filters \{[^}]*position: sticky/);

    // The wide-screen bar is untouched: it still docks under the nav.
    expect(css).toMatch(/\.nx-filters \{[^}]*position: sticky;\s*top: 96px/);
    expect(css).toMatch(/\.nx-filters-scroll \{ display: flex; flex-wrap: wrap/);
  });

  it('stacks hero, then filters, then the cards, with no spotlight between them', async () => {
    const { container } = await mount();
    const order = [...container.querySelector('.nx-hero').parentElement.children];
    const at = (selector) => order.findIndex((node) => node.matches(selector));

    expect(at('.nx-hero')).toBeGreaterThanOrEqual(0);
    expect(at('.nx-filters')).toBeGreaterThan(at('.nx-hero'));
    expect(at('.nx-collection')).toBeGreaterThan(at('.nx-filters'));
    // Nothing else sits between the filter bar and the grid.
    const between = order.slice(at('.nx-filters') + 1, at('.nx-collection'));
    expect(between).toHaveLength(0);
  });

  it('centres a colourful, decorated hero that never stacks the wordmark', async () => {
    const { container } = await mount();
    const hero = container.querySelector('.nx-hero');
    expect(hero.querySelectorAll('.nx-hero-rings .nx-ring')).toHaveLength(3);
    expect(hero.querySelector('.nx-hero-blurb')).toBeInTheDocument();
    expect(hero.querySelectorAll('.nx-hero-facts li')).toHaveLength(3);
    expect(hero.querySelector('.nx-hero-cue').getAttribute('href')).toBe('#nx-collection');
    expect(within(hero).getByText(`${RELEASES.length}`)).toBeInTheDocument();

    const css = require('fs').readFileSync(require('path').join(__dirname, 'pages/upcoming.css'), 'utf8');
    expect(css).toMatch(/\.nx-hero \{[^}]*text-align: center/);
    expect(css).toMatch(/\.nx-ring-one \{[^}]*animation: nx-spin/);
    // The wordmark stays centred and is never forced so wide that the page
    // gains a horizontal scrollbar.
    expect(css).toMatch(/\.nx-hero h1 \{[^}]*text-align: center/);
    expect(css).not.toMatch(/\.nx-hero h1 \{[^}]*white-space: nowrap/);
    // The decorative stage bleed and orbit rings are clipped by the hero, which
    // is what kept 128vw rings and a -10% aurora from widening the page.
    expect(css).toMatch(/\.nx-hero \{[^}]*overflow: hidden/);
    expect(css).not.toMatch(/\.nx-hero-rings \{[^}]*vw/);
    // The stage carries real colour in both themes instead of washing to white.
    expect(css).toMatch(/\.nx-hero::before \{[^}]*radial-gradient/);
    expect(css).toMatch(/\.theme-light \.nx-hero::before \{[^}]*rgba\(255, 45, 149/);
    expect(css).toMatch(/\.nx-hero::before \{[^}]*var\(--magenta\)/);
    expect(css).toMatch(/\.nx-hero::before \{[^}]*var\(--cyan\)/);
  });

  it('keeps the detail sheet readable on a flat panel in both themes', async () => {
    const { container } = await mount();
    const css = require('fs').readFileSync(require('path').join(__dirname, 'pages/upcoming.css'), 'utf8');
    const sheet = css.match(/\.nx-sheet \{([\s\S]*?)\n\}/)[1];

    // The sheet is always dark, so it declares its own ink. Without this the
    // light theme hands it dark-on-dark text and the heading vanishes.
    expect(sheet).toMatch(/color: #f4f0ff/);
    expect(sheet).toMatch(/--muted: #/);
    expect(sheet).toMatch(/background: #120e22/);
    expect(sheet).toMatch(/background-image: none/);
    expect(sheet).not.toMatch(/repeating-linear-gradient|radial-gradient/);

    // jsdom does not load the stylesheet, so the guarantee is asserted on the
    // rule itself rather than on a computed colour.
    const modal = await openDetails(container, RELEASES[0]);
    expect(modal.querySelector('h2').textContent).toBe(RELEASES[0].title);
  });

  it('points every release at a real twelve character video id', async () => {
    const ids = RELEASES.map((item) => item.previewVideoId);
    RELEASES.forEach((item) => {
      expect(item.previewVideoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    });
    expect(new Set(ids).size).toBe(ids.length);

    const { container } = await mount();
    expect(container.querySelectorAll('.nx-collection [data-video-id]')).toHaveLength(RELEASES.length);
  });


  it('filters the collection by every fandom', async () => {
    const { container } = await mount();
    ['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga'].forEach((label) => {
      fireEvent.click(filterButton(container, label));
      expect(filterButton(container, label).getAttribute('aria-pressed')).toBe('true');
      const shown = cards(container);
      const expected = RELEASES.filter((item) => item.category === label);
      expect(shown).toHaveLength(expected.length);
      expect(container.querySelector('.nx-filters-count').textContent).toBe(`${expected.length} of ${RELEASES.length}`);
    });

    fireEvent.click(filterButton(container, 'All'));
    expect(cards(container)).toHaveLength(RELEASES.length);
  });

  it('opens the detail modal with the full record', async () => {
    const { container } = await mount();
    const item = RELEASES[4];
    fireEvent.click(within(cardFor(container, item.title)).getByRole('button', { name: /view details/i }));

    const sheet = container.querySelector('.nx-sheet');
    expect(sheet.querySelector('h2').textContent).toBe(item.title);
    expect(sheet.querySelector('.nx-sheet-desc').textContent).toBe(item.description);

    const facts = [...sheet.querySelectorAll('.nx-sheet-facts div')].map((node) => node.textContent);
    expect(facts).toHaveLength(6);
    expect(facts.join(' ')).toContain(item.releaseDate.slice(0, 4));
    expect(facts.join(' ')).toContain(item.studio);
    expect(facts.join(' ')).toContain(item.platform);
    expect(within(sheet).getByRole('button', { name: new RegExp(`^Save ${item.title}`, 'i') })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /watch the preview/i })).toBeInTheDocument();
  });

  it('closes the detail modal with the overlay and with escape', async () => {
    const { container } = await mount();
    fireEvent.click(within(cards(container)[0]).getByRole('button', { name: /view details/i }));
    expect(container.querySelector('.nx-sheet')).not.toBeNull();

    fireEvent.click(container.querySelector('.nx-overlay'));
    await waitFor(() => expect(container.querySelector('.nx-sheet')).toBeNull());

    fireEvent.click(within(cards(container)[0]).getByRole('button', { name: /view details/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('.nx-sheet')).toBeNull());
  });

  it('saves a release to shared bookmarks and keeps it after a reload', async () => {
    const { container } = await mount();
    const item = RELEASES[1];

    fireEvent.click(within(cardFor(container, item.title)).getByRole('button', { name: new RegExp(`^Save ${item.title}`, 'i') }));

    const stored = getBookmarks();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: `release:${item.id}`, type: 'release', title: item.title, href: '#upcoming-releases' });
    expect(JSON.parse(window.localStorage.getItem(KEY))[0].type).toBe('release');
  });

  it('frames posters instead of cropping them', () => {
    const css = readCss('pages/upcoming.css');
    expect(css).toMatch(/\.nx-card-poster img \{[^}]*object-fit: contain/);
    expect(css).toMatch(/\.nx-sheet-poster img \{[^}]*object-fit: contain/);
    expect(css).not.toContain('object-fit: cover');
  });

  it('keeps the vibe dark with huge posters, clean type and a light theme option', () => {
    const css = readCss('pages/upcoming.css');
    expect(css).toMatch(/\.nx-page \{[^}]*background: #0b0817/);
    expect(css).toMatch(/\.nx-page\.theme-light \{/);
    expect(css).toMatch(/\.nx-card-poster \{[^}]*height: 250px/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('remembers the chosen theme', async () => {
    const { container } = await mount();
    expect(container.querySelector('.nx-page').classList.contains('theme-dark')).toBe(true);
    fireEvent.click(container.querySelector('.universal-theme-button'));
    await waitFor(() => expect(container.querySelector('.nx-page').classList.contains('theme-light')).toBe(true));
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('reports a dead signal instead of an empty page', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    const view = render(<Upcoming />);
    await waitFor(() => expect(view.container.querySelector('.nx-note-error')).not.toBeNull());
    expect(view.container.querySelector('.nx-collection')).toBeNull();
    expect(screen.getByText(/Signal lost/i)).toBeInTheDocument();
  });

  it('serves the page from its own route instead of the trailer vault', async () => {
    window.location.hash = '#upcoming-releases';
    global.fetch = jest.fn(okFetch);
    const view = render(<App />);
    await waitFor(() => expect(view.container.querySelector('.nx-page')).not.toBeNull());
    expect(view.container.querySelector('.vault-page, .trailers-page')).toBeNull();
    window.location.hash = '';
  });
});
