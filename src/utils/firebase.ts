import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  FacebookAuthProvider,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DailyJournal, AppSettings } from '../types';
import { calculateJournalSummary } from './calculations';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Add offline prompt configuration
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});
microsoftProvider.addScope('User.Read');

/**
 * Sign in with Microsoft Popup
 */
export async function signInWithMicrosoft(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    const user = result.user;

    // Save/update user profile in firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'microsoft.com',
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    }

    return user;
  } catch (error: any) {
    console.error('Error during Microsoft sign-in:', error);
    throw error;
  }
}

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
facebookProvider.setCustomParameters({
  display: 'popup'
});

/**
 * Sign in with Facebook Popup
 */
export async function signInWithFacebook(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;

    // Save/update user profile in firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'facebook.com',
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    }

    return user;
  } catch (error: any) {
    console.error('Error during Facebook sign-in:', error);
    throw error;
  }
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save/update user profile in firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    }

    return user;
  } catch (error: any) {
    console.error('Error during Google sign-in:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Save or update a daily journal to Firestore under the user's account
 */
export async function saveJournalToCloud(userId: string, journal: DailyJournal): Promise<void> {
  try {
    const journalRef = doc(db, 'users', userId, 'journals', journal.id || `journal-${journal.date}`);
    await setDoc(journalRef, {
      ...journal,
      userId,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to save journal to cloud:', error);
    throw error;
  }
}

/**
 * Batch save multiple journals to cloud (during initial sync)
 */
export async function syncAllJournalsToCloud(userId: string, journals: DailyJournal[]): Promise<void> {
  try {
    for (const journal of journals) {
      await saveJournalToCloud(userId, journal);
    }
  } catch (error) {
    console.error('Failed to sync all journals to cloud:', error);
    throw error;
  }
}

/**
 * Load all journals from Cloud Firestore for a user
 */
export async function loadJournalsFromCloud(userId: string): Promise<DailyJournal[]> {
  try {
    const journalsRef = collection(db, 'users', userId, 'journals');
    const q = query(journalsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    const loadedJournals: DailyJournal[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const sellers = Array.isArray(data.sellers) ? data.sellers : [];
      const expenses = Array.isArray(data.expenses) ? data.expenses : [];
      const unitSellingPrice = Number(data.unitSellingPrice) || 175;
      const unitReturnPrice = Number(data.unitReturnPrice) || 50;
      const unitCostPrice = Number(data.unitCostPrice) || 100;

      let summary = data.summary;
      if (!summary || typeof summary.netGain !== 'number') {
        summary = calculateJournalSummary(
          sellers,
          unitSellingPrice,
          unitReturnPrice,
          unitCostPrice,
          expenses,
          'excel_sheet_mode'
        );
      }

      loadedJournals.push({
        id: data.id || docSnap.id,
        date: data.date,
        title: data.title || `Journal du ${data.date}`,
        productName: data.productName || 'Pain / Baguette',
        unitSellingPrice,
        unitReturnPrice,
        unitCostPrice,
        sellers,
        expenses,
        summary,
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    return loadedJournals;
  } catch (error) {
    console.error('Failed to load journals from cloud:', error);
    return [];
  }
}

/**
 * Delete a journal from Cloud Firestore
 */
export async function deleteJournalFromCloud(userId: string, journalId: string): Promise<void> {
  try {
    const journalRef = doc(db, 'users', userId, 'journals', journalId);
    await deleteDoc(journalRef);
  } catch (error) {
    console.error('Failed to delete journal from cloud:', error);
    throw error;
  }
}

/**
 * Save user app settings to cloud
 */
export async function saveSettingsToCloud(userId: string, settings: AppSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'general');
    await setDoc(settingsRef, {
      ...settings,
      userId,
      syncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to save settings to cloud:', error);
  }
}

/**
 * Load user app settings from cloud
 */
export async function loadSettingsFromCloud(userId: string): Promise<AppSettings | null> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'general');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
  } catch (error) {
    console.error('Failed to load settings from cloud:', error);
  }
  return null;
}
