import type { PlacesContext } from './types'

/**
 * Calculates a deterministic 0-100 score from OSM context data.
 *
 * Three weighted factors:
 *   Competition  (0-50 pts): fewer rivals nearby = higher score
 *   Foot traffic (0-30 pts): nearby amenities as a pedestrian activity proxy
 *   Area type    (5-20 pts): commercial > mixed > residential
 */
export function calculateScore(ctx: PlacesContext): number {
  // Competition factor: each competitor reduces score by 8, floor at 5
  const competitionScore = Math.max(5, 50 - ctx.competitors * 8)

  // Foot traffic proxy: each distinct amenity type adds 8 pts, capped at 30
  const footTrafficScore = Math.min(30, ctx.amenities.length * 8)

  // Area type bonus
  const areaScore = ctx.areaType === 'commercial' ? 20 : ctx.areaType === 'mixed' ? 12 : 5

  return Math.round(competitionScore + footTrafficScore + areaScore)
}
