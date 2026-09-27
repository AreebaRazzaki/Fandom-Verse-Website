import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BookmarkButton from './BookmarkButton';
import './CharacterCodex.css';

const DATA_URL = '/assets/json%20data/characterProfiles.json';

// The plates are transparent cut-outs, so any failure just falls back to the
// category artwork rather than leaving a torn hole in the page.
const FALLBACK_IMAGES = {
  anime: '/assets/images/anime.png',
  comics: '/assets/images/comics.png',
  gaming: '/assets/images/gaming.png',
  movies: '/assets/images/movie.png',
  tvshows: '/assets/images/tv shows.png',
  kpop: '/assets/images/k-pop.png',
  manga: '/assets/images/manga.png',
};

const fallbackFor = (fandom) => FALLBACK_IMAGES[fandom] || FALLBACK_IMAGES.anime;

// The same roster, read three different ways depending on the fandom: an anime
// codex is filed under series and watched as a series, a film codex is filed
// under films and watched as a film, and the second trailer block stops being a
// spin-off. A fandom only has to name the ones that actually change for it.
const DEFAULT_LABELS = {
  archive: 'The character codex',
  series: 'Series',
  watch: 'Watch the series',
  plate: 'Plate',
  companion: 'Popular movie',
};

const labelsFor = (fandom, labels) => ({ ...DEFAULT_LABELS, ...((labels || {})[fandom] || {}) });

// How long the page takes to fold over. Slow enough to read as paper being
// turned rather than a slide, quick enough that the arrows never feel like they
// are waiting on an animation. The turn state is cleared on the same beat, so
// the two stay in step without the CSS and the JS disagreeing.
const TURN_MS = 520;

const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;

let inflight = null;

const loadProfiles = () => {
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

const useCodex = (fandom) => {
  const [state, setState] = useState({
    status: 'loading',
    characters: [],
    issue: null,
    volume: 'Vol. 01',
    sectionTitle: 'The Character Codex',
    labels: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, status: 'loading' }));
    loadProfiles()
      .then((data) => {
        if (!alive) return;
        const all = Array.isArray(data.characters) ? data.characters : [];
        const characters = fandom ? all.filter((item) => item.fandom === fandom) : all;
        // A fandom can rename the heading — the gaming page calls its copy the
        // player codex, the movies page the film codex — but the shared title
        // is still the fallback.
        const titles = data.sectionTitles || {};
        setState({
          status: 'ready',
          characters,
          issue: data.issue || null,
          volume: data.volume || 'Vol. 01',
          sectionTitle: titles[fandom] || data.sectionTitle || 'The Character Codex',
          labels: data.sectionLabels || null,
        });
      })
      .catch(() => { if (alive) setState((current) => ({ ...current, status: 'error' })); });
    return () => { alive = false; };
  }, [fandom, nonce]);

  return { ...state, retry: () => setNonce((value) => value + 1) };
};

// The SRS asks for traits on every profile, so they are printed the way the
// document reads them: a label, then the words separated by a middle dot.
function TraitList({ traits, className = '' }) {
  return (
    <p className={`codex-traits ${className}`.trim()}>
      <span className="codex-traits-label">Traits</span>
      <span className="codex-traits-list">
        {traits.map((trait, index) => (
          <span className="codex-trait-pair" key={trait}>
            {index > 0 && <i className="codex-dot" aria-hidden="true">&bull;</i>}
            <b>{trait}</b>
          </span>
        ))}
      </span>
    </p>
  );
}

