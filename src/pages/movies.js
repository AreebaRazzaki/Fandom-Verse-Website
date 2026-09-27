import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { paletteFor } from '../components/fandomConfig';
import CharacterCodex from '../components/CharacterCodex';
import FandomMediaWall from '../components/FandomMediaWall';
import FandomDoors from '../components/FandomDoors';
import './movies.css';

const movies = [
  {
    id: 'dhool-dhandar',
    title: 'DHOOL DHANDAR',
    subtitle: 'LEGENDS OF THE REALM',
    hero: '/assets/images/dhool-dhandar.png',
    poster: '/assets/images/poster-dhool-dhandar.jpg',
    match: '96%',
    year: '2023',
    genres: 'DRAMA / ACTION / EPIC',
    label: 'A FANDOMVERSE ORIGINAL',
    description: 'An epic battle for honor and survival unfolds in a forgotten realm where ancient mythical guardians awaken to protect humanity.',
  },
  {
    id: 'harry-potter',
    title: 'HARRY POTTER',
    subtitle: "AND THE SORCERER'S STONE",
    hero: '/assets/images/harry-potter.jpg',
    poster: '/assets/images/poster-harry-potter.jpg',
    match: '97%',
    year: '2001',
    genres: 'FANTASY / ADVENTURE / MAGIC',
    label: 'A FANTASY CLASSIC',
    description: 'An orphaned boy enters a school of wizardry and discovers the truth about his family, his power, and the evil waiting in the shadows.',
  },
  {
    id: 'jumanji',
    title: 'JUMANJI',
    subtitle: 'THE NEXT LEVEL',
    hero: '/assets/images/jumanji.jpg',
    poster: '/assets/images/poster-jumanji.jpg',
    match: '94%',
    year: '2019',
    genres: 'ADVENTURE / COMEDY / ACTION',
    label: 'ACTION COMEDY BLOCKBUSTER',
    description: 'The gang returns to rescue one of their own, only to discover that the game has changed and every level has a new surprise.',
  },
  {
    id: 'la-casa-de-papel',
    title: 'LA CASA DE PAPEL',
    subtitle: 'MONEY HEIST',
    hero: '/assets/images/la-casa-de-papel.jpg',
    poster: '/assets/images/poster-la-casa-de-papel.jpg',
    match: '98%',
    year: '2017',
    genres: 'CRIME / THRILLER / ACTION',
    label: 'TOP 10 GLOBAL SERIES',
    description: 'An unusual crew attempts the most perfect robbery in Spanish history, risking everything for one impossible plan.',
  },
  {
    id: 'my-trip',
    title: 'MY TRIP',
    subtitle: 'TO ITALY',
    hero: '/assets/images/my-trip.jpg',
    poster: '/assets/images/poster-my-trip.jpg',
    match: '88%',
    year: '2022',
    genres: 'TRAVEL / COMEDY / ADVENTURE',
    label: 'FEEL-GOOD ADVENTURE',
    description: "Three friends take a spontaneous road trip across Italy's unforgettable coastlines and scenic countryside.",
  },
  {
    id: 'avengers',
    title: 'THE AVENGERS',
    subtitle: "EARTH'S MIGHTIEST HEROES",
    hero: '/assets/images/avengers.jpg',
    poster: '/assets/images/poster-avengers.jpg',
    match: '95%',
    year: '2012',
    genres: 'ACTION / SCI-FI / SUPERHERO',
    label: 'MARVEL STUDIOS EPIC',
    description: "Earth's mightiest heroes must learn to fight as one if they are going to stop Loki and his alien army.",
  },
  {
    id: 'avengers-2',
    title: 'THE AVENGERS 2',
    subtitle: 'AGE OF ULTRON',
    hero: '/assets/images/avengers-2.png',
    poster: '/assets/images/poster-avengers-2.jpg',
    match: '93%',
    year: '2015',
    genres: 'ACTION / SUPERHERO / SCI-FI',
    label: 'MARVEL ACTION MASTERPIECE',
    description: 'When a dormant peacekeeping program wakes up, the Avengers face a threat created from their own attempt to protect the world.',
  },
  {
    id: 'peaky-blinders',
    title: 'PEAKY BLINDERS',
    subtitle: 'BY ORDER OF THE PEAKY BLINDERS',
    hero: '/assets/images/peaky-blinders.jpg',
    poster: '/assets/images/poster-peaky-blinders.jpg',
    match: '96%',
    year: '2013',
    genres: 'CRIME / DRAMA / ACTION',
    label: 'BBC / NETFLIX EPIC SERIES',
    description: "A gangster family epic set in 1900s England, led by the fiercely ambitious Tommy Shelby.",
  },
  {
    id: 'joker',
    title: 'JOKER',
    subtitle: 'PUT ON A HAPPY FACE',
    hero: '/assets/images/joker.jpg',
    poster: '/assets/images/poster-joker.jpg',
    match: '98%',
    year: '2019',
    genres: 'CRIME / THRILLER / DRAMA',
    label: 'OSCAR-WINNING MASTERPIECE',
    description: 'A troubled comedian is ignored and mistreated by society, setting him on a dark path toward revolution and crime.',
  },
  {
    id: 'glass',
    title: 'GLASS',
    subtitle: 'UNBREAKABLE TRILOGY',
    hero: '/assets/images/glass.jpg',
    poster: '/assets/images/poster-glass.jpg',
    match: '91%',
    year: '2019',
    genres: 'THRILLER / SCI-FI / MYSTERY',
    label: 'MIND-BENDING THRILLER',
    description: 'David Dunn uses his supernatural abilities to track Kevin Wendell Crumb, a man with twenty-four personalities.',
  },
];

