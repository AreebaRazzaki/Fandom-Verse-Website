import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TvShows from './pages/tvshows';
import { resyncBookmarks } from './bookmarks';
import { clearMediaWallCache } from './components/FandomMediaWall';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readData = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'assets', 'json data', name), 'utf8'));

const PROFILES = readData('characterProfiles.json');
const GALLERY = readData('gallery.json');
const TRAILERS = readData('trailers.json');

const tvFrames = GALLERY.fandoms.find((item) => item.id === 'tv').media
  .filter((item) => item.type === 'image');
const tvTrailers = TRAILERS.trailers.filter((item) => item.category === 'tv');
const tvCast = PROFILES.characters.filter((item) => item.fandom === 'tvshows');

const FILES = { characterProfiles: PROFILES, gallery: GALLERY, trailers: TRAILERS };

const jsonFetch = () => jest.fn((url) => {
  const key = Object.keys(FILES).find((name) => String(url).includes(name));
  return Promise.resolve({ ok: Boolean(key), json: () => Promise.resolve(key ? FILES[key] : null) });
});

const pageSections = () => [...document.querySelectorAll('main > section')];
const sectionIds = () => pageSections().map((node) => node.id || node.className);
const hero = () => document.querySelector('.tvshows-hero');
const codex = () => document.getElementById('tvshows-character-profiles');
const wall = () => document.getElementById('tvshows-media-wall');
const doors = () => document.getElementById('tvshows-doors');
const wallReady = () => waitFor(() => expect(document.querySelector('.mwall-grid')).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jsonFetch();
  clearMediaWallCache();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  // The carousel turns on a six-second interval. Left running it re-renders the
  // hero mid-assertion, so it is stubbed out; waitFor still uses real timers.
  jest.spyOn(window, 'setInterval').mockImplementation(() => 0);
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

describe('TvShows — the hero', () => {
  it('keeps its own frame, backdrop, copy, controls and footer', () => {
    render(<TvShows />);

    expect(hero()).not.toBeNull();
    ['.tvshows-backdrop', '.tvshows-stage', '.tvshows-frame', '.tvshows-masthead',
      '.tvshows-slides', '.tvshows-slide', '.tvshows-slide-wash', '.tvshows-copy',
      '.tvshows-side-code', '.tvshows-controls', '.tvshows-dots', '.tvshows-footer']
      .forEach((part) => expect(hero().querySelector(part)).not.toBeNull());
  });

  it('opens on the first featured series, in all caps, over the crystal backdrop', () => {
    render(<TvShows />);

    expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('STRANGER THINGS');
    expect(hero().querySelector('.tvshows-slide.is-active img')).toHaveAttribute('src', '/assets/images/tv%20show%201.png');
    expect(hero().querySelector('.tvshows-copy')).toHaveTextContent('The town where nothing stays buried.');
  });

  it('rotates one featured series at a time, on the dot and on the arrows', async () => {
    render(<TvShows />);

    expect(hero().querySelectorAll('.tvshows-slide')).toHaveLength(4);
    expect(document.querySelectorAll('.tvshows-dots button')).toHaveLength(4);
    expect(document.querySelectorAll('.tvshows-dots button.is-active')).toHaveLength(1);

    userEvent.click(screen.getByRole('button', { name: /show 2: red notice/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('RED NOTICE'));

    userEvent.click(screen.getByRole('button', { name: /next tv show/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('FORMULA'));

    userEvent.click(screen.getByRole('button', { name: /previous tv show/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('RED NOTICE'));

    // Back around to the first show, then forwards past the last one, so the
    // carousel can never stall on either end.
    userEvent.click(screen.getByRole('button', { name: /previous tv show/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('STRANGER THINGS'));

    userEvent.click(screen.getByRole('button', { name: /show 4: study group/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('STUDY GROUP'));

    userEvent.click(screen.getByRole('button', { name: /next tv show/i }));
    await waitFor(() => expect(within(hero()).getByRole('heading', { level: 1 })).toHaveTextContent('STRANGER THINGS'));
  });

  it('points the hero call to action down at the codex it now opens onto', () => {
    render(<TvShows />);

    expect(hero().querySelector('.tvshows-cta')).toHaveAttribute('href', '#tvshows-character-profiles');
  });
});

describe('TvShows — the sections below the hero', () => {
  it('runs the codex, the wall and the doors under the hero, in the anime order', async () => {
    render(<TvShows />);
    await wallReady();

    const ids = sectionIds();
    expect(ids[0]).toBe('tvshows-hero');
    expect(ids).toContain('tvshows-character-profiles');
    expect(ids).toContain('tvshows-media-wall');
    expect(ids).toContain('tvshows-doors');
    expect(ids.indexOf('tvshows-character-profiles')).toBeLessThan(ids.indexOf('tvshows-media-wall'));
    expect(ids.indexOf('tvshows-media-wall')).toBeLessThan(ids.indexOf('tvshows-doors'));
  });

  it('files the five cast profiles under TV Shows, not under any other fandom', async () => {
    render(<TvShows />);

    await waitFor(() => expect(codex().querySelector('.codex-spread')).not.toBeNull());
    expect(tvCast).toHaveLength(5);
    expect(codex()).toHaveTextContent('The Cast Codex');
    tvCast.forEach((profile) => expect(codex()).toHaveTextContent(new RegExp(profile.name)));
  });

  it('opens a cast profile out of the codex', async () => {
    render(<TvShows />);

    await waitFor(() => expect(codex().querySelector('.codex-spread')).not.toBeNull());
    const nav = within(codex()).getByRole('navigation', { name: /jump to a character/i });
    userEvent.click(within(nav).getByRole('button', { name: new RegExp(tvCast[0].name) }));
    userEvent.click(within(codex()).getByRole('button', { name: /view profile/i }));

    expect(await screen.findByRole('dialog')).toHaveTextContent(tvCast[0].name);
  });

  it('hangs the TV stills and the TV trailers on the wall', async () => {
    render(<TvShows />);
    await wallReady();

    // The wall shelves six frames and six trailers: the TV group in gallery.json
    // still resolves even though the page and the fandom are both "tvshows".
    expect(document.querySelectorAll('.mwall-card')).toHaveLength(
      Math.min(6, tvFrames.length) + Math.min(6, tvTrailers.length)
    );
    expect(tvFrames.length).toBeGreaterThan(0);
    expect(tvTrailers.length).toBeGreaterThan(0);
    expect(wall()).toHaveTextContent('Wednesday Addams');
  });

  it('sends the doors out to the TV articles and the TV events', () => {
    render(<TvShows />);

    const [articles, events] = doors().querySelectorAll('a');
    expect(articles).toHaveAttribute('href', '#featured-articles/tv');
    expect(events).toHaveAttribute('href', '#events/tv');
  });

  it('answers the page theme from the shared nav toggle', async () => {
    render(<TvShows />);

    const main = document.querySelector('main');
    expect(main.className).toContain('tvshows-theme-dark');
    expect(codex()).toHaveAttribute('data-theme', 'dark');

    userEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));

    await waitFor(() => expect(document.querySelector('main').className).toContain('tvshows-theme-light'));
    await waitFor(() => expect(codex()).toHaveAttribute('data-theme', 'light'));
    await waitFor(() => expect(wall()).toHaveAttribute('data-theme', 'light'));
  });
});
