import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BookmarkButton from './BookmarkButton';
import { FANDOMS, paletteVars } from './fandomConfig';
import './FandomMediaWall.css';

const GALLERY_URL = '/assets/json%20data/gallery.json';
const TRAILERS_URL = '/assets/json%20data/trailers.json';

// The wall is two shelves and nothing else: six stills and six moving plates.
// Six of each reads as a wall with a top and a bottom; more and the grid stops
// being scannable, fewer and the rows break.
const FRAME_LIMIT = 6;
const TRAILER_LIMIT = 6;

// Two badges, not a list of drawers: the wall is either stills or trailers, so
// the only choice worth offering is which one the visitor wants to walk. Nothing
// is pressed on arrival, which is the whole wall.
const BADGES = [
  { key: 'image', label: 'Images', note: 'Stills' },
  { key: 'video', label: 'Videos', note: 'Trailers' },
];

const ImageGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="1.4" />
    <circle cx="8.6" cy="10" r="1.7" />
    <path d="m4 17 4.4-4.6 3.4 3.4 3.1-3.2 5.1 5.2" />
  </svg>
);

const VideoGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="1.4" />
    <path d="M10.4 9.4 15 12l-4.6 2.6z" />
  </svg>
);

const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;

const pad = (value) => String(value).padStart(2, '0');
const plateNo = (index) => String(index + 1).padStart(2, '0');

const prefersCalm = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let inflight = null;

// Exported for tests. Both files are cached for the session, so a test that
// needs a cold cache asks for one instead of depending on file order.
export const clearMediaWallCache = () => { inflight = null; };

const loadMedia = () => {
  if (!inflight) {
    inflight = Promise.all([
      fetch(GALLERY_URL).then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch(TRAILERS_URL).then((response) => (response.ok ? response.json() : null)).catch(() => null),
    ])
      .then(([gallery, trailers]) => {
        if (!gallery && !trailers) throw new Error('Request failed');
        return { gallery, trailers };
      })
      .catch((error) => {
        inflight = null;
        throw error;
      });
  }
  return inflight;
};

// The stills come off the gallery file, which already holds the fandom's own
// captions and credits. Only the moving plates are lifted from the trailers
// file, because that is the one place that keeps a real runtime and a studio
// for every video.
//
// Two ids are accepted because the gallery files the TV group under `tv` while
// the page and the route spell it `tvshows` — the same mismatch `dataId` exists
// to absorb, so the wall asks for both and takes whichever the file has.
const framePlates = (gallery, fandom, dataId) => {
  const groups = gallery && Array.isArray(gallery.fandoms) ? gallery.fandoms : [];
  const group = groups.find((item) => item.id === fandom)
    || groups.find((item) => item.id === dataId);
  const media = group && Array.isArray(group.media) ? group.media : [];

  return media
    .filter((item) => item.type === 'image')
    .slice(0, FRAME_LIMIT)
    .map((item) => ({
      id: item.id,
      type: 'image',
      title: item.title,
      caption: item.caption,
      credit: item.credit,
      alt: item.alt || item.title,
      src: item.src,
    }));
};

const trailerPlates = (trailers, category) => {
  const list = trailers && Array.isArray(trailers.trailers) ? trailers.trailers : [];

  return list
    .filter((item) => item.category === category && item.videoId)
    .slice(0, TRAILER_LIMIT)
    .map((item) => ({
      id: item.id,
      type: 'video',
      title: item.title,
      caption: item.blurb,
      credit: item.studio,
      alt: `${item.title} trailer`,
      youtubeId: item.videoId,
      runtime: item.runtime,
      badge: item.badge,
    }));
};

const usePlates = (fandom) => {
  const [state, setState] = useState({ status: 'loading', plates: [] });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, status: 'loading' }));

    loadMedia()
      .then(({ gallery, trailers }) => {
        if (!alive) return;
        const config = FANDOMS[fandom] || null;
        const category = config ? config.dataId : fandom;
        setState({
          status: 'ready',
          plates: [...framePlates(gallery, fandom, category), ...trailerPlates(trailers, category)],
        });
      })
      .catch(() => { if (alive) setState((current) => ({ ...current, status: 'error' })); });

    return () => { alive = false; };
  }, [fandom, nonce]);

  return { ...state, retry: () => setNonce((value) => value + 1) };
};

// One source per plate. A still is the file itself; a trailer is its poster
// frame, and anything that fails to load falls back to the fandom's key art so
// a dead path leaves an empty mount rather than a torn hole in the card.
const artFor = (plate) => (plate.type === 'image' ? plate.src : thumbFor(plate.youtubeId));

const useSafeImage = (fallback) => ({
  onError: (event) => {
    const node = event.currentTarget;
    if (node.dataset.failed || !fallback) return;
    node.dataset.failed = 'true';
    node.src = fallback;
  },
});

