
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebaseReactNative';

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
    isPremium: false, // Default to non-premium
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
        // Premium has expired, update status to non-premium
        // But don't block the current request with await
        updateUserPremiumStatus(userId, false).catch(error => {
          console.error("Error updating expired premium status:", error);
        });

        // Update returned profile
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

  // Check if username is valid (add validation as needed)
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  await updateDoc(profileRef, { username });
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

/**
 * Set or update user's premium status
 * @param userId User ID
 * @param isPremium Whether user has premium access
 * @param planId Optional plan ID (e.g., 'monthly_basic', 'yearly_premium')
 * @param expiryDate Optional expiry date for the premium access
 * @param transactionId Optional transaction ID for tracking payments
 */
export async function updateUserPremiumStatus(
  userId: string,
  isPremium: boolean,
  planId?: string,
  expiryDate?: Date,
  transactionId?: string
): Promise<void> {
  if (!db) throw new Error('Database not available');

  const profileRef = doc(db, 'userProfiles', userId);

  // Get current profile to ensure it exists
  const profileDoc = await getDoc(profileRef);
  if (!profileDoc.exists()) {
    throw new Error('User profile not found');
  }

  // Prepare update data
  const updateData: Partial<UserProfile> = {
    isPremium,
    premiumUpdatedAt: Timestamp.now()
  };

  // Add optional fields if provided
  if (planId) {
    updateData.premiumPlan = planId;
  }

  if (expiryDate) {
    updateData.premiumExpiry = Timestamp.fromDate(expiryDate);
  } else if (isPremium) {
    // Default expiry to 30 days from now if not provided but user is premium
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    updateData.premiumExpiry = Timestamp.fromDate(thirtyDaysFromNow);
  } else {
    // If removing premium, clear expiry
    updateData.premiumExpiry = undefined;
    updateData.premiumPlan = undefined;
  }

  if (transactionId) {
    updateData.premiumTransactionId = transactionId;
  }

  await updateDoc(profileRef, updateData);
}

/**
 * Check if user's premium subscription is active
 * @param userId User ID
 * @returns Whether user has active premium status
 */
export async function checkPremiumStatus(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return false;
  }

  // getUserProfile already checks for expired premium status
  return !!profile.isPremium;
}

/**
 * Get premium subscription details
 * @param userId User ID 
 * @returns Premium details or null if not premium
 */
export async function getPremiumDetails(userId: string): Promise<{
  isPremium: boolean;
  plan?: string;
  expiryDate?: Date;
} | null> {
  const profile = await getUserProfile(userId);

  if (!profile || !profile.isPremium) {
    return { isPremium: false };
  }

  return {
    isPremium: true,
    plan: profile.premiumPlan,
    expiryDate: profile.premiumExpiry ? profile.premiumExpiry.toDate() : undefined
  };
}