import { Timestamp } from 'firebase/firestore';

/**
 * Formats a Firestore Timestamp (or date-like value) as a relative date string.
 * Previously duplicated verbatim in PrayerBoard and BiblicalDiscussions.
 */
export function formatRelativeDate(timestamp: Timestamp | Date | string | null | undefined): string {
  if (!timestamp) return '';

  const date =
    timestamp instanceof Date
      ? timestamp
      : typeof (timestamp as Timestamp).toDate === 'function'
        ? (timestamp as Timestamp).toDate()
        : new Date(timestamp as string);

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
