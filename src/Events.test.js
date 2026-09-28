import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import Events from './pages/events';
import BookmarkButton from './components/BookmarkButton';
import { resyncBookmarks } from './bookmarks';
import { bookTicket, getTickets, resyncTickets, setTicketSeats } from './eventTickets';

const BOOK = require('../public/assets/json data/events.json');
const EVENTS = BOOK.events;
const FANDOM_IDS = ['anime', 'gaming', 'movies', 'tv', 'kpop', 'comics', 'manga'];
const KEY = 'fandomverse-bookmarks';

const readCss = (name) => require('fs').readFileSync(require('path').join(__dirname, name), 'utf8');
const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(BOOK) });

const mount = async (ui = <Events />, fetchImpl = okFetch) => {
  global.fetch = jest.fn(fetchImpl);
  const view = render(ui);
  await waitFor(() => expect(view.container.querySelector('.pass-grid')).not.toBeNull());
  return view;
};

const mountBroken = async (fetchImpl) => {
  global.fetch = jest.fn(fetchImpl);
  const view = render(<Events />);
  await waitFor(() => expect(view.container.querySelector('.pass-note-error')).not.toBeNull());
  return view;
};

const fandomChip = (container, name) =>
  within(container.querySelector('.pass-filters')).getByRole('button', { name });

const openPass = (container, title) => {
  const ticket = [...container.querySelectorAll('.pass-ticket')]
    .find((node) => node.querySelector('.pass-ticket-title').textContent === title);
  fireEvent.click(ticket.querySelector('.pass-ticket-hit'));
  return ticket;
};

const flagshipCard = (container) => container.querySelector('.pass-ticket.is-flagship');

beforeEach(() => {
  window.localStorage.clear();
  resyncBookmarks();
  resyncTickets();
  document.body.innerHTML = '';
});

