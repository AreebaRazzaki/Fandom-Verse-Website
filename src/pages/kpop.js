import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { paletteFor } from '../components/fandomConfig';
import CharacterCodex from '../components/CharacterCodex';
import FandomMediaWall from '../components/FandomMediaWall';
import FandomDoors from '../components/FandomDoors';
import './kpop.css';

function Kpop() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('fandomverse-theme') || 'dark');
  const [showCanvas, setShowCanvas] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    window.localStorage.setItem('fandomverse-theme', theme);
  }, [theme]);

  useEffect(() => {
    const cycleTimer = window.setInterval(() => {
      setIsGlitching(true);
      window.setTimeout(() => setShowCanvas((currentScene) => !currentScene), 390);
      window.setTimeout(() => setIsGlitching(false), 860);
    }, 5000);

    return () => window.clearInterval(cycleTimer);
  }, []);

  return (
    <>
    <main className={`kpop-page ${theme === 'light' ? 'kpop-theme-light' : ''} ${showCanvas ? 'kpop-show-canvas' : ''} ${isGlitching ? 'kpop-is-glitching' : ''}`}>
      <SiteNav theme={theme} setTheme={setTheme} active="kpop" variant="kpop" />

      <section className="kpop-hero" aria-label="K-Pop rotating hero">
        <div className="kpop-main-scene" aria-label="Featured K-Pop hero">
          <img className="kpop-main-pattern" src="/pattern%201.jpg" alt="" aria-hidden="true" />
          <div className="kpop-main-stage">
            <div className="kpop-main-decor" aria-hidden="true"><i /><i /><i /><span>✦</span><span>＋</span><span>◇</span></div>
            <div className="kpop-main-side-copy"><span>STAGE / 01</span><h1>NEW<br /><em>WAVE</em></h1><p>Every comeback<br />starts with a signal.</p><b>LIVE / 2024</b><div className="kpop-main-side-tags"><span>VOCAL / VISUAL</span><span>BLUE HOUR</span><span>TRACK 01 — LOADING</span></div></div>
            <div className="kpop-main-frame">
              <img className="kpop-main-image" src="/assets/images/kpop1.jpg" alt="Featured K-Pop visual" />
              <img className="kpop-main-glitch kpop-main-glitch-one" src="/assets/images/kpop1.jpg" alt="" aria-hidden="true" />
              <img className="kpop-main-glitch kpop-main-glitch-two" src="/assets/images/kpop1.jpg" alt="" aria-hidden="true" />
              <div className="kpop-main-scan" aria-hidden="true" />
              <div className="kpop-main-label"><span>FV / K-POP 05</span><b>MAIN VISUAL</b></div>
              <div className="kpop-main-footer"><span>NEW ERA / LIVE SIGNAL</span><span>SCENE 01 — 03</span></div>
            </div>
            <div className="kpop-main-side-note">CONCEPT FILE / A-01<br /><b>TURN UP THE FEELING ↓</b></div>
          </div>
        </div>

        <div className="kpop-canvas-scene" aria-label="K-Pop concept canvas">
          <div className="kpop-canvas-stage">
            <div className="kpop-canvas-topline"><span>CONCEPT ARCHIVE / 002</span><b>BLUE HOUR</b></div>
            <div className="kpop-concept-canvas">
              <img className="kpop-concept-pattern" src="/pattern%201.jpg" alt="" aria-hidden="true" />
              <div className="kpop-canvas-grid" aria-hidden="true" />
              <div className="kpop-canvas-orbit" aria-hidden="true" />
              <div className="kpop-canvas-corner kpop-canvas-corner-one" aria-hidden="true" />
              <div className="kpop-canvas-corner kpop-canvas-corner-two" aria-hidden="true" />
              <div className="kpop-canvas-floating" aria-hidden="true"><span>✦</span><span>＋</span><span>◇</span><i /><i /><b>MOOD / 03</b></div>
              <img className="kpop-secondary-image" src="/assets/images/kpop2.jpg" alt="K-Pop concept portrait" />
              <div className="kpop-concept-copy"><span>MOOD / 03</span><h1>SOFT<br /><em>NOISE</em></h1><p>A new scene is loading.<br />Turn up the feeling.</p><a href="#kpop-character-profiles">ENTER THE ERA <b>↗</b></a></div>
              <div className="kpop-canvas-stamp">NEXT<br /><em>COMEBACK</em></div>
              <div className="kpop-canvas-note">SINGER / SONGWRITER<br /><b>LIVE FROM THE BLUE HOUR</b></div>
              <div className="kpop-canvas-bottom"><span>01 — CONCEPT</span><span>SCROLL TO DISCOVER ↓</span></div>
            </div>
            <div className="kpop-canvas-side-code">STAGE 05<br /><b>K-POP</b></div>
          </div>
        </div>

        <div className="kpop-glitch-noise" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="kpop-scene-progress" aria-hidden="true"><i className={!showCanvas ? 'active' : ''} /><i className={showCanvas ? 'active' : ''} /></div>
      </section>

      <CharacterCodex fandom="kpop" theme={theme} sectionNumber="05" />

      <FandomMediaWall fandom="kpop" theme={theme} />

      <FandomDoors fandom="kpop" theme={theme} />
    </main>

    {/* The last thing on the page, themed to match the fandom it closes. */}
    <SiteFooter theme={theme} accent={paletteFor('kpop', theme).accent} />
    </>
  );
}

export default Kpop;