/* ------------------------------------------------------------------ */
/* One plate.                                                          */
/* ------------------------------------------------------------------ */

function PlateArt({ plate, number, fallback, onOpen, label }) {
  const imageProps = useSafeImage(fallback);
  const isVideo = plate.type === 'video';

  return (
    <div className={`mwall-art${isVideo ? ' is-video' : ' is-still'}`}>
      <span className="mwall-mat" aria-hidden="true" />

      <img
        className="mwall-img"
        src={artFor(plate)}
        alt={isVideo ? '' : plate.alt}
        loading="lazy"
        decoding="async"
        {...imageProps}
      />

      <span className="mwall-veil" aria-hidden="true" />
      <span className="mwall-corners" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="mwall-num" aria-hidden="true">{number}</span>

      <span className={`mwall-chip is-${plate.type}`}>
        {isVideo ? <i className="is-play" aria-hidden="true" /> : null}
        {isVideo ? 'Trailer' : 'Frame'}
        {plate.runtime ? <em>{plate.runtime}</em> : null}
      </span>

      {isVideo
        ? <span className="mwall-disc" aria-hidden="true"><i className="is-play" /></span>
        : <span className="mwall-zoom" aria-hidden="true">&nearr;</span>}

      <span className="mwall-sheen" aria-hidden="true" />

      {/* The window itself is the click target, so the button lies over it
          instead of wrapping it: an empty overlay keeps the name on the button
          and leaves the plate copy readable underneath. */}
      <button
        type="button"
        className="mwall-open"
        onClick={() => onOpen(number)}
        aria-label={`Open ${label}: ${plate.title}`}
      />
    </div>
  );
}

