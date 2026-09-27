import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import Shop from './pages/shop';

const BOOK = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/assets/json data/products.json'), 'utf8'));
const PRODUCTS = BOOK.products;
const CSS = fs.readFileSync(path.join(__dirname, 'pages/shop.css'), 'utf8');

let loadCount = 0;
let productLoads = 0;
const ok = (payload) => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
const fail = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('bad json')) });

const mount = async () => {
  const view = render(<Shop />);
  await waitFor(() => expect(view.container.querySelectorAll('.fv-card')).toHaveLength(PRODUCTS.length));
  return view;
};

const cards = (container) => [...container.querySelectorAll('.fv-card')];
const cardNamed = (container, name) => cards(container).find((card) => card.textContent.includes(name));
const tabs = (container) => [...container.querySelectorAll('.fv-tab')];
const tabNamed = (container, label) => tabs(container).find((tab) => tab.textContent.startsWith(label));
// The sort control paints its own listbox, so the tests open the menu the way a
// shopper does and click a row in it rather than firing change on a <select>.
// Choosing a sort closes the menu, so picking opens it again every time.
const sortTrigger = (container) => container.querySelector('.fv-sort-trigger');
const sortOptions = (container) => [...container.querySelectorAll('.fv-sort-option')];
const pickSort = (container, label) => {
  if (!container.querySelector('.fv-sort-menu')) fireEvent.click(sortTrigger(container));
  return sortOptions(container).find((option) => option.textContent.startsWith(label));
};
const bagButton = (container) => container.querySelector('.fv-vault-button');
const cart = (container) => container.querySelector('.fv-bag');
const openModal = async (container, name) => {
  fireEvent.click(within(cardNamed(container, name)).getByRole('button', { name: /^details$/i }));
  await waitFor(() => expect(container.querySelector('.fv-modal')).not.toBeNull());
  return container.querySelector('.fv-modal');
};
const addFromCard = async (container, name) => {
  fireEvent.click(within(cardNamed(container, name)).getByRole('button', { name: /add to cart/i }));
};
const openVault = async (container) => {
  fireEvent.click(bagButton(container));
  await waitFor(() => expect(cart(container)).not.toBeNull());
  return cart(container);
};

beforeEach(() => {
  loadCount = 0;
  productLoads = 0;
  global.fetch = jest.fn((url) => {
    loadCount += 1;
    if (String(url).includes('products.json')) { productLoads += 1; return ok(BOOK); }
    return fail();
  });
  window.localStorage.clear();
});

afterEach(() => {
  delete global.fetch;
});

describe('the fan vault shelf', () => {
  it('loads the shelf from the products json and says so while it is away', async () => {
    let resolve;
    global.fetch = jest.fn((url) => {
      if (!String(url).includes('products.json')) return fail();
      productLoads += 1;
      return new Promise((done) => { resolve = () => done(ok(BOOK)); });
    });

    const { container } = render(<Shop />);
    expect(container.textContent).toMatch(/unlocking the vault/i);
    expect(cards(container)).toHaveLength(0);

    await act(async () => { resolve(); });
    await waitFor(() => expect(cards(container)).toHaveLength(PRODUCTS.length));
    // The shelf is fetched once, and the nav's search index does not refetch it.
    expect(productLoads).toBe(1);
  });

  it('reports a shelf that cannot be loaded instead of showing an empty room', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { container } = render(<Shop />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/could not be loaded/i);
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(global.fetch).toHaveBeenCalled();
    expect(cards(container)).toHaveLength(0);
  });

  it('ships json with the exact fields the page renders', () => {
    expect(BOOK.page.title).toBe('The Fan Vault');
    PRODUCTS.forEach((item) => {
      expect(typeof item.id).toBe('number');
      expect(typeof item.name).toBe('string');
      expect(['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']).toContain(item.category);
      expect(item.image.startsWith('/assets/images/')).toBe(true);
      expect(item.description.length).toBeGreaterThan(20);
      expect(typeof item.price).toBe('number');
      expect(item.priceRange).toMatch(/^\$\d+ - \$\d+$/);
    });
    expect(new Set(PRODUCTS.map((item) => item.id)).size).toBe(PRODUCTS.length);
    // Two pieces with the same name on the shelf would read as a bug.
    expect(new Set(PRODUCTS.map((item) => item.name)).size).toBe(PRODUCTS.length);
  });

  it('stocks twelve pieces in every one of the seven fandoms', () => {
    const CATEGORIES = ['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga'];
    expect(PRODUCTS).toHaveLength(84);

    const counts = {};
    PRODUCTS.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1; });
    CATEGORIES.forEach((category) => expect(counts[category]).toBe(12));
    expect(Object.keys(counts)).toHaveLength(7);

    // Every cover points at a file that actually exists in the project.
    PRODUCTS.forEach((item) => {
      expect(fs.existsSync(path.join(__dirname, '../public', item.image))).toBe(true);
    });
  });
});

