/**
 * Escapes characters that have a special meaning in regular expressions, so user input
 * such as "a.*(" is searched for literally instead of being run as a pattern.
 */
export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
