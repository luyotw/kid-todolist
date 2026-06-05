import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { db } from './firebase';
import { familyPaths } from './family/paths';

// 使用者路徑（過渡期 #38 前仍由 app 使用）與家庭路徑（v2 隔離單位）集中於此模組。
const userRoot = (uid: string) => `users/${uid}`;

export const paths = {
  tasks: (uid: string) => `${userRoot(uid)}/tasks`,
  adhoc: (uid: string) => `${userRoot(uid)}/adhoc`,
  completions: (uid: string) => `${userRoot(uid)}/completions`,
  settings: (uid: string) => `${userRoot(uid)}/meta/settings`,
  family: familyPaths,
};

/** Subscribe to every document in a user-scoped collection. */
export function subscribeCollection<T>(
  collectionPath: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void,
  firestore: Firestore = db,
): () => void {
  return onSnapshot(
    collection(firestore, collectionPath),
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
  firestore: Firestore = db,
): () => void {
  return onSnapshot(
    doc(firestore, docPath),
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
  firestore: Firestore = db,
): Promise<void> {
  return setDoc(doc(firestore, collectionPath, id), data);
}

export function writeSingleton<T extends DocumentData>(
  docPath: string,
  data: T,
  firestore: Firestore = db,
): Promise<void> {
  return setDoc(doc(firestore, docPath), data);
}

export function removeDoc(
  collectionPath: string,
  id: string,
  firestore: Firestore = db,
): Promise<void> {
  return deleteDoc(doc(firestore, collectionPath, id));
}

export async function isCollectionEmpty(
  collectionPath: string,
  firestore: Firestore = db,
): Promise<boolean> {
  const snap = await getDocs(collection(firestore, collectionPath));
  return snap.empty;
}

export async function readSingletonDoc<T>(
  docPath: string,
  firestore: Firestore = db,
): Promise<T | null> {
  const snap = await getDoc(doc(firestore, docPath));
  return snap.exists() ? (snap.data() as T) : null;
}

export async function listCollectionDocs<T extends { id: string }>(
  collectionPath: string,
  firestore: Firestore = db,
): Promise<T[]> {
  const snap = await getDocs(collection(firestore, collectionPath));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}