function FactList({ facts, columns = 1 }) {
  return (
    <dl className={`codex-facts cols-${columns}`}>
      {facts.map((fact) => (
        <div className="codex-fact" key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function YouTubeChip({ video, className = '' }) {
  if (!video || !video.videoId) return null;
  return (
    <a
      className={`codex-yt ${className}`.trim()}
      href={watchUrl(video.videoId)}
      target="_blank"
      rel="noreferrer"
      aria-label={`${video.label} on YouTube`}
    >
      <span className="codex-yt-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M9.6 8.1v7.8L16 12z" /><path d="M12 3.2c3 0 5.3.2 6.6.5a3 3 0 0 1 2.4 2.4c.3 1.3.5 3.6.5 6.6s-.2 5.3-.5 6.6a3 3 0 0 1-2.4 2.4c-1.3.3-3.6.5-6.6.5s-5.3-.2-6.6-.5a3 3 0 0 1-2.4-2.4C3.2 17.3 3 15 3 12s.2-5.3.5-6.6a3 3 0 0 1 2.4-2.4C7.2 3.4 9.5 3.2 12 3.2z" /></svg>
      </span>
      <span className="codex-yt-text">
        <b>yt</b>
        <span>{video.label}</span>
      </span>
    </a>
  );
}

function CodeActions({ character, anchorHref, onOpen, variant = 'card' }) {
  return (
    <div className={`codex-actions is-${variant}`}>
      {/* The accessible name repeats the visible words and then adds the
          character, so a screen reader hears what the button actually says. */}
      <button type="button" className="codex-view" onClick={() => onOpen(character.id)} aria-label={`View profile — ${character.name}`}>
        <span>View profile</span>
        <i aria-hidden="true">&rarr;</i>
      </button>

      <YouTubeChip video={character.youtube} />

      <BookmarkButton
        className="codex-save"
        label="Bookmark"
        entry={{
          id: `character:${character.id}`,
          type: 'character',
          title: character.name,
          meta: `${character.series.title} (${character.series.year}) · ${character.traits.join(' · ')}`,
          image: character.image,
          href: anchorHref,
        }}
      />
    </div>
  );
}

function Plate({ character, caption, className = '', fallback, plateLabel = DEFAULT_LABELS.plate }) {
  return (
    <figure className={`codex-plate ${className}`.trim()}>
      <span className="codex-plate-mat" aria-hidden="true" />
      <span className="codex-plate-reg" aria-hidden="true"><i /><i /></span>
      <img
        className="codex-plate-image"
        src={character.image}
        alt={`${character.name} — plate from ${character.series.title}`}
        onError={(event) => { event.currentTarget.src = fallback; }}
      />
      <figcaption className="codex-plate-caption">
        <span className="codex-plate-no">{plateLabel} {character.entry}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* The book: a left page and a right page, one entry at a time.        */
/* ------------------------------------------------------------------ */

function BookSpread({ character, folio, total, onOpen, anchorHref, fallback, direction, labels }) {
  return (
    <div
      className={`codex-spread${direction ? ` is-in-${direction}` : ''}`}
      key={`${character.id}-${direction || 'still'}`}
      style={{ '--entry-accent': character.accent, '--entry-accent-two': character.accentTwo }}
    >
      <span className="codex-ribbon" aria-hidden="true" />

      <div className="codex-leaf is-verso">
        <p className="codex-leaf-mark">
          <b>Entry {character.entry}</b>
          <i aria-hidden="true" />
          <span>Page {folio}</span>
        </p>

        <Plate character={character} caption={`${character.name}, ${character.series.origin}.`} className="is-leaf" fallback={fallback} plateLabel={labels.plate} />

        <div className="codex-leaf-foot">
          <span className="codex-leaf-role">{character.role}</span>
          <span className="codex-leaf-studio">{character.series.studio} · {character.series.year}</span>
        </div>
      </div>

      <div className="codex-leaf is-recto">
        <p className="codex-leaf-entry">{character.chapter} <i aria-hidden="true" /> Entry {character.entry} of {String(total).padStart(2, '0')}</p>
        <h3 className="codex-leaf-name">{character.name}</h3>
        <p className="codex-leaf-reading">{character.reading}</p>
        <p className="codex-leaf-epithet">{character.epithet}</p>
        <p className="codex-leaf-series">
          <span>{labels.series}</span> {character.series.title} <i aria-hidden="true" /> {character.series.year} <i aria-hidden="true" /> {character.series.format}
        </p>
        <TraitList traits={character.traits} />
        <FactList facts={character.facts.slice(0, 2)} columns={1} />
        <CodeActions character={character} onOpen={onOpen} anchorHref={anchorHref} variant="leaf" />
      </div>
    </div>
  );
}

// The sheet that is actually in the air while the page turns: a paper panel
// carrying the entry you are leaving, hinged on the spine.
function FoldLeaf({ character, folio, direction }) {
  return (
    <div className={`codex-fold is-${direction}`} aria-hidden="true">
      <span className="codex-fold-face">
        <img src={character.image} alt="" onError={(event) => { event.currentTarget.style.opacity = '0'; }} />
        <span className="codex-fold-ghost">{character.name}</span>
        <span className="codex-fold-folio">p.{folio}</span>
      </span>
      <span className="codex-fold-shade" />
    </div>
  );
}

// The turn lives in the parent so a tab can cancel a fold that is still in the
// air and jump straight to its entry.
function BookReader({ characters, folios, volume, sectionTitle, labels, onOpen, anchorHref, fallback, page, onPage, turn, onTurn }) {
  const total = characters.length;

  // Going past either end wraps back round, so the arrows never dead-end.
  const goTo = (target) => {
    const next = ((target % total) + total) % total;
    if (next === page) return;
    onTurn({ dir: next > page ? 'next' : 'prev', from: page });
    onPage(next);
  };

  useEffect(() => {
    if (!turn) return undefined;
    const timer = window.setTimeout(() => onTurn(null), TURN_MS);
    return () => window.clearTimeout(timer);
  }, [turn, onTurn]);

  if (total === 0) return null;

  const character = characters[page];
  const leaving = turn ? characters[turn.from] : null;

  return (
    <div className="codex-reader-book">
      <span className="codex-book-board" aria-hidden="true" />
      <span className="codex-book-block" aria-hidden="true" />
      <span className="codex-book-stamp" aria-hidden="true">{volume}</span>
      <span className="codex-book-spine" aria-hidden="true">
        <b>Fandomverse</b>
        <i aria-hidden="true" />
        <span>{sectionTitle}</span>
      </span>

      <div className="codex-book-bar">
        <p className="codex-book-bar-title">
          <b>{character.name}</b>
          <span>Entry {character.entry} / 0{total}</span>
        </p>
        <div className="codex-book-arrows">
          <button
            type="button"
            className="codex-arrow is-prev"
            onClick={() => goTo(page - 1)}
            aria-label="Turn back to the previous character"
          >
            <i aria-hidden="true">&larr;</i>
            <span>Back</span>
          </button>
          <button
            type="button"
            className="codex-arrow is-next"
            onClick={() => goTo(page + 1)}
            aria-label="Turn the page to the next character"
          >
            <span>Next</span>
            <i aria-hidden="true">&rarr;</i>
          </button>
        </div>
      </div>

      <div
        className="codex-stage"
        role="group"
        aria-label={`Open book, entry ${character.entry} of ${total}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(page - 1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); goTo(page + 1); }
        }}
      >
        <span className="codex-gutter" aria-hidden="true" />

        <BookSpread
          character={character}
          folio={folios[page]}
          total={total}
          labels={labels}
          onOpen={onOpen}
          anchorHref={anchorHref}
          fallback={fallback}
          direction={turn ? turn.dir : null}
        />

        {leaving && <FoldLeaf character={leaving} folio={folios[turn.from]} direction={turn.dir} />}
      </div>

      <nav className="codex-tabs" aria-label="Jump to a character">
        {characters.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={index === page ? 'is-on' : ''}
            style={{ '--entry-accent': item.accent }}
            aria-current={index === page ? 'true' : undefined}
            onClick={() => goTo(index)}
          >
            <span className="codex-tab-no">{item.entry}</span>
            <span className="codex-tab-name">{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The open profile.                                                   */
/* ------------------------------------------------------------------ */

function ScreenBlock({ kicker, title, video, blurb, extra, fallback }) {
  const [playing, setPlaying] = useState(false);
  const videoId = video ? video.videoId : null;

  // Switching to another entry has to drop the running player, otherwise the
  // iframe keeps the previous trailer playing behind the new cover.
  useEffect(() => { setPlaying(false); }, [videoId]);

  if (!videoId) return null;

  return (
    <section className="codex-screen">
      <p className="codex-screen-title">{kicker}</p>
      <div className="codex-screen-frame">
        {playing ? (
          <iframe
            title={video.name || video.title}
            src={embedUrl(videoId)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={thumbFor(videoId)}
              alt=""
              onError={(event) => { event.currentTarget.src = fallback; }}
            />
            <span className="codex-screen-veil" aria-hidden="true" />
            <button
              type="button"
              className="codex-screen-play"
              onClick={() => setPlaying(true)}
              aria-label={`Play ${video.name || video.title}`}
            >
              <i aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <p className="codex-screen-meta">
        <b>{title}</b>
        <span>{video.channel}</span>
      </p>
      {blurb && <p className="codex-screen-blurb">{blurb}</p>}
      <div className="codex-screen-links">
        <a className="codex-view" href={watchUrl(videoId)} target="_blank" rel="noreferrer">
          <span>Open on YouTube</span><i aria-hidden="true">&nearr;</i>
        </a>
        {extra && <YouTubeChip video={extra} />}
      </div>
    </section>
  );
}

function ProfileModal({ character, theme, variant, fandom, labels, anchorHref, fallback, onClose, onSelect, others }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    // Handing the scrollbar's width back as padding keeps the page from
    // sliding sideways while the spread is open.
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
  }, [onClose]);

  const style = { '--entry-accent': character.accent, '--entry-accent-two': character.accentTwo };
  const movie = character.movie;

  // The plate is dropped from the full profile on purpose. It used to sit in its
  // own left-hand column, which left a picture beside a wall of text and pushed
  // the trailers below the fold. Read straight down instead, the name, the
  // biography, the index and the two trailers follow each other in one sequence.
  const identity = [
    { label: labels.series, value: character.series.title },
    { label: 'Year', value: character.series.year },
    { label: 'Studio', value: character.series.studio },
    { label: 'Format', value: character.series.format },
    { label: 'Role', value: character.role },
    { label: 'Origin', value: character.series.origin },
  ];

  return createPortal(
    <div className={`codex-modal is-${variant}`} role="presentation" data-theme={theme} data-fandom={fandom} style={style}>
      <div className="codex-modal-veil" onClick={onClose} data-testid="codex-modal-veil" />

      <div className="codex-modal-book" role="dialog" aria-modal="true" aria-labelledby="codex-modal-name">
        <span className="codex-modal-board" aria-hidden="true" />

        <button type="button" className="codex-modal-close" onClick={onClose} ref={closeRef} aria-label="Close profile">
          <span aria-hidden="true">&times;</span>
        </button>

        <div className="codex-modal-page is-copy">
          <p className="codex-modal-mark"><b>Entry {character.entry}</b><i aria-hidden="true" />{character.chapter}</p>
          <p className="codex-modal-kicker">Biography</p>
          <h2 className="codex-modal-name" id="codex-modal-name">{character.name}</h2>
          <p className="codex-modal-epithet">{character.epithet}</p>

          <TraitList traits={character.traits} className="is-modal" />

          <div className="codex-modal-body">
            {character.bio.map((paragraph, index) => (
              <p className={index === 0 ? 'has-dropcap' : ''} key={index}>{paragraph}</p>
            ))}
          </div>

          <blockquote className="codex-modal-quote">
            <span aria-hidden="true">&ldquo;</span>
            {character.quote}
          </blockquote>

          <section className="codex-modal-ledger" aria-label="Profile index">
            <p className="codex-modal-ledger-title">Index</p>
            <FactList facts={identity} columns={2} />
            <FactList facts={character.facts} columns={2} />
          </section>

          <ScreenBlock
            kicker={labels.watch}
            title={character.series.title}
            video={character.youtube}
            extra={character.moreYoutube}
            fallback={fallback}
          />

          {movie && (
            <ScreenBlock
              kicker={labels.companion}
              title={`${movie.title} (${movie.year})`}
              video={{ ...movie, title: movie.name }}
              blurb={movie.blurb}
              extra={movie.moreYoutube}
              fallback={fallback}
            />
          )}

          <footer className="codex-modal-foot">
            <BookmarkButton
              className="codex-save is-modal"
              label="Bookmark profile"
              entry={{
                id: `character:${character.id}`,
                type: 'character',
                title: character.name,
                meta: `${character.series.title} (${character.series.year}) · ${character.traits.join(' · ')}`,
                image: character.image,
                href: anchorHref,
              }}
            />
            <span className="codex-modal-issue">Codex / {character.series.title}</span>
          </footer>
        </div>

        {others.length > 0 && (
          <nav className="codex-modal-others" aria-label="Other profiles in this codex">
            <p>Turn the page</p>
            <ul>
              {others.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onSelect(item)}>
                    <span className="codex-modal-others-no" style={{ '--entry-accent': item.accent }}>{item.entry}</span>
                    <span className="codex-modal-others-body">
                      <b>{item.name}</b>
                      <small>{item.series.title}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

function Backdrop() {
  return (
    <>
      <span className="codex-bg codex-bg-book" aria-hidden="true" />
      <span className="codex-bg-grid" aria-hidden="true" />
      <span className="codex-bg-shelf" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="codex-bg-sheets" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="codex-bg-motes" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
    </>
  );
}

function CharacterCodex({
  fandom,
  theme = 'dark',
  sectionNumber = '05',
  // `book` is the printed-codex room. `game` and `cinema` re-skin the same
  // markup as a game screen and as a screening room, so a fandom can mount this
  // without a second component.
  variant = 'book',
}) {
  const { status, characters, volume, sectionTitle, labels: labelSet, retry } = useCodex(fandom);
  const [openId, setOpenId] = useState(null);
  const [bookPage, setBookPage] = useState(0);
  const [turn, setTurn] = useState(null);

  const sectionId = `${fandom}-character-profiles`;
  const open = characters.find((item) => item.id === openId) || null;
  const others = open ? characters.filter((item) => item.id !== open.id) : [];
  const folios = characters.map((_, index) => String(index + 3).padStart(2, '0'));
  const surface = theme === 'light' ? 'light' : 'dark';
  const fallback = fallbackFor(fandom);
  const labels = labelsFor(fandom, labelSet);

  return (
    <section className={`codex codex-book is-${variant}`} id={sectionId} data-theme={surface} data-fandom={fandom} aria-label={labels.archive}>
      <Backdrop />

      <div className="codex-wrap">
        <header className="codex-book-head">
          <p className="codex-head-num" aria-hidden="true">{sectionNumber}</p>
          <h2 className="codex-book-title">{sectionTitle}</h2>
        </header>

        {status === 'loading' && <p className="codex-note-line">Binding the codex&hellip;</p>}

        {status === 'error' && (
          <p className="codex-note-line is-error" role="alert">
            The codex did not open. <button type="button" onClick={retry}>Try again</button>
          </p>
        )}

        {status === 'ready' && characters.length === 0 && (
          <p className="codex-note-line">No profiles have been filed under this fandom yet.</p>
        )}

        {status === 'ready' && characters.length > 0 && (
          <BookReader
            characters={characters}
            folios={folios}
            volume={volume}
            sectionTitle={sectionTitle}
            labels={labels}
            onOpen={setOpenId}
            anchorHref={`#${sectionId}`}
            fallback={fallback}
            page={bookPage}
            onPage={setBookPage}
            turn={turn}
            onTurn={setTurn}
          />
        )}
      </div>

      {open && (
        <ProfileModal
          character={open}
          others={others}
          theme={surface}
          variant={variant}
          fandom={fandom}
          labels={labels}
          anchorHref={`#${sectionId}`}
          fallback={fallback}
          onClose={() => setOpenId(null)}
          onSelect={(item) => setOpenId(item.id)}
        />
      )}
    </section>
  );
}

export default CharacterCodex;
