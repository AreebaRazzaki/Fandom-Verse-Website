import { useEffect, useMemo, useRef, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import BookmarkButton from '../components/BookmarkButton';
import './shop.css';

const DATA_URL = '/assets/json%20data/products.json';
const THEME_KEY = 'shop-theme';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'anime', label: 'Anime' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'kpop', label: 'K-Pop' },
  { id: 'comics', label: 'Comics' },
  { id: 'manga', label: 'Manga' },
];

const SORTS = [
  { id: 'featured', label: 'Featured', hint: 'Vault picks, in shelf order' },
  { id: 'low', label: 'Price: low to high', hint: 'Cheapest piece first' },
  { id: 'high', label: 'Price: high to low', hint: 'Priciest piece first' },
  { id: 'az', label: 'Name: A to Z', hint: 'Alphabetical by title' },
];

const slugOf = (label) => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const labelOf = (id) => (TABS.find((tab) => tab.id === id)?.label) || 'All';

const money = (value) => `$${Number(value).toFixed(2)}`;

// A range like "$28 - $40" sorts on its midpoint, so mixed ranges and single
// prices can live in the same shelf and still order cleanly.
const priceMid = (product) => {
  if (typeof product.price === 'number') return product.price;
  const numbers = String(product.priceRange || '').match(/\d+(?:\.\d+)?/g);
  if (!numbers || !numbers.length) return 0;
  const total = numbers.reduce((sum, value) => sum + Number(value), 0);
  return total / numbers.length;
};

const priceText = (product) => (typeof product.price === 'number' ? money(product.price) : product.priceRange);

const useOverlay = (onClose) => {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const pad = document.body.style.paddingRight;
    if (gap > 0 && gap <= 32) document.body.style.paddingRight = `${gap}px`;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = pad;
    };
  }, [onClose]);
};

const BagIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7.5h13l-1 12.5h-11z" /><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" /></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const ChevronIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6" /></svg>;

