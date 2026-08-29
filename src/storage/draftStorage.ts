import type { StateStorage } from 'zustand/middleware';

export const DRAFT_STORAGE_KEY = 'exam-seating-draft';
export const DRAFT_LAST_SAVED_KEY = 'exam-seating-draft-last-saved';

let saveTimer: number | undefined;

export function readDraft(): Record<string, unknown> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function hasDraft(): boolean {
  return readDraft() !== null;
}

export function getLastSavedTimestamp(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(DRAFT_LAST_SAVED_KEY);
}

export function clearDraft(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(DRAFT_LAST_SAVED_KEY);
}

export const draftStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = window.localStorage.getItem(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }

    saveTimer = window.setTimeout(() => {
      window.localStorage.setItem(name, value);
      window.localStorage.setItem(DRAFT_LAST_SAVED_KEY, new Date().toISOString());
    }, 500);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(name);
    window.localStorage.removeItem(DRAFT_LAST_SAVED_KEY);
  },
};
