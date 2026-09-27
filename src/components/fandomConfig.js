// One place for the facts every fandom page needs to agree on. The site already
// spells the same fandom three different ways — the page components use
// `tvshows` and `kpop`, the json data uses `tv` and `kpop`, and the image
// filenames use `tv_shows` and `k-pop` — so the mapping lives here instead of
// being retyped in every component.
//
// The `palette` block is the important part. Every colour the gallery, the desk
// and the footer paint with is lifted from that fandom's own page stylesheet
// (`anime.css`, `gaming.css`, `kpop.css`, `comics.css`, `manga.css`,
// `movies.css`, `tvshows.css`) rather than invented here — so a section can
// never drift onto a colour the page itself does not use. `page`/`sunk`/`card`
// are the surface steps, `mat1`/`mat2` the mount a cut-out sits on, `ink`/
// `soft`/`muted` the three text weights, and `accent`/`accentTwo` the fandom's
// two real accent tokens.

const palette = (page, sunk, card, mat1, mat2, ink, soft, muted, line, accent, accentTwo) => ({
  page, sunk, card, mat1, mat2, ink, soft, muted, line, accent, accentTwo,
});

export const FANDOMS = {
  anime: {
    id: 'anime',
    label: 'Anime',
    dataId: 'anime',
    articleCategory: 'anime',
    eventsCategory: 'anime',
    galleryNumber: '06',
    deskNumber: '07',
    palette: {
      // anime.css: --anime-bg / --anime-paper / --anime-muted / --anime-accent.
      dark: palette('#17181a', '#0f1012', '#252628', '#303134', '#1a1b1d', '#f2f1ee', '#cdcbc6', '#8f8d86', 'rgba(242,241,238,.15)', '#b98516', '#c5962e'),
      light: palette('#d1d2cf', '#bfc1be', '#dddedb', '#c8c9c5', '#e7e8e3', '#1b1c1e', '#3a3b3c', '#5b5c59', 'rgba(27,28,30,.2)', '#a87308', '#76510c'),
    },
  },
  comics: {
    id: 'comics',
    label: 'Comics',
    dataId: 'comics',
    articleCategory: 'comics',
    eventsCategory: 'comics',
    galleryNumber: '02',
    deskNumber: '03',
    palette: {
      // comics.css: --comics-bg / --comics-paper / --comics-muted / --comics-orange.
      dark: palette('#242529', '#1a1b1e', '#2f2825', '#3a2d27', '#211b19', '#f3eee8', '#d9d0c6', '#9c8c82', 'rgba(243,238,232,.16)', '#ff762b', '#d85d22'),
      light: palette('#dedbd7', '#cac5c0', '#f4efe8', '#d4ccc4', '#eae5dd', '#292321', '#4a403a', '#5e514b', 'rgba(41,35,33,.2)', '#d85d22', '#a8410f'),
    },
  },
  gaming: {
    id: 'gaming',
    label: 'Gaming',
    dataId: 'gaming',
    articleCategory: 'gaming',
    eventsCategory: 'gaming',
    galleryNumber: '02',
    deskNumber: '03',
    palette: {
      // gaming.css: --game-bg / --game-paper / --game-muted / --game-pink / --game-blue.
      dark: palette('#3b3b46', '#2b2b35', '#263441', '#2f4050', '#1a222b', '#eaf2f7', '#bfced8', '#8496a3', 'rgba(234,242,247,.16)', '#ee278f', '#80e4f1'),
      light: palette('#d1ccd5', '#c3bdc9', '#fff4fa', '#ece2ea', '#fbeef7', '#23222b', '#3f3c48', '#5d5a68', 'rgba(35,34,43,.2)', '#bb7398', '#72d9e9'),
    },
  },
  kpop: {
    id: 'kpop',
    label: 'K-Pop',
    dataId: 'kpop',
    articleCategory: 'kpop',
    eventsCategory: 'kpop',
    galleryNumber: '02',
    deskNumber: '03',
    palette: {
      // kpop.css: --kpop-bg / --kpop-paper / --kpop-muted / --kpop-blue / --kpop-deep-blue.
      dark: palette('#101923', '#0a1017', '#1d2a34', '#263845', '#131c24', '#e9f2f7', '#bfd1dc', '#7b8d99', 'rgba(233,242,247,.16)', '#176d93', '#72dced'),
      light: palette('#d4dadd', '#c3c9cc', '#f1f7fa', '#dfe9ee', '#f7fbfd', '#131e27', '#3a4a55', '#52616c', 'rgba(19,30,39,.2)', '#176d93', '#123e70'),
    },
  },
  manga: {
    id: 'manga',
    label: 'Manga',
    dataId: 'manga',
    articleCategory: 'manga',
    eventsCategory: 'manga',
    galleryNumber: '02',
    deskNumber: '03',
    palette: {
      // manga.css: --manga-bg / --manga-lavender / --manga-beige / --manga-accent.
      dark: palette('#4b3f55', '#3b3143', '#5b4d66', '#6b5c77', '#453a4e', '#fbf5f0', '#e3d8dd', '#b6a8b9', 'rgba(251,245,240,.18)', '#cdbb9f', '#e0b3da'),
      light: palette('#d9cfe0', '#c7bbd1', '#f4eef7', '#e6dcee', '#fbf6fd', '#33283d', '#5b4a66', '#6b5a75', 'rgba(51,40,61,.2)', '#805b99', '#b9a8c8'),
    },
  },
  movies: {
    id: 'movies',
    label: 'Movies',
    dataId: 'movies',
    articleCategory: 'movies',
    eventsCategory: 'movies',
    // The film codex holds slot 02 and the wall and the doors carry no number,
    // so the gallery and the desk keep 03 and 04 and the visible run has no gap.
    galleryNumber: '03',
    deskNumber: '04',
    palette: {
      // movies.css: --movie-bg / --movie-ink / --movie-muted / --movie-accent / --movie-deep-accent.
      dark: palette('#192b28', '#12201e', '#1f3b35', '#2b5249', '#162925', '#eff9f2', '#c6dcd1', '#8fa89c', 'rgba(239,249,242,.16)', '#77c9ae', '#328d79'),
      light: palette('#b8cec4', '#a5bcb1', '#eff9f2', '#d1e2d8', '#f7fcf8', '#163a34', '#2c4c44', '#3d5d53', 'rgba(22,58,52,.2)', '#247c6d', '#246f63'),
    },
  },
  tvshows: {
    id: 'tvshows',
    label: 'TV Shows',
    dataId: 'tv',
    articleCategory: 'tv',
    eventsCategory: 'tv',
    galleryNumber: '02',
    deskNumber: '03',
    palette: {
      // tvshows.css: --tv-bg / --tv-ink / --tv-muted / --tv-accent / --tv-soft-accent.
      dark: palette('#252528', '#1a1a1d', '#333336', '#3d3d41', '#1e1e21', '#f6eeee', '#ddd3d3', '#a39696', 'rgba(246,238,238,.16)', '#d9343b', '#882b32'),
      light: palette('#c7c7c8', '#b4b4b6', '#f2eeee', '#dcd7d7', '#faf7f7', '#282528', '#4a4648', '#5d585c', 'rgba(40,37,40,.2)', '#a9262e', '#731f29'),
    },
  },
};

