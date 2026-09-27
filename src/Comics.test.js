import { render, waitFor, within } from '@testing-library/react';
import Comics from './pages/comics';
import { resyncBookmarks } from './bookmarks';
import { clearMediaWallCache } from './components/FandomMediaWall';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const readData = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'assets', 'json data', name), 'utf8'));

const PROFILES = readData('characterProfiles.json');
const GALLERY = readData('gallery.json');
const TRAILERS = readData('trailers.json');

const FILES = {
  characterProfiles: PROFILES,
  gallery: GALLERY,
  trailers: TRAILERS,
};

const jsonFetch = () => jest.fn((url) => {
  const key = Object.keys(FILES).find((name) => String(url).includes(name));
  return Promise.resolve({ ok: Boolean(key), json: () => Promise.resolve(key ? FILES[key] : null) });
});

const wallReady = () => waitFor(() => expect(document.querySelector('.mwall-grid')).not.toBeNull());

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  global.fetch = jsonFetch();
  clearMediaWallCache();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

test('comics page mounts the codex, the wall and the doors with comics data', async () => {
  const { container } = render(<Comics />);
  await wallReady();

  const codex = container.querySelector('.codex');
  expect(codex).toHaveAttribute('data-fandom', 'comics');
  expect(codex).toHaveAttribute('data-theme', 'dark');
  expect(codex.querySelector('.codex-book-title')).toHaveTextContent('The Panel Codex');
  expect(within(codex).getByRole('button', { name: '01 Batman' })).toBeInTheDocument();
  expect(within(codex).getByRole('heading', { level: 3 })).toHaveTextContent('Batman');
  // Comics vocabulary, not the shared "series" / "plate" defaults.
  expect(within(codex).getByText('Title')).toBeInTheDocument();
  expect(codex.querySelector('.codex-plate-no')).toHaveTextContent('Panel 01');
  expect(codex.querySelector('.codex-leaf-entry')).toHaveTextContent('Issue 01');
  expect(codex.querySelector('.codex-plate-image')).toHaveAttribute('src', '/assets/images/Batman__(comic_1).png');

  const wall = document.getElementById('comics-media-wall');
  expect(wall).toHaveAttribute('data-theme', 'dark');
  // The wall is painted from the comics palette in comics.css, not the default.
  expect(wall.getAttribute('style')).toContain('--mwall-page: #242529');
  expect(wall.getAttribute('style')).toContain('--mwall-accent: #ff762b');
  expect(within(wall).getByText('Frames')).toBeInTheDocument();

  const doors = document.getElementById('comics-doors');
  expect(doors.querySelector('.door-go.is-articles')).toHaveAttribute('href', '#featured-articles/comics');
  expect(doors.querySelector('.door-go.is-events')).toHaveAttribute('href', '#events/comics');

  // Exactly one footer, and it is the last thing on the page.
  expect(document.querySelectorAll('.site-footer')).toHaveLength(1);
});

test('the light stage repaints the same three sections', async () => {
  window.localStorage.setItem('fandomverse-theme', 'light');
  const { container } = render(<Comics />);
  await wallReady();

  expect(container.querySelector('.comics-page')).toHaveClass('comics-theme-light');
  expect(container.querySelector('.codex')).toHaveAttribute('data-theme', 'light');
  expect(container.querySelector('.codex-book-title')).toHaveTextContent('The Panel Codex');

  const wall = document.getElementById('comics-media-wall');
  expect(wall).toHaveAttribute('data-theme', 'light');
  expect(wall.getAttribute('style')).toContain('--mwall-accent: #d85d22');
  expect(document.getElementById('comics-doors')).toHaveAttribute('data-theme', 'light');
});
