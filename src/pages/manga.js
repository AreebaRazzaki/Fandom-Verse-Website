import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { paletteFor } from '../components/fandomConfig';
import CharacterCodex from '../components/CharacterCodex';
import FandomMediaWall from '../components/FandomMediaWall';
import FandomDoors from '../components/FandomDoors';
import './manga.css';

const mangaSlides = [
  {
    image: '/assets/images/manga1.png',
    title: 'A quiet heroine. A secret panel.',
    detail: 'A shojo manga about memory, rivalry, and the hidden chapter her family never finished.',
    note: 'When an old manga notebook returns, every blank panel becomes a clue.',
    year: '2015',
    genre: 'SHOJO / DRAMA',
    label: 'VIOLET / ARCHIVE 01',
    chapter: 'CHAPTER 01',
    chapterCount: '12',
    panels: '∞',
    progress: '38',
    credit: 'Manga story / original feature',
  },
  {
    image: '/assets/images/manga2.png',
    title: 'Two lines. One impossible ending.',
    detail: 'A dramatic manga about two artists racing toward the final page before the truth disappears.',
    note: 'The next panel changes the story, but the past keeps reading back.',
    year: '2024',
    genre: 'SEINEN / MYSTERY',
    label: 'NEW SCENE / ARCHIVE 02',
    chapter: 'CHAPTER 02',
    chapterCount: '09',
    panels: '24',
    progress: '71',
    credit: 'Manga story / original feature',
  },
];

function Manga() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('fandomverse-theme') || 'dark');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const activeSlide = mangaSlides[activeIndex];

  useEffect(() => {
    window.localStorage.setItem('fandomverse-theme', theme);
  }, [theme]);

  useEffect(() => {
    let swapTimer;
    let resetTimer;
    const cycle = window.setInterval(() => {
      setIsChanging(true);
      swapTimer = window.setTimeout(() => {
        setActiveIndex((currentIndex) => (currentIndex + 1) % mangaSlides.length);
      }, 360);
      resetTimer = window.setTimeout(() => setIsChanging(false), 980);
    }, 4000);

    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(swapTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--manga-shift-x', `${x * -12}px`);
    event.currentTarget.style.setProperty('--manga-shift-y', `${y * -12}px`);
    event.currentTarget.style.setProperty('--manga-stage-x', `${x * 5}px`);
    event.currentTarget.style.setProperty('--manga-stage-y', `${y * 5}px`);
    event.currentTarget.style.setProperty('--manga-tilt', `${x * 1.4}deg`);
  };

  const resetPointer = (event) => {
    event.currentTarget.style.setProperty('--manga-shift-x', '0px');
    event.currentTarget.style.setProperty('--manga-shift-y', '0px');
    event.currentTarget.style.setProperty('--manga-stage-x', '0px');
    event.currentTarget.style.setProperty('--manga-stage-y', '0px');
    event.currentTarget.style.setProperty('--manga-tilt', '0deg');
  };

  return (
    <>
    <main className={`manga-page ${theme === 'light' ? 'manga-theme-light' : 'manga-theme-dark'} ${isChanging ? 'manga-is-changing' : ''}`}>
      <SiteNav theme={theme} setTheme={setTheme} active="manga" variant="manga" />
      <section className="manga-hero" aria-label="Manga universe introduction" onPointerMove={handlePointerMove} onPointerLeave={resetPointer} onPointerCancel={resetPointer}>
        <div className="manga-surface" aria-hidden="true">
          <div className="manga-right-panel" />
          <div className="manga-left-panel" />
          <div className="manga-pattern" />
          <div className="manga-panel-echo"><i /><i /><i /></div>
          <div className="manga-slash" />
          <span className="manga-shape manga-shape-ring" />
          <span className="manga-shape manga-shape-diamond" />
          <span className="manga-shape manga-shape-cross">+</span>
          <span className="manga-shape manga-shape-dot" />
          <span className="manga-shape manga-shape-bar manga-shape-bar-one" />
          <span className="manga-shape manga-shape-bar manga-shape-bar-two" />
        </div>

        <div className="manga-masthead" aria-hidden="true">
          <span className="manga-masthead-side">FANDOMVERSE / MANGA</span>
          <span className="manga-masthead-center"><i />THE MANGA ARCHIVE<i /></span>
          <span className="manga-masthead-issue">VOL. 07 / 2025</span>
        </div>

        <div className="manga-copy-left">
          <p className="manga-code">FANDOMVERSE / MANGA 01</p>
          <p className="manga-kicker"><span /> {activeSlide.genre}</p>
          <p className="manga-year">{activeSlide.year}</p>
          <h1 key={`title-${activeSlide.image}`}><span>Violet</span><em>Between</em><span>Lines</span></h1>
          <p className="manga-left-note">{activeSlide.note}</p>
          <a className="manga-cta" href="#manga-content">Open chapter 01 <span>↗</span></a>
        </div>

        <div className="manga-stage" aria-live="polite">
          <div className="manga-stage-frame" aria-hidden="true" />
          <div className="manga-stage-halo" aria-hidden="true" />
          <img className="manga-character" key={activeSlide.image} src={activeSlide.image} alt="Featured manga character" />
          <img className="manga-character-glitch manga-character-glitch-one" key={`one-${activeSlide.image}`} src={activeSlide.image} alt="" aria-hidden="true" />
          <img className="manga-character-glitch manga-character-glitch-two" key={`two-${activeSlide.image}`} src={activeSlide.image} alt="" aria-hidden="true" />
          <span className="manga-stage-label">{activeSlide.chapter} / PANEL {String(activeIndex + 1).padStart(2, '0')}</span>
          <div className="manga-glitch-lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="manga-glitch-overlay" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>

        <aside className="manga-copy-right" id="manga-content">
          <p className="manga-side-kicker">Manga story / {activeSlide.chapter}</p>
          <h2 key={`side-${activeSlide.image}`}>{activeSlide.title}</h2>
          <p className="manga-detail" key={`detail-${activeSlide.image}`}>{activeSlide.detail}</p>
          <div className="manga-meta"><span><b>{activeSlide.chapterCount}</b> chapters</span><span><b>{activeSlide.panels}</b> panels</span></div>
          <div className="manga-signal"><span>Panel progress</span><i><b style={{ width: `${activeSlide.progress}%` }} /></i><strong>{activeSlide.progress}%</strong></div>
          <p className="manga-director">Story / art / emotion<br /><b>{activeSlide.credit}</b></p>
        </aside>

        <div className="manga-hero-footer"><span>NEXT PANEL ↓</span></div>
      </section>
      <CharacterCodex fandom="manga" theme={theme} sectionNumber="02" />

      <FandomMediaWall fandom="manga" theme={theme} />

      <FandomDoors fandom="manga" theme={theme} />
    </main>

    {/* The last thing on the page, closed in the manga palette rather than the
        site-wide black stage, so it reads as part of this page. */}
    <SiteFooter theme={theme} tones={paletteFor('manga', theme)} />
    </>
  );
}

export default Manga;
