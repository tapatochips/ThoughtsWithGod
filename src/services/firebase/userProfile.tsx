import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebaseReactNative';
import { validateUsername } from '../../utils/inputValidation';

export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  createdAt: any;
  displayName?: string;
  photoURL?: string;
  // Premium status fields
  isPremium?: boolean;
  premiumPlan?: string;
  premiumExpiry?: any; // Timestamp
  premiumUpdatedAt?: any; // Timestamp
  premiumTransactionId?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'sepia';
    fontSize: 'small' | 'medium' | 'large';
    reminders?: boolean;
    reminderTime?: string;
  };
}

export async function createUserProfile(user: User): Promise<UserProfile> {
  if (!db || !user) throw new Error('Database or user not available');

  // Default username is first part of email
  const defaultUsername = user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`;

  const newProfile: UserProfile = {
    userId: user.uid,
    email: user.email || '',
    username: defaultUsername,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    createdAt: new Date(),
    preferences: {
      theme: 'light',
      fontSize: 'medium'
    }
  };

  // Check if profile already exists
  const profileRef = doc(db, 'userProfiles', user.uid);
  const profileDoc = await getDoc(profileRef);

  if (!profileDoc.exists()) {
    // Create new profile if it doesn't exist
    await setDoc(profileRef, newProfile);
    return newProfile;
  } else {
    // Return existing profile
    return profileDoc.data() as UserProfile;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!db) return null;

  const profileRef = doc(db, 'userProfiles', userId);
  const profileDoc = await getDoc(profileRef);

  if (profileDoc.exists()) {
    const profile = profileDoc.data() as UserProfile;

    // Check if premium has expired
    if (profile.isPremium && profile.premiumExpiry) {
      const expiryDate = profile.premiumExpiry.toDate();
      const now = new Date();

      if (expiryDate < now) {
        // Premium entitlement is server-managed. Never try to correct it from
        // the client; only present this stale cached value as inactive.
        profile.isPremium = false;
      }
    }

    return profile;
  }

  return null;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  if (!db) throw new Error('Database not available');

  const profileRef = doc(db, 'userProfiles', userId);

  // Validate and sanitize username
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid username');
  }

  await updateDoc(profileRef, { username: validation.sanitized });
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserProfile['preferences']>
): Promise<void> {
  if (!db) throw new Error('Database not available');

  const profileRef = doc(db, 'userProfiles', userId);

  // Get current profile to merge preferences
  const profileDoc = await getDoc(profileRef);
  if (!profileDoc.exists()) {
    throw new Error('User profile not found');
  }

  const currentProfile = profileDoc.data() as UserProfile;
  const updatedPreferences = {
    ...currentProfile.preferences,
    ...preferences
  };

  await updateDoc(profileRef, { preferences: updatedPreferences });
}

