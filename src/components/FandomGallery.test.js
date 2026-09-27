import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FandomGallery, { clearGalleryCache } from './FandomGallery';
import { resyncBookmarks } from '../bookmarks';
import { FANDOMS, KIND_LABELS, paletteFor } from './fandomConfig';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_PATH = path.join(ROOT, 'public', 'assets', 'json data', 'gallery.json');
const DATA = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const css = fs.readFileSync(path.join(__dirname, 'FandomGallery.css'), 'utf8');

const groupFor = (id) => DATA.fandoms.find((item) => item.id === id);
const mediaFor = (id) => groupFor(id).media;

// PAGE_SIZE is 6 and each press of "load more" adds 4.
const FIRST_PAGE = 6;
const STEP = 4;

const cards = () => [...document.querySelectorAll('.gal-card')];
const section = () => document.querySelector('section.gal');
const viewer = () => document.querySelector('.gal-viewer-stage');
const loadMore = () => screen.queryByRole('button', { name: /load \d+ more/i });

// A card carries two buttons that both open the plate, so they are addressed by
// position rather than by name: the title button is the one the visitor reads.
const openCard = (title) => {
  const button = [...document.querySelectorAll('.gal-card-title button')]
    .find((node) => node.textContent.trim().toLowerCase().startsWith(String(title).toLowerCase()));
  if (!button) throw new Error(`No card on the wall is titled "${title}".`);
  userEvent.click(button);
};

const jsonFetch = (ok = true) => jest.fn(() => (ok
  ? Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) })
  : Promise.reject(new Error('offline'))));

const renderGallery = (props = {}) => render(<FandomGallery fandom="anime" theme="dark" {...props} />);
const wall = () => waitFor(() => expect(document.querySelector('.gal-cards')).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jsonFetch();
  // The wall is cached on purpose for the session, so each test starts cold.
  clearGalleryCache();
});

