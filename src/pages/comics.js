import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { paletteFor } from '../components/fandomConfig';
import CharacterCodex from '../components/CharacterCodex';
import FandomMediaWall from '../components/FandomMediaWall';
import FandomDoors from '../components/FandomDoors';
import './comics.css';

function Comics() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('fandomverse-theme') || 'dark');

  useEffect(() => {
    window.localStorage.setItem('fandomverse-theme', theme);
  }, [theme]);

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--comics-shift-x', `${x * -10}px`);
    event.currentTarget.style.setProperty('--comics-shift-y', `${y * -8}px`);
    event.currentTarget.style.setProperty('--comics-art-x', `${x * 6}px`);
    event.currentTarget.style.setProperty('--comics-art-y', `${y * 4}px`);
  };

  const resetPointer = (event) => {
    event.currentTarget.style.setProperty('--comics-shift-x', '0px');
    event.currentTarget.style.setProperty('--comics-shift-y', '0px');
    event.currentTarget.style.setProperty('--comics-art-x', '0px');
    event.currentTarget.style.setProperty('--comics-art-y', '0px');
  };

  return (
    <>
    <main className={`comics-page ${theme === 'light' ? 'comics-theme-light' : 'comics-theme-dark'}`}>
      <SiteNav theme={theme} setTheme={setTheme} active="comics" variant="comics" />
      <section className="comics-hero" aria-label="Comics universe introduction" onPointerMove={handlePointerMove} onPointerLeave={resetPointer} onPointerCancel={resetPointer}>
        <div className="comics-backdrop" aria-hidden="true">
          <img className="comics-background" src="/assets/images/bg%20comics.png" alt="" aria-hidden="true" />
          <div className="comics-background-veil" />
        </div>
        <div className="comics-stage">
          <div className="comics-frame">
            <div className="comics-orange-wash" aria-hidden="true" />
            <div className="comics-foreign-words" aria-hidden="true">
              <span className="comics-word comics-word-one">コミック</span>
              <span className="comics-word comics-word-two">英雄</span>
              <span className="comics-word comics-word-three">物語</span>
              <span className="comics-word comics-word-four">ACTION</span>
            </div>
            <div className="comics-panel-lines" aria-hidden="true"><i /><i /><i /></div>

            <div className="comics-art-wrap">
              <div className="comics-art-halo" aria-hidden="true" />
              <img className="comics-art" src="/assets/images/comics1.png" alt="Hinata and Kageyama from a volleyball comic" />
              <img className="comics-art-glitch comics-art-glitch-one" src="/assets/images/comics1.png" alt="" aria-hidden="true" />
              <img className="comics-art-glitch comics-art-glitch-two" src="/assets/images/comics1.png" alt="" aria-hidden="true" />
              <div className="comics-art-scan" aria-hidden="true" />
              <div className="comics-art-caption"><span>CHARACTER FILE / 01</span><b>COURT VISION</b></div>
            </div>

            <div className="comics-left-label" aria-hidden="true">
              <span>FV / COMICS 01</span>
              <b>DRAWN TO MOVE</b>
            </div>

            <aside className="comics-copy">
              <p className="comics-kicker"><span /> PANEL / POWER / PLAY</p>
              <p className="comics-index">ISSUE 01 <b>—</b> THE FIRST SERVE</p>
              <h1>Stories<br /><em>in motion.</em></h1>
              <p className="comics-description">From bold heroes to impossible worlds, every panel builds a universe worth getting lost in.</p>
              <div className="comics-meta"><span><b>24</b> panels</span><span><b>01</b> origin</span><span><b>∞</b> worlds</span></div>
            </aside>

            <div className="comics-footer"><span>COMICS / HEROES / SEQUENTIAL ART</span><span>TURN THE PAGE ↓</span></div>
          </div>
        </div>
      </section>

      <CharacterCodex fandom="comics" theme={theme} sectionNumber="02" />

      <FandomMediaWall fandom="comics" theme={theme} />

      <FandomDoors fandom="comics" theme={theme} />
    </main>

    {/* The last thing on the page, themed to match the fandom it closes. */}
    <SiteFooter theme={theme} accent={paletteFor('comics', theme).accent} />
    </>
  );
}

export default Comics;
