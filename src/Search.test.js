import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SiteNav from './components/SiteNav';
import { loadSearchIndex, resetSearchIndex, searchSite, suggestTerms } from './search';

const ARTICLES = require('../public/assets/json data/featuredArticles.json');
const TRAILERS = require('../public/assets/json data/trailers.json');
const EVENTS = require('../public/assets/json data/events.json');
const RELEASES = require('../public/assets/json data/upcomingReleases.json');

const PATHS = {
  articles: '/assets/json%20data/featuredArticles.json',
  trailers: '/assets/json%20data/trailers.json',
  events: '/assets/json%20data/events.json',
  releases: '/assets/json%20data/upcomingReleases.json',
};

const DATA = { articles: ARTICLES, trailers: TRAILERS, events: EVENTS, releases: RELEASES };

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');

const jsonFetch = () => jest.fn((url) => {
  const key = Object.keys(PATHS).find((name) => PATHS[name] === url);
  if (!key) return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  return Promise.resolve({ ok: true, json: () => Promise.resolve(DATA[key]) });
});

const field = (container) => container.querySelector('.universal-search-box input');
const panel = (container) => container.querySelector('.universal-search-panel');
const hits = (container) => [...container.querySelectorAll('.universal-search-hits li a')];

const mount = async () => {
  const view = render(<SiteNav theme="dark" setTheme={() => {}} />);
  await waitFor(() => expect(field(view.container)).toBeInTheDocument());
  await loadSearchIndex();
  return view;
};

beforeEach(() => {
  resetSearchIndex();
  global.fetch = jsonFetch();
  window.localStorage.clear();
  window.location.hash = '';
});

describe('site-wide search index', () => {
  it('builds from the four page json files through their encoded paths', async () => {
    await loadSearchIndex();
    Object.values(PATHS).forEach((url) => expect(global.fetch).toHaveBeenCalledWith(url));
  });

  it('indexes words the site actually uses, from every section', async () => {
    const rows = await loadSearchIndex();
    expect(rows.length).toBe(
      ARTICLES.articles.length + TRAILERS.trailers.length + EVENTS.events.length + RELEASES.releases.length,
    );
    ['Article', 'Trailer', 'Event', 'Release'].forEach((kind) => {
      expect(rows.some((row) => row.kind === kind)).toBe(true);
    });
  });

  it('finds related content across sections for a word the visitor types', async () => {
    await loadSearchIndex();
    const found = searchSite('demon');

    expect(found.length).toBeGreaterThan(0);
    found.forEach((row) => expect(row.title.toLowerCase()).toContain('demon'));
    // A trailer and a release share the word, and both are offered.
    expect(new Set(found.map((row) => row.kind)).size).toBeGreaterThan(1);

    const release = found.find((row) => row.kind === 'Release');
    expect(release.title).toMatch(/Demon Slayer/i);
    expect(release.href).toBe('#upcoming-releases');
  });

  it('indexes the release schema fields, so a word from any of them finds the entry', async () => {
    await loadSearchIndex();

    // From the title. The trailer shares the words, so the release is offered beside it.
    const byTitle = searchSite('Erdtree');
    expect(byTitle.map((row) => row.title)).toContain('ELDEN RING: Shadow of the Erdtree');
    expect(byTitle.find((row) => row.kind === 'Release').href).toBe('#upcoming-releases');

    // From the description.
    expect(searchSite('anniversary').map((row) => row.title)).toContain('Interstellar');
    expect(searchSite('announcement').map((row) => row.title)).toContain('The Last of Us: Official Announcement');

    // From the studio and the platform the release carries.
    expect(searchSite('Shueisha').map((row) => row.title)).toContain('Jujutsu Kaisen: Sendai Colony');
    expect(searchSite('FromSoftware').map((row) => row.title)).toContain('ELDEN RING NIGHTREIGN');

    // From the status the release is filed under. The list is long, so the
    // default seven result cap is lifted to see every match.
    const rumoured = searchSite('rumoured', 40).map((row) => row.title);
    RELEASES.releases.filter((item) => item.status === 'Rumoured').forEach((item) => {
      expect(rumoured).toContain(item.title);
    });
    expect(searchSite('rumoured').length).toBeLessThanOrEqual(7);
  });

  it('survives a source that cannot be fetched', async () => {
    resetSearchIndex();
    global.fetch = jest.fn((url) => (url === PATHS.events
      ? Promise.reject(new Error('offline'))
      : Promise.resolve({ ok: true, json: () => Promise.resolve(RELEASES) })));

    const rows = await loadSearchIndex();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.kind === 'Release')).toBe(true);
  });

  it('suggests other words the site uses for a partial query', async () => {
    await loadSearchIndex();
    const words = suggestTerms('an');
    expect(words.length).toBeGreaterThan(0);
    words.forEach((word) => expect(word.startsWith('an')).toBe(true));
  });

  it('returns nothing for an empty or unknown query', async () => {
    await loadSearchIndex();
    expect(searchSite('')).toEqual([]);
    expect(searchSite('  ')).toEqual([]);
    expect(searchSite('zzzzqqq')).toEqual([]);
    expect(suggestTerms('a')).toEqual([]);
  });
});