afterEach(() => {
  delete global.fetch;
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — the data', () => {
  it('reads the one wall file, and every fandom is on it', async () => {
    renderGallery();
    await wall();

    expect(global.fetch).toHaveBeenCalledWith('/assets/json%20data/gallery.json');
    expect(DATA.fandoms.map((item) => item.id).sort()).toEqual(
      ['anime', 'comics', 'gaming', 'kpop', 'manga', 'movies', 'tv'].sort(),
    );
  });

  it('hangs between eight and twelve images on every wall', () => {
    DATA.fandoms.forEach((group) => {
      const images = group.media.filter((item) => item.type === 'image');
      expect(images.length).toBeGreaterThanOrEqual(8);
      expect(images.length).toBeLessThanOrEqual(12);
    });
  });

  it('points every plate at a file that is actually in the project', () => {
    DATA.fandoms.forEach((group) => {
      group.media.forEach((item) => {
        if (item.type !== 'image') return;
        expect(fs.existsSync(path.join(ROOT, 'public', decodeURIComponent(item.src)))).toBe(true);
      });
    });
  });

  it('keeps video and audio to a handful, so the wall still reads as artwork', () => {
    DATA.fandoms.forEach((group) => {
      // One trailer per fandom.
      expect(group.media.filter((item) => item.type === 'video')).toHaveLength(1);
    });
    // Audio exists only where the data is genuinely music.
    const audio = DATA.fandoms.flatMap((group) => group.media).filter((item) => item.type === 'audio');
    expect(audio.every((item) => item.kind === 'track')).toBe(true);
    expect(audio.length).toBeLessThanOrEqual(2);
  });

  it('gives every moving plate a YouTube id, and flags one cover per wall', () => {
    DATA.fandoms.forEach((group) => {
      expect(group.media.filter((item) => item.cover)).toHaveLength(1);
      group.media
        .filter((item) => item.type !== 'image')
        .forEach((item) => expect(item.youtubeId).toMatch(/^[\w-]{6,}$/));
    });
  });

  it('marks the transparent character art as a cut-out, so it gets matted', () => {
    DATA.fandoms.flatMap((group) => group.media)
      .filter((item) => item.cutout)
      .forEach((item) => expect(item.kind).toBe('character'));
  });
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — the cards', () => {
  it('is a grid of cards, not a carousel', async () => {
    const { container } = renderGallery();
    await wall();

    expect(screen.getByRole('heading', { name: /the fandom gallery/i })).toBeInTheDocument();
    ['.gal-track', '.gal-slide', '.gal-dot', '.carousel-dot', '.swiper'].forEach((gone) => {
      expect(container.querySelector(gone)).toBeNull();
    });
    // Cards, not bare images: each plate is an article with a foot and tools.
    cards().forEach((card) => {
      expect(card.tagName).toBe('ARTICLE');
      expect(card.querySelector('.gal-card-art img')).not.toBeNull();
      expect(card.querySelector('.gal-card-title button')).not.toBeNull();
      expect(card.querySelector('.gal-card-caption').textContent.length).toBeGreaterThan(0);
      expect(card.querySelector('.gal-card-foot')).not.toBeNull();
    });
  });

  it('gives the cover plate the whole first row', async () => {
    renderGallery();
    await wall();

    expect(cards()[0].className).toMatch(/is-cover/);
    expect(css).toMatch(/\.gal-card\.is-cover \{[^}]*grid-column: 1 \/ -1/);
  });

  it('lays the wall out as equal cards on a responsive grid', () => {
    expect(css).toMatch(/\.gal-cards \{[^}]*display: grid[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    // A uniform art window is what makes them read as cards rather than tiles.
    expect(css).toMatch(/\.gal-card-art \{[^}]*aspect-ratio: 4 \/ 3/);
    // Not CSS columns: those reorder the visual wall against the tab order.
    expect(css).not.toMatch(/\.gal-cards \{[^}]*column-count/);
  });

  it('puts a real control on every card: Open, plus Save, plus Watch or Listen', async () => {
    renderGallery();
    await wall();

    // Six cards open at a time, so the first page has no trailer on it.
    cards().forEach((card) => {
      expect(within(card).getByRole('button', { name: /open plate/i })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /watch to/i })).toBeNull();
  });

  it('labels the moving plates with what they do, not with their file type', async () => {
    renderGallery();
    await wall();

    userEvent.click(loadMore());
    await waitFor(() => expect(cards().length).toBe(FIRST_PAGE + STEP));

    const trailer = cards().find((card) => card.className.includes('has-video'));
    expect(trailer).toBeDefined();
    expect(within(trailer).getByRole('link', { name: /^watch to /i })).toBeDefined();
    expect(within(trailer).getByRole('button', { name: /open plate/i })).toBeDefined();
  });

  it('filters the wall by drawer, and says how many cards are up', async () => {
    renderGallery();
    await wall();

    const characters = screen.getByRole('button', { name: /^characters/i });
    expect(mediaFor('anime').filter((item) => item.kind === 'character')).toHaveLength(5);

    userEvent.click(characters);
    await waitFor(() => expect(cards()).toHaveLength(5));
    expect(characters).toHaveAttribute('aria-pressed', 'true');
    expect(section()).toHaveTextContent(/05 of 05 cards/i);

    userEvent.click(screen.getByRole('button', { name: /everything/i }));
    await waitFor(() => expect(cards()).toHaveLength(FIRST_PAGE));
  });
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — load more', () => {
  it('never opens the whole wall at once, and hands out the rest on request', async () => {
    renderGallery();
    await wall();

    const total = mediaFor('anime').length;
    expect(total).toBeGreaterThan(FIRST_PAGE);
    // The wall opens folded.
    expect(cards()).toHaveLength(FIRST_PAGE);
    expect(section()).toHaveTextContent(new RegExp(`0${FIRST_PAGE} of ${total} cards`, 'i'));

    // Each press adds a step, never everything at once.
    userEvent.click(loadMore());
    await waitFor(() => expect(cards()).toHaveLength(FIRST_PAGE + STEP));
    userEvent.click(loadMore());
    await waitFor(() => expect(cards()).toHaveLength(total));

    // Once it is all up, the button retires itself and says so.
    expect(loadMore()).toBeNull();
    expect(section()).toHaveTextContent(/that is the whole wall/i);
  });

  it('counts the tail so the visitor knows there is more to ask for', async () => {
    renderGallery();
    await wall();

    const total = mediaFor('anime').length;
    const button = loadMore();
    expect(button).toHaveTextContent(/load 4 more/i);
    expect(button).toHaveTextContent(new RegExp(`${total - FIRST_PAGE} still on the wall`, 'i'));
  });

  it('refolds the wall when the drawer changes, so paging never carries over', async () => {
    renderGallery();
    await wall();
    userEvent.click(loadMore());
    await waitFor(() => expect(cards()).toHaveLength(FIRST_PAGE + STEP));

    userEvent.click(screen.getByRole('button', { name: /^trailer/i }));
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(section()).toHaveTextContent(/01 of 01 cards/i);
    // One card is the whole drawer, so there is nothing left to load.
    expect(loadMore()).toBeNull();
  });

  it('closes a plate left open when the wall is re-folded under it', async () => {
    renderGallery();
    await wall();
    openCard('Naruto Uzumaki');
    await waitFor(() => expect(viewer()).not.toBeNull());

    userEvent.click(screen.getByRole('button', { name: /^trailer/i }));
    await waitFor(() => expect(viewer()).toBeNull());
  });
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — the page palette', () => {
  it('paints with the colours from that fandom\'s own page, not invented ones', async () => {
    renderGallery({ fandom: 'gaming' });
    await wall();

    // The gaming page is pink and cyan; the wall has to be pink and cyan.
    const tones = paletteFor('gaming', 'dark');
    expect(tones.accent).toBe('#ee278f');
    expect(tones.accentTwo).toBe('#80e4f1');

    const style = section().getAttribute('style');
    expect(style).toContain(tones.accent);
    expect(style).toContain(tones.accentTwo);
    expect(style).toContain(tones.card);
  });

  it('gives each fandom its own page palette, so no two walls look alike', async () => {
    const seen = new Set();
    for (const id of Object.keys(FANDOMS)) {
      const view = renderGallery({ fandom: id });
      await waitFor(() => expect(document.querySelector('.gal-cards')).not.toBeNull());
      seen.add(section().getAttribute('style'));
      view.unmount();
    }
    expect(seen.size).toBe(Object.keys(FANDOMS).length);
  });

  it('carries no pink on a page that has none', () => {
    // Anime is gold, TV is red, K-Pop is blue. A pink chip on any of them
    // would be a colour the page itself never uses.
    expect(paletteFor('anime', 'dark').accent).toBe('#b98516');
    expect(paletteFor('anime', 'light').accent).toBe('#a87308');
    expect(paletteFor('tvshows', 'dark').accent).toBe('#d9343b');
    expect(paletteFor('kpop', 'dark').accent).toBe('#176d93');

    const pink = /^#(ff4d6d|ff77c8|ef5da8)$/i;
    Object.keys(FANDOMS).forEach((id) => {
      ['dark', 'light'].forEach((theme) => {
        const tones = paletteFor(id, theme);
        expect(tones.accent).not.toMatch(pink);
        expect(tones.accentTwo).not.toMatch(pink);
      });
    });
  });

  it('takes the theme from the page, so both stages are the page\'s own', async () => {
    const dark = renderGallery({ theme: 'dark' });
    await wall();
    const darkStyle = section().getAttribute('style');
    dark.unmount();

    renderGallery({ theme: 'light' });
    await wall();
    const lightStyle = section().getAttribute('style');

    expect(darkStyle).not.toBe(lightStyle);
    expect(darkStyle).toContain(paletteFor('anime', 'dark').page);
    expect(lightStyle).toContain(paletteFor('anime', 'light').page);
  });

  it('keeps the palette in the component, not hardcoded in the stylesheet', () => {
    // The stylesheet only derives steps from what it is given; it declares no
    // theme of its own, which is what used to let the two drift apart.
    expect(css).not.toMatch(/\.gal\[data-theme=/);
    expect(css).not.toMatch(/\.gal-viewer\[data-theme=/);
    expect(css).toMatch(/--gal-line-2: color-mix\(in srgb, var\(--gal-line\), var\(--gal-ink\) 22%\)/);
  });

  it('marks the pressed chip with a ring rather than an accent fill', () => {
    // Small type on top of a mid-tone hue is where the accent stops being
    // readable, so the pressed state is a ring and the page ink.
    expect(css).toMatch(/\.gal-chip\.is-on \{[^}]*background: var\(--gal-tint\)/);
    expect(css).not.toMatch(/\.gal-chip\.is-on \{[^}]*color: var\(--gal-accent\)/);
  });
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — the backdrop', () => {
  it('is built from layers rather than one flat fill', () => {
    ['.gal-bg', '.gal-bg-grid', '.gal-bg-dots', '.gal-bg-rays', '.gal-bg-hairs', '.gal-bg-marks', '.gal-bg-stack', '.gal-bg-grain']
      .forEach((layer) => {
        expect(css).toContain(`${layer} {`);
        expect(css).toContain(`${layer},`) || expect(css).toContain(`${layer} {`);
      });
    // Glows off the two accent tokens, a ruled grid, a halftone field, diagonal
    // rays, hairline columns, corner brackets, a stack of empty frames, grain.
    expect(css).toMatch(/radial-gradient\(104% 62% at 84% -6%, var\(--gal-tint\)/);
    expect(css).toMatch(/radial-gradient\(86% 58% at 4% 102%, var\(--gal-tint-two\)/);
    expect(css).toMatch(/background-image: radial-gradient\(var\(--gal-line-2\) 1px, transparent 1\.4px\)/);
    expect(css).toMatch(/repeating-linear-gradient\(64deg/);
    expect(css).toContain('feTurbulence');
    // The frames are all hidden from assistive tech.
    expect(css).toMatch(/\.gal-bg,[\s\S]*?pointer-events: none/);
  });

  it('marks every layer as decorative', async () => {
    const { container } = renderGallery();
    await wall();
    const layers = container.current.querySelectorAll('.gal-bg, .gal-bg-grid, .gal-bg-dots, .gal-bg-rays, .gal-bg-hairs, .gal-bg-marks, .gal-bg-stack, .gal-bg-grain');
    expect(layers.length).toBeGreaterThanOrEqual(8);
    layers.forEach((layer) => expect(layer).toHaveAttribute('aria-hidden', 'true'));
  });
});

/* ------------------------------------------------------------------ */

describe('FandomGallery — the viewer', () => {
  it('opens on the card that was pressed, not on the first one', async () => {
    renderGallery();
    await wall();

    openCard('Naruto Uzumaki');
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(within(viewer()).getByRole('heading', { level: 3 })).toHaveTextContent('Naruto Uzumaki');
    expect(within(viewer()).getByText(/Plate 07 \/ 06/i)).toBeInTheDocument();
  });

  it('moves with the arrows and the keyboard, and wraps at both ends', async () => {
    renderGallery();
    await wall();
    openCard('Opening frame');
    await waitFor(() => expect(viewer()).not.toBeNull());

    const heading = () => within(viewer()).getByRole('heading', { level: 3 });
    const plate = () => within(viewer()).getByText(/Plate \d+ \/ \d+/i);
    const back = () => userEvent.click(within(viewer()).getByRole('button', { name: /previous plate/i }));
    const forward = () => userEvent.click(within(viewer()).getByRole('button', { name: /next plate/i }));

    forward();
    await waitFor(() => expect(heading()).toHaveTextContent('Quiet before the storm'));
    back();
    await waitFor(() => expect(heading()).toHaveTextContent('Opening frame'));

    // Wrapping, so the arrows never dead-end at either edge of the wall.
    back();
    await waitFor(() => expect(plate()).toHaveTextContent(`Plate ${String(FIRST_PAGE).padStart(2, '0')} / ${String(FIRST_PAGE).padStart(2, '0')}`));
    forward();
    await waitFor(() => expect(plate()).toHaveTextContent('Plate 01 / 06'));

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() => expect(plate()).toHaveTextContent('Plate 02 / 06'));
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    await waitFor(() => expect(plate()).toHaveTextContent('Plate 01 / 06'));
  });

  it('jumps straight to a plate from the filmstrip', async () => {
    renderGallery();
    await wall();
    openCard('Opening frame');
    await waitFor(() => expect(viewer()).not.toBeNull());

    userEvent.click(within(viewer()).getByRole('button', { name: /go to plate 04: the price of power/i }));
    await waitFor(() => expect(within(viewer()).getByRole('heading', { level: 3 })).toHaveTextContent('The price of power'));
  });

  it('closes from the close button, the veil and escape', async () => {
    renderGallery();
    await wall();
    const open = () => openCard('Opening frame');

    userEvent.click(open());
    await waitFor(() => expect(viewer()).not.toBeNull());
    userEvent.click(within(viewer()).getByRole('button', { name: /close the gallery viewer/i }));
    await waitFor(() => expect(viewer()).toBeNull());

    userEvent.click(open());
    await waitFor(() => expect(viewer()).not.toBeNull());
    userEvent.click(document.querySelector('[data-testid="gal-viewer-veil"]'));
    await waitFor(() => expect(viewer()).toBeNull());

    userEvent.click(open());
    await waitFor(() => expect(viewer()).not.toBeNull());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(viewer()).toBeNull());
  });

  it('embeds the trailer instead of downloading a video file', async () => {
    renderGallery();
    await wall();

    const trailer = mediaFor('anime').find((item) => item.type === 'video');
    userEvent.click(loadMore());
    await waitFor(() => expect(cards().length).toBeGreaterThan(FIRST_PAGE));
    openCard(trailer.title.split('—')[0].trim());

    await waitFor(() => expect(viewer()).not.toBeNull());
    const frame = document.querySelector('.gal-viewer-embed iframe');
    expect(frame.getAttribute('src')).toContain(`youtube-nocookie.com/embed/${trailer.youtubeId}`);
    expect(within(viewer()).getByRole('link', { name: /open on youtube/i })).toHaveAttribute(
      'href',
      `https://www.youtube.com/watch?v=${trailer.youtubeId}`,
    );
  });

  it('plays a kpop track the same way a trailer plays', async () => {
    renderGallery({ fandom: 'kpop' });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    userEvent.click(loadMore());
    await waitFor(() => expect(cards().length).toBeGreaterThan(FIRST_PAGE));
    const track = mediaFor('kpop').find((item) => item.type === 'audio');
    openCard(track.title.split('—')[0].trim());

    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(within(viewer()).getByText(/now playing/i)).toBeInTheDocument();
    expect(document.querySelector('.gal-viewer-embed iframe').getAttribute('src')).toContain(track.youtubeId);
  });

  it('offers a full-size link and a save on an image plate', async () => {
    renderGallery();
    await wall();
    openCard('Naruto Uzumaki');
    await waitFor(() => expect(viewer()).not.toBeNull());

    expect(within(viewer()).getByRole('link', { name: /full size/i }).getAttribute('href'))
      .toBe(decodeURIComponent(mediaFor('anime').find((item) => item.title === 'Naruto Uzumaki').src));
    expect(within(viewer()).getByRole('button', { name: /save plate naruto uzumaki/i })).toBeInTheDocument();
  });

  it('locks the page while it is up and hands the scrollbar back on close', async () => {
    renderGallery();
    await wall();
    openCard('Opening frame');
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('walks the wall on its own, and stops when asked', async () => {
    renderGallery();
    await wall();

    userEvent.click(screen.getByRole('button', { name: /play the wall/i }));
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(screen.getByRole('button', { name: /pause the wall/i })).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: /pause the wall/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /play the wall/i })).toBeInTheDocument());
  });

  it('says so when the json cannot be reached, and retries on demand', async () => {
    global.fetch = jsonFetch(false);
    renderGallery();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/the gallery did not load/i);
    // The retry has to actually refetch, so the cached promise was cleared.
    global.fetch = jsonFetch();
    userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await wall();
  });
});
