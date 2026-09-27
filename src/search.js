// A tiny site-wide search. Every page already ships its content as json, so the
// index is built from the words the site actually uses: titles, categories,
// tags, studios, blurbs and descriptions. Nothing is hardcoded here.

import { findFandomByDataId } from './components/fandomConfig';

const SOURCES = [
  { key: 'articles', url: '/assets/json%20data/featuredArticles.json', href: '#featured-articles', kind: 'Article' },
  { key: 'trailers', url: '/assets/json%20data/trailers.json', href: '#trailers', kind: 'Trailer' },
  { key: 'events', url: '/assets/json%20data/events.json', href: '#events', kind: 'Event' },
  { key: 'releases', url: '/assets/json%20data/upcomingReleases.json', href: '#upcoming-releases', kind: 'Release' },
  { key: 'characters', url: '/assets/json%20data/characterProfiles.json', href: '#anime-character-profiles', kind: 'Character' },
  // The galleries are nested one level down, so this source flattens them itself
  // rather than relying on the shared `json[key]` lookup.
  {
    key: 'gallery',
    url: '/assets/json%20data/gallery.json',
    kind: 'Gallery',
    list: (json) => (json.fandoms || []).flatMap((group) => (group.media || []).map((item) => ({ ...item, group: group.label, pageId: (findFandomByDataId(item.fandom || group.id) || {}).id }))),
  },
];

const WORDS = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((word) => word.length > 1);

const fromArticles = (source, list) => list.map((item) => ({
  id: `article:${item.slug || item.id}`,
  kind: source.kind,
  href: `#featured-articles/${item.category || 'all'}`,
  title: item.title,
  meta: [item.kicker, item.author, `${item.readTime || ''} read`].filter(Boolean).join(' · '),
  image: item.image,
  words: [...WORDS(item.title), ...WORDS(item.kicker), ...WORDS(item.excerpt), ...(item.tags || []).flatMap(WORDS), ...WORDS(item.category)],
}));

const fromTrailers = (source, list) => list.map((item) => ({
  id: `trailer:${item.id}`,
  kind: source.kind,
  href: source.href,
  title: item.title,
  meta: [item.category, item.status, item.runtime, item.studio].filter(Boolean).join(' · '),
  image: '',
  words: [...WORDS(item.title), ...WORDS(item.blurb), ...WORDS(item.category), ...WORDS(item.status), ...WORDS(item.studio), ...WORDS(item.badge)],
}));

const fromEvents = (source, list) => list.map((item) => ({
  id: `event:${item.id}`,
  kind: source.kind,
  href: source.href,
  title: item.title,
  meta: [item.venue, item.location, item.date].filter(Boolean).join(' · '),
  image: item.image,
  words: [...WORDS(item.title), ...WORDS(item.description), ...WORDS(item.category), ...WORDS(item.tag), ...WORDS(item.venue), ...WORDS(item.location), ...(item.highlights || []).flatMap(WORDS)],
}));

const fromReleases = (source, list) => list.map((item) => ({
  id: `release:${item.id}`,
  kind: source.kind,
  href: source.href,
  title: item.title,
  meta: [item.category, item.type, item.releaseDate].filter(Boolean).join(' · '),
  image: item.image,
  words: [
    ...WORDS(item.title),
    ...WORDS(item.description),
    ...WORDS(item.category),
    ...WORDS(item.type),
    ...WORDS(item.status),
    ...WORDS(item.franchise),
    ...WORDS(item.studio),
    ...WORDS(item.platform),
  ],
}));

const fromCharacters = (source, list) => list.map((item) => ({
  id: `character:${item.id}`,
  kind: source.kind,
  href: source.href,
  title: item.name,
  meta: [item.role, (item.series || {}).title, (item.series || {}).year, (item.series || {}).studio].filter(Boolean).join(' · '),
  image: item.image,
  words: [
    ...WORDS(item.name),
    ...WORDS(item.epithet),
    ...WORDS(item.role),
    ...WORDS(item.fandom),
    ...WORDS(item.chapter),
    ...WORDS((item.series || {}).title),
    ...WORDS((item.series || {}).studio),
    ...WORDS((item.series || {}).format),
    ...WORDS((item.series || {}).origin),
    ...(item.traits || []).flatMap(WORDS),
    ...(item.facts || []).flatMap((fact) => [...WORDS(fact.label), ...WORDS(fact.value)]),
  ],
}));

const fromGallery = (source, list) => list.map((item) => ({
  id: `gallery:${item.id}`,
  kind: source.kind,
  // Every fandom page mounts its gallery under `<page>-gallery`, so a plate is
  // one link from the search box even though the seven pages are separate.
  href: `#${item.pageId || 'anime'}-gallery`,
  title: item.title,
  meta: [item.group, item.kind, item.credit].filter(Boolean).join(' · '),
  image: item.type === 'image' ? item.src : item.poster || '',
  words: [
    ...WORDS(item.title),
    ...WORDS(item.caption),
    ...WORDS(item.alt),
    ...WORDS(item.kind),
    ...WORDS(item.type),
    ...WORDS(item.fandom),
    ...WORDS(item.group),
  ],
}));

const BUILDERS = { articles: fromArticles, trailers: fromTrailers, events: fromEvents, releases: fromReleases, characters: fromCharacters, gallery: fromGallery };

let pending = null;
let rows = null;

// Fetched once per session and shared by every page that mounts the search box.
export const loadSearchIndex = () => {
  if (rows) return Promise.resolve(rows);
  if (pending) return pending;

    pending = Promise.all(SOURCES.map((source) => fetch(source.url)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!json) return [];
        const list = source.list ? source.list(json) : json[source.key];
        return Array.isArray(list) ? (BUILDERS[source.key] || (() => []))(source, list) : [];
      })
      .catch(() => [])))
    .then((chunks) => {
      rows = chunks.flat();
      return rows;
    });

  return pending;
};

export const getSearchIndex = () => rows || [];

export const resetSearchIndex = () => { rows = null; pending = null; };

// Ranks exact title hits first, then word starts, then word matches, and finally
// the kind label, so typing "anime" still finds things even without the word.
export const searchSite = (query, limit = 7) => {
  const terms = WORDS(query);
  if (!terms.length) return [];

  return getSearchIndex()
    .map((row) => {
      const haystack = row.words.join(' ');
      const title = row.title.toLowerCase();
      let score = 0;

      terms.forEach((term) => {
        if (title === term) score += 60;
        else if (title.startsWith(term)) score += 34;
        else if (title.includes(term)) score += 20;
        if (row.words.some((word) => word === term)) score += 12;
        else if (row.words.some((word) => word.startsWith(term))) score += 7;
        else if (haystack.includes(term)) score += 3;
      });

      return { row, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title))
    .slice(0, limit)
    .map((hit) => hit.row);
};

export const suggestTerms = (query, limit = 5) => {
  const term = WORDS(query)[0] || '';
  if (term.length < 2) return [];

  const seen = new Set();
  const out = [];
  getSearchIndex().forEach((row) => {
    row.words.forEach((word) => {
      if (out.length >= limit || seen.has(word)) return;
      if (!word.startsWith(term) || word === term) return;
      seen.add(word);
      out.push(word);
    });
  });
  return out;
};
