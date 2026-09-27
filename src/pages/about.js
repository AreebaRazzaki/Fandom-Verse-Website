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
  { name: 'Areeba', role: 'Founder & curator', line: 'Decides what gets printed and refuses to reprint it.', art: '/assets/images/areeba.jpg' },
  { name: 'Rafay', role: 'Editorial', line: 'Writes the articles and keeps the canon honest.', art: '/assets/images/rafay.jpg' },
  { name: 'Rida', role: 'Design', line: 'Builds the vault, the map and everything you can save.', art: '/assets/images/rida.jpg' },
  { name: 'Musab', role: 'Community', line: 'Runs the events calendar and answers every email.', art: '/assets/images/musab.jpg' },
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
            beside the wordmark, in both themes. */}
        <div className="ab-hero-shapes" aria-hidden="true">
          <span className="ab-shape is-ring" />
          <span className="ab-shape is-disc" />
          <span className="ab-shape is-shard" />
          <span className="ab-shape is-bar" />
          <span className="ab-shape is-dash" />
          <span className="ab-shape is-dot" />
        </div>
         <div className="ab-hero-layout">
           <figure className="ab-story-card">
             <div className="ab-story-card-head"><span>FIELD NOTES / 001</span><b>FV</b></div>
             <div className="ab-story-art"><img src="/assets/images/manga.png" alt="Illustrated fandom character" /><i>ARCHIVE<br />OF<br />OBSESSION</i></div>
             <figcaption><b>Every story needs a shelf.</b><span>Collected across seven rooms, kept alive by the people who still care.</span></figcaption>
             <div className="ab-story-card-foot"><span>EST. 2024</span><span>OPEN THE BOOK →</span></div>
           </figure>

           <div className="ab-hero-copy">
             <p className="ab-kicker">About the site · A living archive</p>
             <h1>THE STORY BEHIND <em>FANDOMVERSE</em></h1>
             <p className="ab-lede">
               Fandomverse began as a margin in a notebook: a place for the worlds we return to, the scenes
               we quote, and the objects we refuse to let disappear. Now it is a fan-run shelf for seven
               universes, built to feel like opening a new chapter.
             </p>
             <div className="ab-hero-stats">
               <div><b>7</b><i>Fandoms</i></div>
               <div><b>23</b><i>Releases tracked</i></div>
               <div><b>84</b><i>Shelf items</i></div>
             </div>
           </div>
         </div>
      </header>

      <section className="ab-why" aria-label="Why FandomVerse">
        <h2>WHY FANDOMVERSE</h2>
        <div className="ab-why-grid">
          {REASONS.map((reason) => (
            <article key={reason.head} className="ab-why-card">
              <h3>{reason.head}</h3>
              <p>{reason.line}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ab-chapters" aria-label="Fandom field guide">
        <div className="ab-chapters-intro">
          <p className="ab-section-kicker">The field guide · seven chapters</p>
          <h2>TURN THE PAGE.<br /><em>FIND YOUR WORLD.</em></h2>
          <p>There is no single way into a fandom. Choose a chapter and see the objects, stories and rituals waiting inside.</p>
        </div>

        <div className="ab-chapter-rail" role="tablist" aria-label="Choose a fandom chapter">
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
                <small>0{FANDOMS.indexOf(item) + 1}</small><span>{item.name}</span><b>↗</b>
              </button>
            ))}
        </div>

        <article
          className="ab-chapter-detail"
          id="ab-map-detail"
          role="tabpanel"
          aria-labelledby={`ab-tab-${active.id}`}
          key={active.id}
        >
          <div className="ab-chapter-image"><img src={active.art} alt="" /><span>CHAPTER / {String(FANDOMS.indexOf(active) + 1).padStart(2, '0')}</span></div>
          <div className="ab-chapter-copy"><p className="ab-chapter-label">NOW READING</p><h3>{active.name}</h3><p>{active.line}</p><a className="ab-map-link" href={`#${active.id === 'tv' ? 'tv-shows' : active.id === 'kpop' ? 'k-pop' : active.id}`}>Open chapter
          </a>
          </div>
        </article>
      </section>

      <section className="ab-team" aria-label="The team">
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
        <div className="ab-mission-copy"><p className="ab-section-kicker">A note from the editors</p><h2>KEEP THE<br /><em>FEELING ALIVE.</em></h2><p>To keep every fandom current, correctly spelled and honestly presented, so finding something you love takes one click, not twenty.</p></div>
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
