import { useEffect, useMemo, useState } from 'react';
import ArticleModal from './ArticleModal';
import BookmarkButton from './BookmarkButton';
import { FANDOMS, paletteFor, paletteVars } from './fandomConfig';
import './FandomCTA.css';

const ARTICLES_URL = '/assets/json%20data/featuredArticles.json';
const EVENTS_URL = '/assets/json%20data/events.json';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;

const money = (value) => (!value ? 'Free entry' : `$${value}`);

const stamp = (value) => {
  if (!value) return { day: '--', month: '---', year: '----' };
  const [year, month, day] = value.split('-');
  return { day, month: MONTHS[Number(month) - 1] || '---', year };
};

const longDate = (value) => {
  if (!value) return 'Date to be announced';
  const [year, month, day] = value.split('-');
  return `${day} ${MONTHS[Number(month) - 1] || '---'} ${year}`;
};

const shortDate = (value) => {
  const { day, month } = stamp(value);
  return day === '--' ? 'TBA' : `${day} ${month}`;
};

// The same countdown that the date stamp needs, split so the ticking piece can
// sit on its own interval without re-rendering the whole desk.
function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return useMemo(() => {
    if (!target) return null;
    const start = new Date(`${target.date}T${(target.time || '00:00')}:00`).getTime();
    if (Number.isNaN(start)) return null;

    const gap = start - now;
    const passed = gap < 0;
    const left = Math.abs(gap);
    const days = Math.floor(left / DAY);
    const hours = Math.floor((left % DAY) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    const seconds = Math.floor((left % 60000) / 1000);

    return {
      passed,
      days,
      hours,
      minutes,
      seconds,
      label: passed
        ? `Wrapped ${days} day${days === 1 ? '' : 's'} ago`
        : `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
    };
  }, [target, now]);
}

function useDeskData(articleCategory, eventsCategory) {
  const [state, setState] = useState({ status: 'loading', stories: [], events: [], issue: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, status: 'loading' }));

    Promise.all([
      fetch(ARTICLES_URL).then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch(EVENTS_URL).then((response) => (response.ok ? response.json() : null)).catch(() => null),
    ])
      .then(([articles, events]) => {
        if (!alive) return;
        const allStories = articles && Array.isArray(articles.articles) ? articles.articles : [];
        const allEvents = events && Array.isArray(events.events) ? events.events : [];
        setState({
          status: 'ready',
          issue: (articles && articles.issue) || null,
          stories: allStories.filter((item) => item.category === articleCategory),
          // Oldest first, so the nearest date is always the one at the top.
          events: allEvents
            .filter((item) => item.category === eventsCategory)
            .sort((a, b) => String(a.date).localeCompare(String(b.date))),
        });
      })
      .catch(() => { if (alive) setState((current) => ({ ...current, status: 'error' })); });

    return () => { alive = false; };
  }, [articleCategory, eventsCategory, nonce]);

  return { ...state, retry: () => setNonce((value) => value + 1) };
}

// The index rail doubles as the interaction: pointing at a row previews it in
// the lead panel, and clicking pins it there after the pointer leaves.
function usePreview(items) {
  const [pinned, setPinned] = useState(0);
  const [hovered, setHovered] = useState(null);
  const index = hovered === null ? pinned : hovered;
  const lead = items[index] || items[0] || null;
  return { index, lead, pinned, setPinned, setHovered };
}

function Rail({ items, preview, renderBody, ariaLabel }) {
  if (items.length === 0) return null;

  return (
    <ul className="cta-rail" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={item.id || item.slug}>
          <button
            type="button"
            className={`cta-rail-row${index === preview.index ? ' is-on' : ''}`}
            aria-pressed={index === preview.index}
            onMouseEnter={() => preview.setHovered(index)}
            onMouseLeave={() => preview.setHovered(null)}
            onFocus={() => preview.setHovered(index)}
            onBlur={() => preview.setHovered(null)}
            onClick={() => preview.setPinned(index)}
          >
            <span className="cta-rail-no" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="cta-rail-body">{renderBody(item, index)}</span>
            <span className="cta-rail-state" aria-hidden="true">
              <i />{index === preview.index ? 'On the desk' : 'Preview'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function StoriesPanel({ config, stories, onOpen, openSlug }) {
  const preview = usePreview(stories);
  const lead = preview.lead;
  const articlesHref = `#featured-articles/${config.articleCategory}`;

  if (!lead) {
    return (
      <article className="cta-panel is-stories is-empty">
        <p className="cta-panel-empty">No stories filed under {config.label} yet.</p>
      </article>
    );
  }

  return (
    <article className="cta-panel is-stories" aria-label={`Featured ${config.label} stories`}>
      <header className="cta-panel-head">
        <p className="cta-panel-kicker"><span /> Featured stories</p>
        <p className="cta-panel-note">
          {stories.length} on the desk &middot; a short preview, then the full page
        </p>
      </header>

      <div className="cta-story-layout">
        <div className="cta-story-lead" key={lead.slug}>
          <figure className="cta-story-art">
            <img src={lead.image} alt={lead.imageAlt || lead.title} />
            <span className="cta-story-art-shade" aria-hidden="true" />
            <figcaption>
              <b>{lead.kicker}</b>
              <span>{String(preview.index + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</span>
            </figcaption>
          </figure>

          <div className="cta-story-copy">
            <p className="cta-story-meta">
              <span>{shortDate(lead.date)}</span>
              <i aria-hidden="true" />
              <span>{lead.readTime} min read</span>
              <i aria-hidden="true" />
              <span>{lead.author}</span>
            </p>
            <h3 className="cta-story-title">{lead.title}</h3>
            <p className="cta-story-excerpt">{lead.excerpt}</p>
            <div className="cta-story-actions">
              <button type="button" className="cta-press" onClick={() => onOpen(lead.slug)}>
                <span>Read the preview</span><i aria-hidden="true">&rarr;</i>
              </button>
              <BookmarkButton
                className="cta-save"
                label="Save story"
                entry={{
                  id: `article:${lead.slug}`,
                  type: 'article',
                  title: lead.title,
                  meta: `${config.label} · ${longDate(lead.date)}`,
                  image: lead.image,
                  href: articlesHref,
                }}
              />
            </div>
          </div>
        </div>

        <Rail
          items={stories}
          preview={preview}
          ariaLabel={`Preview the ${config.label} stories`}
          renderBody={(item, index) => (
            <>
              <b>{item.title}</b>
              <small>{item.kicker} &middot; {item.readTime} min</small>
            </>
          )}
        />
      </div>

      {/* The dock is a live list, not a bare link: pointing at it opens the
          fandom's own stories so you can pick one instead of only taking the
          whole page. */}
      <div className="cta-dock">
        <a className="cta-dock-go" href={articlesHref}>
          <b>Explore all articles</b>
          <i aria-hidden="true">&rarr;</i>
          <small>Opens the Articles page, filtered to {config.label}</small>
        </a>
        <ul className="cta-dock-list">
          {stories.map((item) => (
            <li key={item.slug}>
              <a href={`${articlesHref}/${item.slug}`}>
                <span className="cta-dock-no" aria-hidden="true">{shortDate(item.date)}</span>
                <span className="cta-dock-body">
                  <b>{item.title}</b>
                  <small>{item.readTime} min &middot; {item.author}</small>
                </span>
                <span className="cta-dock-arrow" aria-hidden="true">&nearr;</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {openSlug && <span className="cta-sr" aria-live="polite">Opening {lead.title}</span>}
    </article>
  );
}

function EventsPanel({ config, events }) {
  const preview = usePreview(events);
  const lead = preview.lead;
  const clock = useCountdown(lead);
  const eventsHref = `#events/${config.eventsCategory}`;

  if (!lead) {
    return (
      <article className="cta-panel is-events is-empty">
        <p className="cta-panel-empty">No passes issued for {config.label} yet.</p>
      </article>
    );
  }

  const mark = stamp(lead.date);

  return (
    <article className="cta-panel is-events" aria-label={`Upcoming ${config.label} events`}>
      <header className="cta-panel-head">
        <p className="cta-panel-kicker"><span /> Upcoming in this fandom</p>
        <p className="cta-panel-note">
          {events.length} scheduled &middot; the nearest one is on the desk
        </p>
      </header>

      <div className="cta-event-layout">
        <div className="cta-event-lead" key={lead.id}>
          <span className="cta-event-stub" aria-hidden="true">
            <b>{mark.day}</b>
            <i>{mark.month}</i>
            <small>{mark.year}</small>
          </span>

          <div className="cta-event-copy">
            <p className="cta-event-flags">
              <b>{lead.tag}</b>
              <i aria-hidden="true" />
              <span className={`is-${lead.status}`}>{lead.status}</span>
            </p>
            <h3 className="cta-event-title">{lead.title}</h3>
            <p className="cta-event-where">{lead.venue} &middot; {lead.location}</p>
            <p className="cta-event-desc">{lead.description}</p>

            {lead.highlights?.length > 0 && (
              <ul className="cta-event-marks">
                {lead.highlights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}

            <div className="cta-event-foot">
              <span className="cta-event-price">{money(lead.price)}</span>
              <span className="cta-event-doors">Doors {lead.time}</span>
              <a className="cta-press is-pass" href={`${eventsHref}/${lead.id}`}>
                <span>Open the pass</span><i aria-hidden="true">&rarr;</i>
              </a>
              <BookmarkButton
                className="cta-save"
                label="Save pass"
                entry={{
                  id: `event:${lead.id}`,
                  type: 'event',
                  title: lead.title,
                  meta: `${config.label} · ${longDate(lead.date)}`,
                  image: lead.image,
                  href: `${eventsHref}/${lead.id}`,
                }}
              />
            </div>
          </div>

          {/* A live clock, so the panel reports the wait instead of only
              printing a date. */}
          <p className={`cta-event-clock${clock && clock.passed ? ' is-past' : ''}`}>
            <b>{clock ? clock.label : 'Date to be announced'}</b>
            <small>{clock ? (clock.passed ? 'this pass has already run' : 'until doors open') : 'check back soon'}</small>
          </p>
        </div>

        <Rail
          items={events}
          preview={preview}
          ariaLabel={`Preview the ${config.label} events`}
          renderBody={(item) => (
            <>
              <b>{item.title}</b>
              <small>{longDate(item.date)} &middot; {item.venue}</small>
            </>
          )}
        />
      </div>

      <div className="cta-dock">
        <a className="cta-dock-go" href={eventsHref}>
          <b>View all events</b>
          <i aria-hidden="true">&rarr;</i>
          <small>Opens the Events page, filtered to {config.label}</small>
        </a>
        <ul className="cta-dock-list">
          {events.map((item) => (
            <li key={item.id}>
              <a href={`${eventsHref}/${item.id}`}>
                <span className="cta-dock-no" aria-hidden="true">{shortDate(item.date)}</span>
                <span className="cta-dock-body">
                  <b>{item.title}</b>
                  <small>{item.venue} &middot; {money(item.price)}</small>
                </span>
                <span className="cta-dock-arrow" aria-hidden="true">&nearr;</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

// The two doors. The panels above show one story and one pass; these say in
// plain words what happens when you want the rest, and each one is a real link
// to that page with the filter already set to this fandom. The articles
// button is the "I want to read" door and the events button is the "I want to
// see what's on" door — they are the last thing in the section, so the visitor
// has a named next step instead of a dead end.
function NextDoors({ config, storyCount, eventCount }) {
  return (
    <div className="cta-next">
      <p className="cta-next-label"><span /> Where to next</p>

      <div className="cta-next-doors">
        <a className="cta-next-go is-read" href={`#featured-articles/${config.articleCategory}`}>
          <span className="cta-next-no" aria-hidden="true">A</span>
          <span className="cta-next-body">
            <b>Read the {config.label} articles</b>
            <small>
              {storyCount} written {storyCount === 1 ? 'piece' : 'pieces'} about {config.label}.
              One press takes you to the Articles page with the filter already
              set to {config.label}, where you can open any of them in full.
            </small>
          </span>
          <span className="cta-next-go-label">Open the articles page</span>
          <i aria-hidden="true">&rarr;</i>
        </a>

        <a className="cta-next-go is-events" href={`#events/${config.eventsCategory}`}>
          <span className="cta-next-no" aria-hidden="true">B</span>
          <span className="cta-next-body">
            <b>See the {config.label} events</b>
            <small>
              {eventCount} {eventCount === 1 ? 'pass' : 'passes'} scheduled for {config.label}.
              One press takes you to the Events page with the filter already set
              to {config.label}, dates and venues included.
            </small>
          </span>
          <span className="cta-next-go-label">Open the events page</span>
          <i aria-hidden="true">&rarr;</i>
        </a>
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <span className="cta-bg" aria-hidden="true" />
      <span className="cta-bg-rule" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="cta-bg-nodes" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
    </>
  );
}

/* ------------------------------------------------------------------ */

function FandomCTA({ fandom, theme = 'dark', sectionNumber = '03' }) {
  const config = FANDOMS[fandom] || null;
  const surface = theme === 'light' ? 'light' : 'dark';
  const articleCategory = config ? config.articleCategory : fandom;
  const eventsCategory = config ? config.eventsCategory : fandom;
  const { status, stories, events, retry } = useDeskData(articleCategory, eventsCategory);
  const [openSlug, setOpenSlug] = useState(null);

  const style = useMemo(() => paletteVars(fandom, theme, 'cta'), [fandom, theme]);

  // The reader is portalled to document.body, so it has to be handed its own
  // values rather than inheriting anything from this section. It takes the same
  // fandom tones, so the article you land in is the same colour as the wall.
  const readerVars = useMemo(() => {
    const tones = paletteFor(fandom, theme);
    return {
      '--reader-accent': tones.accent,
      '--reader-bg': tones.sunk,
      '--reader-paper': tones.ink,
      '--reader-muted': tones.muted,
      '--reader-ink': tones.ink,
    };
  }, [fandom, theme]);

  const openArticle = stories.find((item) => item.slug === openSlug) || null;
  const related = openArticle
    ? stories.filter((item) => item.slug !== openArticle.slug)
    : [];

  return (
    <section className="cta" id={`${fandom}-desk`} data-theme={surface} style={style} aria-label={`${config ? config.label : 'Fandom'} reading and events`}>
      <Backdrop />

      <div className="cta-wrap">
        <header className="cta-head">
          <p className="cta-num" aria-hidden="true">{sectionNumber}</p>
          <div className="cta-head-copy">
            <p className="cta-kicker"><span /> Two more doors / {config ? config.label : 'Fandom'}</p>
            <h2 className="cta-title">Keep going</h2>
            <p className="cta-tagline">
              The wall shows you what this fandom looks like. These two panels are where it
              reads and where it happens &mdash; both previews live here, and both open the
              full page with the filter already set to {config ? config.label : 'this fandom'}.
            </p>
          </div>
          <dl className="cta-tally">
            <div><dt>Stories</dt><dd>{String(stories.length).padStart(2, '0')}</dd></div>
            <div><dt>Passes</dt><dd>{String(events.length).padStart(2, '0')}</dd></div>
          </dl>
        </header>

        {status === 'loading' && <p className="cta-note">Laying out the desk&hellip;</p>}

        {status === 'error' && (
          <p className="cta-note is-error" role="alert">
            The desk did not open. <button type="button" onClick={retry}>Try again</button>
          </p>
        )}

        {status === 'ready' && config && (
          <>
            <div className="cta-panels">
              <StoriesPanel config={config} stories={stories} onOpen={setOpenSlug} openSlug={openSlug} />
              <EventsPanel config={config} events={events} />
            </div>

            <NextDoors config={config} storyCount={stories.length} eventCount={events.length} />
          </>
        )}

        {status === 'ready' && !config && <p className="cta-note">That fandom is not registered yet.</p>}
      </div>

      <ArticleModal
        article={openArticle}
        related={related}
        onClose={() => setOpenSlug(null)}
        onSelect={(next) => setOpenSlug(next.slug)}
        style={readerVars}
      />
    </section>
  );
}

export default FandomCTA;
