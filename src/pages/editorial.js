import { useEffect, useMemo, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import ArticleModal from '../components/ArticleModal';
import BookmarkButton from '../components/BookmarkButton';
import './editorial.css';

const ARTICLES_URL = '/assets/json%20data/featuredArticles.json';

const CATEGORIES = [
  { id: 'all', label: 'All Stories', accent: '#d89416' },
  { id: 'anime', label: 'Anime', accent: '#d89416' },
  { id: 'gaming', label: 'Gaming', accent: '#ee278f' },
  { id: 'movies', label: 'Movies', accent: '#20b7aa' },
  { id: 'tv', label: 'TV', accent: '#e23b2d' },
  { id: 'kpop', label: 'K-Pop', accent: '#50c7eb' },
  { id: 'comics', label: 'Comics', accent: '#ef7027' },
  { id: 'manga', label: 'Manga', accent: '#a889c6' },
];

const byNewest = (a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`);

// Poster jpgs are opaque rectangles, not cut-out character art, so they get framed instead.
const isPhoto = (src) => /\.(jpe?g|webp)$/i.test(src);

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

let inflight = null;

const loadArticles = () => {
  if (!inflight) {
    inflight = fetch(ARTICLES_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      })
      .catch((error) => {
        inflight = null;
        throw error;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
};

const useArticles = () => {
  const [state, setState] = useState({ status: 'loading', articles: [], issue: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));
    loadArticles()
      .then((data) => {
        if (active) setState({ status: 'ready', articles: data.articles, issue: data.issue });
      })
      .catch(() => {
        if (active) setState({ status: 'error', articles: [], issue: null });
      });
    return () => { active = false; };
  }, [nonce]);

  return { ...state, retry: () => setNonce((value) => value + 1) };
};

const relatedFor = (articles, article, limit = 3) => {
  if (!article) return [];
  const pool = articles.filter((item) => item.slug !== article.slug);
  const sameCategory = pool.filter((item) => item.category === article.category);
  const sharedTag = pool.filter((item) => item.category !== article.category && item.tags.some((tag) => article.tags.includes(tag)));
  const rest = pool.filter((item) => item.category !== article.category && !item.tags.some((tag) => article.tags.includes(tag)));
  return [...sameCategory.sort(byNewest), ...sharedTag.sort(byNewest), ...rest.sort(byNewest)].slice(0, limit);
};

function Editorial({ category = 'all', slug = null }) {
  const { status, articles, issue, retry } = useArticles();
  const [theme, setTheme] = useState(() => window.localStorage.getItem('editorial-theme') || 'light');
  const [active, setActive] = useState(category);
  const [openSlug, setOpenSlug] = useState(null);

  useEffect(() => {
    window.localStorage.setItem('editorial-theme', theme);
  }, [theme]);

  useEffect(() => {
    setActive(category);
  }, [category]);

  // A fandom page can link to one story as well as to the filtered page. The
  // slug is held until the articles land, so the reader never opens on nothing.
  useEffect(() => {
    if (slug && articles.some((article) => article.slug === slug)) setOpenSlug(slug);
  }, [slug, articles]);

  const counts = useMemo(() => {
    const map = { all: articles.length };
    articles.forEach((article) => { map[article.category] = (map[article.category] || 0) + 1; });
    return map;
  }, [articles]);

  const visible = useMemo(() => {
    if (active === 'all') return [...articles].sort(byNewest);
    return articles.filter((article) => article.category === active).sort(byNewest);
  }, [articles, active]);

  const openArticle = useMemo(
    () => (openSlug ? articles.find((article) => article.slug === openSlug) || null : null),
    [articles, openSlug],
  );

  const accent = (CATEGORIES.find((item) => item.id === active) || CATEGORIES[0]).accent;
  const isLight = theme === 'light';

  // The reader is portalled to document.body, so it needs the theme values on its own root.
  const readerVars = {
    '--reader-accent': accent,
    '--reader-paper': isLight ? '#14161d' : '#f3efe7',
    '--reader-muted': isLight ? '#4a4e57' : '#a9a59d',
    '--reader-bg': isLight ? '#f2f5f8' : '#12161c',
    '--reader-ink': isLight ? '#2c3038' : '#05070a',
  };

  return (
    <main className={`editorial-page ${isLight ? 'theme-light' : 'theme-dark'}`} style={{ '--accent': accent }}>
      <div className="editorial-bg" aria-hidden="true">
        <span className="crystal crystal-one" />
        <span className="crystal crystal-two" />
        <span className="crystal crystal-three" />
        <span className="crystal crystal-four" />
        <span className="crystal-shape shape-one" />
        <span className="crystal-shape shape-two" />
        <span className="crystal-shape shape-three" />
        <span className="crystal-shape shape-four" />
        <span className="crystal-facets" />
        <span className="crystal-rings" />
        <span className="crystal-dots" />
        <span className="crystal-vignette" />
      </div>

      <SiteNav theme={theme} setTheme={setTheme} active="discover" variant="home" />

      <header className="editorial-head">
        <p className="head-kicker"><span /> Discover / Featured Articles</p>
        <h1>THE FANDOM <em>EDIT</em></h1>
        <p className="head-tagline">{issue ? issue.tagline : 'Stories, culture & moments from every universe.'}</p>
      </header>

      <div className="head-marquee" aria-hidden="true">
        <div className="head-marquee-track">
          {[0, 1].map((copy) => (
            <span className="head-marquee-group" key={copy}>
              {CATEGORIES.filter((item) => item.id !== 'all').map((item) => (
                <b key={`${copy}-${item.id}`} style={{ '--marquee-accent': item.accent }}>{item.label}</b>
              ))}
              <i>Issue {issue ? issue.issueNumber : '07'}</i>
              <b className="is-star">&#9733;</b>
            </span>
          ))}
        </div>
      </div>

      <nav className="filter-strip" aria-label="Filter stories by fandom">
        <div className="filter-strip-options">
          {CATEGORIES.map((item) => (
            <button
              type="button"
              key={item.id}
              className={active === item.id ? 'is-active' : ''}
              style={{ '--chip-accent': item.accent }}
              aria-pressed={active === item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
              <sup>{counts[item.id] || 0}</sup>
            </button>
          ))}
        </div>
        <span className="filter-strip-count">{visible.length} / {articles.length} stories</span>
      </nav>

      {status === 'loading' && <p className="editorial-note">Tuning the signal...</p>}

      {status === 'error' && (
        <div className="editorial-note editorial-note-error" role="alert">
          <p>The stories did not load.</p>
          <button type="button" onClick={retry}>Try again</button>
        </div>
      )}

      {status === 'ready' && (
        <section className="card-grid" aria-label={`${active === 'all' ? 'All' : active} stories`}>
          {visible.map((article, index) => (
            <article
              className={`story-card is-${article.category}${isPhoto(article.image) ? ' has-photo' : ''}`}
              key={article.slug}
              style={{ '--card-accent': (CATEGORIES.find((item) => item.id === article.category) || CATEGORIES[0]).accent }}
            >
              <span className="card-glow" aria-hidden="true" />
              <span className="card-pattern" aria-hidden="true" />
              <span className="card-watermark" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className="card-shine" aria-hidden="true" />
              <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="card-label">{article.category}</span>
              <span className="card-shape" aria-hidden="true" />
              <span className="card-media"><img src={article.image} alt="" /></span>
              <span className="card-foot">
                <b>{article.title}</b>
                <small>READ <i aria-hidden="true">&#8599;</i></small>
              </span>
              <span className="card-meta">
                <span>{formatDate(article.date)}</span>
                <span>{article.readTime} min</span>
              </span>
              <button
                type="button"
                className="card-hit"
                onClick={() => setOpenSlug(article.slug)}
                aria-label={`Read ${article.title}`}
              />
              <BookmarkButton
                className="card-save"
                entry={{
                  id: `article:${article.slug}`,
                  type: 'article',
                  title: article.title,
                  meta: `${article.category} · ${formatDate(article.date)}`,
                  href: `#featured-articles/${article.category}`,
                }}
              />
            </article>
          ))}
        </section>
      )}

      <SiteFooter />

      <ArticleModal
        article={openArticle}
        related={relatedFor(articles, openArticle)}
        onClose={() => setOpenSlug(null)}
        onSelect={(next) => setOpenSlug(next.slug)}
        style={readerVars}
      />
    </main>
  );
}

export default Editorial;
