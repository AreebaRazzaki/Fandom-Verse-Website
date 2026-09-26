import { useEffect, useMemo, useRef, useState } from 'react';
import { clearBookmarks, removeBookmark, setBookmarkNote, useBookmarks } from '../bookmarks';
import { loadSearchIndex, searchSite, suggestTerms } from '../search';
import './SiteNav.css';

const fandomLinks = ['Anime', 'Gaming', 'Movies', 'TV Shows', 'K-Pop', 'Comics', 'Manga'];
const discoverLinks = ['Featured Articles', 'Trailers', 'Events', 'Upcoming Releases'];

const BOOKMARK_LABEL = { article: 'Article', trailer: 'Trailer', event: 'Event', release: 'Release', product: 'Product' };
const BOOKMARK_HREF = { article: '#featured-articles', trailer: '#trailers', event: '#events', release: '#upcoming-releases', product: '#shop' };

const palettes = {
  home: {
    dark: { '--nav-ink': '#eeeae1', '--nav-muted': '#aaa6a0', '--nav-accent': 'var(--accent, #d89416)' },
    light: { '--nav-ink': '#171820', '--nav-muted': '#5e6068', '--nav-accent': 'var(--accent, #d89416)' },
  },
  anime: {
    dark: { '--nav-ink': '#d6d3cb', '--nav-muted': '#85837d', '--nav-accent': '#c5962e' },
    light: { '--nav-ink': '#252628', '--nav-muted': '#60615f', '--nav-accent': '#aa7711' },
  },
  comics: {
    dark: { '--nav-ink': '#fff1e7', '--nav-muted': '#c5b3a8', '--nav-accent': '#ff7b32' },
    light: { '--nav-ink': '#2d2928', '--nav-muted': '#746c67', '--nav-accent': '#d65b20' },
  },
  gaming: {
    dark: { '--nav-ink': '#ffe0f0', '--nav-muted': '#efb1cd', '--nav-accent': '#ff4da4' },
    light: { '--nav-ink': '#42102a', '--nav-muted': '#6b2849', '--nav-accent': '#a81760' },
  },
  kpop: {
    dark: { '--nav-ink': '#f1f7fb', '--nav-muted': '#a7b8c5', '--nav-accent': '#70d9ef' },
    light: { '--nav-ink': '#1c2a37', '--nav-muted': '#52616d', '--nav-accent': '#17698e' },
  },
  manga: {
    dark: { '--nav-ink': '#fbf5f0', '--nav-muted': '#e9d7e5', '--nav-accent': '#e0b3da' },
    light: { '--nav-ink': '#33283d', '--nav-muted': '#60496c', '--nav-accent': '#805b99' },
  },
  tvshows: {
    dark: { '--nav-ink': '#f4eeee', '--nav-muted': '#aaa3a4', '--nav-accent': '#d9343b' },
    light: { '--nav-ink': '#252326', '--nav-muted': '#686266', '--nav-accent': '#a9262e' },
  },
  movies: {
    dark: { '--nav-ink': '#e9f5ef', '--nav-muted': '#9bb9ad', '--nav-accent': '#70c6ae' },
    light: { '--nav-ink': '#1d3935', '--nav-muted': '#58706a', '--nav-accent': '#2f8979' },
  },
  editorial: {
    dark: { '--nav-ink': '#f0ece4', '--nav-muted': '#a89f96', '--nav-accent': '#d89416' },
    light: { '--nav-ink': '#171820', '--nav-muted': '#5e6068', '--nav-accent': '#a06e0c' },
  },
  trailers: {
    dark: { '--nav-ink': '#f6f2ff', '--nav-muted': '#a99cbe', '--nav-accent': '#ff2d95' },
    light: { '--nav-ink': '#1a1024', '--nav-muted': '#6a5a78', '--nav-accent': '#c9106f' },
  },
  events: {
    dark: { '--nav-ink': '#f6f2ff', '--nav-muted': '#a99cbe', '--nav-accent': '#ffc247' },
    light: { '--nav-ink': '#1c1608', '--nav-muted': '#6d6349', '--nav-accent': '#a9760a' },
  },
  releases: {
    dark: { '--nav-ink': '#f6f2ff', '--nav-muted': '#a99cbe', '--nav-accent': '#31d0aa' },
    light: { '--nav-ink': '#121b1a', '--nav-muted': '#5d6b68', '--nav-accent': '#14876c' },
  },
  shop: {
    dark: { '--nav-ink': '#f7f4fb', '--nav-muted': '#a49bb0', '--nav-accent': '#ff2d95' },
    light: { '--nav-ink': '#140a1c', '--nav-muted': '#5f5470', '--nav-accent': '#c9106f' },
  },
  about: {
    dark: { '--nav-ink': '#f8f2e4', '--nav-muted': '#b3a892', '--nav-accent': '#ffc247' },
    light: { '--nav-ink': '#1d1508', '--nav-muted': '#6b6150', '--nav-accent': '#a9760a' },
  },
  contact: {
    dark: { '--nav-ink': '#eef8fb', '--nav-muted': '#9db2ba', '--nav-accent': '#35e2f2' },
    light: { '--nav-ink': '#0c1a1e', '--nav-muted': '#4f646b', '--nav-accent': '#0d7f95' },
  },
  auth: {
    dark: { '--nav-ink': '#f9f2f8', '--nav-muted': '#b3a3b4', '--nav-accent': '#ff2d95' },
    light: { '--nav-ink': '#190a14', '--nav-muted': '#63505d', '--nav-accent': '#c9106f' },
  },
};

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>;
const BookmarkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17l-5.5-3.2-5.5 3.2z" /></svg>;
const ThemeIcon = ({ isLight }) => <svg viewBox="0 0 24 24" aria-hidden="true">{isLight ? <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.2 8.2 0 1 0 12 12z" /> : <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}</svg>;

// A deliberately small search field: it widens while you type and drops a panel
// of matching articles, trailers, events and releases built from the site's own
// words. Escape closes it, Enter takes the first hit.
function SiteSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef(null);
  const fieldRef = useRef(null);

  useEffect(() => { loadSearchIndex().then(() => setReady(true)).catch(() => setReady(true)); }, []);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onClickAway = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickAway);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickAway);
    };
  }, []);

  const hits = useMemo(() => (ready && query.trim() ? searchSite(query) : []), [query, ready]);
  const words = useMemo(() => (ready && query.trim() ? suggestTerms(query) : []), [query, ready]);
  const showPanel = open && query.trim().length > 0;

  const go = (href) => {
    setOpen(false);
    setQuery('');
    window.location.hash = href.replace(/^#/, '');
  };

  return (
    <div className={`universal-search${showPanel ? ' is-open' : ''}`} ref={boxRef}>
      <label className="universal-search-box">
        <SearchIcon />
        <input
          ref={fieldRef}
          type="search"
          value={query}
          placeholder="Search"
          aria-label="Search articles, trailers, events and releases"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setCursor(0); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && hits.length) { event.preventDefault(); go(hits[cursor].href); }
            if (event.key === 'ArrowDown' && hits.length) { event.preventDefault(); setCursor((value) => (value + 1) % hits.length); }
            if (event.key === 'ArrowUp' && hits.length) { event.preventDefault(); setCursor((value) => (value - 1 + hits.length) % hits.length); }
          }}
        />
        {query && (
          <button type="button" className="universal-search-clear" onClick={() => { setQuery(''); fieldRef.current?.focus(); }} aria-label="Clear search">&#10005;</button>
        )}
      </label>

      {showPanel && (
        <div className="universal-search-panel">
          {hits.length === 0 && (
            <p className="universal-search-none">
              {ready ? 'Nothing on the site matches that yet.' : 'Warming up the index...'}
            </p>
          )}

          {hits.length > 0 && (
            <ul className="universal-search-hits">
              {hits.map((hit, index) => (
                <li key={hit.id}>
                  <a
                    href={hit.href}
                    className={index === cursor ? 'is-cursor' : ''}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => { setOpen(false); setQuery(''); }}
                  >
                    <b>{hit.title}</b>
                    <span>{hit.kind}{hit.meta ? ` · ${hit.meta}` : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {words.length > 0 && (
            <p className="universal-search-words">
              <span>On the site</span>
              {words.map((word) => (
                <button type="button" key={word} onClick={() => setQuery(word)}>{word}</button>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SavedPopup({ items, onClose }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const totalNotes = items.filter((item) => item.note).length;

  return (
    <div className="universal-saved-popup" role="presentation">
      <div className="universal-saved-veil" onClick={onClose} data-testid="saved-veil" />

      <div className="universal-saved" role="dialog" aria-modal="true" aria-label="Saved bookmarks">
        <span className="universal-saved-stamp" aria-hidden="true">SAVED</span>

        <div className="universal-saved-head">
          <div className="universal-saved-titles">
            <strong>My bookmarks</strong>
            <span>
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {totalNotes > 0 && ` · ${totalNotes} with notes`}
            </span>
          </div>
          <button type="button" className="universal-saved-close" onClick={onClose} aria-label="Close saved bookmarks">&#10005;</button>
        </div>

        {items.length === 0 && (
          <p className="universal-saved-empty">
            Nothing saved yet. Tap <b>Save</b> on any article, trailer, event or release and it lands right here.
          </p>
        )}

        <ul className="universal-saved-list">
          {items.map((item) => (
            <li key={item.id} className={`universal-saved-item is-${item.type}`}>
              <a className="universal-saved-link" href={item.href || BOOKMARK_HREF[item.type] || '#home'}>
                <span className="universal-saved-type">{BOOKMARK_LABEL[item.type] || item.type}</span>
                <b>{item.title}</b>
                {item.meta && <small>{item.meta}</small>}
                {item.note && <em>&#9998; {item.note}</em>}
              </a>
              <div className="universal-saved-tools">
                <button type="button" onClick={() => { setEditing(editing === item.id ? null : item.id); setDraft(item.note || ''); }} aria-label={`Add a note to ${item.title}`}>
                  {item.note ? 'Edit note' : '+ note'}
                </button>
                <button type="button" onClick={() => removeBookmark(item.id)} aria-label={`Remove ${item.title} from bookmarks`}>&#10005;</button>
              </div>
              {editing === item.id && (
                <div className="universal-saved-note">
                  <input
                    type="text"
                    value={draft}
                    autoFocus
                    placeholder="Add a private note (optional)"
                    aria-label={`Note for ${item.title}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { setBookmarkNote(item.id, draft.trim()); setEditing(null); } }}
                  />
                  <button type="button" onClick={() => { setBookmarkNote(item.id, draft.trim()); setEditing(null); }}>Save note</button>
                  <button type="button" onClick={() => { setBookmarkNote(item.id, ''); setEditing(null); }}>Clear</button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {items.length > 0 && (
          <button type="button" className="universal-saved-clear" onClick={clearBookmarks}>Clear all bookmarks</button>
        )}
      </div>
    </div>
  );
}

function SiteNav({ theme, setTheme, active = 'home', variant = 'home' }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const saved = useBookmarks();
  const palette = palettes[variant]?.[theme] || palettes.home.dark;
  const linkId = (label) => `#${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <nav className={`universal-nav universal-nav-${variant}${savedOpen ? ' is-overlay-open' : ''}`} style={palette} aria-label="Main navigation">
      <a className="universal-brand" href="#home" aria-label="Fandomverse home"><img src="/assets/images/logo.png" alt="" /><span>FANDOMVERSE</span></a>
      <div className="universal-nav-links">
        <a className={`universal-nav-link ${active === 'home' ? 'is-active' : ''}`} href="#home">Home</a>
        <div className="universal-nav-menu">
          <button type="button" className="universal-nav-link" onClick={() => setOpenMenu(openMenu === 'fandoms' ? null : 'fandoms')} aria-expanded={openMenu === 'fandoms'}>Fandoms <span>⌄</span></button>
          {openMenu === 'fandoms' && <div className="universal-dropdown">{fandomLinks.map((item) => <a href={linkId(item)} key={item}>{item}</a>)}</div>}
        </div>
        <div className="universal-nav-menu">
          <button type="button" className="universal-nav-link" onClick={() => setOpenMenu(openMenu === 'discover' ? null : 'discover')} aria-expanded={openMenu === 'discover'}>Discover <span>⌄</span></button>
          {openMenu === 'discover' && <div className="universal-dropdown universal-discover-dropdown">{discoverLinks.map((item) => <a href={linkId(item)} key={item}>{item}</a>)}</div>}
        </div>
        <a className={`universal-nav-link ${active === 'shop' ? 'is-active' : ''}`} href="#shop">Shop</a>
        <a className={`universal-nav-link ${active === 'about' ? 'is-active' : ''}`} href="#about">About</a>
        <a className={`universal-nav-link ${active === 'contact' ? 'is-active' : ''}`} href="#contact">Contact</a>
      </div>
      <div className="universal-nav-actions">
        <SiteSearch />
        <button
          type="button"
          className={`universal-icon-button universal-saved-button${savedOpen ? ' is-open' : ''}`}
          onClick={() => setSavedOpen((value) => !value)}
          aria-expanded={savedOpen}
          aria-label={`Saved bookmarks${saved.length ? `, ${saved.length} item${saved.length === 1 ? '' : 's'}` : ''}`}
        >
          <BookmarkIcon />
          {saved.length > 0 && <b className="universal-saved-count">{saved.length}</b>}
        </button>
        <button type="button" className="universal-icon-button universal-theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><ThemeIcon isLight={theme === 'light'} /><span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
        <a className={`universal-signin${active === 'login' ? ' is-active' : ''}`} href="#sign-in">Sign in <b>↗</b></a>
      </div>
      {savedOpen && <SavedPopup items={saved} onClose={() => setSavedOpen(false)} />}
    </nav>
  );
}

export default SiteNav;
