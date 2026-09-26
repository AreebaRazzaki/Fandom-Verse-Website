import './SiteFooter.css';

function SiteFooter() {
  // "Back to the beginning" climbs back to the top of the page you are already
  // on, instead of dumping the visitor at the home page and losing their place.
  const scrollToTop = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block">
          <a className="footer-brand" href="#home" aria-label="Fandomverse home">
            <span className="footer-logo"><img src="/assets/images/logo.png" alt="" /></span>
            <span className="footer-brand-text"><strong>FANDOMVERSE</strong><small>Seven worlds. One place to<br /><em>keep your fandom alive.</em></small></span>
          </a>
        </div>
        <div className="footer-column"><strong>Explore</strong><a href="#universe">Universes</a><a href="#featured-articles">Discover</a><a href="#events">Events</a><a href="#shop">Shop</a></div>
        <div className="footer-column"><strong>Categories</strong><a href="#anime">Anime</a><a href="#gaming">Gaming</a><a href="#movies">Movies</a><a href="#manga">Manga</a></div>
        <div className="footer-column footer-connect"><strong>Connect</strong><a href="#sign-in">Sign in</a><a href="#about">About us</a><a href="#contact">Contact</a><div className="social-links"><a href="#instagram" aria-label="Instagram">ig</a><a href="#x" aria-label="X">x</a><a href="#discord" aria-label="Discord">dc</a><a href="#youtube" aria-label="YouTube">yt</a></div></div>
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
