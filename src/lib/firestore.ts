import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

// All per-parent data lives under `users/{uid}` so Firestore security rules
// can isolate one parent's data from another's. This module is the single
// place that knows the on-disk shape; feature hooks build on top of it.
const userRoot = (uid: string) => `users/${uid}`;

export const paths = {
  tasks: (uid: string) => `${userRoot(uid)}/tasks`,
  adhoc: (uid: string) => `${userRoot(uid)}/adhoc`,
  completions: (uid: string) => `${userRoot(uid)}/completions`,
  settings: (uid: string) => `${userRoot(uid)}/meta/settings`,
};

/** Subscribe to every document in a user-scoped collection. */
export function subscribeCollection<T>(
  collectionPath: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, collectionPath),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
    },
    (err) => onError?.(err),
  );
}

/** Subscribe to a single user-scoped document. */
export function subscribeDoc<T>(
  docPath: string,
  onData: (data: T | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, docPath),
    (snap) => {
      onData(snap.exists() ? (snap.data() as T) : null);
    },
    (err) => onError?.(err),
  );
}

export function writeDoc<T extends DocumentData>(
  collectionPath: string,
  id: string,
  data: T,
): Promise<void> {
  return setDoc(doc(db, collectionPath, id), data);
}

export function writeSingleton<T extends DocumentData>(
  docPath: string,
  data: T,
): Promise<void> {
  return setDoc(doc(db, docPath), data);
}

export function removeDoc(collectionPath: string, id: string): Promise<void> {
  return deleteDoc(doc(db, collectionPath, id));
}
