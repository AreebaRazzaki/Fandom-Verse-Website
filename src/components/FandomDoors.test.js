import { render, screen } from '@testing-library/react';
import FandomDoors from './FandomDoors';
import { FANDOMS, paletteFor } from './fandomConfig';

const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'FandomDoors.css'), 'utf8');

const doors = () => [...document.querySelectorAll('.door-go')];
const section = () => document.querySelector('section.door');

beforeEach(() => {
  window.localStorage.clear();
});

/* ------------------------------------------------------------------ */

describe('FandomDoors — the heading', () => {
  it('names what is behind the doors', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    expect(screen.getByRole('heading', { name: /articles & events/i })).toBeInTheDocument();
  });

  it('says which fandom the pages behind them are filtered to', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    expect(screen.getByText(/the anime articles/i)).toBeInTheDocument();
    expect(screen.getByText(/the anime events/i)).toBeInTheDocument();
    expect(section().getAttribute('aria-label')).toBe('Anime articles and events');
  });

  it('leaves the number off the section and lets the title carry it', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    expect(document.querySelector('.door-num')).toBeNull();
    expect(screen.getByRole('heading', { name: /articles & events/i })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */

describe('FandomDoors — the two buttons', () => {
  it('is exactly two doors, and both are links', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    expect(doors()).toHaveLength(2);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('sends the reader to the articles page, already filtered to the fandom', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    const articles = doors()[0];
    expect(articles.getAttribute('href')).toBe(`#featured-articles/${FANDOMS.anime.articleCategory}`);
    expect(articles.textContent).toMatch(/open the articles page/i);
  });

  it('sends the reader to the events page, already filtered to the fandom', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    const events = doors()[1];
    expect(events.getAttribute('href')).toBe(`#events/${FANDOMS.anime.eventsCategory}`);
    expect(events.textContent).toMatch(/open the events page/i);
  });

  it('follows the data id, so a fandom spelled differently still lands right', () => {
    render(<FandomDoors fandom="tvshows" theme="dark" />);

    expect(doors()[0].getAttribute('href')).toBe(`#featured-articles/${FANDOMS.tvshows.articleCategory}`);
    expect(doors()[1].getAttribute('href')).toBe(`#events/${FANDOMS.tvshows.eventsCategory}`);
  });

  it('never dead-ends: a fandom that is not registered still gets two doors', () => {
    render(<FandomDoors fandom="hololive" theme="dark" />);

    expect(doors().map((door) => door.getAttribute('href'))).toEqual([
      '#featured-articles/hololive',
      '#events/hololive',
    ]);
  });
});

/* ------------------------------------------------------------------ */

describe('FandomDoors — the page palette', () => {
  it('paints the doors in the fandom palette, not a second theme', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    const tones = paletteFor('anime', 'dark');
    const style = section().getAttribute('style');
    expect(style).toContain(`--door-accent: ${tones.accent}`);
    expect(style).toContain(`--door-page: ${tones.page}`);
  });

  it('follows the theme the page is on', () => {
    const { unmount } = render(<FandomDoors fandom="anime" theme="light" />);
    expect(section().getAttribute('data-theme')).toBe('light');
    expect(section().getAttribute('style')).toContain(`--door-accent: ${paletteFor('anime', 'light').accent}`);
    unmount();

    render(<FandomDoors fandom="anime" theme="dark" />);
    expect(section().getAttribute('data-theme')).toBe('dark');
  });
});

/* ------------------------------------------------------------------ */