describe('the vault hero', () => {
  it('names the vault and goes straight from the hero to the shelf', async () => {
    const { container } = await mount();

    expect(container.querySelector('.universal-nav')).toBeInTheDocument();
    expect(container.querySelector('.fv-hero').textContent).toContain('THE FAN');
    expect(container.querySelector('.fv-hero h1 em').textContent).toBe('VAULT');
    expect(container.querySelector('.fv-hero-tagline').textContent).toBe(BOOK.page.tagline);

    // The featured-collectible stage is gone: the product grid follows the hero
    // and the filters directly, with no showcase card wedged in between.
    expect(container.querySelector('.fv-feature')).toBeNull();
    const flow = [...container.querySelector('.fv-page').children].map((node) => node.className);
    const heroAt = flow.findIndex((name) => name.includes('fv-hero'));
    const vaultAt = flow.findIndex((name) => name.includes('fv-vault'));
    expect(heroAt).toBeGreaterThan(-1);
    expect(vaultAt).toBeGreaterThan(heroAt);
    // Nothing but the filters sits between the hero and the first card.
    expect(flow.slice(heroAt + 1, vaultAt).join(' ')).not.toContain('fv-feature');

    // Copy on one side, the vault trigger on the other.
    expect(CSS).toMatch(/\.fv-hero \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
    expect(CSS).toMatch(/\.fv-hero \{[^}]*text-align: left/);
  });

  it('puts View Vault on the right of the hero and counts what is inside', async () => {
    const { container } = await mount();
    const hero = container.querySelector('.fv-hero');
    const button = bagButton(container);

    expect(hero.contains(button)).toBe(true);
    // The trigger is the last thing in the hero, on the right-hand column.
    expect(hero.lastElementChild.contains(button)).toBe(true);
    expect(button.querySelector('span').textContent).toBe('View Vault');
    expect(button.getAttribute('aria-label')).toMatch(/empty/i);
    expect(button.textContent).toContain('0');
    expect(CSS).toMatch(/\.fv-hero-vault \{[^}]*justify-items: end/);

    await addFromCard(container, PRODUCTS[3].name);
    expect(button.textContent).toContain('1');
    expect(button.getAttribute('aria-label')).toMatch(/1 item/);
    expect(button.className).toContain('has-items');
  });

  it('picks the stage theme and keeps it in storage', async () => {
    const { container } = await mount();
    const stage = container.querySelector('.fv-page');
    expect(stage.className).toContain('theme-dark');

    fireEvent.click(within(container.querySelector('.universal-nav')).getByRole('button', { name: /switch to light theme/i }));
    expect(stage.className).toContain('theme-light');
    expect(window.localStorage.getItem('shop-theme')).toBe('light');
  });
});

describe('fandom match', () => {
  it('reshapes the vault when a fandom is chosen and back again', async () => {
    const { container } = await mount();
    const match = container.querySelector('.fv-match');
    expect(match.textContent).toMatch(/what's your fandom/i);

    const anime = within(match).getByRole('button', { name: /^anime/i });
    fireEvent.click(anime);
    await waitFor(() => expect(cards(container)).toHaveLength(PRODUCTS.filter((p) => p.category === 'Anime').length));
    expect(anime.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.fv-match-state').textContent).toMatch(/Showing Anime/);
    expect(tabNamed(container, 'All').getAttribute('aria-pressed')).toBe('false');

    // The shelf tabs follow the match, so the two controls never disagree.
    expect(tabNamed(container, 'Anime').getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(anime);
    await waitFor(() => expect(cards(container)).toHaveLength(PRODUCTS.length));
    expect(container.querySelector('.fv-match-state').textContent).toMatch(/Showing All/);
  });

  it('offers every fandom except All, with a count on each', async () => {
    const { container } = await mount();
    const choices = [...container.querySelectorAll('.fv-match-choice')];
    expect(choices.map((node) => node.textContent.replace(/\d+$/, '').trim())).toEqual(['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']);
    PRODUCTS.forEach((item) => {
      const node = choices.find((choice) => choice.textContent.startsWith(item.category));
      expect(node.textContent).toContain(String(PRODUCTS.filter((p) => p.category === item.category).length));
    });
  });
});

describe('explore the vault', () => {
  it('filters by category and shows all twelve pieces of the chosen fandom', async () => {
    const { container } = await mount();
    expect(tabs(container).map((tab) => tab.textContent.replace(/\d+$/, '').trim())).toEqual(['All', 'Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']);

    for (const label of ['Anime', 'Gaming', 'Movies', 'TV', 'K-Pop', 'Comics', 'Manga']) {
      const expected = PRODUCTS.filter((item) => item.category === label);
      expect(expected).toHaveLength(12);
      fireEvent.click(tabNamed(container, label));
      await waitFor(() => expect(cards(container)).toHaveLength(12));
      expect(tabNamed(container, label).getAttribute('aria-pressed')).toBe('true');
      expected.forEach((item) => expect(cardNamed(container, item.name)).toBeTruthy());
    }

    fireEvent.click(tabNamed(container, 'All'));
    await waitFor(() => expect(cards(container)).toHaveLength(PRODUCTS.length));
  });

  it('sorts by price both ways and by name', async () => {
    const { container } = await mount();
    const middle = (node) => {
      const text = node.querySelector('.fv-card-price').textContent;
      const numbers = text.match(/\d+(?:\.\d+)?/g).map(Number);
      return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    };
    const firstNames = () => cards(container).map((card) => card.querySelector('.fv-card-name').textContent);

    fireEvent.click(sortTrigger(container));
    // Each row carries a plain-language hint under the label, so the labels are
    // read off their own element rather than the whole row's text.
    expect(sortOptions(container).map((option) => option.querySelector('b').textContent))
      .toEqual(['Featured', 'Price: low to high', 'Price: high to low', 'Name: A to Z']);

    fireEvent.click(pickSort(container, 'Price: low to high'));
    const low = cards(container).map(middle);
    expect(low).toEqual([...low].sort((a, b) => a - b));

    fireEvent.click(pickSort(container, 'Price: high to low'));
    const high = cards(container).map(middle);
    expect(high).toEqual([...high].sort((a, b) => b - a));

    fireEvent.click(pickSort(container, 'Name: A to Z'));
    expect(firstNames()).toEqual([...firstNames()].sort((a, b) => a.localeCompare(b)));

    // The mix of single prices and ranges still orders cleanly.
    fireEvent.click(pickSort(container, 'Price: low to high'));
    expect(cards(container).map(middle)).toEqual([...low].reverse().sort((a, b) => a - b));
  });

  it('opens the sort menu, marks the live sort, and closes on escape', async () => {
    const { container } = await mount();
    const trigger = sortTrigger(container);

    // Nothing but the trigger exists until it is asked for, and the trigger
    // always states which sort is in force.
    expect(container.querySelector('.fv-sort-menu')).toBeNull();
    expect(container.querySelector('.fv-sort select')).toBeNull();
    expect(trigger.textContent).toContain('Featured');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');

    fireEvent.click(trigger);
    const menu = container.querySelector('.fv-sort-menu');
    expect(menu).toBeInTheDocument();
    expect(menu.getAttribute('role')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.className).toContain('is-open');
    // Featured is the live sort, so it is the selected row and the cursor lands
    // on it — the shopper arrows away from where the shelf already is.
    const featured = sortOptions(container)[0];
    expect(featured.getAttribute('aria-selected')).toBe('true');
    expect(featured.className).toContain('is-current');
    expect(menu.getAttribute('aria-activedescendant')).toBe(featured.id);

    // The chosen sort moves to the trigger and out of the list.
    fireEvent.click(pickSort(container, 'Name: A to Z'));
    expect(container.querySelector('.fv-sort-menu')).toBeNull();
    expect(trigger.textContent).toContain('Name: A to Z');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Escape backs out without changing anything.
    fireEvent.click(trigger);
    fireEvent.keyDown(container.querySelector('.fv-sort-menu'), { key: 'Escape' });
    expect(container.querySelector('.fv-sort-menu')).toBeNull();
    expect(trigger.textContent).toContain('Name: A to Z');
  });

  it('dresses the sort control like the rest of the shelf instead of a native select', async () => {
    const { container } = await mount();
    // The OS popup cannot be styled, so the sort arrived on every platform as a
    // flat white rectangle that shared nothing with the shelf's angled neon
    // faces. The menu is painted here instead, so the open trigger, the raised
    // panel, the live-sort tick and the flipping chevron are all its own.
    expect(container.querySelector('.fv-sort select')).toBeNull();
    expect(CSS).toMatch(/\.fv-sort-trigger \{[^}]*border-radius: 12px 4px 12px 4px/);
    expect(CSS).toMatch(/\.fv-sort-trigger \{[^}]*background: linear-gradient\(/);
    expect(CSS).toMatch(/\.theme-light \.fv-sort-trigger \{[^}]*background: linear-gradient\(/);
    expect(CSS).toMatch(/\.fv-sort-trigger:focus-visible \{[^}]*outline: 2px solid/);
    // The open state has to read as part of the control, so the chevron flips.
    expect(CSS).toMatch(/\.fv-sort-trigger\.is-open \{[^}]*border-color: var\(--magenta\)/);
    expect(CSS).toMatch(/\.fv-sort-trigger\.is-open svg \{[^}]*transform: rotate\(180deg\)/);
    // The menu is anchored under the trigger, not dropped in the page flow.
    expect(CSS).toMatch(/\.fv-sort \{[^}]*position: relative/);
    expect(CSS).toMatch(/\.fv-sort-menu \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.theme-light \.fv-sort-menu \{[^}]*background: #fff/);
    // The live sort is called out by a filled tick, not by colour alone.
    expect(CSS).toMatch(/\.fv-sort-option\.is-current \.fv-sort-tick \{[^}]*background: var\(--magenta\)/);
  });

  it('lays the shelf out as a uniform four-column grid with no cropped tiles', async () => {
    await mount();
    // Only the desktop layout counts; the media queries restack it for small screens.
    const desktop = CSS.split('@media')[0];
    expect(desktop).toMatch(/\.fv-vault \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    // The old twelve-column mosaic spanned tiles across uneven tracks, which cut
    // artwork off at the card edges. No span rules and no fixed auto-rows remain.
    expect(desktop).not.toMatch(/grid-auto-flow: dense/);
    expect(desktop).not.toMatch(/grid-auto-rows/);
    expect(desktop).not.toMatch(/\.fv-card\.is-scale-/);
    // Every tile shares one art window, and the cover is letterboxed inside it.
    expect(desktop).toMatch(/\.fv-card-art \{[^}]*height: 292px/);
    expect(desktop).toMatch(/\.fv-card-art img \{[^}]*object-fit: contain/);
  });
});

describe('product cards', () => {
  it('shows the art, name, category, price, description and a save control', async () => {
    const { container } = await mount();
    const card = cardNamed(container, PRODUCTS[0].name);

    expect(card.querySelector('img').getAttribute('src')).toBe(PRODUCTS[0].image);
    expect(card.querySelector('.fv-card-name').textContent).toBe(PRODUCTS[0].name);
    expect(card.querySelector('.fv-card-flags b').textContent).toBe(PRODUCTS[0].category);
    expect(card.querySelector('.fv-card-price').textContent).toMatch(/^\$| - \$/);
    expect(card.querySelector('.fv-card-desc').textContent).toBe(PRODUCTS[0].description);
    expect(within(card).getByRole('button', { name: /^details$/i })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: new RegExp(`Save ${PRODUCTS[0].name}`, 'i') })).toBeInTheDocument();
  });

  it('puts the name, price, description and add to cart over the cover on hover', async () => {
    const { container } = await mount();
    const target = PRODUCTS[0];
    const card = cardNamed(container, target.name);
    const art = card.querySelector('.fv-card-art');
    const overlay = card.querySelector('.fv-card-overlay');

    // The overlay is a child of the art, so it covers the artwork itself
    // instead of sitting under it in the card body.
    expect(art.contains(overlay)).toBe(true);
    expect(overlay.querySelector('h3').textContent).toBe(target.name);
    expect(overlay.querySelector('.fv-card-flags b').textContent).toBe(target.category);
    expect(overlay.querySelector('.fv-card-flags i').textContent).toMatch(/^\$| - \$/);
    expect(overlay.querySelector('.fv-card-desc').textContent).toBe(target.description);
    expect(within(overlay).getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    expect(within(overlay).getByRole('button', { name: /^details$/i })).toBeInTheDocument();

    // Hidden until hover, revealed on hover or keyboard focus, and pinned open
    // on touch where there is no hover at all.
    const desktop = CSS.split('@media')[0];
    expect(desktop).toMatch(/\.fv-card-overlay \{[^}]*position: absolute; inset: 0/);
    expect(desktop).toMatch(/\.fv-card-overlay \{[^}]*opacity: 0/);
    expect(desktop).toMatch(/\.fv-card:hover \.fv-card-overlay,\s*\.fv-card:focus-within \.fv-card-overlay \{[^}]*opacity: 1/);
    expect(CSS).toMatch(/@media \(hover: none\) \{[\s\S]*?\.fv-card-overlay \{ opacity: 1/);
    // Keyboard users get the same panel as the mouse does.
    expect(desktop).toMatch(/\.fv-card:focus-within \.fv-card-overlay/);
  });

  it('keeps the price readable on the cover without hovering', () => {
    expect(CSS).toMatch(/\.fv-card-tag \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.fv-card:hover \.fv-card-tag,\s*\.fv-card:focus-within \.fv-card-tag \{[^}]*opacity: 0/);
  });

  it('saves a product to the shared bookmark list', async () => {
    const { container } = await mount();
    const card = cardNamed(container, PRODUCTS[0].name);
    fireEvent.click(within(card).getByRole('button', { name: new RegExp(`Save ${PRODUCTS[0].name}`, 'i') }));

    expect(within(card).getByRole('button', { name: new RegExp(`Remove ${PRODUCTS[0].name} from bookmarks`, 'i') })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem('fandomverse-bookmarks') || '[]');
    expect(stored.some((item) => item.type === 'product' && item.title === PRODUCTS[0].name)).toBe(true);
  });
});

describe('item details', () => {
  it('opens on the card and closes from the button, the veil and escape', async () => {
    const { container } = await mount();
    const modal = await openModal(container, PRODUCTS[0].name);

    expect(modal.getAttribute('aria-modal')).toBe('true');
    fireEvent.click(within(modal).getByRole('button', { name: /close item details/i }));
    await waitFor(() => expect(container.querySelector('.fv-modal')).toBeNull());

    const again = await openModal(container, PRODUCTS[0].name);
    fireEvent.click(container.querySelector('[data-testid="product-veil"]'));
    await waitFor(() => expect(container.querySelector('.fv-modal')).toBeNull());

    await openModal(container, PRODUCTS[0].name);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(container.querySelector('.fv-modal')).toBeNull());
    expect(again).toBeTruthy();
  });

  it('lists the big art, name, price, description, category and add to cart', async () => {
    const { container } = await mount();
    const target = PRODUCTS[2];
    const modal = await openModal(container, target.name);

    expect(within(modal).getByRole('img', { name: `Artwork for ${target.name}` }).getAttribute('src')).toBe(target.image);
    expect(within(modal).getByRole('heading', { name: target.name })).toBeInTheDocument();
    expect(modal.querySelector('.fv-modal-price').textContent).toMatch(/^\$| - \$/);
    expect(modal.querySelector('.fv-modal-desc').textContent).toBe(target.description);
    expect(modal.querySelector('.fv-modal-flags b').textContent).toBe(target.category);
    expect(within(modal).getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('opens item details as a centred popup, readable on both stages', async () => {
    const { container } = await mount();
    const modal = await openModal(container, PRODUCTS[0].name);

    // A real dialog in the middle of the stage, not a sheet pinned to the
    // bottom edge, and it still scrolls so nothing is cut off.
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(CSS).not.toContain('.fv-overlay-sheet');
    expect(CSS).toMatch(/\.fv-overlay \{[^}]*align-items: center; justify-content: center/);
    expect(CSS).toMatch(/\.fv-modal \{[^}]*max-height: min\(84vh, 720px\)/);
    expect(CSS).toMatch(/\.fv-modal \{[^}]*overflow-y: auto/);
    expect(CSS).toMatch(/@keyframes fv-rise \{[^}]*translateY\(24px\)/);
    // The shell paints its own surface per stage, so the type reads either way.
    expect(CSS).toMatch(/\.fv-modal \{[^}]*background: #100a18/);
    expect(CSS).toMatch(/\.theme-light \.fv-modal \{[^}]*background: #fff/);
  });
});

describe('the vault bag', () => {
  it('starts empty and is reached from the hero, not a floating tab', async () => {
    const { container } = await mount();
    const button = bagButton(container);

    expect(button.getAttribute('aria-label')).toMatch(/empty/i);
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('.fv-hero').contains(button)).toBe(true);
    // The old fixed corner tab is gone.
    expect(CSS).not.toContain('.fv-bag-button {');
  });

  it('adds from the detail modal and waits for View Vault before opening', async () => {
    const { container } = await mount();
    const target = PRODUCTS[1];
    const modal = await openModal(container, target.name);
    fireEvent.click(within(modal).getByRole('button', { name: /add to cart/i }));

    await waitFor(() => expect(bagButton(container).textContent).toContain('1'));
    expect(bagButton(container).getAttribute('aria-label')).toMatch(/1 item/);
    // The modal steps aside, but the vault waits for the shopper to ask for it.
    expect(container.querySelector('.fv-modal')).toBeNull();
    expect(cart(container)).toBeNull();

    const panel = await openVault(container);
    expect(panel.textContent).toContain(target.name);
    expect(within(panel).getByRole('heading', { name: /your vault/i })).toBeInTheDocument();
  });

  it('adds straight from a card hover overlay', async () => {
    const { container } = await mount();
    const target = PRODUCTS[4];
    await addFromCard(container, target.name);

    expect(bagButton(container).textContent).toContain('1');
    const panel = await openVault(container);
    expect(panel.textContent).toContain(target.name);
  });

  it('opens the vault as a side drawer holding everything that was added', async () => {
    const { container } = await mount();
    const added = [PRODUCTS[0], PRODUCTS[9], PRODUCTS[40]];
    for (const target of added) await addFromCard(container, target.name);
    expect(bagButton(container).textContent).toContain('3');

    const panel = await openVault(container);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.tagName).toBe('ASIDE');
    expect(panel.querySelector('.fv-bag-head span').textContent).toContain('3');

    // Every piece the shopper added is in the drawer, with its own artwork and
    // line total, not just the one that was added last.
    expect(panel.querySelectorAll('.fv-bag-line')).toHaveLength(added.length);
    added.forEach((target) => {
      const line = [...panel.querySelectorAll('.fv-bag-line')].find((node) => node.textContent.includes(target.name));
      expect(line).toBeTruthy();
      expect(line.querySelector('img').getAttribute('src')).toBe(target.image);
      expect(line.textContent).toContain(target.category);
    });

    // Bolted to the right edge of the stage, not floating in the middle of it,
    // and one piece per row down the panel.
    expect(CSS).toMatch(/\.fv-overlay-bag \{[^}]*align-items: stretch; justify-content: flex-end/);
    expect(CSS).toMatch(/\.fv-bag \{[^}]*width: min\(480px, 100%\)/);
    expect(CSS).toMatch(/\.fv-bag \{[^}]*margin-left: auto/);
    expect(CSS).toMatch(/\.fv-bag \{[^}]*border-right: 0/);
    expect(CSS).not.toMatch(/\.fv-cart/);
  });

  it('flies the cover into the View Vault button when a piece is added', async () => {
    const { container } = await mount();
    const target = PRODUCTS[5];

    // jsdom reports zeroed rects, so the flight is verified on the layer the
    // click produces plus the animation that carries it home.
    await addFromCard(container, target.name);
    const flyer = container.querySelector('.fv-fly');
    expect(flyer).toBeInTheDocument();
    expect(flyer.getAttribute('aria-hidden')).toBe('true');
    expect(flyer.querySelector('img').getAttribute('src')).toBe(target.image);
    expect(flyer.style.getPropertyValue('--fv-fly-x')).not.toBe('');
    expect(flyer.style.getPropertyValue('--fv-fly-y')).not.toBe('');

    expect(CSS).toMatch(/\.fv-fly \{[^}]*position: fixed/);
    expect(CSS).toMatch(/@keyframes fv-fly \{[\s\S]*?var\(--fv-fly-x\)/);
    // Reduced motion skips the flight and just pulses the button.
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.fv-fly \{ display: none/);
  });

  it('clears the flyer once the flight lands', async () => {
    const { container } = await mount();
    await addFromCard(container, PRODUCTS[6].name);
    expect(container.querySelector('.fv-fly')).toBeInTheDocument();

    // The layer is torn down after the animation, so it cannot pile up.
    await waitFor(() => expect(container.querySelector('.fv-fly')).toBeNull(), { timeout: 3000 });
    expect(bagButton(container).textContent).toContain('1');
  });

  it('raises quantity, lowers it back, and removes the line at zero', async () => {
    const { container } = await mount();
    const target = PRODUCTS[0];
    const modal = await openModal(container, target.name);
    fireEvent.click(within(modal).getByRole('button', { name: /add to cart/i }));
    const panel = await openVault(container);

    fireEvent.click(within(panel).getByRole('button', { name: `Add one more ${target.name}` }));
    fireEvent.click(within(panel).getByRole('button', { name: `Add one more ${target.name}` }));
    expect(bagButton(container).textContent).toContain('3');
    expect(within(panel).getByLabelText(`Quantity of ${target.name}`).textContent).toBe('3');

    fireEvent.click(within(panel).getByRole('button', { name: `Remove one ${target.name}` }));
    expect(within(panel).getByLabelText(`Quantity of ${target.name}`).textContent).toBe('2');

    fireEvent.click(within(panel).getByRole('button', { name: `Remove ${target.name} from the vault` }));
    expect(panel.querySelectorAll('.fv-bag-line')).toHaveLength(0);
    expect(panel.textContent).toMatch(/the vault is empty/i);
  });

  it('totals the shelf and clears it on request', async () => {
    const { container } = await mount();
    const first = PRODUCTS[0];
    const second = PRODUCTS[1];
    const mid = (item) => (typeof item.price === 'number' ? item.price : item.priceRange.match(/\d+/g).map(Number).reduce((a, b) => a + b, 0) / 2);

    for (const target of [first, second]) {
      const modal = await openModal(container, target.name);
      fireEvent.click(within(modal).getByRole('button', { name: /add to cart/i }));
    }

    const panel = await openVault(container);
    expect(panel.querySelectorAll('.fv-bag-line')).toHaveLength(2);
    const expected = (mid(first) + mid(second)).toFixed(2);
    expect(panel.querySelector('.fv-bag-total b').textContent).toBe(`$${expected}`);
    expect(panel.textContent).toMatch(/no payment here/i);

    fireEvent.click(within(panel).getByRole('button', { name: /clear cart/i }));
    expect(panel.querySelectorAll('.fv-bag-line')).toHaveLength(0);
    expect(bagButton(container).getAttribute('aria-label')).toMatch(/empty/i);
  });

  it('keeps the vault in memory only, never in storage', async () => {
    const { container } = await mount();
    const modal = await openModal(container, PRODUCTS[0].name);
    fireEvent.click(within(modal).getByRole('button', { name: /add to cart/i }));

    expect(window.localStorage.getItem('fan-vault-cart')).toBeNull();
    expect(JSON.stringify(window.localStorage)).not.toContain('qty');
  });

  it('closes from the button, the veil and escape', async () => {
    const { container } = await mount();
    let panel = await openVault(container);

    fireEvent.click(within(panel).getByRole('button', { name: /close your vault/i }));
    await waitFor(() => expect(cart(container)).toBeNull());

    panel = await openVault(container);
    fireEvent.click(container.querySelector('[data-testid="cart-veil"]'));
    await waitFor(() => expect(cart(container)).toBeNull());

    await openVault(container);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(cart(container)).toBeNull());
  });

  it('stops the page behind the vault from scrolling', async () => {
    const { container } = await mount();
    const panel = await openVault(container);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(within(panel).getByRole('button', { name: /close your vault/i }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });
});

describe('the stage theme', () => {
  it('repaints the vault for the light stage too', async () => {
    await mount();
    expect(CSS).toMatch(/\.fv-page\.theme-light \{[^}]*--magenta:/);
    expect(CSS).toMatch(/\.theme-light \.fv-toolbar \{[^}]*background:/);
    expect(CSS).toMatch(/\.theme-light \.fv-card:hover/);
  });

  it('keeps the Save control readable on a card in both stages', () => {
    // The shared control used to fall back to near-black ink on a near-black
    // face, which made the chip vanish wherever a page did not override its
    // --mark-* tokens. The fallback is light ink now, and the shop hands the
    // control the stage palette on top of that.
    const BOOKMARK_CSS = fs.readFileSync(path.join(__dirname, 'components/BookmarkButton.css'), 'utf8');
    expect(BOOKMARK_CSS).toMatch(/\.bookmark \{[^}]*--mark-ink: #f4f1fb/);

    const dark = CSS.match(/\.fv-page \.bookmark \{[^}]*\}/)[0];
    const light = CSS.match(/\.fv-page\.theme-light \.bookmark \{[^}]*\}/)[0];
    // Light ink on a dark face, dark ink on a light face: always the inverse.
    expect(dark).toMatch(/--mark-ink: #f4f1fb/);
    expect(light).toMatch(/--mark-ink: #140a1c/);
    expect(light).toMatch(/--mark-face: #fff/);
  });

  it('seats the shared footer clear of the last row of cards', async () => {
    const { container } = await mount();
    const footer = container.querySelector('.fv-page > .site-footer');

    expect(footer).toBeInTheDocument();
    // The vault grid has no bottom padding, so without this the footer sat flush
    // against the last row. A negative margin would be worse: it would drag the
    // footer up on top of the cards.
    expect(CSS).not.toMatch(/\.fv-page > \.site-footer \{[^}]*margin-top: -/);
    expect(CSS).toMatch(/\.fv-vault \{[^}]*padding-bottom: 52px/);
    expect(CSS).toMatch(/\.fv-page > \.site-footer \{[^}]*margin-top: 28px/);
    expect(CSS).toMatch(/\.fv-page > \.site-footer \{[^}]*border-top: 1px solid/);
    expect(CSS).toMatch(/\.theme-light \.fv-page > \.site-footer \{[^}]*border-top-color/);
    // The scroll-to-top control travels with the shared footer.
    expect(within(footer).getByRole('button', { name: /back to the beginning/i })).toBeInTheDocument();
  });
});
