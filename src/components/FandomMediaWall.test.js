import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FandomMediaWall, { clearMediaWallCache } from './FandomMediaWall';
import { resyncBookmarks } from '../bookmarks';
import { paletteFor } from './fandomConfig';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readData = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'assets', 'json data', name), 'utf8'));

const GALLERY = readData('gallery.json');
const TRAILERS = readData('trailers.json');

const cards = () => [...document.querySelectorAll('.mwall-card')];
const section = () => document.querySelector('section.mwall');
const viewer = () => document.querySelector('.mwall-viewer-stage');
const chip = (name) => screen.getByRole('button', { name: new RegExp(name, 'i') });
const openButtons = () => [...document.querySelectorAll('.mwall-open')];

const animeFrames = (GALLERY.fandoms.find((item) => item.id === 'anime').media || [])
  .filter((item) => item.type === 'image');
const animeTrailers = TRAILERS.trailers.filter((item) => item.category === 'anime');

const jsonFetch = () => jest.fn((url) => {
  const data = String(url).includes('gallery') ? GALLERY : TRAILERS;
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
});

const renderWall = (props = {}) => render(<FandomMediaWall fandom="anime" theme="dark" {...props} />);
const wall = () => waitFor(() => expect(document.querySelector('.mwall-grid')).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jsonFetch();
  clearMediaWallCache();
});

