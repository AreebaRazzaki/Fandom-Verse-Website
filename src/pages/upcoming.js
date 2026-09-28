import { useEffect, useMemo, useRef, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import BookmarkButton from '../components/BookmarkButton';
import CanvasField from '../components/CanvasField';
import './upcoming.css';

const DATA_URL = '/assets/json%20data/upcomingReleases.json';
const THEME_KEY = 'releases-theme';

const FALLBACK = {
  Anime: '/assets/images/anime1.png',
  Gaming: '/assets/images/game1.png',
  Movies: '/assets/images/poster-glass.jpg',
  TV: '/assets/images/poster-peaky-blinders.jpg',
  'K-Pop': '/assets/images/kpop1.jpg',
  Comics: '/assets/images/comics1.png',
  Manga: '/assets/images/manga1.png',
};

const FALLBACK_FILTERS = [
  { id: 'all', label: 'All', accent: '#ffc247' },
  { id: 'anime', label: 'Anime', accent: '#ff5a5f' },
  { id: 'gaming', label: 'Gaming', accent: '#31d0aa' },
  { id: 'movies', label: 'Movies', accent: '#ffc247' },
  { id: 'tv', label: 'TV', accent: '#5b8cff' },
  { id: 'kpop', label: 'K-Pop', accent: '#ff77c8' },
  { id: 'comics', label: 'Comics', accent: '#ef5da8' },
  { id: 'manga', label: 'Manga', accent: '#8ad14f' },
];

const slugOf = (label) => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// The preview plays inside the page, so nothing ever opens a new tab.
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

const parseDate = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0);
};

const day = (value) => {
  const date = parseDate(value);
  return date ? String(date.getDate()).padStart(2, '0') : '--';
};

const month = (value) => {
  const date = parseDate(value);
  return date ? MONTHS[date.getMonth()] : '---';
};

const longDate = (value) => {
  const date = parseDate(value);
  if (!date) return 'Date to be announced';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

// Live countdown against the wall clock, so the numbers are real.
const remaining = (target) => {
  const gap = target - Date.now();
  if (gap <= 0) return { live: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    live: true,
    days: Math.floor(gap / 86400000),
    hours: Math.floor((gap / 3600000) % 24),
    minutes: Math.floor((gap / 60000) % 60),
    seconds: Math.floor((gap / 1000) % 60),
  };
};

const pad = (value) => String(value).padStart(2, '0');

const readTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage unavailable */ }
  return 'dark';
};

const isFuture = (release) => {
  const date = parseDate(release.releaseDate);
  return Boolean(date) && new Date(`${release.releaseDate}T12:00:00`).getTime() > Date.now();
};

const countdownTarget = (release) => (isFuture(release)
  ? new Date(`${release.releaseDate}T12:00:00`).getTime()
  : 0);

const artFor = (release) => release.image || FALLBACK[release.category] || '/assets/images/logo.png';

