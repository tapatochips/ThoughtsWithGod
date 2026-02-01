/**
 * Input validation and sanitization utilities for user-generated content
 */

// Content length limits
export const LIMITS = {
    PRAYER_MIN_LENGTH: 10,
    PRAYER_MAX_LENGTH: 2000,
    COMMENT_MIN_LENGTH: 1,
    COMMENT_MAX_LENGTH: 500,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
} as const;

/**
 * Sanitizes user input by removing potentially dangerous content
 * - Strips HTML tags
 * - Removes script-like patterns
 * - Normalizes whitespace
 */
export function sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove script patterns
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Normalize whitespace (but preserve line breaks)
        .replace(/[^\S\n]+/g, ' ')
        // Remove excessive line breaks (more than 3 consecutive)
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();
}

/**
 * Validates prayer request content
 */
export function validatePrayer(text: string): { valid: boolean; error?: string; sanitized: string } {
    const sanitized = sanitizeInput(text);

    if (!sanitized) {
        return { valid: false, error: 'Prayer request cannot be empty', sanitized: '' };
    }

    if (sanitized.length < LIMITS.PRAYER_MIN_LENGTH) {
        return {
            valid: false,
            error: `Prayer request must be at least ${LIMITS.PRAYER_MIN_LENGTH} characters`,
            sanitized
        };
    }

    if (sanitized.length > LIMITS.PRAYER_MAX_LENGTH) {
        return {
            valid: false,
            error: `Prayer request cannot exceed ${LIMITS.PRAYER_MAX_LENGTH} characters`,
            sanitized
        };
    }

    return { valid: true, sanitized };
}

/**
 * Validates comment content
 */
export function validateComment(text: string): { valid: boolean; error?: string; sanitized: string } {
    const sanitized = sanitizeInput(text);

    if (!sanitized) {
        return { valid: false, error: 'Comment cannot be empty', sanitized: '' };
    }

    if (sanitized.length < LIMITS.COMMENT_MIN_LENGTH) {
        return {
            valid: false,
            error: `Comment must be at least ${LIMITS.COMMENT_MIN_LENGTH} character`,
            sanitized
        };
    }

    if (sanitized.length > LIMITS.COMMENT_MAX_LENGTH) {
        return {
            valid: false,
            error: `Comment cannot exceed ${LIMITS.COMMENT_MAX_LENGTH} characters`,
            sanitized
        };
    }

    return { valid: true, sanitized };
}

/**
 * Validates username
 */
export function validateUsername(username: string): { valid: boolean; error?: string; sanitized: string } {
    const sanitized = sanitizeInput(username).replace(/\s+/g, '_');

    if (!sanitized) {
        return { valid: false, error: 'Username cannot be empty', sanitized: '' };
    }

    if (sanitized.length < LIMITS.USERNAME_MIN_LENGTH) {
        return {
            valid: false,
            error: `Username must be at least ${LIMITS.USERNAME_MIN_LENGTH} characters`,
            sanitized
        };
    }

    if (sanitized.length > LIMITS.USERNAME_MAX_LENGTH) {
        return {
            valid: false,
            error: `Username cannot exceed ${LIMITS.USERNAME_MAX_LENGTH} characters`,
            sanitized
        };
    }

    // Only allow alphanumeric, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
        return {
            valid: false,
            error: 'Username can only contain letters, numbers, underscores, and hyphens',
            sanitized
        };
    }

    // Reserved usernames
    const reserved = ['admin', 'administrator', 'support', 'help', 'system', 'moderator', 'mod', 'anonymous'];
    if (reserved.includes(sanitized.toLowerCase())) {
        return {
            valid: false,
            error: 'This username is reserved',
            sanitized
        };
    }

    return { valid: true, sanitized };
}
