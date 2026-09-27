import { useMemo } from 'react';
import { FANDOMS, paletteVars } from './fandomConfig';
import './FandomDoors.css';

// The wall shows the fandom. This is the way out of it: two plain doors, one to
// the writing and one to the live dates, and each one is a real link to that
// page with the filter already set to this fandom — so a visitor who wants to
// read or to see what is on has somewhere named to go instead of a dead end.
// The doorway each card sits in is painted behind it rather than drawn on it,
// so the two routes read as thresholds from across the section.
function FandomDoors({ fandom = 'anime', theme = 'dark' }) {
  const config = FANDOMS[fandom] || null;
  const label = config ? config.label : 'Fandom';
  const surface = theme === 'light' ? 'light' : 'dark';
  const style = useMemo(() => paletteVars(fandom, theme, 'door'), [fandom, theme]);

  const articlesHref = `#featured-articles/${config ? config.articleCategory : fandom}`;
  const eventsHref = `#events/${config ? config.eventsCategory : fandom}`;

  return (
    <section
      className="door"
      id={`${fandom}-doors`}
      data-theme={surface}
      style={style}
      aria-label={`${label} articles and events`}
    >
      <span className="door-bg" aria-hidden="true" />
      <span className="door-bg-rule" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="door-bg-glow" aria-hidden="true" />
      <span className="door-bg-arch" aria-hidden="true"><i /><i /></span>
      <span className="door-bg-shapes" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      <span className="door-bg-ticks" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="door-bg-chevrons" aria-hidden="true"><i /><i /><i /></span>
      <span className="door-bg-motes" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="door-bg-grain" aria-hidden="true" />

      <div className="door-wrap">
        <header className="door-head">
          <div className="door-head-copy">
            <p className="door-kicker"><span /> Keep going / {label}</p>
            <h2 className="door-title">Articles &amp; events</h2>
            <p className="door-tagline">
              The wall shows you what {label} looks like. The writing and the live
              dates live one click away &mdash; both doors open their own page with
              the filter already set to {label}.
            </p>
          </div>
        </header>

        <div className="door-pair">
          <a className="door-go is-articles" href={articlesHref}>
            <span className="door-go-no" aria-hidden="true">A</span>
            <span className="door-go-body">
              <b>Read the {label} articles</b>
              <small>
                One press takes you to the Articles page, filtered to {label},
                where every story opens in full and can be saved with a note.
              </small>
            </span>
            <span className="door-go-cta">
              Open the articles page<i aria-hidden="true">&rarr;</i>
            </span>
          </a>

          <a className="door-go is-events" href={eventsHref}>
            <span className="door-go-no" aria-hidden="true">B</span>
            <span className="door-go-body">
              <b>See the {label} events</b>
              <small>
                One press takes you to the Events page, filtered to {label}, with
                every date, venue and pass already on it.
              </small>
            </span>
            <span className="door-go-cta">
              Open the events page<i aria-hidden="true">&rarr;</i>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default FandomDoors;
