const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for',
  'of', 'and', 'or', 'but', 'with', 'this', 'that', 'i', 'me',
  'my', 'we', 'you', 'he', 'she', 'they', 'want', 'would', 'like',
  'please', 'can', 'could', 'will', 'do', 'does', 'am', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'not', 'no',
])

export function tokenize(text: string, caseSensitive = false): string[] {
  const normalized = caseSensitive ? text : text.toLowerCase()
  return normalized
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

export function buildNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [...tokens]
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join('_'))
  }
  return ngrams
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Lightweight suffix-stripping stemmer.
 * Handles the most common English inflections without a full Porter stemmer.
 */
export function stem(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3)
  if (word.endsWith('tion') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ness') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ment') && word.length > 6) return word.slice(0, -4)
  if (word.endsWith('ed') && word.length > 5)  return word.slice(0, -2)
  if (word.endsWith('er') && word.length > 5)  return word.slice(0, -2)
  if (word.endsWith('ly') && word.length > 5)  return word.slice(0, -2)
  if (word.endsWith('es') && word.length > 4)  return word.slice(0, -2)
  if (word.endsWith('s')  && word.length > 4)  return word.slice(0, -1)
  return word
}
