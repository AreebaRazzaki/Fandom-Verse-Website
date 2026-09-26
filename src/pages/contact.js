import { useEffect, useState } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './contact.css';

const THEME_KEY = 'contact-theme';

const STUDIO = {
  email: 'hello@fandomverse.com',
  phone: '+92 300 1234567',
  location: 'Studio 4, Fandomverse House, Karachi, Pakistan',
  hours: 'Monday to Saturday, 10am to 8pm PKT',
  socials: [
    { label: 'Instagram', handle: '@fandomverse', href: '#contact' },
    { label: 'X', handle: '@fandomverse', href: '#contact' },
    { label: 'YouTube', handle: 'Fandomverse', href: '#contact' },
    { label: 'Discord', handle: 'fandomverse', href: '#contact' },
  ],
};

// Fields are validated on the client so a typo never leaves the browser.
const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name', placeholder: 'Your name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { name: 'subject', label: 'Subject', type: 'text', autoComplete: 'off', placeholder: 'What is this about?' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Please tell us your name.';
  if (!values.email.trim()) errors.email = 'We need an email to reply to.';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'That email address does not look right.';
  if (!values.subject.trim()) errors.subject = 'Add a short subject.';
  if (!values.message.trim()) errors.message = 'Write a message so we know what you need.';
  else if (values.message.trim().length < 12) errors.message = 'A little more detail helps us answer properly.';
  return errors;
}

function Contact() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY)) || 'dark');
  const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState('');

  useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage is optional */ }
  }, [theme]);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    // Clear a field's complaint as soon as the shopper starts fixing it.
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSent(true);
  };

  const reset = () => {
    setValues({ name: '', email: '', subject: '', message: '' });
    setErrors({});
    setSent(false);
  };

  // GPS gives the studio a rough distance so a visitor can tell if they are
  // local. Denied or unsupported is not an error, it just stays quiet.
  const locate = () => {
    if (!navigator.geolocation) { setLocation('Location is not available in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocation(`You are near ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}.`);
      },
      () => { setLocating(false); setLocation('We could not read your location. The map below still works.'); },
      { timeout: 8000 },
    );
  };

  return (
    <div className={`ct-page theme-${theme}`}>
      <div className="ct-glow ct-glow-one" aria-hidden="true" />
      <div className="ct-glow ct-glow-two" aria-hidden="true" />

      <SiteNav theme={theme} setTheme={setTheme} active="contact" variant="contact" />

      <header className="ct-hero">
        {/* Decorative geometry dresses the heading and the right-hand field, so
            the top of the page is not an empty band. Everything sits behind the
            copy and clear of the middle, where the words have to stay readable. */}
        <div className="ct-hero-shapes" aria-hidden="true">
          <span className="ct-shape is-halo" />
          <span className="ct-shape is-ring" />
          <span className="ct-shape is-ring is-ring-outer" />
          <span className="ct-shape is-disc" />
          <span className="ct-shape is-blob" />
          <span className="ct-shape is-shard" />
          <span className="ct-shape is-bar" />
          <span className="ct-shape is-bar is-bar-two" />
          <span className="ct-shape is-dot" />
          <span className="ct-shape is-grid" />
        </div>

        <div className="ct-hero-inner">
          <p className="ct-kicker">Contact</p>
          <h1>TALK TO THE <em>FANDOMVERSE</em></h1>
          <p className="ct-lede">
            Questions, corrections, a shelf you want stocked, or just want to say hi — send it over and one of
            the seven of us will pick it up.
          </p>
        </div>
      </header>

      <div className="ct-split">
        <aside className="ct-details" aria-label="How to reach us">
          <h2>WHERE TO FIND US</h2>

          <dl className="ct-list">
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a></dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd><a href={`tel:${STUDIO.phone.replace(/\s/g, '')}`}>{STUDIO.phone}</a></dd>
            </div>
            <div>
              <dt>Studio</dt>
              <dd>{STUDIO.location}</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{STUDIO.hours}</dd>
            </div>
          </dl>

          <div className="ct-gps">
            <button type="button" className="ct-gps-button" onClick={locate} disabled={locating}>
              {locating ? 'Locating...' : 'Use my location'}
            </button>
            <p className="ct-gps-note" aria-live="polite">{location}</p>
          </div>

          <ul className="ct-socials">
            {STUDIO.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href}>
                  <b>{social.label}</b>
                  <span>{social.handle}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <section className="ct-form-wrap" aria-label="Send us a message">
          {sent ? (
            <div className="ct-sent" role="status">
              <span className="ct-sent-mark" aria-hidden="true">&#10003;</span>
              <h2>TRANSMISSION SENT</h2>
              <p>
                Thanks {values.name.trim().split(' ')[0]}, your message is with the team. We answer every
                email, usually within a day.
              </p>
              <button type="button" className="ct-again" onClick={reset}>Send another message</button>
            </div>
          ) : (
            <form className="ct-form" onSubmit={onSubmit} noValidate>
              {FIELDS.map((field) => (
                <div className="ct-field" key={field.name}>
                  <label htmlFor={`ct-${field.name}`}>{field.label}</label>
                  <input
                    id={`ct-${field.name}`}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    value={values[field.name]}
                    aria-invalid={errors[field.name] ? 'true' : undefined}
                    aria-describedby={errors[field.name] ? `ct-${field.name}-error` : undefined}
                    onChange={update(field.name)}
                  />
                  {errors[field.name] && <p className="ct-error" id={`ct-${field.name}-error`}>{errors[field.name]}</p>}
                </div>
              ))}

              <div className="ct-field">
                <label htmlFor="ct-message">Message</label>
                <textarea
                  id="ct-message"
                  name="message"
                  rows={6}
                  placeholder="Tell us what you need."
                  value={values.message}
                  aria-invalid={errors.message ? 'true' : undefined}
                  aria-describedby={errors.message ? 'ct-message-error' : undefined}
                  onChange={update('message')}
                />
                {errors.message && <p className="ct-error" id="ct-message-error">{errors.message}</p>}
              </div>

              <button type="submit" className="ct-send">Send message</button>
            </form>
          )}
        </section>
      </div>

      <section className="ct-map" aria-label="Studio location">
        <h2>FIND THE STUDIO</h2>
        <div className="ct-map-frame">
          <iframe
            title="Fandomverse studio location map"
            src="https://www.google.com/maps?q=Karachi%2C%20Pakistan&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a
          className="ct-directions"
          href="https://www.google.com/maps/dir/?api=1&destination=Karachi%2C%20Pakistan"
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps<span className="ct-directions-arrow" aria-hidden="true">&#8599;</span>
        </a>
      </section>

      <SiteFooter />
    </div>
  );
}

export default Contact;
