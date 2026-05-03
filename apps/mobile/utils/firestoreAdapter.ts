// utils/firestoreAdapter.ts
import { getFirebase } from './firebaseClient';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

export interface DatabaseAdapter {
  create<T>(collectionName: string, userId: string, itemId: string, data: T): Promise<void>;
  read<T>(collectionName: string, userId: string, itemId: string): Promise<T | null>;
  update<T>(collectionName: string, userId: string, itemId: string, data: Partial<T>): Promise<void>;
  delete(collectionName: string, userId: string, itemId: string): Promise<void>;
  list<T>(collectionName: string, userId: string): Promise<T[]>;
  search<T>(collectionName: string, userId: string, predicate: (item: T) => boolean): Promise<T[]>;
  batchCreate<T>(collectionName: string, userId: string, items: Array<{ id: string; data: T }>): Promise<void>;
  batchDelete(collectionName: string, userId: string, itemIds: string[]): Promise<void>;
}

export class FirestoreAdapter implements DatabaseAdapter {
  async create<T>(collectionName: string, userId: string, itemId: string, data: T): Promise<void> {
    const { db } = getFirebase();
    const id = `${userId}_${itemId}`;
    const ref = doc(collection(db, collectionName), id);
    await setDoc(ref, { ...data, _userId: userId, _id: itemId, _createdAt: Timestamp.now() } as any, { merge: true });
  }

  async read<T>(collectionName: string, userId: string, itemId: string): Promise<T | null> {
    const { db } = getFirebase();
    const id = `${userId}_${itemId}`;
    const ref = doc(collection(db, collectionName), id);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as T) : null;
  }

  async update<T>(collectionName: string, userId: string, itemId: string, data: Partial<T>): Promise<void> {
    const { db } = getFirebase();
    const id = `${userId}_${itemId}`;
    const ref = doc(collection(db, collectionName), id);
    await updateDoc(ref, { ...(data as any), _updatedAt: Timestamp.now() } as any);
  }

  async delete(collectionName: string, userId: string, itemId: string): Promise<void> {
    const { db } = getFirebase();
    const id = `${userId}_${itemId}`;
    const ref = doc(collection(db, collectionName), id);
    await deleteDoc(ref);
  }

  async list<T>(collectionName: string, userId: string): Promise<T[]> {
    const { db } = getFirebase();
    const col = collection(db, collectionName);
    const q = query(col, where('_userId', '==', userId));
    const snap = await getDocs(q);
    const items: T[] = [];
    snap.forEach(d => items.push(d.data() as T));
    return items;
  }

  async search<T>(collectionName: string, userId: string, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.list<T>(collectionName, userId);
    return all.filter(predicate);
  }

  async batchCreate<T>(collectionName: string, userId: string, items: Array<{ id: string; data: T }>): Promise<void> {
    const { db } = getFirebase();
    const batch = writeBatch(db);
    const col = collection(db, collectionName);
    for (const { id, data } of items) {
      const docId = `${userId}_${id}`;
      batch.set(doc(col, docId), { ...data, _userId: userId, _id: id, _createdAt: Timestamp.now() } as any, { merge: true });
    }
    await batch.commit();
  }

  async batchDelete(collectionName: string, userId: string, itemIds: string[]): Promise<void> {
    const { db } = getFirebase();
    const batch = writeBatch(db);
    const col = collection(db, collectionName);
    for (const id of itemIds) {
      const docId = `${userId}_${id}`;
      batch.delete(doc(col, docId));
    }
    await batch.commit();
  }
}

export const firestoreAdapter = new FirestoreAdapter();


