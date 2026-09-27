import { useEffect, useMemo, useRef, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import BookmarkButton from '../components/BookmarkButton';
import CanvasField from '../components/CanvasField';
import { bookTicket, cancelTicket, clearTickets, setTicketSeats, useTickets } from '../eventTickets';
import './events.css';

const DATA_URL = '/assets/json%20data/events.json';
const THEME_KEY = 'events-theme';
const PAGE_SIZE = 9;

const FALLBACK = {
  anime: '/assets/images/anime1.png',
  gaming: '/assets/images/game1.png',
  movies: '/assets/images/poster-glass.jpg',
  tv: '/assets/images/tv show 1.png',
  kpop: '/assets/images/kpop1.jpg',
  comics: '/assets/images/comics1.png',
  manga: '/assets/images/manga1.png',
};

const labelFor = (id) => ({
  anime: 'Anime', gaming: 'Gaming', movies: 'Movies', tv: 'TV Shows', kpop: 'K-Pop', comics: 'Comics', manga: 'Manga',
}[id] || id);

// Fallback accents so the ticket panel keeps its colour coding before load.
const ACCENTS = {
  anime: '#ff6b4a',
  gaming: '#31d0aa',
  movies: '#ffc247',
  tv: '#5b8cff',
  kpop: '#ff77c8',
  comics: '#ef5da8',
  manga: '#8ad14f',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const stamp = (value) => {
  if (!value) return { day: '--', month: '---', year: '----' };
  const [year, month, day] = value.split('-');
  return { day, month: MONTHS[Number(month) - 1] || '---', year };
};

const formatDate = (value) => {
  const { day, month, year } = stamp(value);
  return year === '----' ? 'Date to be announced' : `${day} ${month} ${year}`;
};

const money = (value) => (!value ? 'Free entry' : `$${value}`);

const readTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage unavailable */ }
  return 'dark';
};

// Opening a panel locks the page behind it. The width the scrollbar gave up is
// handed back as padding, so nothing shifts sideways and no scroll line shows.
const useScrollLock = () => {
  useEffect(() => {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const pad = document.body.style.paddingRight;
    // Only a real scrollbar width is worth compensating for.
    if (gap > 0 && gap <= 32) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = pad;
    };
  }, []);
};