// The sort control paints its own menu instead of handing the job to a native
// <select>. The OS popup cannot be styled, so on every platform it opened as a
// flat white rectangle that shared nothing with the shelf's angled, neon faces —
// the one control in the filter bar that looked like it came from another site.
// Owning the listbox also buys the active row, the tick and the rotating chevron
// that tell the shopper the menu is open and which sort is live.
function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const current = SORTS.find((item) => item.id === value) || SORTS[0];

  // Opening parks the cursor on the sort already in force, so the first arrow
  // press steps away from where the shelf is rather than jumping to a far row.
  useEffect(() => {
    if (!open) return undefined;
    const at = SORTS.findIndex((item) => item.id === value);
    setCursor(at < 0 ? 0 : at);
    // Focus moves onto the list itself, which is what lets aria-activedescendant
    // announce the highlighted row while the shopper keeps arrowing.
    listRef.current?.focus();

    const onPointerDown = (event) => {
      if (wrapRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, value]);

  const close = (refocus) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (id) => {
    onChange(id);
    close(true);
  };

  const step = (delta) => setCursor((index) => (index + delta + SORTS.length) % SORTS.length);

  // Arrows open the menu first, then walk it. Enter and space commit, Escape and
  // Tab back out, and Home/End jump to either end of the list.
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      step(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (!open) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(SORTS[cursor].id); return; }
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Tab') { close(false); return; }
    if (event.key === 'Home') { event.preventDefault(); setCursor(0); return; }
    if (event.key === 'End') { event.preventDefault(); setCursor(SORTS.length - 1); }
  };

  return (
    <div className="fv-sort" ref={wrapRef} onKeyDown={onKeyDown}>
      <span className="fv-sort-label" aria-hidden="true">Sort</span>

      <button
        type="button"
        ref={triggerRef}
        className={`fv-sort-trigger${open ? ' is-open' : ''}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort products, currently ${current.label}`}
      >
        <span className="fv-sort-current">{current.label}</span>
        <ChevronIcon />
      </button>

      {open && (
        <ul
          className="fv-sort-menu"
          role="listbox"
          tabIndex={-1}
          ref={listRef}
          aria-label="Sort products"
          aria-activedescendant={`fv-sort-option-${SORTS[cursor].id}`}
        >
          {SORTS.map((item, index) => (
            <li
              key={item.id}
              id={`fv-sort-option-${item.id}`}
              role="option"
              aria-selected={item.id === value}
              className={`fv-sort-option${item.id === value ? ' is-current' : ''}${index === cursor ? ' is-cursor' : ''}`}
              onMouseEnter={() => setCursor(index)}
              // Keep the list from losing focus mid-press, which would blur the
              // menu out from under the click that is still on its way.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item.id)}
            >
              <span className="fv-sort-tick" aria-hidden="true" />
              <span className="fv-sort-copy">
                <b>{item.label}</b>
                <i aria-hidden="true">{item.hint}</i>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// View Details opens a centred popup: the shopper clicked a card, so the piece
// they picked comes forward in the middle of the stage with its full details.
function ProductModal({ product, onClose, onAdd }) {
  const closeRef = useRef(null);
  const artRef = useRef(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useOverlay(onClose);

  return (
    <div className="fv-overlay" role="presentation">
      <div className="fv-veil" onClick={onClose} data-testid="product-veil" />

      <div className="fv-modal" role="dialog" aria-modal="true" aria-label={product.name}>
        <button type="button" className="fv-modal-close" ref={closeRef} onClick={onClose} aria-label="Close item details"><CloseIcon /></button>

        <div className="fv-modal-art" ref={artRef}>
          <img src={product.image} alt={`Artwork for ${product.name}`} />
          <span className="fv-modal-stamp" aria-hidden="true">AUTHENTIC</span>
        </div>

        <div className="fv-modal-body">
          <p className="fv-modal-flags">
            <b>{product.category}</b>
            <i>The Fan Vault</i>
          </p>
          <h2>{product.name}</h2>
          <p className="fv-modal-price">{priceText(product)}</p>
          <p className="fv-modal-desc">{product.description}</p>
          <p className="fv-modal-note">Temporary shelf. Nothing is charged here, and the vault resets when you close the tab.</p>

          <div className="fv-modal-tools">
            <button type="button" className="fv-add" onClick={() => onAdd(product, artRef.current)}>Add to cart</button>
            <BookmarkButton
              entry={{ id: `product:${product.id}`, type: 'product', title: product.name, meta: product.category, image: product.image, href: '#shop' }}
              label="Save"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Pressing View Vault slides this drawer in from the right edge: the shopper
// asked to see the vault, and a side panel keeps the shelf behind it in view
// while they read, change or drop what they picked.
function CartDrawer({ lines, onClose, onChange, onRemove, onClear }) {
  const closeRef = useRef(null);

  useEffect(() => { closeRef.current?.focus(); }, []);
  useOverlay(onClose);

  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + line.qty * priceMid(line), 0);

  return (
    <div className="fv-overlay fv-overlay-bag" role="presentation">
      <div className="fv-veil" onClick={onClose} data-testid="cart-veil" />

      <aside className="fv-bag" role="dialog" aria-modal="true" aria-label="Your vault">
        <header className="fv-bag-head">
          <div>
            <h2>Your Vault</h2>
            <span aria-live="polite">{count} {count === 1 ? 'item' : 'items'}</span>
          </div>
          <button type="button" className="fv-bag-close" ref={closeRef} onClick={onClose} aria-label="Close your vault"><CloseIcon /></button>
        </header>

        {lines.length === 0 && (
          <p className="fv-bag-empty">
            The vault is empty. Hover a cover and press <b>Add to cart</b>, or open any item to add it from there.
          </p>
        )}

        <ul className="fv-bag-list">
          {lines.map((line) => (
            <li key={line.id} className="fv-bag-line">
              <img src={line.image} alt={`Artwork for ${line.name}`} />
              <div className="fv-bag-info">
                <b>{line.name}</b>
                <span>{line.category} &middot; {priceText(line)}</span>
                <div className="fv-qty">
                  <button type="button" onClick={() => onChange(line.id, line.qty - 1)} aria-label={`Remove one ${line.name}`}>&minus;</button>
                  <span aria-label={`Quantity of ${line.name}`}>{line.qty}</span>
                  <button type="button" onClick={() => onChange(line.id, line.qty + 1)} aria-label={`Add one more ${line.name}`}>+</button>
                </div>
              </div>
              <button type="button" className="fv-bag-remove" onClick={() => onRemove(line.id)} aria-label={`Remove ${line.name} from the vault`}>&times;</button>
            </li>
          ))}
        </ul>

        {lines.length > 0 && (
          <footer className="fv-bag-foot">
            <p className="fv-bag-total"><span>Total</span><b>{money(total)}</b></p>
            <p className="fv-bag-hint">No payment here. The vault is a preview of the full checkout flow.</p>
            <button type="button" className="fv-bag-clear" onClick={onClear}>Clear cart</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function ProductCard({ product, index, onOpen, onAdd }) {
  const price = priceText(product);
  const artRef = useRef(null);

  // The cover itself is the flight origin, so the card hands its <img> upward.
  const add = (event) => onAdd(product, artRef.current);

  return (
    <article className="fv-card">
      <div className="fv-card-art" ref={artRef}>
        <img src={product.image} alt="" loading="lazy" />
        {index % 12 === 0 && <i className="fv-card-badge">Vault pick</i>}
        <span className="fv-card-tag">{price}</span>

        <div className="fv-card-overlay">
          <p className="fv-card-flags"><b>{product.category}</b><i>{price}</i></p>
          <h3>{product.name}</h3>
          <p className="fv-card-desc">{product.description}</p>
          <div className="fv-card-tools">
            <button type="button" className="fv-add" onClick={add}>Add to cart</button>
            <button type="button" className="fv-card-view" onClick={() => onOpen(product)}>Details</button>
          </div>
        </div>
      </div>

      <div className="fv-card-foot">
        <button type="button" className="fv-card-name" onClick={() => onOpen(product)}>{product.name}</button>
        <span className="fv-card-actions">
          <span className="fv-card-price">{price}</span>
          <BookmarkButton
            entry={{ id: `product:${product.id}`, type: 'product', title: product.name, meta: product.category, image: product.image, href: '#shop' }}
            label="Save"
          />
        </span>
      </div>
    </article>
  );
}

function Shop() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY)) || 'dark');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('featured');
  const [openProduct, setOpenProduct] = useState(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [fly, setFly] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [addedNotice, setAddedNotice] = useState('');
  const vaultRef = useRef(null);
  const flyTimer = useRef(null);
  const pulseTimer = useRef(null);
  const noticeTimer = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(flyTimer.current);
    window.clearTimeout(pulseTimer.current);
    window.clearTimeout(noticeTimer.current);
  }, []);

  // Drops a clone of the cover at its real position, then flies it into the
  // View Vault button. Skipped when the shopper asked for less motion.
  const launchFly = (product, source) => {
    const target = vaultRef.current;
    const calm = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (calm) {
      setPulse(true);
      window.clearTimeout(pulseTimer.current);
      pulseTimer.current = window.setTimeout(() => setPulse(false), 600);
      return;
    }

    const from = source?.getBoundingClientRect?.();
    const to = target?.getBoundingClientRect?.();
    if (!from || !to) return;

    setFly({
      key: `${product.id}-${Date.now()}`,
      image: product.image,
      left: from.left,
      top: from.top,
      // A hidden source still gets a visible flyer rather than a 0px speck.
      size: from.width || 120,
      dx: to.left + to.width / 2 - (from.left + from.width / 2),
      dy: to.top + to.height / 2 - (from.top + from.height / 2),
    });

    window.clearTimeout(flyTimer.current);
    flyTimer.current = window.setTimeout(() => setFly(null), 760);
  };

  useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage is optional */ }
  }, [theme]);

  useEffect(() => {
    let live = true;
    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!live) return;
        setData(payload);
        setStatus('ready');
      })
      .catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, []);

  // Held in a memo so the shelf identity is stable across renders; otherwise
  // every state change would hand the filters a brand new array.
  const products = useMemo(() => data?.products || [], [data]);

  const shown = useMemo(() => {
    const list = tab === 'all' ? products : products.filter((item) => slugOf(item.category) === tab);
    if (sort === 'low') return [...list].sort((a, b) => priceMid(a) - priceMid(b));
    if (sort === 'high') return [...list].sort((a, b) => priceMid(b) - priceMid(a));
    if (sort === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, tab, sort]);

  const counts = useMemo(() => {
    const out = { all: products.length };
    products.forEach((item) => {
      const key = slugOf(item.category);
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }, [products]);

  const bagCount = lines.reduce((sum, line) => sum + line.qty, 0);

  const changeQty = (id, qty) => {
    if (qty < 1) { setLines((list) => list.filter((line) => line.id !== id)); return; }
    setLines((list) => list.map((line) => (line.id === id ? { ...line, qty } : line)));
  };

  // Adding never yanks the panel open: the piece flies to the View Vault button
  // and the shopper decides when to look inside.
  const addToCart = (product, source) => {
    setLines((list) => {
      const found = list.find((line) => line.id === product.id);
      if (found) return list.map((line) => (line.id === product.id ? { ...line, qty: line.qty + 1 } : line));
      return [...list, { ...product, qty: 1 }];
    });
    setOpenProduct(null);
    setPulse(true);
    setAddedNotice(`${product.name} added to your vault`);
    window.clearTimeout(pulseTimer.current);
    window.clearTimeout(noticeTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 600);
    noticeTimer.current = window.setTimeout(() => setAddedNotice(''), 2600);
    launchFly(product, source);
  };

  return (
    <div className={`fv-page theme-${theme}`}>
      <div className="fv-glow fv-glow-one" aria-hidden="true" />
      <div className="fv-glow fv-glow-two" aria-hidden="true" />
      <div className="fv-grid-lines" aria-hidden="true" />

      <SiteNav theme={theme} setTheme={setTheme} active="shop" variant="shop" />

      {status === 'loading' && <p className="fv-note">Unlocking the vault...</p>}

      {status === 'error' && (
        <div className="fv-note fv-note-error" role="alert">
          <b>The vault stayed shut.</b> The shelf could not be loaded. <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}

      {status === 'ready' && products.length > 0 && (
        <>
          <header className="fv-hero">
            <span className="fv-hero-grid" aria-hidden="true" />
            <img className="fv-hero-art" src="/assets/images/shop%20bg.png" alt="" aria-hidden="true" />
            <span className="fv-hero-ticker" aria-hidden="true">FV / CURATED OBJECTS / DROP 01</span>
            <span className="fv-hero-stamp" aria-hidden="true">LIMITED RUNS</span>

            <div className="fv-hero-copy">
              <p className="fv-hero-kicker">Fandomverse Editions · Open shelf</p>
              <h1>THE FAN <em>VAULT</em></h1>
              <p className="fv-hero-tagline">{data.page?.tagline || 'Objects worth keeping.'}</p>
              <p className="fv-hero-blurb">
                Posters, prints, figures and small editions from every universe on the site. Picked by fans,
                printed in short runs, and never restocked.
              </p>
            </div>

            <div className="fv-hero-vault">
              <button
                type="button"
                ref={vaultRef}
                className={`fv-vault-button${bagOpen ? ' is-open' : ''}${bagCount ? ' has-items' : ''}${pulse ? ' is-pulse' : ''}`}
                onClick={() => setBagOpen(true)}
                aria-label={`View vault${bagCount ? `, ${bagCount} item${bagCount === 1 ? '' : 's'}` : ', empty'}`}
              >
                <BagIcon />
                <span>View Vault</span>
                <b aria-hidden="true">{bagCount}</b>
              </button>
              <p className="fv-hero-vault-note">
                {bagCount
                  ? <>{bagCount} {bagCount === 1 ? 'piece' : 'pieces'} waiting in your vault.</>
                  : 'Hover a cover for the details, or add a piece and it will fly up here.'}
              </p>
              <p className="fv-added-notice" aria-live="polite">{addedNotice}</p>
            </div>
          </header>

          <section className="fv-match" aria-label="Fandom match">
            <div className="fv-match-copy">
              <h2>WHAT'S YOUR FANDOM?</h2>
              <p>Pick a universe and the vault reshapes itself around it. Pick another one whenever you like.</p>
            </div>
            <div className="fv-match-choices" role="group" aria-label="Choose your fandom">
              {TABS.filter((item) => item.id !== 'all').map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`fv-match-choice${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(tab === item.id ? 'all' : item.id)}
                  aria-pressed={tab === item.id}
                >
                  {item.label}
                  <i>{counts[item.id] || 0}</i>
                </button>
              ))}
            </div>
            <p className="fv-match-state" aria-live="polite">
              Showing <b>{labelOf(tab)}</b> · {shown.length} of {products.length} pieces
            </p>
          </section>

          <div className="fv-toolbar">
            <nav className="fv-tabs" aria-label="Explore the vault">
              {TABS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`fv-tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                  aria-pressed={tab === item.id}
                >
                  {item.label}
                  <i>{counts[item.id] || 0}</i>
                </button>
              ))}
            </nav>

            <SortMenu value={sort} onChange={setSort} />
          </div>

          {shown.length === 0 ? (
            <p className="fv-note">Nothing in this universe yet. Try another fandom.</p>
          ) : (
            <section className="fv-vault" id="fv-vault" aria-label="Vault collection">
              {shown.map((product, index) => (
                <ProductCard product={product} index={index} key={product.id} onOpen={setOpenProduct} onAdd={addToCart} />
              ))}
            </section>
          )}
        </>
      )}

      {fly && (
        <span
          key={fly.key}
          className="fv-fly"
          aria-hidden="true"
          style={{ left: `${fly.left}px`, top: `${fly.top}px`, width: `${fly.size}px`, '--fv-fly-x': `${fly.dx}px`, '--fv-fly-y': `${fly.dy}px` }}
        >
          <img src={fly.image} alt="" />
        </span>
      )}

      {openProduct && (
        <ProductModal product={openProduct} onClose={() => setOpenProduct(null)} onAdd={addToCart} />
      )}

      {bagOpen && (
        <CartDrawer
          lines={lines}
          onClose={() => setBagOpen(false)}
          onChange={changeQty}
          onRemove={(id) => setLines((list) => list.filter((line) => line.id !== id))}
          onClear={() => setLines([])}
        />
      )}

      <SiteFooter />
    </div>
  );
}

export default Shop;
