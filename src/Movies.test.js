import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Movies from './pages/movies';
import { resyncBookmarks } from './bookmarks';
import { FANDOMS } from './components/fandomConfig';
import { clearMediaWallCache } from './components/FandomMediaWall';
import { clearGalleryCache } from './components/FandomGallery';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readData = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'assets', 'json data', name), 'utf8'));

const PROFILES = readData('characterProfiles.json');
const GALLERY = readData('gallery.json');
const TRAILERS = readData('trailers.json');
const ARTICLES = readData('featuredArticles.json');
const EVENTS = readData('events.json');

const moviesFrames = GALLERY.fandoms.find((item) => item.id === 'movies').media
  .filter((item) => item.type === 'image');
const moviesTrailers = TRAILERS.trailers.filter((item) => item.category === 'movies');
const moviesCast = PROFILES.characters.filter((item) => item.fandom === 'movies');

// One mock for the whole page: five files, keyed by the url each section asks
// for, so the test exercises the real wiring instead of stubbing the sections.
const FILES = {
  characterProfiles: PROFILES,
  gallery: GALLERY,
  trailers: TRAILERS,
  featuredArticles: ARTICLES,
  events: EVENTS,
};

const jsonFetch = () => jest.fn((url) => {
  const key = Object.keys(FILES).find((name) => String(url).includes(name));
  return Promise.resolve({ ok: Boolean(key), json: () => Promise.resolve(key ? FILES[key] : null) });
});