function Countdown({ target, tone = 'mint' }) {
  const [left, setLeft] = useState(() => remaining(target));

  useEffect(() => {
    setLeft(remaining(target));
    const id = window.setInterval(() => setLeft(remaining(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!left.live) {
    return (
      <div className={`nx-countdown is-${tone} is-out`} data-testid="nx-countdown-out">
        <span className="nx-countdown-out">Out now</span>
      </div>
    );
  }

  const cells = [
    { value: left.days, unit: 'Days' },
    { value: left.hours, unit: 'Hrs' },
    { value: left.minutes, unit: 'Min' },
    { value: left.seconds, unit: 'Sec' },
  ];

  return (
    <div className={`nx-countdown is-${tone}`} data-testid="nx-countdown">
      {cells.map((cell) => (
        <span className="nx-clock" key={cell.unit}>
          <b>{pad(cell.value)}</b>
          <i>{cell.unit}</i>
        </span>
      ))}
    </div>
  );
}

// The page behind an overlay stops scrolling, and only a real scrollbar width
// is handed back as padding so nothing shifts sideways.
const useOverlay = (onClose) => {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const pad = document.body.style.paddingRight;
    if (gap > 0 && gap <= 32) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = pad;
    };
  }, [onClose]);
};

function ReleaseModal({ release, onClose, onPreview }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useOverlay(onClose);

  return (
    <div className="nx-modal" role="presentation">
      <div className="nx-overlay" onClick={onClose} data-testid="nx-overlay" />
      <div className="nx-sheet" role="dialog" aria-modal="true" aria-label={release.title}>
        <button type="button" className="nx-sheet-close" ref={closeRef} onClick={onClose} aria-label="Close details">&#10005;</button>

        <div className="nx-sheet-poster">
          <img
            src={artFor(release)}
            alt=""
            onError={(target) => { target.currentTarget.src = FALLBACK[release.category]; }}
          />
          <span className="nx-sheet-date">
            <b>{day(release.releaseDate)}</b>
            <i>{month(release.releaseDate)}</i>
          </span>
        </div>

        <div className="nx-sheet-body">
          <p className="nx-sheet-flags">
            <b>{release.category}</b>
            <i>•</i>
            <b>{release.type}</b>
            <i>•</i>
            <b className={`is-${String(release.status).toLowerCase()}`}>{release.status}</b>
          </p>

          <h2>{release.title}</h2>
          <p className="nx-sheet-franchise">{release.franchise}</p>
          <p className="nx-sheet-desc">{release.description}</p>

          <div className="nx-sheet-timer">
            <span>Time to drop</span>
            <Countdown target={countdownTarget(release)} tone="gold" />
          </div>

          <dl className="nx-sheet-facts">
            <div><dt>Release date</dt><dd>{longDate(release.releaseDate)}</dd></div>
            <div><dt>Category</dt><dd>{release.category}</dd></div>
            <div><dt>Type</dt><dd>{release.type}</dd></div>
            <div><dt>Studio</dt><dd>{release.studio}</dd></div>
            <div><dt>Platform</dt><dd>{release.platform}</dd></div>
            <div><dt>Status</dt><dd>{release.status}</dd></div>
          </dl>

          <div className="nx-sheet-actions">
            <button
              type="button"
              className="nx-preview nx-preview-wide"
              onClick={() => onPreview(release.id)}
              aria-label={`Watch the preview of ${release.title}`}
            >
              <span aria-hidden="true">&#9654;</span> Watch Preview
            </button>
            <BookmarkButton
              entry={{
                id: `release:${release.id}`,
                type: 'release',
                title: release.title,
                meta: `${release.category} · ${longDate(release.releaseDate)}`,
                href: '#upcoming-releases',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ release, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useOverlay(onClose);

  const hasVideo = Boolean(release.previewVideoId);

  return (
    <div className="nx-modal nx-modal-preview" role="presentation">
      <div className="nx-overlay" onClick={onClose} data-testid="nx-preview-overlay" />
      <div className="nx-player" role="dialog" aria-modal="true" aria-label={`Preview of ${release.title}`}>
        <div className="nx-player-bar">
          <p className="nx-player-flags">
            <b>{release.category}</b>
            <i>•</i>
            <b>{release.type}</b>
            <i>•</i>
            <b className={`is-${String(release.status).toLowerCase()}`}>{release.status}</b>
          </p>
          <button
            type="button"
            className="nx-sheet-close"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close preview"
          >
            &#10005;
          </button>
        </div>

        <h2 className="nx-player-title">{release.title}</h2>
        <p className="nx-player-sub">Preview playing on this page · nothing opens in a new tab</p>

        {hasVideo ? (
          <div className="nx-player-frame">
            <iframe
              src={embedUrl(release.previewVideoId)}
              title={`${release.title} preview video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="nx-player-frame is-empty">
            <img src={artFor(release)} alt={`Poster for ${release.title}`} />
            <p>Preview is still being cut. Check back before {longDate(release.releaseDate)}.</p>
          </div>
        )}

        <div className="nx-player-foot">
          <p className="nx-player-desc">{release.description}</p>
          <div className="nx-player-timer">
            <p className="nx-timer-label">Drops {longDate(release.releaseDate)}</p>
            <Countdown target={countdownTarget(release)} tone="gold" />
          </div>
        </div>

        <div className="nx-player-actions">
          {hasVideo && (
            <a
              className="nx-player-out"
              href={watchUrl(release.previewVideoId)}
              target="_blank"
              rel="noreferrer"
            >
              Open on YouTube
            </a>
          )}
          <BookmarkButton
            entry={{
              id: `release:${release.id}`,
              type: 'release',
              title: release.title,
              meta: `${release.category} · ${longDate(release.releaseDate)}`,
              href: '#upcoming-releases',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Upcoming() {
  const [theme, setTheme] = useState(readTheme);
  const [data, setData] = useState({ releases: [], categories: FALLBACK_FILTERS });
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(null);

  const openDetails = (id) => setActive({ id, mode: 'details' });
  const openPreview = (id) => setActive({ id, mode: 'preview' });
  const closeModal = () => setActive(null);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    let alive = true;
    fetch(DATA_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad status'))))
      .then((json) => {
        if (!alive) return;
        setData({ releases: json.releases || [], categories: json.categories || FALLBACK_FILTERS });
        setStatus('ready');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  const releases = useMemo(() => data.releases || [], [data.releases]);
  const categories = data.categories || FALLBACK_FILTERS;

  const counts = useMemo(() => {
    const map = { all: releases.length };
    releases.forEach((item) => {
      const key = slugOf(item.category);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [releases]);

  const visible = useMemo(() => (filter === 'all'
    ? releases
    : releases.filter((item) => slugOf(item.category) === filter)), [releases, filter]);

  // The featured release headlines the page; otherwise the next one to land.
  const spotlight = useMemo(() => {
    const pending = releases.filter(isFuture);
    return releases.find((item) => item.featured && isFuture(item))
      || pending[0]
      || releases[0]
      || null;
  }, [releases]);

  const activeRelease = active === null
    ? null
    : releases.find((item) => item.id === active.id) || null;
  const isLight = theme === 'light';

  return (
    <main className={`nx-page theme-${theme}`}>
      <div className="nx-bg" aria-hidden="true">
        <CanvasField density={isLight ? 0.6 : 1} tone={isLight ? 'sand' : 'violet'} />
        <span className="nx-stars" />
        <span className="nx-glow nx-glow-one" />
        <span className="nx-glow nx-glow-two" />
        <span className="nx-shapes">
          <i className="nx-shape is-ring nx-shape-one" />
          <i className="nx-shape is-disc nx-shape-two" />
          <i className="nx-shape is-shard nx-shape-three" />
          <i className="nx-shape is-bar nx-shape-four" />
          <i className="nx-shape is-dash nx-shape-five" />
          <i className="nx-shape is-dash nx-shape-six" />
        </span>
      </div>

      <SiteNav theme={theme} setTheme={setTheme} active="discover" variant="releases" />

      {status === 'loading' && <p className="nx-note">Tuning into the next season...</p>}

      {status === 'error' && (
        <div className="nx-note nx-note-error" role="alert">
          <b>Signal lost.</b> The release list could not be loaded. <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}

      {status === 'ready' && spotlight && (
        <>
          <header className="nx-hero">
            <div className="nx-hero-rings" aria-hidden="true">
              <i className="nx-ring nx-ring-one" />
              <i className="nx-ring nx-ring-two" />
              <i className="nx-ring nx-ring-three" />
            </div>
            <p className="nx-hero-kicker">{data.page?.issue || 'UR-03'} · {releases.length} releases tracked</p>
            <h1>NEXT IN THE <em>UNIVERSE</em></h1>
            <p className="nx-hero-tagline">{data.page?.tagline || "What's coming next."}</p>
            <p className="nx-hero-blurb">
              One signal, every universe. Trailers, albums, films and volumes that have not landed yet,
              sorted by the fandom you actually follow.
            </p>
            {spotlight && (
              <div className="nx-hero-next">
                <span className="nx-hero-next-art">
                  <img src={artFor(spotlight)} alt="" />
                </span>
                <span className="nx-hero-next-body">
                  <i>Closest drop</i>
                  <b>{spotlight.title}</b>
                  <em>{longDate(spotlight.releaseDate)}</em>
                </span>
                <span className="nx-hero-next-clock">
                  <Countdown target={countdownTarget(spotlight)} tone="gold" />
                </span>
              </div>
            )}
            <ul className="nx-hero-facts">
              <li><b>{releases.length}</b><i>Tracked drops</i></li>
              <li><b>{categories.length - 1}</b><i>Universes</i></li>
              <li><b>{spotlight ? longDate(spotlight.releaseDate) : '--'}</b><i>Next up</i></li>
            </ul>
            <a className="nx-hero-cue" href="#nx-collection" aria-label="Jump to the release collection">
              <span aria-hidden="true" />
              Browse the drop list
            </a>
          </header>

          <nav className="nx-filters" aria-label="Filter releases by category">
            {/* The chips scroll sideways on a phone, so they need a track of
                their own. The count stays outside it and keeps the full width
                to itself rather than being pushed off the end of the scroll. */}
            <div className="nx-filters-scroll">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`nx-filter${filter === item.id ? ' is-active' : ''}`}
                  style={{ '--filter-accent': item.accent }}
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                >
                  {item.label}
                  <i>{counts[item.id] || 0}</i>
                </button>
              ))}
            </div>
            <span className="nx-filters-count">{visible.length} of {releases.length}</span>
          </nav>


          <section className="nx-collection" id="nx-collection" aria-label="Release collection">
            {visible.map((release) => (
              <article className="nx-card" key={release.id} data-video-id={release.previewVideoId}>
                <div className="nx-card-poster">
                  <img
                    src={artFor(release)}
                    alt={`Poster for ${release.title}`}
                    loading="lazy"
                    onError={(target) => { target.currentTarget.src = FALLBACK[release.category]; }}
                  />
                  <span className="nx-card-date">
                    <b>{day(release.releaseDate)}</b>
                    <i>{month(release.releaseDate)}</i>
                  </span>
                  {release.id === spotlight.id && <span className="nx-card-flag">Next drop</span>}
                </div>

                <div className="nx-card-body">
                  <p className="nx-card-flags">
                    <b>{release.category}</b>
                    <i>•</i>
                    <b>{release.type}</b>
                  </p>
                  <h3>{release.title}</h3>
                  <p className="nx-card-desc">{release.description}</p>
                </div>

                <div className="nx-card-foot">
                  <button type="button" className="nx-card-details" onClick={() => openDetails(release.id)}>View Details</button>
                  <button
                    type="button"
                    className="nx-preview nx-preview-small"
                    onClick={() => openPreview(release.id)}
                    aria-label={`Watch the preview of ${release.title}`}
                  >
                    <span aria-hidden="true">&#9654;</span> Watch Preview
                  </button>
                  <BookmarkButton
                    className="nx-card-save"
                    entry={{
                      id: `release:${release.id}`,
                      type: 'release',
                      title: release.title,
                      meta: `${release.category} · ${longDate(release.releaseDate)}`,
                      href: '#upcoming-releases',
                    }}
                  />
                </div>
              </article>
            ))}
          </section>

          {visible.length === 0 && <p className="nx-note">Nothing queued in that universe yet.</p>}

          {activeRelease && active.mode === 'preview' && (
            <PreviewModal release={activeRelease} onClose={closeModal} />
          )}

          {activeRelease && active.mode === 'details' && (
            <ReleaseModal release={activeRelease} onClose={closeModal} onPreview={openPreview} />
          )}
        </>
      )}

      <SiteFooter />
    </main>
  );
}
