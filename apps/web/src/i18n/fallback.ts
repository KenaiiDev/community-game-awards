export type Messages = { [key: string]: string | Messages };

/**
 * Fills every key missing from a translation with the English text, so partial
 * community translations can ship: untranslated strings simply stay in English.
 */
export function withFallback(source: Messages, translation: Messages): Messages {
  const result: Messages = {};
  for (const [key, sourceValue] of Object.entries(source)) {
    const value = translation[key];
    if (typeof sourceValue === 'object') {
      result[key] = withFallback(sourceValue, typeof value === 'object' ? value : {});
    } else {
      result[key] = typeof value === 'string' ? value : sourceValue;
    }
  }
  return result;
}
