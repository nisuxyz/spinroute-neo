/**
 * Simple fuzzy search implementation
 * Scores items based on how well they match the query
 */

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
}

/**
 * Calculate fuzzy match score between query and text
 * Higher score = better match
 */
const calculateScore = (query: string, text: string): number => {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match gets highest score
  if (lowerText === lowerQuery) return 1000;

  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) return 500;

  // Contains query gets medium score
  if (lowerText.includes(lowerQuery)) return 250;

  // Calculate character match score
  let score = 0;
  let queryIndex = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      score += 1 + consecutiveMatches * 5; // Bonus for consecutive matches
      consecutiveMatches++;
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  // If not all query characters were matched, return 0
  if (queryIndex < lowerQuery.length) return 0;

  return score;
};

/**
 * Fuzzy search through items
 * @param query Search query
 * @param items Items to search through
 * @param getSearchText Function to extract searchable text from item
 * @param threshold Minimum score threshold (default: 1)
 * @returns Sorted array of matching items with scores
 */
export const fuzzySearch = <T>(
  query: string,
  items: T[],
  getSearchText: (item: T) => string,
  threshold = 1,
): FuzzySearchResult<T>[] => {
  if (!query.trim()) return [];

  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    const text = getSearchText(item);
    const score = calculateScore(query, text);

    if (score >= threshold) {
      results.push({ item, score });
    }
  }

  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score);
};