afterEach(() => {
  delete global.fetch;
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — the wall', () => {
  it('reads the gallery file and the trailers file, once each', async () => {
    renderWall();
    await wall();

    const called = global.fetch.mock.calls.map(([url]) => url);
    expect(called).toContain('/assets/json%20data/gallery.json');
    expect(called).toContain('/assets/json%20data/trailers.json');
  });

  it('hangs six stills and six trailers, and nothing else', async () => {
    renderWall();
    await wall();

    expect(cards()).toHaveLength(12);
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-card.has-video')).toHaveLength(6);
  });

  it('takes the stills from the gallery file and the trailers from the trailer file', async () => {
    renderWall();
    await wall();

    const stills = cards()
      .filter((card) => card.classList.contains('has-image'))
      .map((card) => within(card).getByRole('heading').textContent.trim());
    const moving = cards()
      .filter((card) => card.classList.contains('has-video'))
      .map((card) => within(card).getByRole('heading').textContent.trim());

    expect(stills).toEqual(animeFrames.slice(0, 6).map((item) => item.title));
    expect(moving).toEqual(animeTrailers.slice(0, 6).map((item) => item.title));
  });

  it('points every still at a file that is actually in the project', async () => {
    renderWall();
    await wall();

    animeFrames.slice(0, 6).forEach((item) => {
      expect(fs.existsSync(path.join(ROOT, 'public', decodeURIComponent(item.src)))).toBe(true);
    });
  });

  it('gives every trailer a real YouTube id and a poster frame', async () => {
    renderWall();
    await wall();

    animeTrailers.slice(0, 6).forEach((item) => {
      expect(item.videoId).toMatch(/^[\w-]{6,}$/);
    });

    const posters = cards()
      .filter((card) => card.classList.contains('has-video'))
      .map((card) => card.querySelector('.mwall-img').getAttribute('src'));

    posters.forEach((src) => expect(src).toMatch(/^https:\/\/i\.ytimg\.com\/vi\/.+\/hqdefault\.jpg$/));
  });

  it('names the section after the fandom it is mounted on, not a caption', async () => {
    renderWall();
    await wall();

    expect(screen.getByRole('heading', { name: 'The Wall' })).toBeInTheDocument();
    expect(section().getAttribute('id')).toBe('anime-media-wall');
    expect(section().getAttribute('aria-label')).toBe('Anime frames and trailers');
  });

  it('paints the wall in the anime page palette, not a second theme', async () => {
    const { container } = renderWall();
    await wall();

    const tones = paletteFor('anime', 'dark');
    const style = section().getAttribute('style');
    expect(style).toContain(`--mwall-accent: ${tones.accent}`);
    expect(style).toContain(`--mwall-page: ${tones.page}`);
    expect(container.firstChild).toBe(section());
  });

  it('keeps the card work in the stylesheet, hover and playback included', () => {
    const css = fs.readFileSync(path.join(__dirname, 'FandomMediaWall.css'), 'utf8');

    expect(css).toMatch(/\.mwall-card:hover/);
    expect(css).toMatch(/\.mwall-open\s*\{[\s\S]*position: absolute/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('leaves the section number off the heading row', async () => {
    renderWall();
    await wall();

    expect(document.querySelector('.mwall-head-num')).toBeNull();
    expect(section().querySelector('.mwall-bar-title')).toHaveTextContent('The Wall');
  });
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — the backdrop', () => {
  it('is built from layers rather than one flat fill', () => {
    const css = fs.readFileSync(path.join(__dirname, 'FandomMediaWall.css'), 'utf8');
    const layers = [
      '.mwall-bg',
      '.mwall-bg-grid',
      '.mwall-bg-arcs',
      '.mwall-bg-beams',
      '.mwall-bg-tape',
      '.mwall-bg-shapes',
      '.mwall-bg-frames',
      '.mwall-bg-perf',
      '.mwall-bg-motes',
      '.mwall-bg-ghost',
      '.mwall-bg-grain',
    ];

    // Every layer is switched off in the one shared rule, so nothing in the
    // room can ever take a click off a plate.
    const shared = css.slice(css.indexOf('.mwall-bg,'), css.indexOf('pointer-events: none;'));
    layers.forEach((layer) => expect(shared).toContain(layer));
    expect(shared).toContain('z-index: 0');

    // Two accent glows, a ruled grid, two great arcs, three light cones, a
    // slack wire with empty frames hung on it, loose geometry, film
    // perforations, drifting dust, the fandom name ghosted huge, then grain.
    expect(css).toMatch(/radial-gradient\(96% 58% at 88% -8%, var\(--mwall-tint\)/);
    expect(css).toMatch(/\.mwall-bg-frames::before[\s\S]*border-radius: 0 0 14% 14%/);
    expect(css).toMatch(/\.mwall-bg-shapes i:nth-child\(3\)[\s\S]*clip-path: polygon\(50% 0, 100% 100%, 0 100%\)/);
    expect(css).toMatch(/\.mwall-bg-frames i::after[\s\S]*border: 1px solid color-mix/);
    expect(css).toMatch(/\.mwall-bg-perf i:nth-child\(n \+ 7\) \{ right: 9px; left: auto; \}/);
    expect(css).toMatch(/@keyframes mwall-beam/);
    expect(css).toMatch(/@keyframes mwall-drift/);
    expect(css).toContain('feTurbulence');

    // The whole room sits behind the plates and never takes a click.
    expect(css).toMatch(/\.mwall-bg,[\s\S]*?pointer-events: none/);
    expect(css).toMatch(/\.mwall-wrap \{[^}]*z-index: 1/);
  });

  it('marks every layer as decorative, and hangs them in the wall', async () => {
    const { container } = renderWall();
    await wall();

    const layers = container.querySelectorAll('.mwall-bg, .mwall-bg-grid, .mwall-bg-arcs, .mwall-bg-beams, .mwall-bg-tape, .mwall-bg-shapes, .mwall-bg-frames, .mwall-bg-perf, .mwall-bg-motes, .mwall-bg-ghost, .mwall-bg-grain');

    expect(layers.length).toBe(11);
    layers.forEach((layer) => expect(layer).toHaveAttribute('aria-hidden', 'true'));

    expect(document.querySelectorAll('.mwall-bg-arcs i')).toHaveLength(2);
    expect(document.querySelectorAll('.mwall-bg-beams i')).toHaveLength(3);
    expect(document.querySelectorAll('.mwall-bg-shapes i')).toHaveLength(8);
    expect(document.querySelectorAll('.mwall-bg-frames i')).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-bg-perf i')).toHaveLength(12);
    expect(document.querySelectorAll('.mwall-bg-motes i')).toHaveLength(7);
  });

  it('ghosts the fandom behind the wall instead of leaving the word empty', async () => {
    renderWall();
    await wall();

    const ghost = document.querySelector('.mwall-bg-ghost');
    expect(ghost).toHaveTextContent('Anime');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
  });
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — the badges', () => {
  it('offers one badge for the stills and one for the trailers', async () => {
    renderWall();
    await wall();

    expect(chip('Images')).toHaveTextContent('6');
    expect(chip('Videos')).toHaveTextContent('6');
    expect(document.querySelectorAll('.mwall-badge')).toHaveLength(2);
  });

  it('leaves the whole wall up until a badge is pressed', async () => {
    renderWall();
    await wall();

    expect(chip('Images')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Videos')).toHaveAttribute('aria-pressed', 'false');
    expect(cards()).toHaveLength(12);
  });

  it('folds the wall down to the six trailers', async () => {
    renderWall();
    await wall();

    fireEvent.click(chip('Videos'));
    await waitFor(() => expect(cards()).toHaveLength(6));
    expect(document.querySelectorAll('.mwall-card.has-video')).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(0);
  });

  it('folds the wall down to the six stills', async () => {
    renderWall();
    await wall();

    fireEvent.click(chip('Images'));
    await waitFor(() => expect(cards()).toHaveLength(6));
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-card.has-video')).toHaveLength(0);
  });

  it('puts the wall back the way it was', async () => {
    renderWall();
    await wall();

    fireEvent.click(chip('Images'));
    await waitFor(() => expect(cards()).toHaveLength(6));
    fireEvent.click(chip('Images'));
    await waitFor(() => expect(cards()).toHaveLength(12));
  });

  it('marks the open shelf as pressed', async () => {
    renderWall();
    await wall();

    fireEvent.click(chip('Videos'));
    await waitFor(() => expect(chip('Videos')).toHaveAttribute('aria-pressed', 'true'));
    expect(chip('Images')).toHaveAttribute('aria-pressed', 'false');
  });
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — the cards', () => {
  it('makes every plate a button that says which plate it opens', async () => {
    renderWall();
    await wall();

    const buttons = openButtons();
    expect(buttons).toHaveLength(12);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Open plate 01 of 12: Opening frame');
    expect(buttons[11]).toHaveAttribute('aria-label', `Open plate 12 of 12: ${animeTrailers[5].title}`);
  });

  it('gives each trailer a watch link and each card a save', async () => {
    renderWall();
    await wall();

    const moving = cards().filter((card) => card.classList.contains('has-video'));
    moving.forEach((card) => {
      const link = within(card).getByRole('link', { name: /watch .* on youtube/i });
      expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+$/);
    });

    expect(document.querySelectorAll('.mwall-save')).toHaveLength(12);
  });

  it('has no watch link on a still, because a still has nowhere to play', async () => {
    renderWall();
    await wall();

    const stills = cards().filter((card) => card.classList.contains('has-image'));
    stills.forEach((card) => expect(within(card).queryByRole('link', { name: /watch/i })).toBeNull());
  });

  it('mattes a still and crops a trailer into its window', async () => {
    renderWall();
    await wall();

    expect(document.querySelector('.mwall-art.is-still')).toBeInTheDocument();
    expect(document.querySelector('.mwall-art.is-video')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — the viewer', () => {
  it('opens on the plate that was pressed', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[2]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(within(viewer()).getByRole('heading').textContent).toBe(animeFrames[2].title);
  });

  it('plays a trailer in place rather than sending the visitor away', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[6]);
    await waitFor(() => expect(viewer()).not.toBeNull());

    const frame = within(viewer()).getByTitle(animeTrailers[0].title);
    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toContain(`/embed/${animeTrailers[0].videoId}`);
  });

  it('walks the wall with the arrow keys and wraps at both ends', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[0]);
    await waitFor(() => expect(viewer()).not.toBeNull());

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    await waitFor(() => expect(within(viewer()).getByRole('heading').textContent).toBe(animeTrailers[5].title));

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() => expect(within(viewer()).getByRole('heading').textContent).toBe(animeFrames[0].title));
  });

  it('shows every plate in the strip, and jumps from the strip', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[0]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(document.querySelectorAll('.mwall-strip-tile')).toHaveLength(12);

    fireEvent.click(screen.getByRole('button', { name: /go to plate 04:/i }));
    await waitFor(() => expect(within(viewer()).getByRole('heading').textContent).toBe(animeFrames[3].title));
  });

  it('closes from the button, the veil and the escape key', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[0]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    fireEvent.click(within(viewer()).getByRole('button', { name: /close the plate viewer/i }));
    await waitFor(() => expect(viewer()).toBeNull());

    fireEvent.click(openButtons()[1]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    fireEvent.click(screen.getByTestId('mwall-viewer-veil'));
    await waitFor(() => expect(viewer()).toBeNull());

    fireEvent.click(openButtons()[1]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(viewer()).toBeNull());
  });

  it('hands the scrollbar back when it shuts', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[0]);
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('shuts when the shelf changes under it', async () => {
    renderWall();
    await wall();

    fireEvent.click(openButtons()[6]);
    await waitFor(() => expect(viewer()).not.toBeNull());

    fireEvent.click(chip('Images'));
    await waitFor(() => expect(viewer()).toBeNull());
    expect(cards()).toHaveLength(6);
  });
});

/* ------------------------------------------------------------------ */

describe('FandomMediaWall — when the data does not come', () => {
  it('says so and offers a retry that fetches again', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    renderWall();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/did not load/i);

    global.fetch = jsonFetch();
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await wall();
    expect(cards()).toHaveLength(12);
  });

  it('carries on when only one of the two files comes back', async () => {
    global.fetch = jest.fn((url) => (String(url).includes('gallery')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(GALLERY) })
      : Promise.resolve({ ok: false, json: () => Promise.resolve({}) })));
    renderWall();
    await wall();

    expect(cards()).toHaveLength(6);
    expect(document.querySelectorAll('.mwall-card.has-image')).toHaveLength(6);
  });

  it('prints a note when a fandom has nothing to pin up', async () => {
    global.fetch = jest.fn((url) => (String(url).includes('gallery')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve({ fandoms: [] }) })
      : Promise.resolve({ ok: true, json: () => Promise.resolve({ trailers: [] }) })));
    renderWall();

    expect(await screen.findByText(/nothing has been pinned/i)).toBeInTheDocument();
    expect(document.querySelector('.mwall-grid')).toBeNull();
  });
});