describe('FANDOM PASSPORT event page', () => {
  it('ships a stubbed data file with at least three events per fandom', () => {
    expect(BOOK.issue.issue).toBe('EV-01');
    expect(BOOK.categories.map((item) => item.id)).toEqual(FANDOM_IDS);
    FANDOM_IDS.forEach((id) => {
      expect(EVENTS.filter((item) => item.category === id).length).toBeGreaterThanOrEqual(3);
    });
    expect(EVENTS.length).toBeGreaterThanOrEqual(21);
  });

  it('gives every event the fields the pass renders', () => {
    EVENTS.forEach((item) => {
      expect(typeof item.id).toBe('string');
      expect(FANDOM_IDS).toContain(item.category);
      expect(item.title.length).toBeGreaterThan(3);
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.location.length).toBeGreaterThan(3);
      expect(item.description.length).toBeGreaterThan(20);
      expect(item.image.startsWith('/assets/images/')).toBe(true);
    });
  });

  it('keeps ids unique so a saved event is never ambiguous', () => {
    expect(new Set(EVENTS.map((item) => item.id)).size).toBe(EVENTS.length);
  });

  it('opens with the passport hero and a single heading', async () => {
    const { container } = await mount();

    expect(container.querySelector('.pass-page')).not.toBeNull();
    expect(container.querySelector('.pass-hero h1').textContent.replace(/\s+/g, ' ')).toBe('FANDOM PASSPORT');
    expect(container.querySelector('.pass-hero h1').querySelector('br')).toBeNull();
    expect(container.querySelector('.pass-tagline')).not.toBeNull();
  });

  it('reads the events json through the encoded public path', async () => {
    await mount();
    expect(global.fetch).toHaveBeenCalledWith('/assets/json%20data/events.json');
  });

  it('drops the standalone featured pass and flags the flagship card instead', async () => {
    const { container } = await mount();
    const featured = EVENTS.find((item) => item.id === BOOK.featuredId);

    expect(container.querySelector('.pass-featured')).toBeNull();
    expect(container.querySelector('.pass-filters')).not.toBeNull();

    const flag = [...container.querySelectorAll('.pass-ticket-flag')];
    expect(flag).toHaveLength(1);
    expect(flag[0].textContent).toBe('Flagship');

    const flagship = flag[0].closest('.pass-ticket');
    expect(flagship.querySelector('.pass-ticket-title').textContent).toBe(featured.title);
    expect(flagship.classList.contains('is-flagship')).toBe(true);
  });

  it('opens the flagship event from its grid card', async () => {
    const { container } = await mount();
    const featured = EVENTS.find((item) => item.id === BOOK.featuredId);

    openPass(container, featured.title);
    await waitFor(() => expect(document.querySelector('.pass-sheet')).not.toBeNull());
    expect(within(document.querySelector('.pass-sheet')).getByText(featured.title)).toBeInTheDocument();
  });

  it('keeps the hero compact and dressed in scenery', async () => {
    const { container } = await mount();
    expect(container.querySelector('.pass-hero h1').textContent).toContain('PASSPORT');
    expect(container.querySelector('.pass-hero-canvas')).not.toBeNull();
    expect(container.querySelector('.pass-scenery')).not.toBeNull();
    expect(container.querySelectorAll('.pass-scenery > *').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll('.pass-hero-ribbon li').length).toBeGreaterThan(3);

    const css = readCss('pages/events.css');
    const hero = css.slice(css.indexOf('.pass-hero h1 {'), css.indexOf('.pass-hero h1 em'));
    expect(hero).toMatch(/font-size: clamp\(26px, 3\.4vw, 46px\)/);
    expect(hero).toMatch(/text-align: center/);
    expect(css).not.toContain('.pass-featured');
    expect(css).toMatch(/\.pass-scenery-gate \{/);
  });

  it('centres the FANDOM PASSPORT wordmark on one line', async () => {
    const { container } = await mount();
    const heading = container.querySelector('.pass-hero h1');

    expect(heading.textContent.replace(/\s+/g, ' ')).toBe('FANDOM PASSPORT');
    expect(heading.querySelector('br')).toBeNull();
    expect(heading.querySelectorAll('em')).toHaveLength(1);

    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-hero-inner \{[^}]*text-align: center/);
    expect(css).toMatch(/\.pass-hero h1 \{[^}]*margin: 0 auto/);
    expect(css).toMatch(/\.pass-hero h1 \{[^}]*text-align: center/);
  });

  it('never lets the hero read as an empty band', async () => {
    const { container } = await mount();
    expect(container.querySelectorAll('.pass-hero-shapes .pass-shape').length).toBeGreaterThanOrEqual(4);

    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-hero-shapes \{[^}]*position: absolute/);
    expect(css).toMatch(/\.pass-shape\.is-a \{[^}]*border-radius: 50%/);
    expect(css).toMatch(/@keyframes pass-drift/);
    // The light stage keeps a warm paper tone instead of a flat white wash.
    expect(css).toMatch(/\.theme-light \.pass-hero \{[^}]*#fff6e2/);
    expect(css).toMatch(/\.theme-light \.pass-shape \{[^}]*border-color/);
  });

  it('puts My tickets directly under the nav, at the top of the hero', async () => {
    const { container } = await mount();
    const hero = container.querySelector('.pass-hero');
    const top = hero.querySelector('.pass-hero-top');
    const inner = hero.querySelector('.pass-hero-inner');

    // Everything painted before the wallet row is decoration only.
    const before = [...hero.children].slice(0, [...hero.children].indexOf(top));
    expect(before.length).toBeGreaterThan(0);
    before.forEach((node) => expect(node.getAttribute('aria-hidden')).toBe('true'));

    // The wallet row is the first readable block, above the wordmark.
    expect(top.querySelector('.pass-wallet-open')).not.toBeNull();
    expect(top.nextElementSibling).toBe(inner);
    expect(inner.querySelector('.pass-hero h1')).not.toBeNull();

    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-hero-top \{[^}]*justify-content: center/);
    expect(css).toMatch(/\.pass-hero-top \{[^}]*margin-bottom: 34px/);
  });

  it('closes the tickets panel with the cross, the overlay and escape', async () => {
    const { container } = await mount();
    const open = () => fireEvent.click(within(container.querySelector('.pass-hero-top')).getByRole('button', { name: /my tickets/i }));

    open();
    const wallet = await waitFor(() => document.querySelector('.pass-wallet'));
    expect(within(wallet).getByRole('button', { name: /close my tickets/i })).toBeInTheDocument();

    // The decorative stamp must never sit on top of the cross.
    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-wallet-stamp \{[^}]*pointer-events: none/);
    expect(css).toMatch(/\.pass-wallet-close \{[^}]*flex: none/);
    // The stamp no longer hangs outside the panel, so no scrollbar is forced.
    expect(css).toMatch(/\.pass-wallet-stamp \{[^}]*bottom: 18px;\s*right: 22px/);
    expect(css).not.toMatch(/\.pass-wallet-stamp \{[^}]*right: -/);

    fireEvent.click(within(wallet).getByRole('button', { name: /close my tickets/i }));
    await waitFor(() => expect(document.querySelector('.pass-wallet')).toBeNull());

    open();
    await waitFor(() => document.querySelector('.pass-wallet'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.pass-wallet')).toBeNull());

    open();
    const again = await waitFor(() => document.querySelector('.pass-wallet'));
    fireEvent.click(screen.getByTestId('tickets-overlay'));
    await waitFor(() => expect(document.querySelector('.pass-wallet')).toBeNull());
    expect(again).not.toBeNull();
  });

  it('never drops a vertical scroll line while a panel is open', async () => {
    const { container } = await mount();
    openPass(container, EVENTS[0].title);
    await waitFor(() => document.querySelector('.pass-sheet'));

    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-sheet,\s*\.pass-wallet \{ scrollbar-width: none/);
    expect(css).toMatch(/\.pass-sheet::-webkit-scrollbar,\s*\.pass-wallet::-webkit-scrollbar \{[^}]*display: none/);

    // The lock only compensates a real scrollbar width, never the whole window.
    expect(document.body.style.paddingRight).toBe('');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('shows the booked state and its cancel cross on the right of the card', async () => {
    const { container } = await mount();
    const event = EVENTS[0];

    openPass(container, event.title);
    const sheet = await waitFor(() => document.querySelector('.pass-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));
    fireEvent.keyDown(document, { key: 'Escape' });

    const card = [...container.querySelectorAll('.pass-ticket')]
      .find((node) => node.textContent.includes(event.title));
    const booked = card.querySelector('.pass-ticket-booked');
    expect(booked).not.toBeNull();

    const css = readCss('pages/events.css');
    // The left corner belongs to the save control, so booked lives on the right.
    expect(css).toMatch(/\.pass-ticket-save \{[^}]*left: 12px/);
    expect(css).toMatch(/\.pass-ticket-booked \{[^}]*top: 12px;\s*right: 12px/);
    expect(css).toMatch(/\.pass-ticket-flag \{ left: 12px; bottom: 10px/);

    // The cross really cancels, straight from the card.
    fireEvent.click(within(booked).getByRole('button', { name: new RegExp(`cancel the ticket for ${event.title}`, 'i') }));
    await waitFor(() => expect(container.querySelector('.pass-ticket-booked')).toBeNull());
    expect(getTickets()).toHaveLength(0);
  });

  it('scrolls the filter chips sideways on a phone instead of wrapping them', async () => {
    const { container } = await mount();
    const row = container.querySelector('.pass-filters-row');
    expect(row).not.toBeNull();

    const css = readCss('pages/events.css');
    // Wrapping onto four or five lines made the sticky bar cover the screen, so
    // on narrow viewports each row becomes a single scrolling line instead.
    const narrow = css.slice(css.indexOf('@media (max-width: 850px)'));
    expect(narrow).toMatch(/\.pass-filters-row \{[^}]*flex-wrap: nowrap/);
    expect(narrow).toMatch(/\.pass-filters-row \{[^}]*overflow-x: auto/);
    // A grid item defaults to min-width:auto, which would let the chips stretch
    // the row wider than the bar instead of scrolling inside it.
    expect(narrow).toMatch(/\.pass-filters-row \{[^}]*min-width: 0/);
    // Chips hold their own width so a long label is never clipped mid-word.
    expect(narrow).toMatch(/\.pass-filters-row > \* \{ flex: 0 0 auto/);
    // A sideways swipe over the chips must not trigger the browser back gesture.
    expect(narrow).toMatch(/\.pass-filters-row \{[^}]*overscroll-behavior-x: contain/);
    // The bar keeps its blur, so the scrollbar is a thin line rather than the
    // full-width chunk that would undo the fix.
    expect(narrow).toMatch(/\.pass-filters-row \{[^}]*scrollbar-width: thin/);
    expect(narrow).toMatch(/\.pass-filters-row::-webkit-scrollbar \{[^}]*height: 4px/);
    expect(narrow).toMatch(/\.theme-light \.pass-filters-row \{[^}]*scrollbar-color/);

    // Desktop keeps the wrapping layout.
    expect(css).toMatch(/\.pass-filters-row \{ display: flex; flex-wrap: wrap; gap: 8px; \}/);
  });

  it('frames event artwork instead of cropping it', () => {
    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-ticket-media img \{[^}]*object-fit: contain/);
    expect(css).toMatch(/\.pass-sheet-media img \{[^}]*object-fit: contain/);
    expect(css).not.toContain('object-fit: cover');
  });

  it('stubs the date like a passport perforation', async () => {
    const { container } = await mount();
    const event = EVENTS[3];
    const [, month, day] = event.date.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    openPass(container, event.title);
    await waitFor(() => expect(document.querySelector('.pass-sheet')).not.toBeNull());

    const stub = document.querySelector('.pass-sheet-stub');
    expect(stub.querySelector('b').textContent).toBe(day);
    expect(stub.querySelector('i').textContent).toBe(months[Number(month) - 1]);
    expect(stub.querySelector('small').textContent).toBe(event.date.split('-')[0]);
  });

  it('lists a ticket card per event with art, venue and price', async () => {
    const { container } = await mount();
    const cards = container.querySelectorAll('.pass-ticket');

    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.querySelector('.pass-ticket-media img')).not.toBeNull();
      expect(card.querySelector('.pass-ticket-title').textContent.length).toBeGreaterThan(3);
      expect(card.querySelector('.pass-ticket-meta')).not.toBeNull();
      expect(card.querySelector('.pass-ticket-loc').textContent.length).toBeGreaterThan(3);
      expect(card.querySelector('.pass-ticket-price').textContent).toMatch(/\$|Free entry/);
    });
  });

  it('filters by fandom and reports the running count', async () => {
    const { container } = await mount();

    FANDOM_IDS.forEach((id) => {
      expect(fandomChip(container, new RegExp(BOOK.categories.find((c) => c.id === id).label, 'i'))).toBeInTheDocument();
    });

    fireEvent.click(fandomChip(container, /manga/i));
    await waitFor(() => expect(container.querySelectorAll('.pass-ticket').length).toBeGreaterThan(0));
    expect([...container.querySelectorAll('.pass-ticket')].every((card) => card.className.includes('is-manga'))).toBe(true);
    expect(container.querySelector('.pass-filters-count b').textContent).toBe(String(EVENTS.filter((item) => item.category === 'manga').length));
  });

  it('filters by event format and can reach an empty result', async () => {
    const { container } = await mount();

    fireEvent.click(fandomChip(container, /manga/i));
    fireEvent.click(within(container.querySelector('.pass-filters-kind')).getByRole('button', { name: /Concert/i }));
    await waitFor(() => expect(container.querySelectorAll('.pass-ticket')).toHaveLength(0));
    expect(container.querySelector('.pass-note').textContent).toMatch(/no passes match/i);
  });

  it('page-loads the collection in blocks', async () => {
    const { container } = await mount();
    const first = container.querySelectorAll('.pass-ticket').length;

    expect(first).toBeGreaterThan(0);
    expect(container.querySelector('.pass-more')).not.toBeNull();

    fireEvent.click(container.querySelector('.pass-more button'));
    await waitFor(() => expect(container.querySelectorAll('.pass-ticket').length).toBeGreaterThan(first));
  });

  it('opens a full pass sheet and closes it again', async () => {
    const { container } = await mount();
    const event = EVENTS[1];

    openPass(container, event.title);
    await waitFor(() => expect(document.querySelector('.pass-sheet')).not.toBeNull());

    const sheet = document.querySelector('.pass-sheet');
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(within(sheet).getByText(event.title)).toBeInTheDocument();
    expect(within(sheet).getByText(event.description)).toBeInTheDocument();
    expect(within(sheet).getByText(event.venue)).toBeInTheDocument();
    expect(within(sheet).getByText(event.location)).toBeInTheDocument();
    expect(sheet.querySelectorAll('.pass-sheet-grid div')).toHaveLength(4);
    expect(sheet.querySelectorAll('.pass-sheet-list li')).toHaveLength(event.highlights.length);

    fireEvent.click(document.querySelector('.pass-close'));
    await waitFor(() => expect(document.querySelector('.pass-sheet')).toBeNull());
  });

  it('closes the pass sheet on the overlay and on Escape', async () => {
    const { container } = await mount();

    openPass(container, EVENTS[2].title);
    await waitFor(() => expect(document.querySelector('.pass-sheet')).not.toBeNull());
    fireEvent.click(document.querySelector('[data-testid="pass-overlay"]'));
    await waitFor(() => expect(document.querySelector('.pass-sheet')).toBeNull());

    openPass(container, EVENTS[2].title);
    await waitFor(() => expect(document.querySelector('.pass-sheet')).not.toBeNull());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.pass-sheet')).toBeNull());
  });

  it('falls back to local art when remote imagery fails', async () => {
    const { container } = await mount();
    const img = container.querySelector('.pass-ticket-media img');
    fireEvent.error(img);
    expect(img.getAttribute('src')).toMatch(/^\/assets\/images\//);
  });

  it('never offers registration, because the passport is a guide only', async () => {
    const { container } = await mount();

    expect(readCss('pages/events.css')).not.toMatch(/registration|checkout|payment/i);
    expect(container.querySelector('form')).toBeNull();
    container.querySelectorAll('button').forEach((button) => {
      expect(button.textContent).not.toMatch(/register|buy ticket|checkout/i);
    });
    EVENTS.forEach((item) => {
      expect(item.registrationUrl).toBeUndefined();
      expect(item.ticketUrl).toBeUndefined();
    });
  });

  it('persists its own theme and stays readable in light and dark', async () => {
    const { container } = await mount();

    expect(container.querySelector('.pass-page.theme-dark')).not.toBeNull();
    expect(window.localStorage.getItem('events-theme')).toBe('dark');

    fireEvent.click(container.querySelector('.universal-theme-button'));
    await waitFor(() => expect(container.querySelector('.pass-page.theme-light')).not.toBeNull());
    expect(window.localStorage.getItem('events-theme')).toBe('light');
  });

  it('keeps the nav and shared footer in place', async () => {
    const { container } = await mount();
    expect(container.querySelector('nav.universal-nav')).not.toBeNull();
    expect(container.querySelector('footer.site-footer .footer-bottom')).not.toBeNull();
  });

  it('falls back to local art paths for every category', () => {
    FANDOM_IDS.forEach((id) => {
      expect(EVENTS.filter((item) => item.category === id).every((item) => item.image.startsWith('/assets/images/'))).toBe(true);
    });
  });

  it('never leaks a blue hero accent into the passport', () => {
    const css = readCss('pages/events.css');
    expect(css).not.toMatch(/#00e5ff/i);
    expect(css).toMatch(/--gold: #ffc247/i);
  });

  it('clips no card or sheet, so the save note is never cropped', () => {
    const css = readCss('pages/events.css');
    // clip-path on an ancestor crops the save-note popup the instant it opens
    // past the card edge, so the ticket and the sheet both use a radius instead.
    // The colon keeps these assertions off the word "clip-path" in the comments.
    expect(css).not.toMatch(/\.pass-ticket\s*\{[^}]*clip-path:/);
    expect(css).toMatch(/\.pass-ticket\s*\{[^}]*border-radius/);
    expect(css).toMatch(/\.pass-sheet\s*\{[^}]*border-radius/);
    expect(css).not.toMatch(/\.pass-sheet\s*\{[^}]*clip-path:/);
    // The save toggle hugs the card's left edge, so the note must grow right.
    expect(css).toMatch(/\.pass-ticket-save \.bookmark-note \{[^}]*left: 0/);
  });

  it('keeps the event title clear of the sheet top clip', () => {
    const css = readCss('pages/events.css');
    expect(css).toMatch(/\.pass-sheet-body h2 \{[^}]*line-height: 1\.1/);
    expect(css).not.toMatch(/\.pass-sheet-body h2 \{[^}]*line-height: 1\.06/);
  });
});

describe('bookmarks on the events page', () => {
  it('saves an event with an optional note and can skip the note', async () => {
    const { container } = await mount();
    const event = EVENTS[0];

    const save = within(flagshipCard(container)).getByRole('button', { name: /save/i });
    fireEvent.click(save);

    await waitFor(() => expect(container.querySelector('.bookmark-note')).not.toBeNull());
    const stored = JSON.parse(window.localStorage.getItem(KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: `event:${event.id}`, type: 'event', title: event.title, note: '' });

    fireEvent.click(within(container.querySelector('.bookmark-note')).getByRole('button', { name: /skip/i }));
    await waitFor(() => expect(container.querySelector('.bookmark-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem(KEY))[0].note).toBe('');
  });

  it('stores a written note on the event', async () => {
    const { container } = await mount();

    fireEvent.click(within(flagshipCard(container)).getByRole('button', { name: /save/i }));
    const field = await waitFor(() => container.querySelector('.bookmark-note input'));

    fireEvent.change(field, { target: { value: 'book the cosplay finals' } });
    fireEvent.click(within(container.querySelector('.bookmark-note')).getByRole('button', { name: /save note/i }));

    await waitFor(() => expect(container.querySelector('.bookmark-note')).toBeNull());
    expect(JSON.parse(window.localStorage.getItem(KEY))[0].note).toBe('book the cosplay finals');
  });

  it('removes a saved event again', async () => {
    const { container } = await mount();
    const note = () => container.querySelector('.bookmark-note');

    fireEvent.click(within(flagshipCard(container)).getByRole('button', { name: /save/i }));
    await waitFor(() => expect(note()).not.toBeNull());
    fireEvent.click(within(note()).getByRole('button', { name: /skip/i }));
    await waitFor(() => expect(note()).toBeNull());
    expect(JSON.parse(window.localStorage.getItem(KEY))).toHaveLength(1);

    // The toggle turns into a remove control, and clearing it empties the store.
    fireEvent.click(container.querySelector('.bookmark-toggle'));
    await waitFor(() => expect(note()).toBeNull());
    expect(JSON.parse(window.localStorage.getItem(KEY))).toHaveLength(0);
    expect(container.querySelector('.bookmark').className).not.toMatch(/is-on/);
  });

  it('shares one store with articles and trailers', () => {
    window.localStorage.setItem(KEY, JSON.stringify([
      { id: 'article:one', type: 'article', title: 'One' },
      { id: 'trailer:two', type: 'trailer', title: 'Two' },
    ]));
    resyncBookmarks();

    const { rerender } = render(<BookmarkButton entry={{ id: 'event:three', type: 'event', title: 'Three' }} />);
    expect(screen.getByRole('button', { name: /save three/i })).toBeInTheDocument();

    rerender(<BookmarkButton entry={{ id: 'trailer:two', type: 'trailer', title: 'Two' }} />);
    expect(screen.getByRole('button', { name: /remove two from bookmarks/i })).toBeInTheDocument();
  });

  it('survives a blocked localStorage without crashing', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => render(<BookmarkButton entry={{ id: 'event:x', type: 'event', title: 'X' }} />)).not.toThrow();
    setItem.mockRestore();
  });
});

describe('event ticket booking', () => {
  const TICKET_KEY = 'fandomverse-event-tickets';

  it('books a ticket from the pass and keeps it on the device', async () => {
    const { container } = await mount();
    const event = EVENTS[2];

    openPass(container, event.title);
    const sheet = await waitFor(() => document.querySelector('.pass-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));

    await waitFor(() => expect(within(sheet).getByText(/ticket booked/i)).toBeInTheDocument());
    const stored = JSON.parse(window.localStorage.getItem(TICKET_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: `event:${event.id}`, title: event.title, seats: 1, venue: event.venue });
  });

  it('multiplies the price by the seat count', async () => {
    const { container } = await mount();
    const event = EVENTS.find((item) => item.price > 0);

    openPass(container, event.title);
    const sheet = await waitFor(() => document.querySelector('.pass-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: 'One seat more' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'One seat more' }));

    expect(within(sheet).getByText(`$${event.price * 3}`)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(TICKET_KEY))[0].seats).toBe(3));
  });

  it('marks a booked card and opens the wallet from the hero', async () => {
    const { container } = await mount();
    const event = EVENTS[0];

    openPass(container, event.title);
    const sheet = await waitFor(() => document.querySelector('.pass-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));
    await waitFor(() => expect(container.querySelector('.pass-ticket-booked')).not.toBeNull());
    expect(container.querySelector('.pass-ticket-booked b').textContent).toBe('Booked');
    fireEvent.keyDown(document, { key: 'Escape' });

    const walletButton = within(container.querySelector('.pass-hero-top')).getByRole('button', { name: /my tickets/i });
    expect(walletButton.textContent).toContain('1');
    fireEvent.click(walletButton);

    const wallet = await waitFor(() => document.querySelector('.pass-wallet'));
    expect(within(wallet).getByText(event.title)).toBeInTheDocument();
    expect(wallet.querySelector('.pass-wallet-stub b').textContent).toBe(event.date.split('-')[2].padStart(2, '0'));
    expect(within(wallet).getByText(/1 booked/)).toBeInTheDocument();
  });

  it('cancels a single ticket and clears the rest', async () => {
    const { container } = await mount();
    [EVENTS[0], EVENTS[1]].forEach((event) => {
      openPass(container, event.title);
      const sheet = document.querySelector('.pass-sheet');
      fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(getTickets()).toHaveLength(2);

    fireEvent.click(within(container.querySelector('.pass-hero-top')).getByRole('button', { name: /my tickets/i }));
    const wallet = await waitFor(() => document.querySelector('.pass-wallet'));
    fireEvent.click(within(wallet).getByRole('button', { name: new RegExp(`cancel the ticket for ${EVENTS[0].title}`, 'i') }));
    expect(getTickets()).toHaveLength(1);

    fireEvent.click(within(wallet).getByRole('button', { name: /clear all tickets/i }));
    expect(getTickets()).toHaveLength(0);
    expect(within(wallet).getByText(/no tickets yet/i)).toBeInTheDocument();
  });

  it('swaps the booking form for a booked state and can undo it', async () => {
    const { container } = await mount();
    const event = EVENTS[4];

    openPass(container, event.title);
    const sheet = await waitFor(() => document.querySelector('.pass-sheet'));
    fireEvent.click(within(sheet).getByRole('button', { name: /book ticket/i }));
    await waitFor(() => expect(within(sheet).queryByRole('button', { name: /book ticket/i })).toBeNull());

    fireEvent.click(within(sheet).getByRole('button', { name: /add a seat/i }));
    expect(getTickets()[0].seats).toBe(2);

    fireEvent.click(within(sheet).getByRole('button', { name: /cancel booking/i }));
    await waitFor(() => expect(within(sheet).getByRole('button', { name: /book ticket/i })).toBeInTheDocument());
    expect(getTickets()).toHaveLength(0);
  });

  it('never books the same pass twice', async () => {
    bookTicket({ id: 'event:one', title: 'One', seats: 1 });
    bookTicket({ id: 'event:one', title: 'One', seats: 4 });
    expect(getTickets()).toHaveLength(1);
    expect(getTickets()[0].seats).toBe(1);
  });

  it('clamps the seat count between one and eight', () => {
    bookTicket({ id: 'event:two', title: 'Two', seats: 99 });
    setTicketSeats('event:two', 0);
    expect(getTickets()[0].seats).toBe(1);
    setTicketSeats('event:two', 12);
    expect(getTickets()[0].seats).toBe(8);
  });

  it('survives a blocked localStorage without crashing', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => bookTicket({ id: 'event:three', title: 'Three' })).not.toThrow();
    setItem.mockRestore();
    resyncTickets();
  });
});

describe('events routing', () => {
  it('opens the page from #events and /events', () => {
    global.fetch = jest.fn(okFetch);
    window.location.hash = '#events';
    expect(render(<App />).container.querySelector('.pass-page')).not.toBeNull();
    document.body.innerHTML = '';

    window.location.hash = '';
    window.history.pushState({}, '', '/events');
    expect(render(<App />).container.querySelector('.pass-page')).not.toBeNull();
  });

  it('is reachable from the Discover menu', async () => {
    const { container } = await mount();
    fireEvent.click(within(container.querySelector('nav.universal-nav')).getByRole('button', { name: /discover/i }));
    const link = within(container.querySelector('.universal-discover-dropdown')).getByRole('link', { name: 'Events' });
    expect(link.getAttribute('href')).toBe('#events');
  });
});