const useEscape = (onClose) => {
  useEffect(() => {
    const onKeyDown = (keyEvent) => { if (keyEvent.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
};

function EventModal({ event, accent, onClose }) {
  const closeRef = useRef(null);
  const tickets = useTickets();
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useScrollLock();
  useEscape(onClose);

  const mark = stamp(event.date);
  const booking = tickets.find((item) => item.id === `event:${event.id}`) || null;

  const book = () => {
    bookTicket({
      id: `event:${event.id}`,
      eventId: event.id,
      title: event.title,
      category: event.category,
      venue: event.venue,
      location: event.location,
      time: event.time,
      date: event.date,
      price: event.price,
      seats,
    });
  };

  return (
    <div className="pass-modal" role="presentation">
      <div className="pass-overlay" onClick={onClose} data-testid="pass-overlay" />
      <div className="pass-sheet" role="dialog" aria-modal="true" aria-label={event.title} style={{ '--pass-accent': accent }}>
        <span className="pass-sheet-edge" aria-hidden="true" />
        <div className="pass-sheet-media">
          <img
            src={event.image || FALLBACK[event.category]}
            alt=""
            onError={(target) => { target.currentTarget.src = FALLBACK[event.category]; }}
          />
          <span className="pass-sheet-stub">
            <b>{mark.day}</b>
            <i>{mark.month}</i>
            <small>{mark.year}</small>
          </span>
        </div>

        <div className="pass-sheet-body">
          <p className="pass-sheet-kicker">{event.tag} · {labelFor(event.category)}</p>
          <h2>{event.title}</h2>
          <p className="pass-sheet-loc">{event.location}</p>
          <p className="pass-sheet-desc">{event.description}</p>

          <dl className="pass-sheet-grid">
            <div><dt>Date</dt><dd>{formatDate(event.date)}</dd></div>
            <div><dt>Doors</dt><dd>{event.time}</dd></div>
            <div><dt>Venue</dt><dd>{event.venue}</dd></div>
            <div><dt>Capacity</dt><dd>{event.capacity.toLocaleString('en-US')}</dd></div>
          </dl>

          {event.highlights?.length > 0 && (
            <ul className="pass-sheet-list">
              {event.highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}

          <div className="pass-sheet-foot">
            <span className="pass-sheet-price">{money(event.price)}</span>
            <span className={`pass-status is-${event.status}`}>{event.status}</span>
          </div>

          <div className="pass-book">
            {booking ? (
              <>
                <p className="pass-book-done">
                  <b>Ticket booked</b>
                  <span>{booking.seats} {booking.seats === 1 ? 'seat' : 'seats'} · saved on this device</span>
                </p>
                <div className="pass-book-done-tools">
                  <button type="button" onClick={() => setTicketSeats(booking.id, booking.seats === 8 ? 1 : booking.seats + 1)}>
                    Add a seat ({booking.seats})
                  </button>
                  <button type="button" className="is-quiet" onClick={() => cancelTicket(booking.id)}>Cancel booking</button>
                </div>
              </>
            ) : (
              <>
                <p className="pass-book-lead">Book your spot</p>
                <div className="pass-book-row">
                  <span className="pass-book-seats">
                    <button type="button" onClick={() => setSeats((value) => Math.max(1, value - 1))} aria-label="One seat fewer">−</button>
                    <b>{seats}</b>
                    <button type="button" onClick={() => setSeats((value) => Math.min(8, value + 1))} aria-label="One seat more">+</button>
                  </span>
                  <span className="pass-book-total">{event.price ? `$${event.price * seats}` : 'Free entry'}</span>
                  <button type="button" className="pass-book-go" onClick={book}>Book ticket</button>
                </div>
                <p className="pass-book-fine">No payment, no account. Your ticket is kept in this browser only.</p>
              </>
            )}
          </div>

          <div className="pass-sheet-actions">
            <button type="button" ref={closeRef} className="pass-close" onClick={onClose}>Back to events</button>
            <BookmarkButton
              entry={{
                id: `event:${event.id}`,
                type: 'event',
                title: event.title,
                meta: `${labelFor(event.category)} · ${formatDate(event.date)}`,
                href: '#events',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketPanel({ tickets, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useScrollLock();
  useEscape(onClose);

  const total = tickets.reduce((sum, item) => sum + item.seats, 0);

  return (
    <div className="pass-modal" role="presentation">
      <div className="pass-overlay" onClick={onClose} data-testid="tickets-overlay" />
      <div className="pass-wallet" role="dialog" aria-modal="true" aria-label="My booked tickets">
        <span className="pass-wallet-stamp" aria-hidden="true">TICKETS</span>

        <div className="pass-wallet-head">
          <div>
            <strong>My tickets</strong>
            <span>{tickets.length} booked · {total} {total === 1 ? 'seat' : 'seats'} · stored on this device</span>
          </div>
          <button type="button" ref={closeRef} className="pass-wallet-close" onClick={onClose} aria-label="Close my tickets">&#10005;</button>
        </div>

        {tickets.length === 0 && (
          <p className="pass-wallet-empty">
            No tickets yet. Open any pass and press <b>Book ticket</b> and it will show up here.
          </p>
        )}

        <ul className="pass-wallet-list">
          {tickets.map((item) => (
            <li key={item.id} className={`pass-wallet-item is-${item.category}`} style={{ '--pass-accent': ACCENTS[item.category] || '#ffc247' }}>
              <span className="pass-wallet-stub">
                <b>{stamp(item.date).day}</b>
                <i>{stamp(item.date).month}</i>
                <small>{stamp(item.date).year}</small>
              </span>
              <span className="pass-wallet-body">
                <b>{item.title}</b>
                <span>{item.venue} · {item.time}</span>
                <span>{item.location}</span>
              </span>
              <span className="pass-wallet-side">
                <b>{item.seats} {item.seats === 1 ? 'seat' : 'seats'}</b>
                <i>{money(item.price)}</i>
                <button type="button" onClick={() => cancelTicket(item.id)} aria-label={`Cancel the ticket for ${item.title}`}>Cancel</button>
              </span>
            </li>
          ))}
        </ul>

        {tickets.length > 0 && (
          <button type="button" className="pass-wallet-clear" onClick={clearTickets}>Clear all tickets</button>
        )}
      </div>
    </div>
  );
}

export default function Events({ fandom: fandomRoute = null, eventId: eventRoute = null }) {
  const [theme, setTheme] = useState(readTheme);
  const [data, setData] = useState({ events: [], categories: [] });
  const [status, setStatus] = useState('loading');
  const [fandom, setFandom] = useState('all');
  const [kind, setKind] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const tickets = useTickets();
  const bookedIds = useMemo(() => new Set(tickets.map((item) => item.id)), [tickets]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    let alive = true;
    fetch(DATA_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad status'))))
      .then((json) => { if (alive) { setData(json); setStatus('ready'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  // A fandom page can hand over its own id, which the passport filters on. Any
  // id the json does not know about falls back to the full list rather than
  // showing an empty page.
  useEffect(() => {
    if (!fandomRoute) return;
    const known = (data.categories || []).some((item) => item.id === fandomRoute);
    setFandom(known ? fandomRoute : 'all');
  }, [fandomRoute, data.categories]);

  // A single pass can be deep-linked as well. It can only be opened once the
  // list has arrived, so the id is parked until the fetch lands.
  useEffect(() => {
    if (!eventRoute) return;
    if (status === 'ready' && (data.events || []).some((item) => item.id === eventRoute)) setOpenId(eventRoute);
  }, [eventRoute, status, data.events]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [fandom, kind]);

  const events = useMemo(() => data.events || [], [data.events]);
  const categories = data.categories || [];

  const counts = useMemo(() => {
    const map = { all: events.length };
    events.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
      map[`kind:${item.tag}`] = (map[`kind:${item.tag}`] || 0) + 1;
    });
    return map;
  }, [events]);

  const visible = useMemo(() => events.filter((item) => {
    const fandomOk = fandom === 'all' || item.category === fandom;
    const kindOk = kind === 'all' || item.tag === kind;
    return fandomOk && kindOk;
  }), [events, fandom, kind]);

  const shown = visible.slice(0, limit);
  const featured = events.find((item) => item.id === data.featuredId) || events[0] || null;
  const accentOf = (id) => (categories.find((item) => item.id === id) || {}).accent || '#ffc247';
  // Resolved against the loaded list, so a deep link to a pass that has since
  // been removed from the json opens nothing instead of a half-filled sheet.
  const openEvent = openId ? events.find((item) => item.id === openId) || null : null;

  const kinds = useMemo(() => {
    const seen = [];
    events.forEach((item) => { if (!seen.includes(item.tag)) seen.push(item.tag); });
    return seen;
  }, [events]);

  return (
    <div className={`pass-page theme-${theme}`}>
      <SiteNav theme={theme} setTheme={setTheme} active="events" variant="events" />

      <header className="pass-hero">
        <span className="pass-hero-wash" aria-hidden="true" />
        <span className="pass-hero-grid" aria-hidden="true" />
        <CanvasField className="pass-hero-canvas" density={0.6} tone={theme === 'light' ? 'sand' : 'gold'} />
        <span className="pass-hero-shapes" aria-hidden="true">
          <i className="pass-shape is-a" />
          <i className="pass-shape is-b" />
          <i className="pass-shape is-c" />
          <i className="pass-shape is-d" />
          <i className="pass-shape is-e" />
        </span>
        <span className="pass-scenery" aria-hidden="true">
          <i className="pass-scenery-gate" />
          <i className="pass-scenery-wire pass-scenery-wire-a" />
          <i className="pass-scenery-wire pass-scenery-wire-b" />
          <i className="pass-scenery-tower" />
          <i className="pass-scenery-crowd" />
        </span>

        <div className="pass-hero-top">
          <button type="button" className="pass-wallet-open" onClick={() => setWalletOpen(true)} aria-haspopup="dialog">
            My tickets
            <b>{tickets.length}</b>
          </button>
          <p className="pass-hero-hint">Every pass you book is kept right here in this browser.</p>
        </div>

        <div className="pass-hero-inner">
          <p className="pass-kicker">Fandom passport · {data.issue?.issue || 'EV-01'} · {events.length} stamped events</p>
          <h1>FANDOM <em>PASSPORT</em></h1>
          <p className="pass-tagline">{data.issue?.tagline || 'Every convention, premiere and gallery night in one stamp book.'}</p>
          <div className="pass-hero-meta">
            <span><b>{categories.length}</b> fandoms</span>
            <span><b>{events.length}</b> events</span>
            <span><b>{events.filter((item) => item.price === 0).length}</b> free to enter</span>
          </div>
        </div>
        <ul className="pass-hero-ribbon" aria-hidden="true">
          {[...kinds, ...categories.map((item) => item.label)].map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </header>

      {status === 'loading' && <p className="pass-note">Stamping your passport...</p>}

      {status === 'error' && (
        <div className="pass-note pass-note-error" role="alert">
          <b>Passport office closed.</b> The event list could not be loaded. <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}

      {status === 'ready' && featured && (
        <>
          <div className="pass-filters" role="group" aria-label="Filter events">
            <div className="pass-filters-row" aria-label="Filter by fandom">
              {[{ id: 'all', label: 'All fandoms', accent: '#ffc247' }, ...categories].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`pass-chip is-${item.id}${fandom === item.id ? ' is-active' : ''}`}
                  style={{ '--chip-accent': item.accent }}
                  onClick={() => setFandom(item.id)}
                  aria-pressed={fandom === item.id}
                >
                  {item.label}<i>{counts[item.id] || 0}</i>
                </button>
              ))}
            </div>
            <div className="pass-filters-row pass-filters-kind" aria-label="Filter by event type">
              {['all', ...kinds].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`pass-kind${kind === item ? ' is-active' : ''}`}
                  onClick={() => setKind(item)}
                  aria-pressed={kind === item}
                >
                  {item === 'all' ? 'Every format' : item}<i>{item === 'all' ? events.length : (counts[`kind:${item}`] || 0)}</i>
                </button>
              ))}
            </div>
            <p className="pass-filters-count"><b>{visible.length}</b> / {events.length} passes in the book</p>
          </div>

          <section className="pass-grid" aria-label="Event collection">
            {shown.map((event) => (
              <article
                className={`pass-ticket is-${event.category} status-${event.status}${event.id === featured.id ? ' is-flagship' : ''}`}
                key={event.id}
                style={{ '--pass-accent': accentOf(event.category) }}
              >
                <span className="pass-ticket-edge" aria-hidden="true" />
                <span className="pass-ticket-media">
                  <img
                    src={event.image || FALLBACK[event.category]}
                    alt=""
                    onError={(target) => { target.currentTarget.src = FALLBACK[event.category]; }}
                  />
                  <span className="pass-ticket-stub">
                    <b>{stamp(event.date).day}</b>
                    <i>{stamp(event.date).month}</i>
                  </span>
                  {event.id === featured.id && <span className="pass-ticket-flag">Flagship</span>}
                  {bookedIds.has(`event:${event.id}`) && (
                    <span className="pass-ticket-booked">
                      <b>Booked</b>
                      <button
                        type="button"
                        onClick={() => cancelTicket(`event:${event.id}`)}
                        aria-label={`Cancel the ticket for ${event.title}`}
                      >&#10005;</button>
                    </span>
                  )}
                </span>
                <span className="pass-ticket-body">
                  <span className="pass-ticket-flags">
                    <b>{labelFor(event.category)}</b>
                    <i>•</i>
                    <b className={`is-${event.status}`}>{event.status}</b>
                  </span>
                  <b className="pass-ticket-title">{event.title}</b>
                  <span className="pass-ticket-meta">{event.venue} · {event.time}</span>
                  <span className="pass-ticket-loc">{event.location}</span>
                </span>
                <span className="pass-ticket-foot">
                  <span className="pass-ticket-price">{money(event.price)}</span>
                  <span className="pass-ticket-cta" aria-hidden="true">Open pass &#8599;</span>
                </span>
                <button
                  type="button"
                  className="pass-ticket-hit"
                  onClick={() => setOpenId(event.id)}
                  aria-label={`Open the pass for ${event.title}`}
                />
                <BookmarkButton
                  className="pass-ticket-save"
                  entry={{
                    id: `event:${event.id}`,
                    type: 'event',
                    title: event.title,
                    meta: `${labelFor(event.category)} · ${formatDate(event.date)}`,
                    href: '#events',
                  }}
                />
              </article>
            ))}
          </section>

          {shown.length === 0 && <p className="pass-note">No passes match that combination. Try another filter.</p>}

          {shown.length < visible.length && (
            <div className="pass-more">
              <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                Load {Math.min(PAGE_SIZE, visible.length - shown.length)} more
              </button>
              <span>{shown.length} / {visible.length}</span>
            </div>
          )}

          {openEvent && (
            <EventModal
              event={openEvent}
              accent={accentOf(openEvent.category)}
              onClose={() => setOpenId(null)}
            />
          )}

          {walletOpen && <TicketPanel tickets={tickets} onClose={() => setWalletOpen(false)} />}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
