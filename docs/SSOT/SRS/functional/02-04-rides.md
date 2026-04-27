> **SRS shard:** `SRS/functional/02-04-rides.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.4 Rides Module (`modules/rides`)

#### 2.4.1 Ride Management

- **Description:** Community ride-sharing — offer and book rides
- **Endpoints:**
  - `POST /api/rides` — create ride offer
  - `GET /api/rides` — list rides
  - `GET /api/rides/:id` — get ride details
  - `POST /api/rides/:id/book` — book a ride
  - `PUT /api/rides/bookings/:bookingId/status` — update booking status
  - `GET /api/rides/user/:userId` — user's rides
  - `GET /api/rides/stats/summary` — ride statistics
  - `PUT /api/rides/:id` — update ride
  - `DELETE /api/rides/:id` — delete ride
- **Business logic:** SQL-based in controller; unique constraint on `(ride_id, passenger_id)` prevents double booking
- **Database:** `rides` table + `ride_bookings` table