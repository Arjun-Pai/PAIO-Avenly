import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar');
googleAuthProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleAuthProvider.addScope('https://www.googleapis.com/auth/chat.messages');
googleAuthProvider.addScope('https://www.googleapis.com/auth/chat.spaces');
googleAuthProvider.addScope('https://www.googleapis.com/auth/contacts');
googleAuthProvider.addScope('https://www.googleapis.com/auth/meetings.space.created');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');

let signInPromise: Promise<any> | null = null;
let cachedOAuthToken: string | null = localStorage.getItem('avenly_oauth_token');

export function getCachedOAuthToken() {
  return cachedOAuthToken || localStorage.getItem('avenly_oauth_token');
}

export function setCachedOAuthToken(token: string | null) {
  cachedOAuthToken = token;
  if (token) {
    localStorage.setItem('avenly_oauth_token', token);
  } else {
    localStorage.removeItem('avenly_oauth_token');
  }
}

export async function signInWithGoogle() {
  if (cachedOAuthToken) {
    return {
      uid: auth.currentUser?.uid || 'user',
      displayName: auth.currentUser?.displayName || 'Google User',
      email: auth.currentUser?.email || '',
      photoURL: auth.currentUser?.photoURL || '',
      accessToken: cachedOAuthToken,
    };
  }

  if (signInPromise) {
    return signInPromise;
  }

  signInPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider, browserPopupRedirectResolver);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedOAuthToken(credential.accessToken);
      }
      const user = result.user;
      return {
        uid: user.uid,
        displayName: user.displayName || 'Google User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        accessToken: cachedOAuthToken,
      };
    } catch (error: any) {
      console.warn('Google Auth popup notice:', error?.message || error);
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        return {
          uid: 'guest',
          displayName: 'Guest User',
          email: '',
          photoURL: '',
          accessToken: null,
        };
      }
      throw error;
    } finally {
      signInPromise = null;
    }
  })();

  return signInPromise;
}

export async function logoutGoogle() {
  await signOut(auth);
  cachedOAuthToken = null;
}

// Connection check as required by Firebase guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Quietly log connection status without erroring out
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase database connection pending network response.');
    }
  }
}
testConnection().catch(() => {});
