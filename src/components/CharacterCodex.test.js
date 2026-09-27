import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CharacterCodex from './CharacterCodex';
import { resyncBookmarks } from '../bookmarks';

// eslint-disable-next-line import/no-unresolved
const data = require('../../public/assets/json data/characterProfiles.json');
const anime = data.characters.filter((c) => c.fandom === 'anime');
const movies = data.characters.filter((c) => c.fandom === 'movies');

const readFile = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const css = readFile('CharacterCodex.css');
const jsx = readFile('CharacterCodex.js');

const renderCodex = (props = {}) =>
  render(<CharacterCodex fandom="anime" theme="dark" {...props} />);
const renderCinema = (props = {}) =>
  render(<CharacterCodex fandom="movies" theme="dark" variant="cinema" {...props} />);

const section = () => document.getElementById('anime-character-profiles');
const cinemaSection = () => document.getElementById('movies-character-profiles');
const reader = () => document.querySelector('.codex-reader-book');
const spread = () => document.querySelector('.codex-spread');
const tabs = () => within(reader()).getByRole('navigation', { name: /jump to a character/i });
const bookName = () => within(spread()).getByRole('heading', { level: 3 }).textContent;
const openTab = (character) => userEvent.click(within(tabs()).getByRole('button', { name: new RegExp(character.name) }));
const openProfile = async (index = 0) => {
  openTab(anime[index]);
  userEvent.click(within(spread()).getByRole('button', { name: /view profile/i }));
  await waitFor(() => expect(document.querySelector('.codex-modal-book')).toBeInTheDocument());
};
const ready = () => waitFor(() => expect(spread()).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  }));
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

