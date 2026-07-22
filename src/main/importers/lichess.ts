/**
 * Lichess import.
 *
 * Lichess' export API returns PGN directly for public games (no auth required;
 * OAuth is only needed for private data or higher rate limits). A single game or
 * a user's recent games can be pulled as newline-delimited PGN text.
 *
 * Docs: https://lichess.org/api#tag/Games
 */

const API_BASE = 'https://lichess.org'

/** Export a single game by its Lichess id as a PGN string. */
export async function fetchGamePgn(gameId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/game/export/${encodeURIComponent(gameId)}`, {
    headers: { Accept: 'application/x-chess-pgn' }
  })
  if (!res.ok) throw new Error(`Lichess: failed to export game (${res.status})`)
  return res.text()
}

/** Export a user's most recent games as an array of PGN strings. */
export async function fetchRecentGames(username: string, max = 10): Promise<string[]> {
  const url = `${API_BASE}/api/games/user/${encodeURIComponent(username)}?max=${max}`
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (!res.ok) throw new Error(`Lichess: failed to export games (${res.status})`)
  const text = await res.text()
  // The export is PGN games separated by blank lines; split on the game boundary.
  return text
    .split(/\n\n(?=\[Event )/)
    .map((g) => g.trim())
    .filter(Boolean)
}
