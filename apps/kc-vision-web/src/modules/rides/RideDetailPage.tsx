import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { VISION_RIDES, VISION_RIDE_BOOKINGS } from '../../fixtures/rides.fixtures'
import { getActingUserId, usePersonaStore } from '../../store/personaStore'

export function RideDetailPage() {
  const { rideId } = useParams()
  const ride = VISION_RIDES.find((r) => r.id === rideId)
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const [booked, setBooked] = useState(
    () =>
      uid
        ? VISION_RIDE_BOOKINGS.some(
            (b) => b.ride_id === rideId && b.passenger_id === uid,
          )
        : false,
  )

  if (!ride) return <p>לא נמצא</p>

  return (
    <div>
      <PageHeader
        title={`${ride.from_city} → ${ride.to_city}`}
        action={
          <Link to="/rides" className="text-sm text-teal-700">
            ← חזרה
          </Link>
        }
      />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p>{ride.notes}</p>
        <p className="text-sm text-slate-600">
          יציאה: {new Date(ride.departure_at).toLocaleString('he-IL')}
        </p>
        <Badge variant="warning">מקומות: {ride.seats_left}</Badge>
        {uid && !booked ? (
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-4 py-2 text-white"
            onClick={() => setBooked(true)}
          >
            הזמנת מקום (דמה)
          </button>
        ) : null}
        {booked ? <p className="text-emerald-700">ההזמנה אושרה (דמה).</p> : null}
      </div>
    </div>
  )
}
