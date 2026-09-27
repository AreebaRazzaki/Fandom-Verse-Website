import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BookmarkButton from './BookmarkButton';
import { FANDOMS, KIND_LABELS, TYPE_LABELS, paletteVars } from './fandomConfig';
import './FandomGallery.css';

const DATA_URL = '/assets/json%20data/gallery.json';

// How many cards the wall opens with, and how many more each press adds. The
// wall never dumps the whole fandom at once: eight is enough to see the shape
// of it and still leaves something to ask for.
const PAGE_SIZE = 6;
const PAGE_STEP = 4;

// How long a card stays up during a playthrough.
const PLAYTHROUGH_MS = 5200;

const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;

const prefersCalm = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let inflight = null;

// Exported for tests. The wall is fetched once per session on purpose, so a
// test that needs a cold cache asks for one instead of depending on the order
// the file happens to run in.
export const clearGalleryCache = () => { inflight = null; };

// Fetched once per session and shared, exactly like the character codex does.
// A failure clears the cache so the retry button actually refetches.
const loadGallery = () => {
  if (!inflight) {
    inflight = fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }
  return inflight;
};

const useGallery = (fandom) => {
  const [state, setState] = useState({ status: 'loading', entry: null, volume: 'Vol. 01', sectionTitle: 'The Fandom Gallery' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, status: 'loading' }));
    loadGallery()
      .then((data) => {
        if (!alive) return;
        const fandoms = Array.isArray(data.fandoms) ? data.fandoms : [];
        const entry = fandoms.find((item) => item.id === fandom) || null;
        setState({
          status: 'ready',
          entry,
          volume: data.volume || 'Vol. 01',
          sectionTitle: data.sectionTitle || 'The Fandom Gallery',
        });
      })
      .catch(() => { if (alive) setState((current) => ({ ...current, status: 'error' })); });
    return () => { alive = false; };
  }, [fandom, nonce]);

  return { ...state, retry: () => setNonce((value) => value + 1) };
};

// One image source per card, whatever the card is. Video and audio plates show
// the poster art, falling back to the fandom key art if the poster 404s.
const artFor = (item) => (item.type === 'image' ? item.src : thumbFor(item.youtubeId));

// On error, fall back once and stop. Without the guard the browser re-enters the
// same error handler on the replacement and loops on the request.
const useSafeImage = (fallback) => ({
  onError: (event) => {
    const node = event.currentTarget;
    if (node.dataset.failed || !fallback) return;
    node.dataset.failed = 'true';
    node.src = fallback;
  },
});

/* ------------------------------------------------------------------ */
/* One card.                                                           */
/* ------------------------------------------------------------------ */

function CardArt({ item, fallback, number, total }) {
  const imageProps = useSafeImage(fallback);
  const isMedia = item.type === 'video' || item.type === 'audio';

  return (
    <div className={`gal-card-art has-${item.type}${item.cutout ? ' is-cutout' : ''}`}>
      <span className="gal-card-mat" aria-hidden="true" />

      <img className="gal-card-img" src={artFor(item)} alt={item.type === 'image' ? (item.alt || item.title) : ''} loading="lazy" decoding="async" {...imageProps} />

      <span className="gal-card-veil" aria-hidden="true" />

      <span className="gal-card-corner is-tl" aria-hidden="true" />
      <span className="gal-card-corner is-tr" aria-hidden="true" />
      <span className="gal-card-corner is-bl" aria-hidden="true" />
      <span className="gal-card-corner is-br" aria-hidden="true" />

      <span className="gal-card-no" aria-hidden="true">{number}</span>

      <span className={`gal-card-chip is-${item.type}`}>
        {isMedia ? <i className={item.type === 'video' ? 'is-play' : 'is-wave'} aria-hidden="true" /> : null}
        {isMedia ? (item.type === 'video' ? 'Trailer' : 'Track') : KIND_LABELS[item.kind] || item.kind}
        {item.runtime ? <em>{item.runtime}</em> : null}
      </span>

      {isMedia && <span className="gal-card-disc" aria-hidden="true"><i className={item.type === 'video' ? 'is-play' : 'is-wave'} /></span>}

      <span className="gal-card-sheen" aria-hidden="true" />
    </div>
  );
}

