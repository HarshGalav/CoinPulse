import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb: ReturnType<typeof getFirestore>;

try {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const firebaseAdminConfig = {
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    };

    const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
    adminDb = getFirestore(app);
  } else {
    throw new Error('Firebase Admin credentials not found. Please configure Firebase to use database features.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw new Error('Failed to initialize Firebase Admin. Please check your Firebase configuration.');
}

export { adminDb };