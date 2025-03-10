// src/services/firebase/userProfile.ts

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebaseConfig'; // Adjust import path as needed

export interface UserProfile {
    userId: string;
    email: string;
    username: string;
    createdAt: any;
    displayName?: string;
    photoURL?: string;
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
    return profileDoc.data() as UserProfile;
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