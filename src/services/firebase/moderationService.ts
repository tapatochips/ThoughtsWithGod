import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

export type ContentType = 'prayer' | 'discussion' | 'comment' | 'user';

export const REPORT_REASONS = [
  'Inappropriate content',
  'Spam',
  'Harassment',
  'False information',
  'Other',
];

export async function blockUser(
  db: Firestore,
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const blockRef = doc(db, `users/${currentUserId}/blockedUsers`, targetUserId);
  await setDoc(blockRef, {
    blockedUserId: targetUserId,
    blockedAt: Timestamp.now(),
  });
}

export async function unblockUser(
  db: Firestore,
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const blockRef = doc(db, `users/${currentUserId}/blockedUsers`, targetUserId);
  await deleteDoc(blockRef);
}

export async function reportContent(
  db: Firestore,
  reporterId: string,
  contentType: ContentType,
  contentId: string,
  authorId: string | null,
  reason: string
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reporterId,
    contentType,
    contentId,
    authorId: authorId ?? null,
    reason,
    createdAt: Timestamp.now(),
    status: 'pending',
  });
}