export const FANDOM_IDS = Object.keys(FANDOMS);

export const getFandom = (id) => FANDOMS[id] || null;

export const surfaceOf = (theme) => (theme === 'light' ? 'light' : 'dark');

// The palette for a fandom in a given theme, with a neutral fallback so an
// unregistered fandom still renders something readable instead of nothing.
export const paletteFor = (id, theme) => {
  const config = FANDOMS[id];
  if (!config) {
    return surfaceOf(theme) === 'light'
      ? palette('#d1d2cf', '#bfc1be', '#dddedb', '#c8c9c5', '#e7e8e3', '#1b1c1e', '#3a3b3c', '#5b5c59', 'rgba(27,28,30,.2)', '#a87308', '#76510c')
      : palette('#17181a', '#0f1012', '#252628', '#303134', '#1a1b1d', '#f2f1ee', '#cdcbc6', '#8f8d86', 'rgba(242,241,238,.15)', '#b98516', '#c5962e');
  }
  return config.palette[surfaceOf(theme)];
};

// The same eleven colours, ready to be handed to a stylesheet as custom
// properties. The prefix differs per section so the gallery, the desk and the
// footer can all be mounted at once without fighting over `--accent`.
export const paletteVars = (id, theme, prefix) => {
  const tones = paletteFor(id, theme);
  return {
    [`--${prefix}-page`]: tones.page,
    [`--${prefix}-sunk`]: tones.sunk,
    [`--${prefix}-card`]: tones.card,
    [`--${prefix}-mat1`]: tones.mat1,
    [`--${prefix}-mat2`]: tones.mat2,
    [`--${prefix}-ink`]: tones.ink,
    [`--${prefix}-soft`]: tones.soft,
    [`--${prefix}-muted`]: tones.muted,
    [`--${prefix}-line`]: tones.line,
    [`--${prefix}-accent`]: tones.accent,
    [`--${prefix}-accent-two`]: tones.accentTwo,
  };
};

// The shared footer reads `--accent` off whatever page renders it, so the
// fandom sections publish the fandom's own accent under that name too.
export const paletteVarsWithAccent = (id, theme, prefix) => ({
  ...paletteVars(id, theme, prefix),
  '--accent': paletteFor(id, theme).accent,
});

// The json data spells TV as `tv`; the routing and the page component spell it
// `tvshows`. This walks the whole map so `#events/tv-shows` and `#events/tv`
// both land on the same fandom.
export const findFandomByDataId = (dataId) => {
  const needle = String(dataId || '').toLowerCase();
  return FANDOM_IDS
    .map((id) => FANDOMS[id])
    .find((item) => item.dataId === needle)
    || null;
};

// Labels for the gallery's filter chips, keyed by the `kind` in the json. Chips
// the current fandom has no media for are simply never rendered.
export const KIND_LABELS = {
  all: 'Everything',
  artwork: 'Artwork',
  character: 'Characters',
  scene: 'Scenes',
  poster: 'Posters',
  panel: 'Panels',
  stage: 'Stage',
  concept: 'Concept',
  trailer: 'Trailer',
  track: 'Tracks',
};

export const TYPE_LABELS = { image: 'Image', video: 'Video', audio: 'Audio' };
