import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './about.css';

const THEME_KEY = 'about-theme';

// The seven rooms of the site, wired to the same fandoms the nav carries.
const FANDOMS = [
  { id: 'anime', name: 'Anime', line: 'Key art, figures and the print that started it all.', art: '/assets/images/anime1.png' },
  { id: 'gaming', name: 'Gaming', line: 'Erdtree maps, Nightreign steel and Hallownest pins.', art: '/assets/images/game1.png' },
  { id: 'movies', name: 'Movies', line: 'One-sheets, model kits and the poster you framed.', art: '/assets/images/poster-glass.jpg' },
  { id: 'tv', name: 'TV Shows', line: 'Box sets, caps and the map you keep on the wall.', art: '/assets/images/poster-peaky-blinders.jpg' },
  { id: 'kpop', name: 'K-Pop', line: 'Photocards, lightsticks and the album you preordered.', art: '/assets/images/kpop1.jpg' },
  { id: 'comics', name: 'Comics', line: 'Trades, variant covers and art books in print.', art: '/assets/images/comics1.png' },
  { id: 'manga', name: 'Manga', line: 'Slipcases, panels and the volume you lent out.', art: '/assets/images/manga1.png' },
];

const TEAM = [
  { name: 'Areeba', role: 'Founder & curator', line: 'Decides what gets printed and refuses to reprint it.', art: '/assets/images/comics.png' },
  { name: 'Zoya', role: 'Editorial', line: 'Writes the articles and keeps the canon honest.', art: '/assets/images/k-pop.png' },
  { name: 'Hassan', role: 'Design', line: 'Builds the vault, the map and everything you can save.', art: '/assets/images/bg comics.png' },
  { name: 'Maham', role: 'Community', line: 'Runs the events calendar and answers every email.', art: '/assets/images/manga.png' },
];

const REASONS = [
  { head: 'One shelf, seven worlds', line: 'Every fandom keeps its own room, so nothing drowns in a single feed.' },
  { head: 'Picked, not scraped', line: 'Each release, trailer and event is added by hand and kept current.' },
  { head: 'Made in small runs', line: 'Short print runs, honest prices and no restock when a run sells out.' },
];

function About() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY)) || 'dark');
  const [openFandom, setOpenFandom] = useState('anime');

  useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage is optional */ }
  }, [theme]);

  const active = FANDOMS.find((item) => item.id === openFandom) || FANDOMS[0];

  return (
    <div className={`ab-page theme-${theme}`}>
      <div className="ab-glow ab-glow-one" aria-hidden="true" />
      <div className="ab-glow ab-glow-two" aria-hidden="true" />

      <SiteNav theme={theme} setTheme={setTheme} active="about" variant="about" />

      <header className="ab-hero">
        {/* Decorative geometry fills what used to read as dead space above and
            beside the wordmark, in both themes. It all sits behind the copy. */}
        <div className="ab-hero-shapes" aria-hidden="true">
          <span className="ab-shape is-halo" />
          <span className="ab-shape is-ring" />
          <span className="ab-shape is-ring is-ring-outer" />
          <span className="ab-shape is-disc" />
          <span className="ab-shape is-blob" />
          <span className="ab-shape is-shard" />
          <span className="ab-shape is-bar" />
          <span className="ab-shape is-bar is-bar-two" />
          <span className="ab-shape is-dash" />
          <span className="ab-shape is-dot" />
          <span className="ab-shape is-grid" />
        </div>

        <div className="ab-hero-inner">
          <p className="ab-kicker">About the site</p>
          <h1>THE STORY BEHIND <em>FANDOMVERSE</em></h1>
          <p className="ab-lede">
            Fandomverse is a fan-run shelf for the seven worlds we keep coming back to. Every corner of the
            site was built around one idea: the stuff you love deserves a proper place to live.
          </p>
        </div>

        <div className="ab-hero-stats">
          <div><b>7</b><i>Fandoms</i></div>
          <div><b>23</b><i>Releases tracked</i></div>
          <div><b>84</b><i>Shelf items</i></div>
        </div>
      </header>

      <section className="ab-why" aria-label="Why FandomVerse">
        <p className="ab-eyebrow"><b>01</b> Why we built it</p>
        <h2>WHY FANDOMVERSE</h2>
        <div className="ab-why-grid">
          {REASONS.map((reason, index) => (
            <article key={reason.head} className="ab-why-card">
              <span className="ab-why-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{reason.head}</h3>
              <p>{reason.line}</p>
            </article>
          ))}
        </div>
      </section>

      {/* The map is one shared panel: pick a fandom, the hub redraws around it. */}
      <section className="ab-map" aria-label="Fandom universe map">
        <div className="ab-map-copy">
          <p className="ab-eyebrow"><b>02</b> The map</p>
          <h2>FANDOM UNIVERSE MAP</h2>
          <p>Seven fandoms orbit one hub. Choose a world to see what lives there.</p>

          <div className="ab-map-nodes" role="tablist" aria-label="Choose a fandom">
            {FANDOMS.map((item) => (
              <button
                type="button"
                key={item.id}
                role="tab"
                id={`ab-tab-${item.id}`}
                aria-selected={openFandom === item.id}
                aria-controls="ab-map-detail"
                className={`ab-node${openFandom === item.id ? ' is-active' : ''}`}
                onClick={() => setOpenFandom(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="ab-hub" role="img" aria-label="Fandomverse hub with seven fandoms around it">
          <span className="ab-hub-ring" aria-hidden="true" />
          <span className="ab-hub-ring ab-hub-ring-two" aria-hidden="true" />
          <b className="ab-hub-core">FANDOMVERSE</b>
          {FANDOMS.map((item, index) => (
            <i key={item.id} className={`ab-satellite is-at-${index + 1}${openFandom === item.id ? ' is-active' : ''}`} aria-hidden="true">
              {item.name}
            </i>
          ))}
        </div>

        <div
          className="ab-map-detail"
          id="ab-map-detail"
          role="tabpanel"
          aria-labelledby={`ab-tab-${active.id}`}
          key={active.id}
        >
          <img src={active.art} alt="" />
          <h3>{active.name}</h3>
          <p>{active.line}</p>
          <a className="ab-map-link" href={`#${active.id === 'tv' ? 'tv-shows' : active.id === 'kpop' ? 'k-pop' : active.id}`}>
            Open {active.name}
          </a>
        </div>
      </section>

      <section className="ab-team" aria-label="The team">
        <p className="ab-eyebrow"><b>03</b> The people</p>
        <h2>THE PEOPLE BEHIND IT</h2>
        <div className="ab-team-grid">
          {TEAM.map((member) => (
            <article key={member.name} className="ab-member">
              <span className="ab-member-art"><img src={member.art} alt="" /></span>
              <b>{member.name}</b>
              <i>{member.role}</i>
              <p>{member.line}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ab-mission" aria-label="Our mission">
        <p className="ab-eyebrow"><b>04</b> The promise</p>
        <h2>OUR MISSION</h2>
        <p>
          To keep every fandom on the site current, correctly spelled and honestly presented — and to make
          finding something you love take one click, not twenty.
        </p>
        <div className="ab-mission-actions">
          <a className="ab-cta" href="#shop">Browse the vault</a>
          <a className="ab-cta ab-cta-ghost" href="#contact">Talk to us</a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default About;
