import { render, within } from '@testing-library/react';
import Gaming from './pages/gaming';

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');

const css = readCss('pages/gaming.css');

// The last block in the file is the mobile hero fix, and its position is the whole
// point: every earlier re-skin layer ends with a bare `.gaming-copy` rule, so a
// desktop geometry declared after the mobile queries would win on source order.
const MOBILE = css.lastIndexOf('@media (max-width: 720px)');
const mobile = css.slice(MOBILE);

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
});

afterEach(() => {
  delete global.fetch;
});

describe('gaming page', () => {
  it('renders the hero with the copy, the window and the character stage', () => {
    const { container } = render(<Gaming />);

    expect(container.querySelector('.gaming-page')).not.toBeNull();
    expect(container.querySelector('.gaming-hero')).not.toBeNull();
    expect(container.querySelector('.gaming-copy h1').textContent).toContain('THE GAME');
    expect(container.querySelector('.gaming-window')).not.toBeNull();
    expect(container.querySelector('.gaming-window .gaming-stage')).not.toBeNull();
    expect(container.querySelector('.gaming-character')).not.toBeNull();
  });

  it('keeps the four HUD labels and the stage index on the character stage', () => {
    const { container } = render(<Gaming />);

    ['player', 'system', 'level', 'ready'].forEach((slot) => {
      expect(container.querySelector(`.gaming-hud-${slot}`)).not.toBeNull();
    });
    expect(container.querySelector('.gaming-stage-index').textContent).toContain('GAMING');
  });

  it('hands the copy the full column on a phone, instead of a 21.5% sliver', () => {
    // The desktop geometry was landing after the mobile media queries and winning
    // the cascade, which collapsed the copy to ~60px and let the hero's own
    // `overflow: hidden` clip its overflowing children.
    expect(mobile).toMatch(/\.gaming-copy \{ left: auto; width: 100%; max-width: 100%; \}/);
    // The fixed pixel widths were cut for the desktop column.
    expect(mobile).toMatch(/\.gaming-intro,\s*\.gaming-copy-detail \{ max-width: 32ch; \}/);
    expect(mobile).toMatch(/\.gaming-copy-signal \{ width: min\(175px, 100%\); \}/);
    expect(mobile).toMatch(/\.gaming-copy-badges \{ max-width: 340px; \}/);
    expect(mobile).toMatch(/\.gaming-copy h1 \{ font-size: clamp\(40px, 13vw, 60px\); \}/);
  });

  it('lets the window and the stage size themselves to the phone', () => {
    // The stage used to be a fixed 430px inside a fixed 735px window, so a 360px
    // phone stretched the character to a tall, narrow sliver.
    expect(mobile).toMatch(/\.gaming-window \{ min-height: 0; \}/);
    expect(mobile).toMatch(/\.gaming-window \.gaming-stage-wrap \{ height: auto; \}/);
    expect(mobile).toMatch(/\.gaming-window \.gaming-stage \{ width: 100%; height: min\(86vw, 400px\); \}/);
    // The 18px/20px hard shadow was tuned for a large stage.
    expect(mobile).toMatch(/\.gaming-stage-surface \{[^}]*box-shadow: 8px 9px 0/);
  });

  it('spreads the four HUD labels so they cannot collide on a short stage', () => {
    const pads = mobile.match(/\.gaming-hud \{ padding: 5px 7px; \}/);
    expect(pads).not.toBeNull();
    // The top and bottom pairs are pulled apart, since the stage is much shorter
    // than the desktop one the percentages were tuned for.
    expect(mobile).toMatch(/\.gaming-hud-player \{ top: 9%; left: 2%; \}/);
    expect(mobile).toMatch(/\.gaming-hud-system \{ top: 2%; right: 2%; \}/);
    expect(mobile).toMatch(/\.gaming-hud-level \{ bottom: 9%; left: 2%; \}/);
    expect(mobile).toMatch(/\.gaming-hud-ready \{ bottom: 2%; right: 2%; \}/);
  });

  it('keeps the mobile fix last, so no desktop rule can override it again', () => {
    // This is the regression that caused the bug: a bare `.gaming-copy` rule
    // written after the mobile queries beats them on source order, because a
    // media query adds no specificity of its own.
    expect(MOBILE).toBeGreaterThan(css.indexOf('.gaming-copy { left: 4.4%; width: 21.5%; }'));
    expect(css.slice(MOBILE)).not.toMatch(/^\.gaming-copy \{/m);

    // The page still scrolls past the hero, and desktop keeps its own rules.
    expect(css).toMatch(/\.gaming-page \{ overflow-x: clip; overflow-y: visible; \}/);
    expect(css).toMatch(/@media \(min-width: 721px\) \{\s*html:has\(\.gaming-page\)/);
  });
});
