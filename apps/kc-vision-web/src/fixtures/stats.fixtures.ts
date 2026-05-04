export interface VisionCommunityStats {
  total_users: number
  total_donations_amount: number
  total_rides: number
  active_challenges: number
}

export interface VisionTrendPoint {
  date: string
  value: number
}

export interface VisionCityStat {
  city: string
  donations: number
  volunteers: number
}

export const VISION_COMMUNITY_STATS: VisionCommunityStats = {
  total_users: 12840,
  total_donations_amount: 4200000,
  total_rides: 8420,
  active_challenges: 56,
}

export const VISION_STATS_TRENDS: VisionTrendPoint[] = [
  { date: '2026-04-01', value: 120 },
  { date: '2026-04-08', value: 132 },
  { date: '2026-04-15', value: 118 },
  { date: '2026-04-22', value: 145 },
  { date: '2026-04-29', value: 151 },
  { date: '2026-05-04', value: 160 },
]

export const VISION_CITY_STATS: VisionCityStat[] = [
  { city: 'תל אביב–יפו', donations: 420, volunteers: 890 },
  { city: 'ירושלים', donations: 310, volunteers: 620 },
  { city: 'חיפה', donations: 180, volunteers: 340 },
  { city: 'נתניה', donations: 210, volunteers: 410 },
]
