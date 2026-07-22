/**
 * Chess.com import.
 *
 * Chess.com exposes a public, unauthenticated "Published-Data" API. Monthly
 * archives return games with an embedded PGN, so importing is just: fetch the
 * archive, pull out the PGN(s), and feed them to the same pipeline as a pasted
 * PGN.
 *
 * Docs: https://www.chess.com/news/view/published-data-api
 */

const API_BASE = 'https://api.chess.com/pub'

interface ChessComGame {
  readonly pgn?: string
  readonly url?: string
  readonly end_time?: number
}

/** List the available monthly-archive URLs for a user. */
export async function listArchives(username: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/player/${encodeURIComponent(username)}/games/archives`)
  if (!res.ok) throw new Error(`Chess.com: failed to list archives (${res.status})`)
  const body = (await res.json()) as { archives?: string[] }
  return body.archives ?? []
}

/** Fetch all games (as PGN strings) from a single monthly-archive URL. */
export async function fetchArchivePgns(archiveUrl: string): Promise<string[]> {
  const res = await fetch(archiveUrl)
  if (!res.ok) throw new Error(`Chess.com: failed to fetch archive (${res.status})`)
  const body = (await res.json()) as { games?: ChessComGame[] }
  return (body.games ?? []).map((g) => g.pgn).filter((pgn): pgn is string => Boolean(pgn))
}

/** Fetch the PGNs from a user's most recent monthly archive. */
export async function fetchLatestGames(username: string): Promise<string[]> {
  const archives = await listArchives(username)
  const latest = archives.at(-1)
  if (!latest) return []
  return fetchArchivePgns(latest)
}
