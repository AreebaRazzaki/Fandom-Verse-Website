import { useEffect, useState } from 'react';
import { EMAIL, Field, GlitchFandoms, GuestAccess } from './authShared';
import './auth.css';

const THEME_KEY = 'login-theme';

function Login() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && window.localStorage.getItem(THEME_KEY)) || 'dark');
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage is optional */ }
  }, [theme]);

  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  // A demo gate: it checks the shape of what was typed, then flips the screen
  // to a signed-in state. No account is created and nothing is stored.
  const onSubmit = (event) => {
    event.preventDefault();
    const found = {};
    if (!values.email.trim()) found.email = 'Enter the email or username you signed up with.';
    else if (values.email.includes('@') && !EMAIL.test(values.email.trim())) found.email = 'That email address does not look right.';
    if (!values.password) found.password = 'Enter your password.';
    else if (values.password.length < 6) found.password = 'Passwords are at least 6 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setDone(true);
  };

  return (
    <div className={`au-page au-page-strip theme-${theme}`}>
      <div className="au-glow au-glow-one" aria-hidden="true" />
      <div className="au-glow au-glow-two" aria-hidden="true" />

      {/* Same treatment as sign-up: no nav, no footer, no art panel. The seven
          fandom images drift past behind the form as a glitch band. */}
      <div className="au-strip">
        <GlitchFandoms />

        <div className="au-theme-toggle">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        <section className="au-panel" aria-label="Sign in">
          {done ? (
            <div className="au-done" role="status">
              <span className="au-done-mark" aria-hidden="true">&#10003;</span>
              <h1>YOU ARE IN</h1>
              <p>Signed in as {values.email.trim()}. This is a demo, so nothing was sent anywhere.</p>
              <a className="au-cta" href="#home">Back to the site</a>
            </div>
          ) : (
            <>
              <p className="au-kicker">Members</p>
              <h1 className="au-title">ENTER THE <em>VERSE</em></h1>
              <p className="au-sub">Sign in to reach your bookmarks, notes and saved pieces.</p>

              <form className="au-form" onSubmit={onSubmit} noValidate>
                <Field
                  id="au-email"
                  label="Email or username"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={values.email}
                  error={errors.email}
                  onChange={update('email')}
                />
                <Field
                  id="au-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={values.password}
                  error={errors.password}
                  onChange={update('password')}
                />

                <div className="au-row">
                  <label className="au-check">
                    <input type="checkbox" name="remember" />
                    <span>Keep me signed in</span>
                  </label>
                  <button type="button" className="au-link" onClick={() => setForgot((value) => !value)}>
                    Forgot password?
                  </button>
                </div>

                {forgot && (
                  <p className="au-note" role="status">
                    Password resets are not wired up in this demo. Ask the team and we will help you back in.
                  </p>
                )}

                <button type="submit" className="au-cta">Sign in</button>
              </form>

              <GuestAccess />

              <p className="au-switch">
                New to the verse? <a href="#sign-up">Create an account</a>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Login;
