import './SiteFooter.css';

// The four circles in the Connect column. They used to be `href="#instagram"`
// and friends, which are just anchors to this same page: clicking one moved the
// visitor a few pixels and left them exactly where they were. Each one now
// points at the platform it names, so the label is true.
//
// The handle is the only thing that has to change to point these at real
// accounts — swap the url below for the profile link and nothing else moves.
const socialLinks = [
  { key: 'instagram', label: 'ig', name: 'Instagram', url: 'https://www.instagram.com/' },
  { key: 'x', label: 'x', name: 'X', url: 'https://x.com/' },
  { key: 'discord', label: 'dc', name: 'Discord', url: 'https://discord.com/' },
  { key: 'youtube', label: 'yt', name: 'YouTube', url: 'https://www.youtube.com/' },
];

// The fandom pages each name their light class after themselves
// (`anime-theme-light`, `tvshows-theme-light`, …), so a footer dropped at the
// end of one of them cannot rely on finding a `.theme-light` ancestor. Passing
// `theme` puts the flag on the footer's own root, and `.site-footer.theme-*`
// in the stylesheet themes it the same way. `accent` overrides `--accent` so
// the footer borrows the fandom's own accent instead of the site-wide gold.
//
// `tones` goes further and repaints the whole footer in a fandom's palette, so
// a page that asks for it closes in its own colour rather than the site-wide
// near-black stage. It takes the eleven tokens `paletteFor` returns and puts
// them on the footer's own `--foot-*` names, which the stylesheet already owns:
//
//   --foot-bg         dark `sunk`, light `card`
//   --foot-ink/--foot-muted/--foot-line   the fandom's three text weights
//   --foot-accent     the fandom's own accent, replacing the gold
//   --foot-on-accent  the ink that sits on top of a filled accent
//
// The two `bg` steps are not arbitrary. The dark stage can carry the fandom's
// muted weight on its `sunk` surface, but the light stage cannot: manga's light
// accent only reaches 4.5:1 on the near-white `card`, not on the mid `sunk`.
// So each theme takes the lightest or darkest of the fandom's own surfaces that
// still reads, which keeps every token in the footer above 4.5:1 instead of
// shipping a beige-on-beige small print.
function SiteFooter({ theme, accent, tones }) {
  const light = theme === 'light';

  // "Back to the beginning" climbs back to the top of the page you are already
  // on, instead of dumping the visitor at the home page and losing their place.
  const scrollToTop = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  const style = tones
    ? {
      '--foot-bg': light ? tones.card : tones.sunk,
      '--foot-ink': tones.ink,
      '--foot-muted': tones.muted,
      '--foot-line': tones.line,
      '--foot-accent': tones.accent,
      // The accent is the pale weight on the dark stage and the deep weight on
      // the light one, so the ink on top of it flips with the theme.
      '--foot-on-accent': light ? '#f7f1e6' : '#0b0d11',
    }
    // A page that only names an accent still gets that accent; `--accent` is
    // what the stylesheet reads, and the rest of the footer keeps its own
    // readable defaults.
    : (accent ? { '--accent': accent } : undefined);

  return (
    <footer
      className={`site-footer${theme ? ` theme-${light ? 'light' : 'dark'}` : ''}`}
      style={style}
    >
      <div className="footer-main">
        <div className="footer-brand-block">
          <a className="footer-brand" href="#home" aria-label="Fandomverse home">
            <span className="footer-logo"><img src="/assets/images/logo.png" alt="" /></span>
            <span className="footer-brand-text"><strong>FANDOMVERSE</strong><small>Seven worlds. One place to<br /><em>keep your fandom alive.</em></small></span>
          </a>
        </div>
        <div className="footer-column"><strong>Explore</strong><a href="#universe">Universes</a><a href="#featured-articles">Discover</a><a href="#events">Events</a><a href="#shop">Shop</a></div>
        <div className="footer-column"><strong>Categories</strong><a href="#anime">Anime</a><a href="#gaming">Gaming</a><a href="#movies">Movies</a><a href="#manga">Manga</a></div>
        <div className="footer-column footer-connect"><strong>Connect</strong><a href="#sign-in">Sign in</a><a href="#about">About us</a><a href="#contact">Contact</a><div className="social-links">{socialLinks.map((social) => <a key={social.key} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.name}>{social.label}</a>)}</div></div>
      </div>
      <div className="footer-bottom">
        <span>c 2024 FandomVerse / Made for the obsessed</span>
        <button type="button" className="footer-top" onClick={scrollToTop}>
          Back to the beginning<span className="footer-top-arrow" aria-hidden="true">&uarr;</span>
        </button>
      </div>
    </footer>
  );
}

export default SiteFooter;