const pageSections = () => [...document.querySelectorAll('main > section')];
const sectionIds = () => pageSections().map((node) => node.id || node.className);
const wall = () => document.getElementById('movies-media-wall');
const doors = () => document.getElementById('movies-doors');
const wallReady = () => waitFor(() => expect(document.querySelector('.mwall-grid')).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jsonFetch();
  clearMediaWallCache();
  clearGalleryCache();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  // The spotlight carousel rotates on a 2.5s interval. Left running it re-renders
  // the hero mid-assertion, so it is stubbed out; waitFor still uses real timers.
  jest.spyOn(window, 'setInterval').mockImplementation(() => 0);
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

describe('Movies — the page', () => {
  it('closes on the same two sections the anime page closes on, in the same order', async () => {
    render(<Movies />);
    await wallReady();

    // The codex, then the wall, then the doors. The doors are written as "the way
    // out of the wall", so the two have to stay neighbours.
    const ids = sectionIds();
    expect(ids).toContain('movies-character-profiles');
    expect(ids).toContain('movies-media-wall');
    expect(ids).toContain('movies-doors');
    expect(ids.indexOf('movies-media-wall')).toBe(ids.indexOf('movies-character-profiles') + 1);
    expect(ids.indexOf('movies-doors')).toBe(ids.indexOf('movies-media-wall') + 1);
  });

  it('keeps the codex in the cinema skin and every section on the one theme', async () => {
    render(<Movies />);
    await wallReady();

    const codex = document.getElementById('movies-character-profiles');
    expect(codex).toHaveClass('codex-book', 'is-cinema');
    expect(codex).toHaveAttribute('aria-label', 'The film codex');

    // The two borrowed sections take the page theme from the same prop, so the
    // emerald room and the wall cannot end up lit differently.
    [codex, wall(), doors()].forEach((node) => expect(node).toHaveAttribute('data-theme', 'dark'));
  });

  it('numbers only the sections that are still on the page, and without a gap', async () => {
    render(<Movies />);
    await wallReady();

    const numbers = pageSections()
      .map((node) => node.querySelector('.codex-head-num, .gal-head-num, .cta-num'))
      .filter(Boolean)
      .map((node) => node.textContent);

    expect(numbers).toEqual(['02']);

    // The gallery and the desk were cut from the cinema room, so neither the
    // wall nor the doors may bring a number back with them.
    expect(wall().querySelector('.mwall-head-num')).toBeNull();
    expect(doors().querySelector('.door-head-num')).toBeNull();
  });

  it('has no gallery and no reading desk left on the page', async () => {
    render(<Movies />);
    await wallReady();

    expect(document.getElementById('movies-gallery')).toBeNull();
    expect(document.getElementById('movies-desk')).toBeNull();
    expect(document.querySelector('.gal-head-num')).toBeNull();
    expect(document.querySelector('.cta-num')).toBeNull();
  });

  it('hangs the movies wall — movies stills and movies trailers', async () => {
    render(<Movies />);
    await wallReady();

    expect(wall()).toHaveAttribute('aria-label', 'Movies frames and trailers');
    expect(document.querySelectorAll('.mwall-card')).toHaveLength(12);

    // Six and six, and the counts on the badges come from the same plates.
    const badges = [...wall().querySelectorAll('.mwall-badge')];
    expect(badges.map((badge) => badge.querySelector('em').textContent)).toEqual(['06', '06']);
    expect(within(wall()).getByRole('heading', { name: /the wall/i })).toBeInTheDocument();

    // The stills are the movies group's own files, not the anime group's.
    const shown = [...wall().querySelectorAll('.mwall-card')]
      .map((card) => card.querySelector('img') && card.querySelector('img').getAttribute('src'));
    expect(shown.filter(Boolean).length).toBeGreaterThan(0);
    moviesFrames.slice(0, 6).forEach((frame) => {
      expect(shown).toContain(frame.src);
    });

    moviesTrailers.slice(0, 6).forEach((trailer) => {
      expect(trailer.videoId).toMatch(/^[\w-]{11}$/);
    });
  });

  it('walks the wall the way the anime page does — a badge flicks a drawer shut', async () => {
    render(<Movies />);
    await wallReady();

    const badges = [...wall().querySelectorAll('.mwall-badge')];
    const [images, videos] = badges;

    // Nothing is pressed on arrival; the whole wall is what you land on.
    expect(badges.every((badge) => badge.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(document.querySelectorAll('.mwall-card')).toHaveLength(12);

    userEvent.click(videos);
    await waitFor(() => expect(document.querySelectorAll('.mwall-card')).toHaveLength(6));
    expect(document.querySelectorAll('.mwall-card.has-video')).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(0);
    expect(videos).toHaveAttribute('aria-pressed', 'true');

    // Pressing the same badge again opens the wall back up.
    userEvent.click(videos);
    await waitFor(() => expect(document.querySelectorAll('.mwall-card')).toHaveLength(12));

    userEvent.click(images);
    await waitFor(() => expect(document.querySelectorAll('.mwall-card')).toHaveLength(6));
    expect(document.querySelectorAll('.mwall-card.has-video')).toHaveLength(0);
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(6);
  });

  it('opens a still into the plate viewer and closes it again', async () => {
    render(<Movies />);
    await wallReady();

    const first = document.querySelector('.mwall-open');
    userEvent.click(first);

    const viewer = await waitFor(() => {
      const node = document.querySelector('.mwall-viewer-stage');
      expect(node).not.toBeNull();
      return node;
    });
    expect(viewer).toHaveAttribute('role', 'dialog');
    expect(within(viewer).getByRole('button', { name: /close the plate viewer/i })).toBeInTheDocument();

    userEvent.click(within(viewer).getByRole('button', { name: /close the plate viewer/i }));
    await waitFor(() => expect(document.querySelector('.mwall-viewer-stage')).toBeNull());
  });

  it('sends both doors to pages that can actually show movies', async () => {
    render(<Movies />);
    await wallReady();

    const [articles, events] = [...doors().querySelectorAll('a.door-go')];

    expect(articles).toHaveAttribute('href', `#featured-articles/${FANDOMS.movies.articleCategory}`);
    expect(events).toHaveAttribute('href', `#events/${FANDOMS.movies.eventsCategory}`);
    expect(doors()).toHaveAttribute('aria-label', 'Movies articles and events');

    // A door to a category nothing is filed under is a dead end, so the data has
    // to agree with the config the links are built from.
    expect(ARTICLES.articles.filter((item) => item.category === FANDOMS.movies.articleCategory).length)
      .toBeGreaterThan(0);
    expect(EVENTS.events.filter((item) => item.category === FANDOMS.movies.eventsCategory).length)
      .toBeGreaterThan(0);
  });

  it('still carries the cast it had before the wall arrived', async () => {
    render(<Movies />);
    await wallReady();

    expect(moviesCast).toHaveLength(5);
    const tabs = within(document.getElementById('movies-character-profiles'))
      .getByRole('navigation', { name: /jump to a character/i });
    moviesCast.forEach((character) => {
      expect(within(tabs).getByRole('button', { name: new RegExp(character.name) })).toBeInTheDocument();
    });
  });

  it('links the hero down to the codex, the way the anime hero links to its own', async () => {
    render(<Movies />);
    await wallReady();

    const link = document.querySelector('.movies-cast-link');
    expect(link).toHaveAttribute('href', '#movies-character-profiles');
    expect(document.getElementById(link.getAttribute('href').slice(1))).not.toBeNull();
  });

  it('reads only the json files the page still needs', async () => {
    render(<Movies />);
    await wallReady();

    const called = [...new Set(global.fetch.mock.calls.map(([url]) => url))];

    // The wall fetches for itself — gallery.json for the stills, trailers.json
    // for the films — and the desk is the only thing that used to ask for the
    // articles and the passes. The codex caches its file for the session and
    // exports no way to drop that, so it is only asserted on the first render
    // of the file rather than here — what matters is that the page asks for
    // nothing else.
    expect(called).toEqual(expect.arrayContaining([
      '/assets/json%20data/gallery.json',
      '/assets/json%20data/trailers.json',
    ]));
    expect(called).not.toContain('/assets/json%20data/featuredArticles.json');
    expect(called).not.toContain('/assets/json%20data/events.json');
    called.forEach((url) => {
      const known = Object.keys(FILES).some((name) => url.includes(name));
      expect({ url, known }).toEqual({ url, known: true });
    });
  });

  it('leaves the nav bar something to stick to', () => {
    const css = fs.readFileSync(path.join(__dirname, 'pages', 'movies.css'), 'utf8');

    // A <body> that scrolls is the nearest scrollport for the sticky nav, and a
    // body sized by its own content never scrolls, so the bar rides away with
    // the page. `hidden` on either axis forces the other to auto and does
    // exactly that; `clip` cuts the overflow off without becoming a scrollport.
    const bodyRule = css.match(/body:has\(\.movies-page\)\s*\{([^}]*)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule[1]).toMatch(/overflow-x:\s*clip/);
    expect(bodyRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*hidden/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/);
  });

  it('keeps the whole page reachable, rather than clipping it to one screen', () => {
    const css = fs.readFileSync(path.join(__dirname, 'pages', 'movies.css'), 'utf8');
    const page = css.match(/\.movies-page\s*\{([\s\S]*?)\n\}/)[1];

    // A single-viewport hero with a hidden overflow used to swallow everything
    // below it, which is where the codex, the wall and the doors now live.
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/height:\s*auto/);

    const locked = /body:has\(\.movies-page\)\s*\{[^}]*overflow:\s*hidden/;
    expect(css).not.toMatch(locked);
  });
});