function Movies() {
  const [theme, setTheme] = useState(() => window.localStorage.getItem('fandomverse-theme') || 'dark');
  const [activeIndex, setActiveIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const activeMovie = movies[activeIndex];

  useEffect(() => {
    window.localStorage.setItem('fandomverse-theme', theme);
  }, [theme]);

  useEffect(() => {
    const cycle = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % movies.length);
    }, 2500);
    return () => window.clearInterval(cycle);
  }, []);

  const selectMovie = (index) => setActiveIndex(index);
  const nextMovie = () => setActiveIndex((activeIndex + 1) % movies.length);
  const previousMovie = () => setActiveIndex((activeIndex - 1 + movies.length) % movies.length);

  return (
    <>
    <main className={`movies-page ${theme === 'light' ? 'movies-theme-light' : 'movies-theme-dark'}`}>
      <SiteNav theme={theme} setTheme={setTheme} active="movies" variant="movies" />
      <section className="movies-stage" aria-label="Movies spotlight">
        <div className="movies-backdrop" aria-hidden="true">
          <div className="movies-crystal" />
        </div>
        <div className="movies-panel">
          <div className="movies-frame">
            <div className="movies-hero-slides" aria-live="polite">
              {movies.map((movie, index) => (
                <div className={`movies-hero-slide ${index === activeIndex ? 'is-active' : ''}`} key={movie.id} aria-hidden={index !== activeIndex}>
                  <img src={movie.hero} alt={`${movie.title} hero visual`} />
                </div>
              ))}
            </div>
            <div className="movies-hero-overlay" aria-hidden="true" />
            <div className="movies-masthead"><i>SPOTLIGHT ARCHIVE</i></div>

            <div className="movies-copy" key={activeMovie.id}>
              <div className="movies-badge"><span>FILM / {activeMovie.match} MATCH</span><b>{activeMovie.label}</b></div>
              <p className="movies-kicker">{activeMovie.genres} <b>—</b> {activeMovie.year}</p>
              <h1>{activeMovie.title}</h1>
              <h2>{activeMovie.subtitle}</h2>
              <p className="movies-description">{activeMovie.description}</p>
              <div className="movies-actions">
                <button type="button" className="movies-play" onClick={() => window.alert(`Now streaming: ${activeMovie.title}`)}>Play now <span>▶</span></button>
                <button type="button" className={`movies-save ${saved ? 'is-saved' : ''}`} onClick={() => setSaved((currentSaved) => !currentSaved)} aria-label={saved ? 'Remove from saved movies' : 'Save movie'} aria-pressed={saved}>{saved ? '♥' : '♡'}</button>
              </div>
              <a className="movies-cast-link" href="#movies-character-profiles">Enter the film codex <span>↗</span></a>
            </div>

            <div className="movies-side-code" aria-hidden="true"><span>SAGE / TEAL / FRAME</span><b>01—10</b></div>
            <section className="movies-shelf" aria-label="Featured movie posters">
              <div className="movies-shelf-heading"><h2>Featured spotlight</h2><span><i /> Auto rotating</span></div>
              <div className="movies-shelf-row">
                <button type="button" className="movies-shelf-arrow" onClick={previousMovie} aria-label="Previous movie">‹</button>
                <div className="movies-cards">
                  {movies.map((movie, index) => (
                    <button type="button" className={`movies-card ${index === activeIndex ? 'is-active' : ''}`} onClick={() => selectMovie(index)} key={movie.id} aria-label={`Select ${movie.title}`} aria-pressed={index === activeIndex}>
                      <img src={movie.poster} alt="" aria-hidden="true" />
                      <span className="movies-card-overlay"><b>{movie.title}</b><small>{movie.match} match</small></span>
                    </button>
                  ))}
                </div>
                <button type="button" className="movies-shelf-arrow" onClick={nextMovie} aria-label="Next movie">›</button>
              </div>
            </section>
          </div>
        </div>
      </section>
      {/* The hero links down to the codex, so the cast of the spotlight films
          sits directly under it — same section, same book, the cinema skin. */}
      <CharacterCodex fandom="movies" variant="cinema" theme={theme} sectionNumber="02" />

      {/* The same two sections the anime page closes on, in the same order and
          for the same reason: the wall shows the fandom, the doors are the way
          out of it. Neither carries a number, so the codex stays 02 and the
          visible run keeps no gap. The gallery and the desk are gone from this
          page — the codex, the wall and the doors are the whole cinema room. */}
      <FandomMediaWall fandom="movies" theme={theme} />

      <FandomDoors fandom="movies" theme={theme} />
    </main>

    {/* The last thing on the page, themed to match the fandom it closes. */}
    <SiteFooter theme={theme} accent={paletteFor('movies', theme).accent} />
    </>
  );
}

export default Movies;
