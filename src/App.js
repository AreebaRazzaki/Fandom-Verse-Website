import { useEffect, useState } from 'react';
import About from './pages/about';
import Anime from './pages/anime';
import Comics from './pages/comics';
import Contact from './pages/contact';
import Editorial from './pages/editorial';
import Events from './pages/events';
import Gaming from './pages/gaming';
import Home from './pages/home';
import Kpop from './pages/kpop';
import Login from './pages/login';
import Manga from './pages/manga';
import Movies from './pages/movies';
import Shop from './pages/shop';
import Signup from './pages/signup';
import Trailers from './pages/trailers';
import TvShows from './pages/tvshows';
import Upcoming from './pages/upcoming';

const FANDOM_ROUTES = [
  ['anime', '#anime', '/anime'],
  ['comics', '#comics', '/comics'],
  ['gaming', '#gaming', '/gaming'],
  ['kpop', '#k-pop', '/k-pop'],
  ['manga', '#manga', '/manga'],
  ['movies', '#movies', '/movies'],
  ['tvshows', '#tv-shows', '/tv-shows'],
  ['tvshows', '#tvshows', '/tv'],
];

function App() {
  const getRoute = () => {
    const currentPath = window.location.pathname.toLowerCase();
    const currentHash = window.location.hash.toLowerCase();

    if (currentHash === '#article' || currentHash.startsWith('#article/')) return { page: 'editorial', category: 'all' };

    // `#featured-articles/<fandom>` opens the Articles page already filtered, and
    // `#featured-articles/<fandom>/<slug>` goes one step further and opens that
    // story in the reader. The fandom pages use the second form to link straight
    // to a single story.
    const categoryHash = currentHash.match(/^#featured-articles\/([a-z-]+)(?:\/([a-z0-9-]+))?$/);
    if (categoryHash) return { page: 'editorial', category: categoryHash[1], slug: categoryHash[2] || null };
    if (currentHash === '#featured-articles' || currentPath.endsWith('/editorial') || currentPath.endsWith('/featured-articles')) return { page: 'editorial', category: 'all' };
    if (currentPath.startsWith('/article/')) return { page: 'editorial', category: 'all' };

    if (currentHash === '#trailers' || currentPath.endsWith('/trailers')) return { page: 'trailers' };
    if (currentHash === '#upcoming-releases' || currentPath.endsWith('/upcoming-releases')) return { page: 'upcoming' };

    // Same shape for events: `#events/<fandom>` lands on the passport with that
    // fandom already chipped, and `#events/<fandom>/<eventId>` opens its pass.
    const eventsHash = currentHash.match(/^#events\/([a-z-]+)(?:\/([a-z0-9-]+))?$/);
    if (eventsHash) return { page: 'events', fandom: eventsHash[1], eventId: eventsHash[2] || null };
    if (currentHash === '#events' || currentPath.endsWith('/events')) return { page: 'events' };

    if (currentHash === '#shop' || currentPath.endsWith('/shop') || currentPath.endsWith('/fan-vault')) return { page: 'shop' };

    if (currentHash === '#about' || currentPath.endsWith('/about')) return { page: 'about' };
    if (currentHash === '#contact' || currentPath.endsWith('/contact')) return { page: 'contact' };
    if (currentHash === '#sign-in' || currentHash === '#login' || currentPath.endsWith('/sign-in') || currentPath.endsWith('/login')) return { page: 'login' };
    if (currentHash === '#sign-up' || currentHash === '#signup' || currentPath.endsWith('/sign-up') || currentPath.endsWith('/signup')) return { page: 'signup' };

    const matched = FANDOM_ROUTES.find(([, hash, path]) => currentHash === hash || currentPath.endsWith(path));
    if (matched) return { page: matched[0] };
    return { page: 'home' };
  };

  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  if (route.page === 'editorial') return <Editorial category={route.category} slug={route.slug} />;
  if (route.page === 'events') return <Events fandom={route.fandom} eventId={route.eventId} />;
  if (route.page === 'upcoming') return <Upcoming />;
  if (route.page === 'shop') return <Shop />;
  if (route.page === 'about') return <About />;
  if (route.page === 'contact') return <Contact />;
  if (route.page === 'login') return <Login />;
  if (route.page === 'signup') return <Signup />;
  if (route.page === 'anime') return <Anime />;
  if (route.page === 'comics') return <Comics />;
  if (route.page === 'gaming') return <Gaming />;
  if (route.page === 'kpop') return <Kpop />;
  if (route.page === 'manga') return <Manga />;
  if (route.page === 'movies') return <Movies />;
  if (route.page === 'trailers') return <Trailers />;
  if (route.page === 'tvshows') return <TvShows />;
  return <Home />;
}

export default App;