describe('FandomDoors — the stylesheet', () => {
  it('holds the door treatment: the wipe, the arrow and the focus ring', () => {
    expect(css).toMatch(/\.door-go::before/);
    expect(css).toMatch(/\.door-go:hover/);
    expect(css).toMatch(/outline: 2px solid var\(--door-accent\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('puts the two doors side by side, and stacks them on a narrow screen', () => {
    expect(css).toMatch(/\.door-pair \{[^}]*grid-template-columns: repeat\(2,/);
    expect(css).toMatch(/@media \(max-width: 860px\)[\s\S]*\.door-pair \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });
});

/* ------------------------------------------------------------------ */

describe('FandomDoors — the backdrop', () => {
  it('is built from layers rather than one flat fill', () => {
    const layers = [
      '.door-bg',
      '.door-bg-rule',
      '.door-bg-glow',
      '.door-bg-arch',
      '.door-bg-shapes',
      '.door-bg-ticks',
      '.door-bg-chevrons',
      '.door-bg-motes',
      '.door-bg-grain',
    ];

    // Every layer is switched off in the one shared rule, so nothing in the
    // room can ever take a click off a door.
    const shared = css.slice(css.indexOf('.door-bg,'), css.indexOf('pointer-events: none;'));
    layers.forEach((layer) => expect(shared).toContain(layer));
    expect(shared).toContain('z-index: 0');

    // One arch per door, a second arch inside each, light on the floor in
    // front of them, loose geometry, a measured rule, a chevron trail, dust,
    // and the grain pass on top of all of it.
    expect(css).toMatch(/radial-gradient\(72% 60% at 92% 0%, var\(--door-tint\)/);
    expect(css).toMatch(/\.door-bg-arch i \{[\s\S]*border-radius: 50% 50% 0 0/);
    expect(css).toMatch(/\.door-bg-arch i::before/);
    expect(css).toMatch(/\.door-bg-arch i::after/);
    expect(css).toMatch(/\.door-bg-ticks::before \{[\s\S]*linear-gradient\(90deg, transparent, color-mix\(in srgb, var\(--door-ink\)/);
    expect(css).toMatch(/\.door-bg-chevrons::before \{[\s\S]*repeating-linear-gradient\(90deg/);
    expect(css).toMatch(/\.door-bg-chevrons i:nth-child\(3\)/);
    expect(css).toMatch(/@keyframes door-drift/);
    expect(css).toContain('feTurbulence');

    // The whole room sits behind the cards and never takes a click.
    expect(css).toMatch(/\.door-bg,[\s\S]*?pointer-events: none/);
    expect(css).toMatch(/\.door-wrap \{[^}]*z-index: 1/);
  });

  it('marks every layer as decorative, and hangs them in the section', () => {
    const { container } = render(<FandomDoors fandom="anime" theme="dark" />);

    const layers = container.querySelectorAll('.door-bg, .door-bg-rule, .door-bg-glow, .door-bg-arch, .door-bg-shapes, .door-bg-ticks, .door-bg-chevrons, .door-bg-motes, .door-bg-grain');

    expect(layers.length).toBe(9);
    layers.forEach((layer) => expect(layer).toHaveAttribute('aria-hidden', 'true'));

    expect(document.querySelectorAll('.door-bg-arch i')).toHaveLength(2);
    expect(document.querySelectorAll('.door-bg-shapes i')).toHaveLength(6);
    expect(document.querySelectorAll('.door-bg-ticks i')).toHaveLength(12);
    expect(document.querySelectorAll('.door-bg-chevrons i')).toHaveLength(3);
    expect(document.querySelectorAll('.door-bg-motes i')).toHaveLength(5);
  });

  it('stands one doorway behind each door', () => {
    render(<FandomDoors fandom="anime" theme="dark" />);

    const arches = [...document.querySelectorAll('.door-bg-arch i')];
    expect(arches).toHaveLength(2);
    expect(doors()).toHaveLength(2);
    // The two arches sit at opposite ends of the row, the same way round as
    // the two cards in front of them.
    expect(css).toMatch(/\.door-bg-arch i:nth-child\(1\) \{ left: 6%; \}/);
    expect(css).toMatch(/\.door-bg-arch i:nth-child\(2\) \{ right: 6%; \}/);
  });
});
