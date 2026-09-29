import { render } from '@testing-library/react';
import Manga from './pages/manga';

const CSS = require('fs').readFileSync(require('path').join(__dirname, 'pages/manga.css'), 'utf8');

// The fixes are commented with the exact property values they replace, so the
// comments are dropped before anything is asserted against the source.
const DECLARED = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

const mount = () => render(<Manga />);

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
});

afterEach(() => {
  delete global.fetch;
});

describe('manga page', () => {
  it('renders the sticky nav inside the page, ahead of the hero', () => {
    const { container } = mount();

    const page = container.querySelector('.manga-page');
    expect(page).not.toBeNull();

    // The nav has to live inside the page root, since that is what it sticks
    // within.
    const nav = container.querySelector('.universal-nav');
    expect(nav).not.toBeNull();
    expect(page.contains(nav)).toBe(true);

    const order = [...page.children];
    expect(order.indexOf(nav)).toBe(0);
    expect(order.indexOf(container.querySelector('.manga-hero'))).toBe(1);
  });

  it('leaves the nav bar something to stick to', () => {
    // A <body> that scrolls is the nearest scrollport for the sticky nav, and a
    // body sized by its own content never scrolls, so the bar rides away with
    // the page. `hidden` on either axis forces the other to auto and does
    // exactly that; `clip` cuts the overflow off without becoming a scrollport.
    const bodyRule = DECLARED.match(/body:has\(\.manga-page\)\s*\{([^}]*)\}/);
    expect(bodyRule).not.toBeNull();
    expect(bodyRule[1]).toMatch(/overflow-x:\s*clip/);
    expect(bodyRule[1]).toMatch(/overflow-y:\s*visible/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*hidden/);
    expect(bodyRule[1]).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/);
  });

  it('does not make the page root its own scrollport', () => {
    const page = DECLARED.match(/\.manga-page\s*\{([\s\S]*?)\n\}/)[1];

    // `overflow: hidden` here turned the page root into a scrollport, and a
    // sticky nav inside a box that never scrolls simply never sticks.
    expect(page).not.toMatch(/overflow:\s*hidden/);
    expect(page).toMatch(/overflow-x:\s*clip/);
    expect(page).toMatch(/overflow-y:\s*visible/);
  });

  it('keeps the nav sticking on a phone too', () => {
    // The 720px block re-declared the page root as `overflow-y: auto`, so the
    // whole problem came back on exactly the viewport where it hurts most.
    const phone = DECLARED.match(/@media \(max-width: 720px\)\s*\{([\s\S]*)\}\s*$/)[1];
    const root = phone.match(/\.manga-page\s*\{([^}]*)\}/)[1];

    expect(root).not.toMatch(/overflow-y:\s*(auto|scroll|hidden)/);
    expect(root).not.toMatch(/overflow-x:\s*hidden/);
    expect(root).toMatch(/overflow-x:\s*clip/);
    expect(root).toMatch(/overflow-y:\s*visible/);
  });

  it('keeps the sections below the hero reachable, rather than clipping them away', () => {
    const { container } = mount();
    const page = container.querySelector('.manga-page');

    // The codex, the media wall and the doors all sit under the hero, so a
    // hidden overflow used to swallow every one of them.
    expect(page.querySelector('.manga-hero')).not.toBeNull();
    expect(page.children.length).toBeGreaterThan(2);
  });
});
