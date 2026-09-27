import { useEffect, useRef, useState } from 'react';
import { isSaved, removeBookmark, saveBookmark, setBookmarkNote, useBookmarks } from '../bookmarks';
import './BookmarkButton.css';

const TYPE_GLYPH = { article: 'A', trailer: 'T', event: 'E', release: 'R', product: 'P', character: 'C', gallery: 'G' };

function BookmarkButton({ entry, label = 'Save', className = '' }) {
  const saved = useBookmarks();
  const [naming, setNaming] = useState(false);
  const [note, setNote] = useState('');
  const fieldRef = useRef(null);

  const isOn = saved.some((item) => item.id === entry.id);
  const stored = saved.find((item) => item.id === entry.id) || null;
  const storedNote = stored ? stored.note : '';

  useEffect(() => {
    if (naming && fieldRef.current) fieldRef.current.focus();
  }, [naming]);

  useEffect(() => {
    setNote(storedNote);
  }, [storedNote]);

  const turnOn = () => {
    saveBookmark(entry);
    setNaming(true);
  };

  const turnOff = () => {
    removeBookmark(entry.id);
    setNaming(false);
  };

  const commitNote = (value) => {
    setNote(value);
    if (isSaved(entry.id)) setBookmarkNote(entry.id, value);
  };

  return (
    <span className={`bookmark ${isOn ? 'is-on' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="bookmark-toggle"
        onClick={isOn ? turnOff : turnOn}
        aria-pressed={isOn}
        aria-label={isOn ? `Remove ${entry.title} from bookmarks` : `${label} ${entry.title}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.2a.6.6 0 0 1-.93.5L12 16.5l-6.07 4.2a.6.6 0 0 1-.93-.5V5a1.5 1.5 0 0 1 1.5-1.5z" />
        </svg>
        <span>{isOn ? 'Saved' : label}</span>
      </button>

      {naming && (
        <span className="bookmark-note">
          <span className="bookmark-note-head">
            <b>{TYPE_GLYPH[entry.type] || 'S'}</b> Note <i>optional</i>
          </span>
          <input
            ref={fieldRef}
            type="text"
            value={note}
            placeholder="Why are you saving this?"
            aria-label={`Note for ${entry.title}`}
            onChange={(event) => commitNote(event.target.value)}
          />
          <span className="bookmark-note-foot">
            <button type="button" onClick={() => setNaming(false)}>Skip</button>
            <button type="button" className="is-primary" onClick={() => setNaming(false)}>Save note</button>
          </span>
        </span>
      )}

      {isOn && !naming && (
        <button
          type="button"
          className="bookmark-edit"
          onClick={() => setNaming(true)}
          aria-label={`Add a note to ${entry.title}`}
          title="Add a note"
        >
          {stored.note ? 'Edit note' : '+ note'}
        </button>
      )}
    </span>
  );
}

export default BookmarkButton;
