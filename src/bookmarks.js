import { useSyncExternalStore } from 'react';

const KEY = 'fandomverse-bookmarks';
const TYPES = ['article', 'trailer', 'event', 'release', 'product', 'character'];

let cache = null;
let listeners = [];

// Every read goes to storage, so a wiped list, another tab, or a page reload is
// picked up immediately. The parsed array is only rebuilt when the raw string
// actually changes, which keeps getSnapshot referentially stable for React.
const read = () => {
  let raw = '';
  try {
    raw = window.localStorage.getItem(KEY) || '';
  } catch {
    raw = '';
  }

  if (cache && cache.raw === raw) return cache.list;

  let list = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    list = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    list = [];
  }

  cache = { raw, list };
  return list;
};

const write = (next) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable, private mode, or quota: the UI still updates */
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.push(listener);
  return () => { listeners = listeners.filter((item) => item !== listener); };
};

// Another tab edited the list, so tell every mounted page to look again.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== KEY) return;
    cache = null;
    listeners.forEach((listener) => listener());
  });
}

export const getBookmarks = () => read();
export const isSaved = (id) => read().some((item) => item.id === id);

export const saveBookmark = ({ id, type, title, meta = '', image = '', href = '' }) => {
  if (!id || !TYPES.includes(type) || isSaved(id)) return;
  write([{ id, type, title, meta, image, href, note: '', at: new Date().toISOString() }, ...read()]);
};

export const removeBookmark = (id) => write(read().filter((item) => item.id !== id));

export const toggleBookmark = (entry) => {
  if (isSaved(entry.id)) removeBookmark(entry.id);
  else saveBookmark(entry);
};

export const setBookmarkNote = (id, note) => {
  write(read().map((item) => (item.id === id ? { ...item, note } : item)));
};

export const clearBookmarks = () => write([]);

// Drops the parsed copy so the next read rebuilds it from storage.
export const resyncBookmarks = () => {
  cache = null;
  listeners.forEach((listener) => listener());
};

export const countByType = (type) => read().filter((item) => item.type === type).length;

export const useBookmarks = () => useSyncExternalStore(subscribe, read, read);
