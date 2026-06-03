/**
 * A tiny, dependency-free fuzzy matcher used by the tenant directory search.
 *
 * It scores how well a `query` matches a `text` by walking the query left to
 * right and greedily matching each character against the next occurrence in the
 * text. The match is a subsequence (the query characters appear in order, not
 * necessarily adjacent), and the score rewards the things humans expect to rank
 * highest: matches at word boundaries (so "jd" finds "John Doe"), runs of
 * consecutive characters (so a real substring beats a scattered one), and an
 * early first match. Returns `null` when the query isn't a subsequence at all.
 */
export interface FuzzyMatch {
  /** Higher is a better match. Only meaningful relative to other results. */
  score: number
  /** Indices into the original `text` that matched, ascending — for highlighting. */
  indices: number[]
}

const SCORE_MATCH = 2
const BONUS_BOUNDARY = 12
const BONUS_CONSECUTIVE = 8
const BONUS_FIRST_CHAR = 6
const PENALTY_PER_GAP = 1
const MAX_GAP_PENALTY = 5

/** A character starts a "word" if it's the first char or follows a non-alphanumeric. */
function isBoundary(text: string, i: number): boolean {
  if (i === 0) return true
  return !/[a-z0-9]/i.test(text[i - 1])
}

/**
 * Returns a {@link FuzzyMatch} when every character of `query` appears in
 * `text` in order, else `null`. An empty query matches everything with score 0.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, indices: [] }

  const lower = text.toLowerCase()
  const indices: number[] = []
  let score = 0
  let from = 0
  let prevIndex = -1

  for (const ch of q) {
    const idx = lower.indexOf(ch, from)
    if (idx === -1) return null

    let charScore = SCORE_MATCH
    if (isBoundary(text, idx)) charScore += BONUS_BOUNDARY
    if (idx === 0) charScore += BONUS_FIRST_CHAR
    if (idx === prevIndex + 1) {
      charScore += BONUS_CONSECUTIVE
    } else if (prevIndex !== -1) {
      // Penalize (mildly, and with a cap) the characters skipped to get here.
      charScore -= Math.min(idx - prevIndex - 1, MAX_GAP_PENALTY) * PENALTY_PER_GAP
    }

    score += charScore
    indices.push(idx)
    prevIndex = idx
    from = idx + 1
  }

  return { score, indices }
}
