> **SRS shard:** `SRS/functional/02-06-items.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.6 Items Module (`modules/items`)

#### 2.6.1 Generic Collections

- **Description:** Key-value collection storage
- **Controller prefix:** `/api/collections`
- **Endpoints:**
  - `GET /api/collections/:collection/:userId/:itemId` — get item
  - `GET /api/collections/:collection` — list collection
  - `POST /api/collections/:collection` — create item
  - `PUT /api/collections/:collection/:userId/:itemId` — update item
  - `DELETE /api/collections/:collection/:userId/:itemId` — delete item
  - `GET /api/collections/user-activity/:userId` — user activity
  - `GET /api/collections/popular-collections` — popular collections
  - `GET /api/collections/cache-stats` — cache statistics

#### 2.6.2 Dedicated Items

- **Description:** Typed items with structured fields
- **Controller prefix:** `/api/dedicated-items`
- **Endpoints:**
  - `POST /api/dedicated-items` — create item
  - `GET /api/dedicated-items/owner/:ownerId` — list by owner
  - `GET /api/dedicated-items/:id` — get by ID
  - `PUT /api/dedicated-items/:id` — update
  - `DELETE /api/dedicated-items/:id` — soft delete
  - `GET /api/dedicated-items/category/:category` — list by category
  - `GET /api/dedicated-items/search` — search items
- **Item fields:** title, description, category (furniture, electronics, clothing, books, food, toys, appliances, sports, tools, medical, other), condition (new, like_new, good, fair, poor), city, address, coordinates, price, image, rating, tags, quantity, delivery_method, status

#### 2.6.3 Items Delivery

- **Description:** Item delivery workflow with reservation and request management
- **Controller prefix:** `/api/items-delivery`
- **Endpoints:**
  - `POST /api/items-delivery` — create delivery item
  - `GET /api/items-delivery/search` — search items
  - `GET /api/items-delivery/user/:userId` — user's items
  - `GET /api/items-delivery` — list all
  - `GET /api/items-delivery/:id` — get by ID
  - `PUT /api/items-delivery/:id` — update
  - `DELETE /api/items-delivery/:id` — delete
  - `POST /api/items-delivery/:id/reserve` — reserve item
  - `POST /api/items-delivery/requests` — create delivery request
  - `GET /api/items-delivery/requests` — list requests
  - `PUT /api/items-delivery/requests/:requestId` — update request status
  - `POST /api/items-delivery/:id/deliver` — mark as delivered
- **Item request fields:** item_id, requester_id, message, proposed_time, delivery_method, meeting_location
- **Request statuses:** pending, approved, rejected, completed (inferred from `UpdateItemRequestDto`)