describe('CharacterCodex — the section', () => {
  it('is one section, headed "The Character Codex" rather than "Character Profiles"', async () => {
    renderCodex();

    expect(await screen.findByRole('heading', { name: /the character codex/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^character profiles$/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('section.codex')).toHaveLength(1);
    await ready();
  });

  it('drops the SRS paragraph and the 5-profiles / 7-fandoms count strip', async () => {
    renderCodex();
    await ready();

    expect(section()).not.toHaveTextContent(/SRS/i);
    expect(section()).not.toHaveTextContent(/35 across 7 fandoms/i);
    expect(section()).not.toHaveTextContent(/Minimum 5 per fandom/i);
  });

  it('leads with the heading alone — no eyebrow, tagline, note or hint line', async () => {
    renderCodex();
    await ready();

    const head = document.querySelector('.codex-book-head');
    expect(head.querySelectorAll('h2')).toHaveLength(1);
    expect(head.querySelector('h2')).toHaveTextContent(/^The Character Codex$/);
    ['.codex-eyebrow', '.codex-book-tagline', '.codex-book-note', '.codex-book-hint'].forEach((gone) => {
      expect(document.querySelector(gone)).toBeNull();
    });

    expect(section()).not.toHaveTextContent(/Section 05 \/ Anime codex/i);
    expect(section()).not.toHaveTextContent(/cast of the anime canon/i);
    expect(section()).not.toHaveTextContent(/One character at a time/i);
  });

  it('builds no card grid, roster or contents panel — only the open book', async () => {
    const { container } = renderCodex();
    await ready();

    expect(container.querySelector('.codex-roster')).toBeNull();
    expect(container.querySelector('.codex-roster-grid')).toBeNull();
    expect(container.querySelector('.codex-contents')).toBeNull();
    expect(container.querySelector('.codex-card')).toBeNull();
    expect(container.querySelectorAll('article')).toHaveLength(0);
    expect(reader()).toBeInTheDocument();
  });

  it('carries the decorative room layers so the backdrop is not a flat fill', async () => {
    renderCodex();
    await ready();

    expect(document.querySelector('.codex-bg-grid')).toBeInTheDocument();
    expect(document.querySelectorAll('.codex-bg-shelf i')).toHaveLength(12);
    expect(document.querySelectorAll('.codex-bg-sheets i')).toHaveLength(4);
    expect(document.querySelectorAll('.codex-bg-motes i')).toHaveLength(6);
  });

  it('answers the page theme', async () => {
    const light = renderCodex({ theme: 'light' });
    await ready();
    expect(section()).toHaveAttribute('data-theme', 'light');
    light.unmount();

    renderCodex({ theme: 'dark' });
    await ready();
    expect(section()).toHaveAttribute('data-theme', 'dark');
  });

  it('keeps the dark room a colour rather than flattening it to black', () => {
    const room = css.match(/\.codex\s*\{([\s\S]*?)\n\}/)[1];
    const deep = room.match(/--room-deep:\s*(#[0-9a-f]{6})/i)[1].toLowerCase();
    const channels = deep.slice(1).match(/[0-9a-f]{2}/g).map((pair) => parseInt(pair, 16));

    // A near-black room has its channels bunched together; a tinted slate does
    // not, and that separation is what keeps it from reading as pure black.
    expect(Math.max(...channels) - Math.min(...channels)).toBeGreaterThan(4);
    expect(Math.max(...channels)).toBeGreaterThan(0x28);
  });
});

describe('CharacterCodex — the open book', () => {
  it('prints one entry across a left and a right page, never as a stacked list', async () => {
    renderCodex();
    await ready();

    const leaves = spread().querySelectorAll(':scope > .codex-leaf');
    expect(leaves).toHaveLength(2);
    expect(leaves[0]).toHaveClass('is-verso');
    expect(leaves[1]).toHaveClass('is-recto');
    expect(document.querySelectorAll('.codex-spread')).toHaveLength(1);
    expect(within(spread()).getByRole('heading', { name: anime[0].name })).toBeInTheDocument();
  });

  it('folds the page over to the next character and back again', async () => {
    renderCodex();
    await ready();
    expect(bookName()).toBe(anime[0].name);

    userEvent.click(screen.getByRole('button', { name: /turn the page to the next character/i }));
    expect(bookName()).toBe(anime[1].name);
    // The leaving sheet is in the air mid-turn, hinged on the spine.
    expect(document.querySelector('.codex-fold')).toHaveClass('is-next');
    expect(spread()).toHaveClass('is-in-next');

    userEvent.click(screen.getByRole('button', { name: /turn back to the previous character/i }));
    expect(bookName()).toBe(anime[0].name);
    expect(document.querySelector('.codex-fold')).toHaveClass('is-prev');
    expect(spread()).toHaveClass('is-in-prev');
  });

  it('clears the fold once the turn is over, so the next one is not stacked on it', async () => {
    renderCodex();
    await ready();

    userEvent.click(screen.getByRole('button', { name: /turn the page to the next character/i }));
    expect(document.querySelector('.codex-fold')).not.toBeNull();

    await waitFor(() => expect(document.querySelector('.codex-fold')).toBeNull());
    expect(spread()).not.toHaveClass('is-in-next');
  });

  it('wraps past the last entry instead of dead-ending', async () => {
    renderCodex();
    await ready();

    userEvent.click(screen.getByRole('button', { name: /turn back to the previous character/i }));
    expect(bookName()).toBe(anime[4].name);
  });

  it('jumps straight to an entry from the tab strip, and marks where it is', async () => {
    renderCodex();
    await ready();

    anime.forEach((character) => {
      const tab = within(tabs()).getByRole('button', { name: new RegExp(character.name) });
      if (character.id === anime[0].id) expect(tab).toHaveAttribute('aria-current', 'true');
      else expect(tab).not.toHaveAttribute('aria-current');
    });

    openTab(anime[3]);
    expect(bookName()).toBe(anime[3].name);
    expect(within(tabs()).getByRole('button', { name: new RegExp(anime[3].name) })).toHaveAttribute('aria-current', 'true');
  });

  it('turns the page from the keyboard', async () => {
    renderCodex();
    await ready();

    const stage = within(reader()).getByRole('group', { name: /open book/i });
    stage.focus();
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(bookName()).toBe(anime[1].name);

    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(bookName()).toBe(anime[0].name);
  });

  it('carries every entry into the book, with a plate, series, traits and its own colour', async () => {
    renderCodex();
    await ready();

    anime.forEach((character) => openTab(character));

    anime.forEach((character) => {
      openTab(character);
      const page = spread();

      expect(within(page).getByRole('heading', { name: character.name })).toBeInTheDocument();
      expect(page.querySelector('.codex-leaf-series')).toHaveTextContent(character.series.title);
      expect(within(page).getByRole('img', { name: new RegExp(character.name) })).toBeInTheDocument();
      character.traits.forEach((trait) => {
        expect(within(page).getByText(trait)).toBeInTheDocument();
      });
      expect(page).toHaveAttribute('style', expect.stringContaining(character.accent));
    });
  });

  it('leaves the tab strip as the last thing under the book', async () => {
    renderCodex();
    await ready();

    const kids = [...reader().children];
    expect(kids[kids.length - 1]).toBe(tabs());
  });
});

describe('CharacterCodex — the pages in print', () => {
  it('caps the left-hand plate instead of letting the cut-out fill the page', () => {
    const rule = css.match(/\.codex-leaf \.codex-plate\s*\{([\s\S]*?)\n\}/)[1];

    // An unbounded `flex: 1` frame is what let the image grow with the page.
    expect(rule).not.toMatch(/flex:\s*1\b/);
    expect(rule).toMatch(/flex:\s*0\s+1\s+auto/);
    expect(rule).toMatch(/max-width:/);
    expect(rule).toMatch(/height:\s*clamp\(/);
  });

  it('reads the full profile as one light column, with no picture in it', async () => {
    renderCodex();
    await ready();
    await openProfile(0);
    const dialog = document.querySelector('.codex-modal-book');

    // The old layout split the profile into a plate column and a text column.
    // That stranded the image beside a wall of copy, so the split is gone: one
    // column, no cut-out, and the trailers follow the biography in sequence.
    expect(dialog.querySelectorAll('.codex-modal-page')).toHaveLength(1);
    expect(dialog.querySelector('.codex-modal-page.is-plate')).toBeNull();
    expect(dialog.querySelector('.codex-plate')).toBeNull();
    expect(dialog.querySelector(`img[src="${anime[0].image}"]`)).toBeNull();
    expect(css).toMatch(/\.codex-modal-book\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });

  it('keeps the popup on light paper even though it is portalled out of the section', async () => {
    renderCodex({ theme: 'dark' });
    await ready();
    await openProfile(0);
    const dialog = document.querySelector('.codex-modal-book');

    // The modal is a child of <body>, so it inherits none of .codex's custom
    // properties. Without its own --paper set the gradient resolves to nothing
    // and dark ink lands on the dark veil.
    const paper = css.match(/\.codex-modal\s*\{([\s\S]*?)\n\}/)[1];
    const hex = (name) => paper.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase();
    const luminance = (color) => {
      const c = color.slice(1).match(/[0-9a-f]{2}/g).map((pair) => parseInt(pair, 16));
      return ((c[0] * 0.299) + (c[1] * 0.587) + (c[2] * 0.114)) / 255;
    };

    expect(paper).toContain('--paper-line:');
    expect(luminance(hex('--paper'))).toBeGreaterThan(0.8);
    expect(luminance(hex('--paper-ink'))).toBeLessThan(0.25);
    expect(luminance(hex('--paper-ink-soft'))).toBeLessThan(0.55);
    expect(luminance(hex('--paper-ink-faint'))).toBeLessThan(0.7);
  });

  it('keeps the profile content in reading order down the single column', async () => {
    renderCodex();
    await ready();
    await openProfile(0);
    const dialog = document.querySelector('.codex-modal-book');

    const order = [...dialog.querySelector('.codex-modal-page.is-copy').children]
      .map((node) => node.className.split(' ')[0]);

    expect(order).toEqual([
      'codex-modal-mark',
      'codex-modal-kicker',
      'codex-modal-name',
      'codex-modal-epithet',
      'codex-traits',
      'codex-modal-body',
      'codex-modal-quote',
      'codex-modal-ledger',
      'codex-screen',
      'codex-screen',
      'codex-modal-foot',
    ]);
  });

  it('turns the page at a readable pace, and the CSS agrees with the JS on it', () => {
    const ms = Number(jsx.match(/const TURN_MS = (\d+);/)[1]);
    expect(ms).toBeGreaterThanOrEqual(450);
    expect(ms).toBeLessThanOrEqual(700);

    // Every fold animation has to match, or the sheet outlives its own state.
    expect(css).toMatch(new RegExp(`codex-fold-next ${ms}ms`));
    expect(css).toMatch(new RegExp(`codex-fold-prev ${ms}ms`));
    expect(css).toMatch(new RegExp(`codex-fold-shade ${ms}ms`));
    expect(css).toMatch(new RegExp(`codex-turn-in-next ${ms}ms`));
    expect(css).toMatch(new RegExp(`codex-turn-in-prev ${ms}ms`));
  });
});

describe('CharacterCodex — the full profile', () => {
  it('opens a detailed profile with the biography and the series trailer', async () => {
    renderCodex();
    await ready();
    await openProfile();
    const dialog = document.querySelector('.codex-modal-book');

    expect(within(dialog).getByRole('heading', { name: anime[0].name })).toBeInTheDocument();
    expect(within(dialog).getByText(/biography/i)).toBeInTheDocument();

    const opener = dialog.querySelector('.codex-modal-body p.has-dropcap');
    expect(opener).toHaveTextContent(anime[0].bio[0].slice(0, 60));

    expect(dialog.querySelector(`a[href="https://www.youtube.com/watch?v=${anime[0].youtube.videoId}"]`)).toBeInTheDocument();
  });

  it('gives every entry a popular movie trailer, and they are real videos', async () => {
    renderCodex();
    await ready();
    await openProfile(4);
    const dialog = document.querySelector('.codex-modal-book');

    expect(within(dialog).getByText(/popular movie/i)).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(anime[4].movie.title))).toBeInTheDocument();
    expect(dialog.querySelector(`a[href="https://www.youtube.com/watch?v=${anime[4].movie.videoId}"]`)).toBeInTheDocument();

    // The movie block sits under the series block, and every entry carries one.
    expect(within(dialog).getByText(/watch the series/i)).toBeInTheDocument();
    anime.forEach((character) => {
      expect(character.movie.videoId).toMatch(/^[\w-]{11}$/);
      expect(character.movie.title).toBeTruthy();
      expect(character.movie.blurb).toBeTruthy();
    });
  });

  it('closes on Escape and on a click outside the spread', async () => {
    renderCodex();
    await ready();

    const openIt = () => userEvent.click(within(spread()).getByRole('button', { name: /view profile/i }));

    openIt();
    await waitFor(() => expect(document.querySelector('.codex-modal-book')).toBeInTheDocument());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.codex-modal-book')).not.toBeInTheDocument());

    openIt();
    await waitFor(() => expect(document.querySelector('.codex-modal-book')).toBeInTheDocument());
    userEvent.click(screen.getByTestId('codex-modal-veil'));
    await waitFor(() => expect(document.querySelector('.codex-modal-book')).not.toBeInTheDocument());
  });

  it('lets the profile jump to another entry without closing', async () => {
    renderCodex();
    await ready();
    await openProfile();

    const other = within(document.querySelector('.codex-modal-others')).getByRole('button', { name: new RegExp(anime[2].name) });
    userEvent.click(other);

    await waitFor(() => {
      expect(within(document.querySelector('.codex-modal-book')).getByRole('heading', { name: anime[2].name })).toBeInTheDocument();
    });
  });

  it('saves the entry under the character bookmark type', async () => {
    renderCodex();
    await ready();

    const save = within(spread()).getByRole('button', { name: new RegExp(`bookmark ${anime[0].name}`, 'i') });
    fireEvent.click(save);

    // Re-query rather than holding the node: the button re-renders as soon as
    // the store reports the save, and the note field opens beside it.
    await waitFor(() => expect(document.querySelector('.codex-spread .bookmark-toggle')).toHaveAttribute('aria-pressed', 'true'));

    const stored = JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'));
    expect(stored[0]).toMatchObject({
      id: `character:${anime[0].id}`,
      type: 'character',
      title: anime[0].name,
      href: '#anime-character-profiles',
    });
  });
});

describe('CharacterCodex — the cinema skin', () => {
  it('is the same codex under a different name, address and skin class', async () => {
    renderCinema();
    await ready();

    expect(document.querySelectorAll('section.codex')).toHaveLength(1);
    expect(cinemaSection()).toHaveClass('is-cinema');
    expect(cinemaSection()).toHaveAttribute('aria-label', 'The film codex');
    expect(within(cinemaSection()).getByRole('heading', { name: /the film codex/i })).toBeInTheDocument();
    expect(spread().querySelectorAll(':scope > .codex-leaf')).toHaveLength(2);
  });

  it('answers the page theme, exactly as the book room does', async () => {
    const light = renderCinema({ theme: 'light' });
    await ready();
    expect(cinemaSection()).toHaveAttribute('data-theme', 'light');
    light.unmount();

    renderCinema({ theme: 'dark' });
    await ready();
    expect(cinemaSection()).toHaveAttribute('data-theme', 'dark');
  });

  it('leaves the anime room alone — the skin is scoped to .is-cinema', () => {
    const base = css.match(/\.codex\s*\{([\s\S]*?)\n\}/)[1];
    const game = css.match(/\.codex\.is-game\s*\{([\s\S]*?)\n\}/)[1];

    expect(base).not.toMatch(/#77c9ae/);
    expect(base).not.toMatch(/#192b28/);
    expect(game).not.toMatch(/#77c9ae/);
  });

  it('paints the room in the movies page palette rather than a new one', () => {
    const moviesCss = readFile('../pages/movies.css');
    const cinema = css.match(/\.codex\.is-cinema\s*\{([\s\S]*?)\n\}/)[1];
    const cinemaLight = css.match(/\.codex\.is-cinema\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/)[1];
    const token = (block, name) => block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1].toLowerCase();

    // Every step of the room — the two ends of the page's crystal gradient, the
    // page background itself, and both of the page's accents — is a colour
    // movies.css already paints with, so the section cannot drift off palette.
    ['--room-top', '--room-mid', '--room-deep', '--room-foil', '--room-jade'].forEach((name) => {
      expect({ name, inPage: moviesCss.includes(token(cinema, name)) }).toEqual({ name, inPage: true });
      expect({ name, inPage: moviesCss.includes(token(cinemaLight, name)) }).toEqual({ name, inPage: true });
    });

    // The night room is a tinted emerald, not a flat black rectangle.
    const deep = token(cinema, '--room-deep');
    const channels = deep.slice(1).match(/[0-9a-f]{2}/g).map((pair) => parseInt(pair, 16));
    expect(Math.max(...channels) - Math.min(...channels)).toBeGreaterThan(4);
    expect(Math.max(...channels)).toBeGreaterThan(0x28);
  });

  it('carries every movie entry into the book, with its plate, film and its own colour', async () => {
    renderCinema();
    await ready();

    expect(movies).toHaveLength(5);

    movies.forEach((character) => {
      openTab(character);
      const page = spread();

      expect(within(page).getByRole('heading', { name: character.name })).toBeInTheDocument();
      expect(within(page).getByRole('img', { name: new RegExp(character.name) })).toHaveAttribute('src', character.image);
      expect(page.querySelector('.codex-leaf-series')).toHaveTextContent(character.series.title);
      expect(page).toHaveAttribute('style', expect.stringContaining(character.accent));
      character.traits.forEach((trait) => {
        expect(within(page).getByText(trait)).toBeInTheDocument();
      });
    });
  });

  it('files the entries as films, not as series', async () => {
    const cinema = renderCinema();
    await ready();

    const page = spread();
    expect(page.querySelector('.codex-leaf-series span')).toHaveTextContent('Film');
    expect(page.querySelector('.codex-plate-no')).toHaveTextContent(/^Frame 01$/);
    expect(page.querySelector('.codex-leaf-entry')).toHaveTextContent(/^Reel 01/);

    // The anime page keeps the printed vocabulary it already had, so the
    // renaming is scoped to the fandom rather than applied globally.
    cinema.unmount();

    render(<CharacterCodex fandom="anime" theme="dark" />);
    await ready();
    expect(spread().querySelector('.codex-leaf-series span')).toHaveTextContent('Series');
    expect(spread().querySelector('.codex-plate-no')).toHaveTextContent(/^Plate 01$/);
  });

  it('opens a film profile with the biography, the film trailer and a second screen', async () => {
    renderCinema();
    await ready();
    openTab(movies[0]);
    userEvent.click(within(spread()).getByRole('button', { name: /view profile/i }));
    await waitFor(() => expect(document.querySelector('.codex-modal-book')).toBeInTheDocument());

    // The skin has to reach the popup too: the modal is portalled out of the
    // section, so it carries the variant on its own wrapper.
    const shell = document.querySelector('.codex-modal');
    expect(shell).toHaveClass('is-cinema');
    expect(shell).toHaveAttribute('data-theme', 'dark');

    const dialog = document.querySelector('.codex-modal-book');
    expect(within(dialog).getByRole('heading', { name: movies[0].name })).toBeInTheDocument();
    expect(dialog.querySelector('.codex-modal-body p.has-dropcap')).toHaveTextContent(movies[0].bio[0].slice(0, 60));

    // Both trailer blocks are renamed for a film fandom, and both point at a
    // real video rather than a placeholder.
    expect(within(dialog).getByText(/watch the film/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/also on screen/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/watch the series/i)).not.toBeInTheDocument();
    expect(dialog.querySelector(`a[href="https://www.youtube.com/watch?v=${movies[0].youtube.videoId}"]`)).toBeInTheDocument();
    expect(dialog.querySelector(`a[href="https://www.youtube.com/watch?v=${movies[0].movie.videoId}"]`)).toBeInTheDocument();
  });

  it('saves a film entry against the movies anchor', async () => {
    renderCinema();
    await ready();

    fireEvent.click(within(spread()).getByRole('button', { name: new RegExp(`bookmark ${movies[0].name}`, 'i') }));
    await waitFor(() => expect(document.querySelector('.codex-spread .bookmark-toggle')).toHaveAttribute('aria-pressed', 'true'));

    const stored = JSON.parse(window.localStorage.getItem('fandomverse-bookmarks'));
    expect(stored[0]).toMatchObject({
      id: `character:${movies[0].id}`,
      type: 'character',
      href: '#movies-character-profiles',
    });
  });

  it('falls back to the movies artwork, not the anime artwork', () => {
    const fallbacks = jsx.match(/const FALLBACK_IMAGES = \{([\s\S]*?)\};/)[1];
    expect(fallbacks).toMatch(/movies:\s*'\/assets\/images\/movie\.png'/);
  });

  it('points every movie plate and trailer at something that exists', () => {
    const fs = require('fs');
    const path = require('path');
    const assets = path.join(__dirname, '../../public');

    movies.forEach((character) => {
      // These cut-outs live in a folder with a space in its name, and some of
      // the filenames have spaces of their own, so a path that is not encoded
      // the way the data encodes it would 404 and tear a hole in the plate.
      const plate = path.join(assets, decodeURIComponent(character.image.replace(/^\//, '')));
      expect({ name: character.image, exists: fs.existsSync(plate) }).toEqual({ name: character.image, exists: true });
      expect(fs.statSync(plate).size).toBeGreaterThan(0);

      const ids = [character.youtube, character.movie, character.moreYoutube, character.movie.moreYoutube]
        .filter(Boolean)
        .map((video) => video.videoId);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      ids.forEach((id) => expect(id).toMatch(/^[\w-]{11}$/));
    });
  });
});
