import { fireEvent, render, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import SiteNav from './components/SiteNav';

const CSS = fs.readFileSync(path.join(__dirname, 'components/SiteNav.css'), 'utf8');
// The narrow-screen rules, taken as one block so a rule outside the breakpoint
// cannot quietly satisfy an assertion that is about phones and tablets.
const NARROW = CSS.slice(CSS.indexOf('@media (max-width: 1024px) {'), CSS.indexOf('/* ---------- saved bookmarks popup ----------'));

const FANDOMS = ['Anime', 'Gaming', 'Movies', 'TV Shows', 'K-Pop', 'Comics', 'Manga'];
const DISCOVER = ['Featured Articles', 'Trailers', 'Events', 'Upcoming Releases'];

const mount = () => render(<SiteNav theme="dark" setTheme={() => {}} active="about" variant="about" />);
const nav = (container) => container.querySelector('.universal-nav');
const drawer = (container) => container.querySelector('.universal-nav-drawer');
const toggle = (container) => container.querySelector('.universal-nav-toggle');

beforeEach(() => { window.localStorage.clear(); });

describe('the nav on a narrow screen', () => {
  it('keeps only the brand and the toggle in the bar itself', () => {
    const { container } = mount();

    // The links, the search, the saved button, the theme switch and the sign-in
    // all live in the drawer, so the bar row is just the two controls.
    expect(nav(container).querySelector('.universal-brand')).toBeInTheDocument();
    expect(toggle(container)).toBeInTheDocument();
    expect(drawer(container)).toBeInTheDocument();
    expect(drawer(container).querySelector('.universal-brand')).toBeNull();
    expect(toggle(container).querySelector('.universal-nav-link')).toBeNull();
    // The toggle is hidden on wide screens, where the bar is the whole nav.
    expect(CSS).toMatch(/\.universal-nav-toggle \{[^}]*display: none/);
    expect(NARROW).toMatch(/\.universal-nav-toggle \{ display: flex;/);
  });

  it('puts every option in the drawer, the links as well as the controls', () => {
    const { container } = mount();
    const panel = drawer(container);
    const labels = [...panel.querySelectorAll('.universal-nav-link')].map((node) => node.textContent);

    expect(labels).toEqual(['Home', 'Fandoms ⌄', 'Discover ⌄', 'Shop', 'About', 'Contact']);
    // The controls come along rather than being left behind in a hidden bar.
    expect(within(panel).getByLabelText(/search articles, trailers, events and releases/i)).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /saved bookmarks/i })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('opens and closes the drawer from the toggle', () => {
    const { container } = mount();
    const button = toggle(container);

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(nav(container).className).not.toContain('is-menu-open');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close menu');
    expect(button.className).toContain('is-open');
    expect(nav(container).className).toContain('is-menu-open');

    fireEvent.click(button);
    expect(nav(container).className).not.toContain('is-menu-open');
    expect(button.getAttribute('aria-label')).toBe('Open menu');
  });

  it('is laid out as a second row under the bar, not a scrolling strip', () => {
    // The old bar squeezed the links into a horizontally scrolling row, and a
    // scrolling row is an overflow container, so the panels opened inside it were
    // clipped away and could never be seen.
    expect(NARROW).not.toMatch(/overflow-x: auto/);
    expect(NARROW).not.toMatch(/scrollbar-width/);
    // Row one is brand plus toggle, row two is the drawer spanning both columns.
    expect(NARROW).toMatch(/\.universal-nav \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
    expect(NARROW).toMatch(/\.universal-nav\.is-menu-open \.universal-nav-drawer \{[^}]*grid-row: 2;[^}]*grid-column: 1 \/ -1;/);
    expect(NARROW).toMatch(/\.universal-nav-drawer \{ display: none; \}/);
    // Wide screens keep the bar untouched: the wrapper generates no box, so the
    // links and the actions stay direct children of the bar's own grid.
    expect(CSS).toMatch(/\.universal-nav-drawer \{ display: contents; \}/);
  });

  it('opens the fandom and discover panels inline instead of floating them', () => {
    const { container } = mount();
    const panel = drawer(container);

    // Absolutely positioned panels are clipped by any scrolling ancestor, which
    // is exactly what broke them. In flow, they push the rows below them down.
    expect(NARROW).toMatch(/\.universal-nav-menu \{ position: static; \}/);
    expect(NARROW).toMatch(/\.universal-dropdown,\s*\.universal-discover-dropdown \{[^}]*position: static;/);

    fireEvent.click(within(panel).getByRole('button', { name: /fandoms/i }));
    const fandoms = panel.querySelector('.universal-dropdown');
    expect(fandoms).toBeInTheDocument();
    expect([...fandoms.querySelectorAll('a')].map((node) => node.textContent)).toEqual(FANDOMS);

    fireEvent.click(within(panel).getByRole('button', { name: /discover/i }));
    expect(within(panel).getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(panel.querySelectorAll('.universal-dropdown')).toHaveLength(1);
  });

  it('closes on Escape, on a click outside the bar, and past the breakpoint', () => {
    const { container } = mount();

    fireEvent.click(toggle(container));
    expect(nav(container).className).toContain('is-menu-open');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(nav(container).className).not.toContain('is-menu-open');

    // A tap that lands on the page rather than the bar is a dismissal.
    fireEvent.click(toggle(container));
    fireEvent.mouseDown(document.body);
    expect(nav(container).className).not.toContain('is-menu-open');

    // Growing past the breakpoint has to close it too, or the wide bar comes back
    // with a stale open drawer hanging off it. 900px is still a drawer width, so
    // the bar has to survive that; 1200px is not.
    fireEvent.click(toggle(container));
    window.innerWidth = 900;
    fireEvent(window, new Event('resize'));
    expect(nav(container).className).toContain('is-menu-open');

    fireEvent.click(toggle(container));
    window.innerWidth = 1200;
    fireEvent(window, new Event('resize'));
    expect(nav(container).className).not.toContain('is-menu-open');
    window.innerWidth = 1024;
  });

  it('closes when a destination is picked, so the page it lands on is visible', () => {
    const { container } = mount();
    const panel = drawer(container);

    fireEvent.click(toggle(container));
    fireEvent.click(within(panel).getByRole('link', { name: 'About' }));
    expect(nav(container).className).not.toContain('is-menu-open');

    // An open panel is folded away with it, so reopening starts from a clean bar.
    fireEvent.click(toggle(container));
    fireEvent.click(within(drawer(container)).getByRole('button', { name: /fandoms/i }));
    expect(drawer(container).querySelector('.universal-dropdown')).toBeInTheDocument();
    fireEvent.click(within(drawer(container)).getByRole('link', { name: 'Anime' }));
    expect(nav(container).className).not.toContain('is-menu-open');
    expect(drawer(container).querySelector('.universal-dropdown')).toBeNull();
  });

  it('keeps the gold frame around the bar instead of stretching it down the drawer', () => {
    // The frame is a clip-path in percentages. On a box that grows to the height
    // of an open drawer its spikes stretch with it, so it is pinned to the bar's
    // own height and the drawer carries a separate surface.
    expect(NARROW).toMatch(/\.universal-nav::before \{[^}]*height: 64px;/);
    expect(NARROW).toMatch(/\.universal-nav::after \{[^}]*height: 58px;/);
  });

  it('carries its own theme, so its surfaces can be keyed off it', () => {
    const light = render(<SiteNav theme="light" setTheme={() => {}} />);

    // Pages disagree on what they call their light theme — `.theme-light`,
    // `.anime-theme-light`, `.comics-theme-light` — so a rule that reached into
    // an ancestor matched on some pages and silently did nothing on the rest.
    // The nav is handed the theme, so it states it itself.
    expect(nav(light.container).className).toContain('theme-light');
    expect(nav(light.container).className).not.toContain('theme-dark');
    expect(nav(mount().container).className).toContain('theme-dark');
    expect(CSS).toMatch(/\.universal-nav\.theme-light \.universal-search-panel \{[^}]*background: #fbf8ff/);
  });

  it('flips the drawer surface with the theme, without one rule outranking the other', () => {
    // --nav-ink is dark ink on the light stage, so a dark drawer there swallowed
    // every label. The surface is written as a pair, and the light one has to be
    // the more specific: the layout rule is `.universal-nav.is-menu-open ...`,
    // which is a class deeper than `.universal-nav ...` and beat the light pair
    // when the surface was hung off it.
    const surface = NARROW.indexOf('.universal-nav .universal-nav-drawer {');
    const light = NARROW.indexOf('.universal-nav.theme-light .universal-nav-drawer {');

    expect(surface).toBeGreaterThan(-1);
    expect(light).toBeGreaterThan(surface);
    expect(NARROW).toMatch(/\.universal-nav \.universal-nav-drawer \{[^}]*background: #14101f;/);
    expect(NARROW).toMatch(/\.universal-nav\.theme-light \.universal-nav-drawer \{[^}]*background: #fbf8ff;/);
    // The layout rule sets its place in the flow and nothing that paints, so it
    // cannot outrank the light pair on the declarations that matter.
    const layout = NARROW.indexOf('.universal-nav.is-menu-open .universal-nav-drawer {');
    expect(NARROW).toMatch(/\.universal-nav\.is-menu-open \.universal-nav-drawer \{[^}]*display: grid;/);
    expect(NARROW.slice(layout, surface)).not.toMatch(/background:/);
  });

  it('stacks the drawer rows and keeps the controls on one line', () => {
    expect(NARROW).toMatch(/\.universal-nav-links \{[^}]*flex-direction: column;[^}]*align-items: stretch;/);
    expect(NARROW).toMatch(/\.universal-nav-actions \{[^}]*flex-wrap: wrap;[^}]*justify-content: flex-start;/);
    // Each label is a full-width row with a hairline, and the active page is
    // marked with a left accent rather than the horizontal bar's underline.
    expect(NARROW).toMatch(/\.universal-nav-link \{[^}]*width: 100%;[^}]*border-bottom: 1px solid/);
    expect(NARROW).toMatch(/\.universal-nav-link::after \{[^}]*left: -10px;[^}]*width: 3px;/);
    // The theme switch names the theme again: a drawer row has room for it.
    expect(NARROW).toMatch(/\.universal-theme-button span \{ display: inline; \}/);
    // The search sits on a row of its own, so nothing can be squeezed off the end.
    expect(NARROW).toMatch(/\.universal-search \{ flex: 1 1 100%; \}/);
  });

  it('switches to the drawer at a tablet width, not a phone width', () => {
    // The bar never wraps, so below roughly 1270px it overflows its own box and
    // the options on the right are cut off. 768 and 820 in portrait and 1024 in
    // landscape all sit under that, so a phone-width breakpoint left every
    // tablet showing a clipped bar.
    expect(CSS).toContain('@media (max-width: 1024px) {');
    expect(NARROW).toMatch(/\.universal-nav \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
    expect(NARROW).toMatch(/\.universal-nav-toggle \{ display: flex;/);
    // The drawer and the bar cannot both answer to one width, or the toggle and
    // the links would be on screen together.
    expect(CSS.match(/@media \(max-width: 1024px\) \{/g)).toHaveLength(1);
  });

  it('trims the bar between the drawer and the full width, so nothing clips', () => {
    const TIGHT = CSS.slice(CSS.indexOf('@media (min-width: 1025px) and (max-width: 1279px) {'), CSS.indexOf('/* ---------- saved bookmarks popup ----------'));

    expect(TIGHT.length).toBeGreaterThan(0);
    // The wordmark and the theme label are what give way first, then the logo
    // and the gaps. Together they buy back the width the full bar needs above
    // this tier, so a 1025px laptop and a 1280px one can share the same bar.
    expect(TIGHT).toMatch(/\.universal-brand span \{ display: none; \}/);
    expect(TIGHT).toMatch(/\.universal-theme-button span \{ display: none; \}/);
    expect(TIGHT).toMatch(/\.universal-brand img \{ width: 54px; height: 54px; \}/);
    expect(TIGHT).toMatch(/\.universal-nav-links \{ gap: 18px; \}/);
    expect(TIGHT).toMatch(/\.universal-nav \{[^}]*width: calc\(100% - 48px\)/);
    // The bar itself is still a bar here: the toggle and the drawer stay off.
    expect(TIGHT).not.toMatch(/universal-nav-toggle/);
    expect(TIGHT).not.toMatch(/universal-nav-drawer/);
  });
});