function Plate({ plate, index, total, fallback, sectionId, onOpen }) {
  const number = plateNo(index);
  const isVideo = plate.type === 'video';
  const label = `plate ${number} of ${pad(total)}`;

  return (
    <article className={`mwall-card has-${plate.type}`}>
      <PlateArt plate={plate} number={number} fallback={fallback} onOpen={onOpen} label={label} />

      <div className="mwall-body">
        <p className="mwall-kind">
          <span>{isVideo ? 'Trailer' : 'Frame'}</span>
          <i aria-hidden="true" />
          <em>{plate.credit}</em>
        </p>

        <h3 className="mwall-name">{plate.title}</h3>
        <p className="mwall-caption">{plate.caption}</p>
      </div>

      <footer className="mwall-card-foot">
        <span className="mwall-slot">Plate {number} / {pad(total)}</span>

        <span className="mwall-tools">
          {isVideo && (
            <a
              className="mwall-watch"
              href={watchUrl(plate.youtubeId)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Watch ${plate.title} on YouTube`}
            >
              <i aria-hidden="true">&blacktriangleright;</i>
              <span>Watch</span>
            </a>
          )}

          <BookmarkButton
            className="mwall-save"
            label="Save"
            entry={{
              id: `media:${plate.id}`,
              type: 'gallery',
              title: plate.title,
              meta: `${isVideo ? 'Trailer' : 'Frame'} · ${plate.credit}`,
              image: artFor(plate),
              href: `#${sectionId}`,
            }}
          />
        </span>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* The viewer.                                                         */
/* ------------------------------------------------------------------ */

function Viewer({ plates, index, theme, sectionId, style, onClose, onStep }) {
  const closeRef = useRef(null);
  const plate = plates[index];
  const total = plates.length;
  const isVideo = plate.type === 'video';

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') { event.preventDefault(); onStep(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(-1); }
    };
    document.addEventListener('keydown', onKeyDown);

    const gap = window.innerWidth - document.documentElement.clientWidth;
    const pad0 = document.body.style.paddingRight;
    if (gap > 0 && gap <= 32) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = 'hidden';
    if (closeRef.current) closeRef.current.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = pad0;
    };
  }, [onClose, onStep]);

  if (!plate) return null;

  const number = plateNo(index);

  return createPortal(
    <div className="mwall-viewer" data-theme={theme} style={style} role="presentation">
      <div className="mwall-viewer-veil" onClick={onClose} data-testid="mwall-viewer-veil" />

      <div
        className="mwall-viewer-stage"
        role="dialog"
        aria-modal="true"
        aria-label={`${plate.title} — plate ${number} of ${pad(total)}`}
      >
        <span className="mwall-viewer-glow" aria-hidden="true" />

        <header className="mwall-viewer-bar">
          <p className="mwall-viewer-brand">
            <b>{isVideo ? 'Trailer' : 'Frame'}</b>
            <i aria-hidden="true" />
            <span>Plate {number} / {pad(total)}</span>
          </p>
          <button type="button" className="mwall-viewer-close" onClick={onClose} ref={closeRef} aria-label="Close the plate viewer">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="mwall-viewer-body">
          <button type="button" className="mwall-viewer-arrow is-prev" onClick={() => onStep(-1)} aria-label="Previous plate" disabled={total < 2}>
            <i aria-hidden="true">&larr;</i>
          </button>

          <figure className={`mwall-viewer-figure is-${plate.type}`}>
            {isVideo ? (
              <div className="mwall-viewer-embed">
                <iframe
                  title={plate.title}
                  src={embedUrl(plate.youtubeId)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <span className="mwall-viewer-embed-label">Playing</span>
              </div>
            ) : (
              <img
                className="mwall-viewer-image"
                src={plate.src}
                alt={plate.alt}
                onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
              />
            )}
          </figure>

          <button type="button" className="mwall-viewer-arrow is-next" onClick={() => onStep(1)} aria-label="Next plate" disabled={total < 2}>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </div>

        <footer className="mwall-viewer-foot">
          <div className="mwall-viewer-copy">
            <h3>{plate.title}</h3>
            <p>{plate.caption}</p>
            <span className="mwall-viewer-credit">{plate.credit}{plate.runtime ? ` · ${plate.runtime}` : ''}</span>
          </div>

          <div className="mwall-viewer-tools">
            {isVideo ? (
              <a className="mwall-viewer-link" href={watchUrl(plate.youtubeId)} target="_blank" rel="noreferrer">
                <span>Open on YouTube</span><i aria-hidden="true">&nearr;</i>
              </a>
            ) : (
              <a className="mwall-viewer-link" href={plate.src} target="_blank" rel="noreferrer">
                <span>Full size</span><i aria-hidden="true">&nearr;</i>
              </a>
            )}
            <BookmarkButton
              className="mwall-viewer-save"
              label="Save plate"
              entry={{
                id: `media:${plate.id}`,
                type: 'gallery',
                title: plate.title,
                meta: `${isVideo ? 'Trailer' : 'Frame'} · ${plate.credit}`,
                image: artFor(plate),
                href: `#${sectionId}`,
              }}
            />
          </div>
        </footer>

        <nav className="mwall-viewer-strip" aria-label="Jump to a plate">
          {plates.map((entry, entryIndex) => (
            <button
              type="button"
              key={entry.id}
              className={`mwall-strip-tile${entryIndex === index ? ' is-on' : ''}`}
              onClick={() => onStep(entryIndex - index)}
              aria-current={entryIndex === index ? 'true' : undefined}
              aria-label={`Go to plate ${plateNo(entryIndex)}: ${entry.title}`}
            >
              <img src={artFor(entry)} alt="" aria-hidden="true" />
              <span className="mwall-strip-no">{plateNo(entryIndex)}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

/* Everything behind the plates. The wall is a room, not a colour: light comes
   down in three beams, a wire of empty frames hangs across the top, film
   perforations run down both edges, loose geometry floats in the corners, two
   great arcs sweep through, dust drifts, and the fandom's own name sits behind
   all of it as one huge ghosted outline. Every layer is decorative and every
   tone is mixed out of `--mwall-*`, so the room is the page's own palette. */
function Backdrop({ label }) {
  return (
    <>
      <span className="mwall-bg" aria-hidden="true" />
      <span className="mwall-bg-grid" aria-hidden="true" />
      <span className="mwall-bg-arcs" aria-hidden="true"><i /><i /></span>
      <span className="mwall-bg-beams" aria-hidden="true"><i /><i /><i /></span>
      <span className="mwall-bg-tape" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="mwall-bg-shapes" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="mwall-bg-frames" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      <span className="mwall-bg-perf" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="mwall-bg-motes" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="mwall-bg-ghost" aria-hidden="true">{label}</span>
      <span className="mwall-bg-grain" aria-hidden="true" />
    </>
  );
}

function FandomMediaWall({ fandom = 'anime', theme = 'dark' }) {
  const { status, plates, retry } = usePlates(fandom);
  const [drawer, setDrawer] = useState('all');
  const [openIndex, setOpenIndex] = useState(null);
  const triggerRef = useRef(null);

  const surface = theme === 'light' ? 'light' : 'dark';
  const config = FANDOMS[fandom] || null;
  const label = config ? config.label : 'Fandom';
  const sectionId = `${fandom}-media-wall`;
  const style = useMemo(() => paletteVars(fandom, theme, 'mwall'), [fandom, theme]);

  const counts = useMemo(() => ({
    all: plates.length,
    image: plates.filter((plate) => plate.type === 'image').length,
    video: plates.filter((plate) => plate.type === 'video').length,
  }), [plates]);

  const visible = useMemo(
    () => (drawer === 'all' ? plates : plates.filter((plate) => plate.type === drawer)),
    [plates, drawer],
  );

  // A missing plate falls back to the fandom's key art, so a broken path leaves
  // an empty mount rather than a hole in the wall.
  const fallback = useMemo(
    () => (plates.find((plate) => plate.type === 'image') || {}).src || '',
    [plates],
  );

  const open = openIndex === null ? null : visible[openIndex] || null;

  // Changing the drawer re-folds the wall and shuts the viewer, because the
  // plate it was pointing at may not be in the new drawer.
  const pickDrawer = (next) => {
    setDrawer(next);
    setOpenIndex(null);
  };

  const openPlate = (number, event) => {
    if (event && event.currentTarget) triggerRef.current = event.currentTarget;
    setOpenIndex(Number(number) - 1);
  };

  // Stepping wraps, so the arrows never dead-end at either end of the wall.
  const step = useCallback((delta) => {
    setOpenIndex((current) => {
      if (current === null || visible.length === 0) return current;
      return (current + delta + visible.length) % visible.length;
    });
  }, [visible.length]);

  const close = useCallback(() => {
    setOpenIndex(null);
    const node = triggerRef.current;
    if (node && typeof node.focus === 'function' && document.body.contains(node)) node.focus();
  }, []);

  return (
    <section
      className="mwall"
      id={sectionId}
      data-theme={surface}
      style={style}
      aria-label={`${label} frames and trailers`}
    >
      <Backdrop label={label} />

      <div className="mwall-wrap">
        <header className="mwall-head">
          {/* The name of the wall, ruled on both sides so the row reads as one
              line rather than as a title with a caption under it. */}
          <div className="mwall-bar">
            <span className="mwall-bar-rule" aria-hidden="true" />
            <h2 className="mwall-bar-title">The Wall</h2>
            <span className="mwall-bar-rule" aria-hidden="true" />
          </div>

          <dl className="mwall-tally">
            <div><dt>Frames</dt><dd>{pad(counts.image)}</dd></div>
            <div><dt>Trailers</dt><dd>{pad(counts.video)}</dd></div>
          </dl>
        </header>

        <div className="mwall-toolbar">
          <div className="mwall-badges" role="group" aria-label={`Choose images or videos on the ${label} wall`}>
            {BADGES.map((item) => {
              const on = drawer === item.key;
              const Glyph = item.key === 'video' ? VideoGlyph : ImageGlyph;

              return (
                <button
                  type="button"
                  key={item.key}
                  className={`mwall-badge is-${item.key}${on ? ' is-on' : ''}`}
                  onClick={() => pickDrawer(on ? 'all' : item.key)}
                  aria-pressed={on}
                >
                  <span className="mwall-badge-glyph"><Glyph /></span>
                  <span className="mwall-badge-body">
                    <b>{item.label}</b>
                    <small>{item.note}</small>
                  </span>
                  <em>{pad(counts[item.key])}</em>
                </button>
              );
            })}
          </div>

          <p className="mwall-readout" aria-live="polite">
            <b>{pad(visible.length)}</b>
            <span>of {pad(plates.length)} plates on the wall</span>
          </p>
        </div>

        {status === 'loading' && <p className="mwall-note">Hanging the wall&hellip;</p>}

        {status === 'error' && (
          <p className="mwall-note is-error" role="alert">
            The wall did not load. <button type="button" onClick={retry}>Try again</button>
          </p>
        )}

        {status === 'ready' && plates.length === 0 && (
          <p className="mwall-note">Nothing has been pinned to this wall yet.</p>
        )}

        {status === 'ready' && visible.length === 0 && plates.length > 0 && (
          <p className="mwall-note">
            No plates on that shelf. <button type="button" onClick={() => pickDrawer('all')}>Show everything</button>
          </p>
        )}

        {status === 'ready' && visible.length > 0 && (
          <div className="mwall-grid">
            {visible.map((plate, index) => (
              <Plate
                key={plate.id}
                plate={plate}
                index={index}
                total={visible.length}
                fallback={fallback}
                sectionId={sectionId}
                onOpen={openPlate}
              />
            ))}
          </div>
        )}

        {status === 'ready' && visible.length > 0 && (
          <footer className="mwall-tips">
            <p className="mwall-tip">
              <b>Tip</b> Every plate is a card: point at it to lift it, press it
              to open the full version, and use the arrow keys or Escape once
              the viewer is up.
            </p>
            <p className="mwall-end">
              {counts.image} stills &middot; {counts.video} trailers
              {prefersCalm() ? ' · motion reduced' : ''}
            </p>
          </footer>
        )}
      </div>

      {open && (
        <Viewer
          plates={visible}
          index={openIndex}
          theme={surface}
          sectionId={sectionId}
          style={style}
          onClose={close}
          onStep={step}
        />
      )}
    </section>
  );
}

export default FandomMediaWall;