function Card({ item, index, total, onOpen, fallback, sectionId }) {
  const number = String(index + 1).padStart(2, '0');
  const isMedia = item.type === 'video' || item.type === 'audio';
  // Two buttons on a card, so they need two different names. The title button
  // is named by its own text, which is the plate title; the foot button says
  // which plate it opens, because on its own it is only the word "Open".
  const plate = `plate ${number} of ${String(total).padStart(2, '0')}`;

  return (
    <article className={`gal-card has-${item.type}${item.cover ? ' is-cover' : ''}`}>
      <CardArt item={item} fallback={fallback} number={number} total={total} />

      <div className="gal-card-body">
        <p className="gal-card-kind">
          <span>{KIND_LABELS[item.kind] || item.kind}</span>
          <i aria-hidden="true" />
          <em>{TYPE_LABELS[item.type]}{item.runtime ? ` · ${item.runtime}` : ''}</em>
        </p>

        <h3 className="gal-card-title">
          <button type="button" onClick={() => onOpen(index)}>
            {item.title}
            <span className="gal-card-sr"> — open {plate}</span>
          </button>
        </h3>

        <p className="gal-card-caption">{item.caption}</p>
      </div>

      <footer className="gal-card-foot">
        <span className="gal-card-credit">{item.credit}</span>
        <span className="gal-card-tools">
          {isMedia && (
            <a className="gal-card-go is-media" href={watchUrl(item.youtubeId)} target="_blank" rel="noreferrer" aria-label={`${item.type === 'video' ? 'Watch' : 'Listen'} to ${item.title} on YouTube`}>
              <i aria-hidden="true">{item.type === 'video' ? '\u25B6' : '\u266A'}</i>
              <span>{item.type === 'video' ? 'Watch' : 'Listen'}</span>
            </a>
          )}
          <BookmarkButton
            className="gal-card-save"
            label="Save"
            entry={{
              id: `gallery:${item.id}`,
              type: 'gallery',
              title: item.title,
              meta: `${KIND_LABELS[item.kind] || item.kind} · ${item.credit}`,
              image: item.src,
              href: `#${sectionId}`,
            }}
          />
          <button type="button" className="gal-card-go" onClick={() => onOpen(index)} aria-label={`Open ${plate}: ${item.title}`}>
            <span>Open</span>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </span>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* The viewer.                                                         */
/* ------------------------------------------------------------------ */

function Viewer({ items, index, theme, sectionId, style, onClose, onStep }) {
  const closeRef = useRef(null);
  const item = items[index];
  const total = items.length;
  const isMedia = item.type === 'video' || item.type === 'audio';

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') { event.preventDefault(); onStep(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(-1); }
    };
    document.addEventListener('keydown', onKeyDown);

    // Handing the scrollbar's width back as padding keeps the page from sliding
    // sideways while the viewer is open.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const pad = document.body.style.paddingRight;
    if (gap > 0 && gap <= 32) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) closeRef.current.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = pad;
    };
  }, [onClose, onStep]);

  if (!item) return null;

  const number = String(index + 1).padStart(2, '0');

  return createPortal(
    <div className="gal-viewer" data-theme={theme} style={style} role="presentation">
      <div className="gal-viewer-veil" onClick={onClose} data-testid="gal-viewer-veil" />

      <div className="gal-viewer-stage" role="dialog" aria-modal="true" aria-label={`${item.title} — plate ${number} of ${String(total).padStart(2, '0')}`}>
        <span className="gal-viewer-glow" aria-hidden="true" />

        <header className="gal-viewer-bar">
          <p className="gal-viewer-brand">
            <b>{KIND_LABELS[item.kind] || TYPE_LABELS[item.type]}</b>
            <i aria-hidden="true" />
            <span>Plate {number} / {String(total).padStart(2, '0')}</span>
          </p>
          <button type="button" className="gal-viewer-close" onClick={onClose} ref={closeRef} aria-label="Close the gallery viewer">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="gal-viewer-body">
          <button type="button" className="gal-viewer-arrow is-prev" onClick={() => onStep(-1)} aria-label="Previous plate" disabled={total < 2}>
            <i aria-hidden="true">&larr;</i>
          </button>

          <figure className={`gal-viewer-figure is-${item.type}${item.cutout ? ' is-cutout' : ''}`}>
            {isMedia ? (
              <div className="gal-viewer-embed">
                <iframe
                  title={item.title}
                  src={embedUrl(item.youtubeId)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <span className="gal-viewer-embed-label">
                  {item.type === 'audio' ? 'Now playing' : 'Trailer'}
                </span>
              </div>
            ) : (
              <img
                className="gal-viewer-image"
                src={item.src}
                alt={item.alt || item.title}
                onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
              />
            )}
          </figure>

          <button type="button" className="gal-viewer-arrow is-next" onClick={() => onStep(1)} aria-label="Next plate" disabled={total < 2}>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </div>

        <footer className="gal-viewer-foot">
          <div className="gal-viewer-copy">
            <h3>{item.title}</h3>
            <p>{item.caption}</p>
            <span className="gal-viewer-credit">{item.credit}{item.runtime ? ` · ${item.runtime}` : ''}</span>
          </div>

          <div className="gal-viewer-tools">
            {isMedia ? (
              <a className="gal-viewer-link" href={watchUrl(item.youtubeId)} target="_blank" rel="noreferrer">
                <span>Open on YouTube</span><i aria-hidden="true">&nearr;</i>
              </a>
            ) : (
              <a className="gal-viewer-link" href={item.src} target="_blank" rel="noreferrer">
                <span>Full size</span><i aria-hidden="true">&nearr;</i>
              </a>
            )}
            <BookmarkButton
              className="gal-viewer-save"
              label="Save plate"
              entry={{
                id: `gallery:${item.id}`,
                type: 'gallery',
                title: item.title,
                meta: `${KIND_LABELS[item.kind] || item.kind} · ${item.credit}`,
                image: item.src,
                href: `#${sectionId}`,
              }}
            />
          </div>
        </footer>

        <nav className="gal-viewer-strip" aria-label="Jump to a plate">
          {items.map((entry, entryIndex) => (
            <button
              type="button"
              key={entry.id}
              className={`gal-strip-tile${entryIndex === index ? ' is-on' : ''}`}
              onClick={() => onStep(entryIndex - index)}
              aria-current={entryIndex === index ? 'true' : undefined}
              aria-label={`Go to plate ${String(entryIndex + 1).padStart(2, '0')}: ${entry.title}`}
            >
              <img src={artFor(entry)} alt="" aria-hidden="true" />
              <span className="gal-strip-no">{String(entryIndex + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

// The backdrop is built out of real elements rather than one flat colour: two
// accent glows, a fine ruled grid, a halftone dot field, diagonal hairlines,
// corner brackets, a stack of empty card outlines that hints at what the
// section holds, and a grain pass over the lot.
function Backdrop() {
  return (
    <>
      <span className="gal-bg" aria-hidden="true" />
      <span className="gal-bg-grid" aria-hidden="true" />
      <span className="gal-bg-dots" aria-hidden="true" />
      <span className="gal-bg-rays" aria-hidden="true" />
      <span className="gal-bg-hairs" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="gal-bg-marks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      <span className="gal-bg-stack" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="gal-bg-grain" aria-hidden="true" />
    </>
  );
}

function FandomGallery({ fandom, theme = 'dark', sectionNumber = '02' }) {
  const { status, entry, volume, sectionTitle, retry } = useGallery(fandom);
  const [kind, setKind] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openIndex, setOpenIndex] = useState(null);
  const [playing, setPlaying] = useState(false);

  const surface = theme === 'light' ? 'light' : 'dark';
  const config = FANDOMS[fandom] || null;
  const media = useMemo(() => (entry && Array.isArray(entry.media) ? entry.media : []), [entry]);
  const sectionId = `${fandom}-gallery`;

  // Every colour comes from the fandom's own page stylesheet, so the wall is
  // the page's own surface and not a second theme laid on top of it.
  const style = useMemo(() => paletteVars(fandom, theme, 'gal'), [fandom, theme]);

  // A missing plate falls back to the fandom's own key art, so a broken path
  // leaves an empty frame rather than a torn hole in the card.
  const fallback = useMemo(
    () => (media.find((item) => item.kind === 'artwork' && item.type === 'image') || media.find((item) => item.type === 'image') || {}).src || '',
    [media],
  );

  const kinds = useMemo(() => {
    const seen = [];
    media.forEach((item) => { if (!seen.includes(item.kind)) seen.push(item.kind); });
    return seen;
  }, [media]);

  const visible = useMemo(
    () => (kind === 'all' ? media : media.filter((item) => item.kind === kind)),
    [media, kind],
  );

  // Changing the drawer re-folds the wall, and closes the viewer, because the
  // plate it was pointing at may not be in the new drawer.
  const pickKind = (next) => {
    setKind(next);
    setLimit(PAGE_SIZE);
    setOpenIndex(null);
    setPlaying(false);
  };

  const shown = visible.slice(0, limit);
  const left = Math.max(0, visible.length - limit);
  const open = openIndex === null ? null : shown[openIndex] || null;

  // Stepping wraps, so the arrows never dead-end at either edge of the wall.
  const step = useCallback((delta) => {
    setOpenIndex((current) => {
      if (current === null || shown.length === 0) return current;
      return (current + delta + shown.length) % shown.length;
    });
  }, [shown.length]);

  useEffect(() => {
    if (!playing || openIndex === null || prefersCalm() || shown.length < 2) return undefined;
    const timer = window.setTimeout(() => step(1), PLAYTHROUGH_MS);
    return () => window.clearTimeout(timer);
  }, [playing, openIndex, step, shown.length]);

  const counts = useMemo(() => {
    const map = { all: media.length };
    media.forEach((item) => { map[item.kind] = (map[item.kind] || 0) + 1; });
    return map;
  }, [media]);

  const style2 = style;

  return (
    <section className="gal" id={sectionId} data-theme={surface} style={style2} aria-label={`${config ? config.label : 'Fandom'} gallery`}>
      <Backdrop />

      <div className="gal-wrap">
        <header className="gal-head">
          <p className="gal-head-num" aria-hidden="true">{sectionNumber}</p>
          <div className="gal-head-copy">
            <p className="gal-kicker"><span /> Gallery / {volume}</p>
            <h2 className="gal-title">{sectionTitle}</h2>
            <p className="gal-tagline">{entry ? entry.tagline : 'Every fandom keeps its own wall of cards.'}</p>
          </div>
          <p className="gal-blurb">{entry ? entry.blurb : ''}</p>
        </header>

        <div className="gal-toolbar">
          <div className="gal-chips" role="group" aria-label={`Filter the ${config ? config.label : 'fandom'} gallery`}>
            <button
              type="button"
              className={`gal-chip is-all${kind === 'all' ? ' is-on' : ''}`}
              onClick={() => pickKind('all')}
              aria-pressed={kind === 'all'}
            >
              Everything<i>{counts.all || 0}</i>
            </button>
            {kinds.map((item) => (
              <button
                type="button"
                key={item}
                className={`gal-chip is-${item}${kind === item ? ' is-on' : ''}`}
                onClick={() => pickKind(item)}
                aria-pressed={kind === item}
              >
                {KIND_LABELS[item] || item}<i>{counts[item] || 0}</i>
              </button>
            ))}
          </div>

          <p className="gal-readout" aria-live="polite">
            <b>{String(shown.length).padStart(2, '0')}</b>
            <span>of {String(visible.length).padStart(2, '0')} cards</span>
          </p>
        </div>

        {status === 'loading' && <p className="gal-note">Hanging the cards&hellip;</p>}

        {status === 'error' && (
          <p className="gal-note is-error" role="alert">
            The gallery did not load. <button type="button" onClick={retry}>Try again</button>
          </p>
        )}

        {status === 'ready' && media.length === 0 && (
          <p className="gal-note">Nothing has been pinned to this wall yet.</p>
        )}

        {status === 'ready' && visible.length === 0 && media.length > 0 && (
          <p className="gal-note">No cards in that drawer. <button type="button" onClick={() => pickKind('all')}>Show everything</button></p>
        )}

        {status === 'ready' && shown.length > 0 && (
          <div className="gal-cards">
            {shown.map((item, index) => (
              <Card
                key={item.id}
                item={item}
                index={index}
                total={shown.length}
                onOpen={setOpenIndex}
                fallback={fallback}
                sectionId={sectionId}
              />
            ))}
          </div>
        )}

        {status === 'ready' && media.length > 0 && (
          <footer className="gal-foot">
            <p className="gal-foot-note">
              <b>Tip</b> Arrow keys move through the viewer, Escape closes it, and
              every card opens full size in a new tab.
            </p>

            <div className="gal-foot-tools">
              <button
                type="button"
                className={`gal-playthrough${playing ? ' is-on' : ''}`}
                onClick={() => {
                  if (openIndex === null) setOpenIndex(0);
                  setPlaying((value) => !value);
                }}
                aria-pressed={playing}
              >
                <i aria-hidden="true">{playing ? '\u275A\u275A' : '\u25B6'}</i>
                <span>{playing ? 'Pause the wall' : 'Play the wall'}</span>
              </button>

              {left > 0 ? (
                <button
                  type="button"
                  className="gal-more"
                  onClick={() => setLimit((value) => value + Math.min(PAGE_STEP, left))}
                >
                  <span>Load {Math.min(PAGE_STEP, left)} more</span>
                  <i aria-hidden="true">&darr;</i>
                  <small>{left} still on the wall</small>
                </button>
              ) : (
                <p className="gal-end">That is the whole wall &mdash; {shown.length} of {visible.length}.</p>
              )}
            </div>
          </footer>
        )}
      </div>

      {open && (
        <Viewer
          items={shown}
          index={openIndex}
          theme={surface}
          sectionId={sectionId}
          style={style2}
          onClose={() => { setOpenIndex(null); setPlaying(false); }}
          onStep={step}
        />
      )}
    </section>
  );
}

export default FandomGallery;
