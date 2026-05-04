export interface VisionRide {
  id: string
  driver_id: string
  from_city: string
  to_city: string
  departure_at: string
  seats_total: number
  seats_left: number
  notes: string
}

export interface VisionRideBooking {
  id: string
  ride_id: string
  passenger_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export const VISION_RIDES: VisionRide[] = [
  {
    id: 'ride-001',
    driver_id: 'user-61bb90ee-3c22-4d50-a401-vol-david',
    from_city: 'נתניה',
    to_city: 'חדרה',
    departure_at: '2026-05-05T07:30:00.000Z',
    seats_total: 3,
    seats_left: 1,
    notes: 'יציאה מרחוב הנשיא — נא לשמור על שקט ברכב.',
  },
  {
    id: 'ride-002',
    driver_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    from_city: 'נתניה',
    to_city: 'תל אביב–יפו',
    departure_at: '2026-05-06T16:00:00.000Z',
    seats_total: 2,
    seats_left: 2,
    notes: 'מתאים למי שצריך ליווי לרופא — תיאום מראש.',
  },
  {
    id: 'ride-003',
    driver_id: 'user-14',
    from_city: 'אשדוד',
    to_city: 'תל השומר',
    departure_at: '2026-05-07T06:00:00.000Z',
    seats_total: 3,
    seats_left: 3,
    notes: 'נסיעה קבועה כל שני לבית חולים תל השומר. יציאה 06:00 בדיוק.',
  },
  {
    id: 'ride-004',
    driver_id: 'user-14',
    from_city: 'אשדוד',
    to_city: 'ירושלים',
    departure_at: '2026-05-08T08:30:00.000Z',
    seats_total: 2,
    seats_left: 1,
    notes: 'נסיעה לירושלים דרך כביש 1. אפשר לרדת במספר נקודות.',
  },
  {
    id: 'ride-005',
    driver_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    from_city: 'נתניה',
    to_city: 'חדרה',
    departure_at: '2026-05-09T07:00:00.000Z',
    seats_total: 3,
    seats_left: 2,
    notes: 'נסיעה שגרתית לעבודה - יציאה מדויקת.',
  },
  {
    id: 'ride-006',
    driver_id: 'user-10',
    from_city: 'באר שבע',
    to_city: 'תל אביב–יפו',
    departure_at: '2026-05-10T14:00:00.000Z',
    seats_total: 4,
    seats_left: 4,
    notes: 'נסיעה דרך כביש 40 - נוח למי שצריך להגיע לתל אביב.',
  },
  {
    id: 'ride-007',
    driver_id: 'user-61bb90ee-3c22-4d50-a401-vol-david',
    from_city: 'הרצליה',
    to_city: 'נתניה',
    departure_at: '2026-05-11T17:30:00.000Z',
    seats_total: 2,
    seats_left: 2,
    notes: 'חזרה מהעבודה - אפשר להסיע 2 נוסעים.',
  },
  {
    id: 'ride-008',
    driver_id: 'user-14',
    from_city: 'אשדוד',
    to_city: 'איכילוב',
    departure_at: '2026-05-12T07:00:00.000Z',
    seats_total: 3,
    seats_left: 1,
    notes: 'נסיעה לבית חולים איכילוב - חניה בבית החולים.',
  },
  {
    id: 'ride-009',
    driver_id: 'user-19',
    from_city: 'הרצליה',
    to_city: 'תל אביב–יפו',
    departure_at: '2026-05-13T09:00:00.000Z',
    seats_total: 2,
    seats_left: 2,
    notes: 'נסיעה לשיעור יוגה - חזרה בשעה 11:00.',
  },
  {
    id: 'ride-010',
    driver_id: 'user-61bb90ee-3c22-4d50-a401-vol-david',
    from_city: 'נתניה',
    to_city: 'רעננה',
    departure_at: '2026-05-14T08:00:00.000Z',
    seats_total: 3,
    seats_left: 3,
    notes: 'נסיעה בוקר - יציאה מתחנה מרכזית נתניה.',
  },
  {
    id: 'ride-011',
    driver_id: 'user-10',
    from_city: 'באר שבע',
    to_city: 'ירושלים',
    departure_at: '2026-05-15T10:30:00.000Z',
    seats_total: 3,
    seats_left: 2,
    notes: 'נסיעה לירושלים - אפשר לרדת בכניסה לעיר או במרכז.',
  },
  {
    id: 'ride-012',
    driver_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    from_city: 'נתניה',
    to_city: 'רמת גן',
    departure_at: '2026-05-16T15:00:00.000Z',
    seats_total: 2,
    seats_left: 1,
    notes: 'ליווי לקניות - חזרה אחרי שעתיים.',
  },
]

export const VISION_RIDE_BOOKINGS: VisionRideBooking[] = [
  {
    id: 'rb-001',
    ride_id: 'ride-001',
    passenger_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    status: 'confirmed',
  },
]