describe('search box in the nav', () => {
  it('stays collapsed until the visitor focuses it', async () => {
    const { container } = await mount();
    expect(panel(container)).toBeNull();

    fireEvent.focus(field(container));
    fireEvent.change(field(container), { target: { value: 'demon' } });
    await waitFor(() => expect(panel(container)).not.toBeNull());
    expect(container.querySelector('.universal-search').className).toContain('is-open');
  });

  it('lists matching content with its kind and section link', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'anniversary' } });

    const first = await waitFor(() => {
      const list = hits(container);
      expect(list.length).toBeGreaterThan(0);
      return list[0];
    });

    expect(first.querySelector('span').textContent).toMatch(/^Release/);
    expect(first.getAttribute('href')).toBe('#upcoming-releases');
  });

  it('says so when nothing matches instead of showing an empty box', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'zzzzqqq' } });
    await waitFor(() => expect(panel(container).querySelector('.universal-search-none')).not.toBeNull());
    expect(panel(container).textContent).toMatch(/Nothing on the site matches/i);
  });

  it('opens words from the site as clickable suggestions', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'an' } });

    const words = await waitFor(() => {
      const list = [...container.querySelectorAll('.universal-search-words button')];
      expect(list.length).toBeGreaterThan(0);
      return list;
    });

    fireEvent.click(words[0]);
    expect(field(container).value).toBe(words[0].textContent);
  });

  it('goes to the result and clears the box when a hit is clicked', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'anniversary' } });
    const first = await waitFor(() => {
      const list = hits(container);
      expect(list.length).toBeGreaterThan(0);
      return list[0];
    });

    fireEvent.click(first);
    // The anchor navigates on its own, so the hash lands in a later task.
    await waitFor(() => expect(window.location.hash).toBe('#upcoming-releases'));
    expect(field(container).value).toBe('');
    expect(panel(container)).toBeNull();
  });

  it('navigates with the keyboard and moves the cursor with the arrows', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'an' } });
    await waitFor(() => expect(hits(container).length).toBeGreaterThan(1));

    expect(hits(container)[0].className).toContain('is-cursor');
    fireEvent.keyDown(field(container), { key: 'ArrowDown' });
    expect(hits(container)[1].className).toContain('is-cursor');

    fireEvent.keyDown(field(container), { key: 'Enter' });
    expect(window.location.hash).toMatch(/^#(featured-articles|trailers|events|upcoming-releases)/);
  });

  it('clears the query and closes on escape', async () => {
    const { container } = await mount();
    fireEvent.change(field(container), { target: { value: 'demon' } });
    await waitFor(() => expect(panel(container)).not.toBeNull());

    fireEvent.click(within(container.querySelector('.universal-search-box')).getByRole('button', { name: /clear search/i }));
    expect(field(container).value).toBe('');
    expect(panel(container)).toBeNull();

    fireEvent.change(field(container), { target: { value: 'demon' } });
    await waitFor(() => expect(panel(container)).not.toBeNull());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(panel(container)).toBeNull());
  });

  it('keeps the right-hand controls legible instead of shrunken to a whisper', () => {
    const css = readCss('components/SiteNav.css');

    // The theme pill's label used to render at 9.5px and the sign-in at 13px, so
    // the right-hand cluster read smaller than the links it sits beside.
    expect(css).toMatch(/\.universal-theme-button \{[^}]*font-size: 11\.5px/);
    expect(css).toMatch(/\.universal-signin \{[^}]*font-size: 14\.5px/);
    // The narrow breakpoint must not shrink them back below the desktop size.
    expect(css).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.universal-signin \{[^}]*font-size: 11\.5px/);
  });

  it('is a compact strip that grows while it is in use', () => {
    const css = readCss('components/SiteNav.css');
    const box = css.slice(css.indexOf('.universal-search-box {'), css.indexOf('.universal-search-box svg'));

    expect(box).toMatch(/width: 34px/);
    expect(box).toMatch(/height: 34px/);
    expect(css).toMatch(/\.universal-search\.is-open \.universal-search-box,\s*\.universal-search-box:focus-within \{[^}]*width: 260px/);
    expect(css).toMatch(/\.universal-search-panel \{[^}]*position: absolute/);
    // Below the breakpoint the search is no longer squeezed into a bar beside the
    // links: it sits in the drawer on a row of its own at full width, so it is a
    // usable tap target instead of a 32px glyph.
    expect(css).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.universal-search \{ flex: 1 1 100%; \}/);
    expect(css).toMatch(/@media \(max-width: 1024px\)[\s\S]*?\.universal-search-box,\s*\.universal-search\.is-open \.universal-search-box,\s*\.universal-search-box:focus-within \{ width: 100%; height: 42px; \}/);
  });

  it('draws the search glyph dark and solid so it never looks dim', () => {
    const css = readCss('components/SiteNav.css');
    const glyph = css.slice(css.indexOf('.universal-search-box svg'), css.indexOf('.universal-search-box input'));
    const box = css.slice(css.indexOf('.universal-search-box {'), css.indexOf('.universal-search-box svg'));

    expect(glyph).toMatch(/width: 18px/);
    expect(glyph).toMatch(/stroke: var\(--nav-ink\)/);
    expect(glyph).toMatch(/stroke-width: 2\.2/);
    expect(css).toMatch(/\.universal-search-box:hover svg \{ stroke: var\(--nav-accent\); \}/);
    // The pill itself has a visible edge, so the control reads as a control.
    expect(box).toMatch(/border: 1px solid color-mix\(in srgb, var\(--nav-ink\), transparent 78%\)/);
    expect(box).toMatch(/background: color-mix\(in srgb, var\(--nav-ink\), transparent 84%\)/);
  });

  it('keeps the results readable on their own surface in both themes', () => {
    const css = readCss('components/SiteNav.css');
    const panel = css.slice(css.indexOf('.universal-search-panel {'), css.indexOf('.universal-search-hits {'));

    expect(panel).toMatch(/background: #14101f/);
    expect(css).toMatch(/\.theme-light \.universal-search-panel \{[^}]*background: #fbf8ff/);
    expect(css).toMatch(/\.universal-search-hits a \{[^}]*color: var\(--nav-ink\)/);
  });
});
