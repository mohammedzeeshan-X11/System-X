import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { SelfAttestedProficiency } from '../types';
import { updateSelfAttestedCompetency, getCurrentProfile } from './storage';

// Safe Firebase configuration
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyKarmayogiMoSPI2026',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || 'karmayogi-mospi.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || 'karmayogi-mospi-portal',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'karmayogi-mospi-portal.appspot.com',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: metaEnv.VITE_FIREBASE_APP_ID || '1:1029384756:web:8a7b6c5d4e3f2a1b',
};

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization notice (offline mode available):', err);
}

export const db = firestoreDb;

/**
 * Saves a self-declared competency proficiency to Firestore,
 * and synchronizes with the persistent storage layer.
 */
export async function saveSelfAttestationToFirestore(
  userId: string,
  competencyName: string,
  level: SelfAttestedProficiency
): Promise<{ success: boolean; firestoreSaved: boolean }> {
  // 1. Always persist to durable local storage immediately
  updateSelfAttestedCompetency(userId, competencyName, level);

  // 2. Attempt Firestore remote sync
  let firestoreSaved = false;
  if (firestoreDb) {
    try {
      const sanitizedCompName = competencyName.replace(/[/#?]/g, '_');
      const docRef = doc(firestoreDb, 'officials', userId, 'selfAttestations', sanitizedCompName);
      await setDoc(
        docRef,
        {
          competencyName,
          level,
          updatedAt: new Date().toISOString(),
          syncedFrom: 'karmayogi_portal',
        },
        { merge: true }
      );
      firestoreSaved = true;
    } catch (error) {
      console.warn('Firestore write warning (persisted locally):', error);
      // We still return success: true because the local persistent state is updated
      firestoreSaved = false;
    }
  }

  return { success: true, firestoreSaved };
}

/**
 * Loads self-attested competencies from Firestore for the given user,
 * falling back to local persistent storage if offline.
 */
export async function getSelfAttestationsFromFirestore(
  userId: string
): Promise<Record<string, SelfAttestedProficiency>> {
  const result: Record<string, SelfAttestedProficiency> = {};

  // First try Firestore
  if (firestoreDb) {
    try {
      const collRef = collection(firestoreDb, 'officials', userId, 'selfAttestations');
      const snapshot = await getDocs(collRef);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.competencyName && data.level) {
          result[data.competencyName] = data.level as SelfAttestedProficiency;
        }
      });
      if (Object.keys(result).length > 0) {
        return result;
      }
    } catch (err) {
      console.warn('Firestore fetch notice (using persistent local storage):', err);
    }
  }

  // Fallback to local profile
  const profile = getCurrentProfile();
  return profile.selfAttestedCompetencies || {};
}
