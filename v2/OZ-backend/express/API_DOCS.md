# OrderZap V2 — API Reference

**Base URL:** `http://localhost:4000`

**All requests (except health) require:**
```
Header: x-api-key = "ozk_a7f3d9e1b2c4056f8e9d1a3b5c7f0e2d4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4"
```

**All responses follow:**
```json
{ "success": true, "data": { ... } }                  // single
{ "success": true, "data": [...], "pagination": {} }   // list
{ "success": false, "error": "message" }               // error
```

**Pagination (all GET lists):**  `?page=1&limit=20`

---

## /api/health

**Keys:** None required

**Supports:** `GET`

### GET
Returns system status. No auth needed.

**Returns:**
- `status` (string) — `"healthy"` | `"degraded"` | `"unhealthy"`
- `services.express.status` (string)
- `services.postgresql.status` (string)
- `services.convex.status` (string)
- `services.docker.containers` (array)

---

## /api/

**Keys:** `x-api-key`

**Supports:** `GET`

### GET
Returns API info. Name, version, description.

---

## /api/restaurant/

**Keys:** `x-api-key`

**Supports:** `POST`

**Syncs to Convex:** ✅ `menu:upsertRestaurantMirror`

### POST — Create restaurant

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `short_id` | string | ✅ | — |
| `name` | string | ✅ | — |
| `email` | string | ❌ | — |
| `description` | string | ❌ | — |
| `active` | boolean | ❌ | `true` |
| `status` | string | ❌ | `"active"` |

**Rules:**
- `short_id` must be unique → `400` if duplicate
- `short_id` + `name` required → `400` if missing

**Returns:** `201` with created restaurant

---

## /api/:restaurantId/menu/menus

> `:restaurantId` = the restaurant's `short_id` (e.g. `"bts"`)

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertMenuMirror`

### GET — List menus

| Filter | Type | Description |
|--------|------|-------------|
| `is_active` | `"true"/"false"` | Filter by active |

### POST — Create menu

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | — |
| `is_active` | boolean | ❌ | `true` |

**Rules:** `name` required → `400` if missing

**Returns:** `201`

---

## /api/:restaurantId/menu/menus/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single menu

**Returns:** `200` or `404`

### PUT — Update menu

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ❌ |
| `is_active` | boolean | ❌ |

**Rules:** At least one field required → `400` if empty

### DELETE — Delete menu

**Returns:** `200` `{ "deleted": true, "id": "uuid" }` or `404`

---

## /api/:restaurantId/menu/categories

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertCategoryMirror`

### GET — List categories (ordered by `display_order`, then `name`)

| Filter | Type | Description |
|--------|------|-------------|
| `menu_id` | UUID | Filter by parent menu |
| `is_active` | `"true"/"false"` | Filter by active |

### POST — Create category

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | — |
| `menu_id` | UUID | ❌ | — |
| `icon` | string | ❌ | — |
| `icon_file_url` | string | ❌ | — |
| `icon_url` | string | ❌ | — |
| `display_order` | number | ❌ | — |
| `is_active` | boolean | ❌ | `true` |
| `created_at` | number | ❌ | `Date.now()` |

**Rules:** `name` required → `400`

**Returns:** `201`

---

## /api/:restaurantId/menu/categories/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single category

**Returns:** `200` or `404`

### PUT — Update category

Any field from POST (except `id`, `restaurant_id`). At least one required.

### DELETE — Delete category

**Returns:** `200` or `404`

---

## /api/:restaurantId/menu/items

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertItemMirror`

### GET — List items (ordered by `name`)

| Filter | Type | Description |
|--------|------|-------------|
| `category_id` | UUID | Filter by category |
| `is_available` | `"true"/"false"` | Filter by availability |
| `is_hidden` | `"true"/"false"` | Filter by hidden |

### POST — Create menu item

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | — |
| `price` | number | ✅ | — |
| `category_id` | UUID | ✅ | — |
| `description` | string | ✅ | — |
| `is_available` | boolean | ❌ | `true` |
| `is_hidden` | boolean | ❌ | `false` |
| `shortcode` | string | ❌ | — |
| `image_url` | string | ❌ | — |
| `image` | string | ❌ | — |
| `image_file_url` | string | ❌ | — |
| `category` | string | ❌ | `"Default"` |
| `allowed_zones` | array | ❌ | — |
| `theme_colors` | object | ❌ | — |

**Rules:** `name`, `price`, `category_id`, `description` all required → `400`

**Returns:** `201`

---

## /api/:restaurantId/menu/items/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single item

**Returns:** `200` or `404`

### PUT — Update item

Any field from POST (except `id`, `restaurant_id`). Auto-sets `updated_at`.

**Special:** `available` ↔ `is_available` are kept in sync automatically.

### DELETE — Delete item

**Returns:** `200` or `404`

---

## /api/:restaurantId/menu/variants

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertVariantMirror`

### GET — List variants (ordered by `name`)

| Filter | Type | Description |
|--------|------|-------------|
| `item_id` | UUID | Filter by parent item |

### POST — Create variant

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `item_id` | UUID | ✅ | — |
| `name` | string | ✅ | — |
| `extra_price` | number | ❌ | `0` |

**Rules:** `item_id` + `name` required → `400`

**Returns:** `201`

---

## /api/:restaurantId/menu/variants/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single variant
### PUT — Update variant (`name`, `extra_price`)
### DELETE — Delete variant

---

## /api/:restaurantId/menu/add-ons

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertAddOnMirror`

### GET — List add-ons (ordered by `name`)

| Filter | Type | Description |
|--------|------|-------------|
| `item_id` | UUID | Filter by parent item |

### POST — Create add-on

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `item_id` | UUID | ✅ | — |
| `name` | string | ✅ | — |
| `price` | number | ❌ | `0` |
| `is_available` | boolean | ❌ | `true` |

**Rules:** `item_id` + `name` required → `400`

**Returns:** `201`

---

## /api/:restaurantId/menu/add-ons/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single add-on
### PUT — Update add-on (`name`, `price`, `is_available`)
### DELETE — Delete add-on

---

## /api/:restaurantId/menu/zones

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertZoneMirror`

### GET — List zones (ordered by `name`)

| Filter | Type | Description |
|--------|------|-------------|
| `is_active` | `"true"/"false"` | Filter by active |

### POST — Create zone

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | ✅ | — |
| `description` | string | ✅ | — |
| `shortcode` | string | ❌ | — |
| `qr_code_url` | string | ❌ | — |
| `is_active` | boolean | ❌ | `true` |

**Rules:** `name` + `description` required → `400`

**Returns:** `201`

---

## /api/:restaurantId/menu/zones/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single zone
### PUT — Update zone (any field except `id`, `restaurant_id`)
### DELETE — Delete zone

---

## /api/:restaurantId/menu/shortcodes

**Keys:** `x-api-key`

**Supports:** `GET`, `POST`

**Syncs to Convex:** ✅ `menu:upsertShortcodeMirror`

### GET — List shortcodes (ordered by `code`)

| Filter | Type | Description |
|--------|------|-------------|
| `type` | string | `"table"`, `"zone"`, or `"item"` |

### POST — Create shortcode

| Field | Type | Required | Default | Allowed |
|-------|------|----------|---------|---------|
| `code` | string | ✅ | — | any |
| `type` | string | ✅ | — | `"table"`, `"zone"`, `"item"` |
| `reference_id` | UUID | ✅ | — | — |
| `is_active` | boolean | ❌ | `true` | — |

**Rules:**
- `code` + `type` + `reference_id` all required → `400`
- `type` must be `table`/`zone`/`item` → `400`
- `code` must be unique per restaurant → `400` if duplicate

**Returns:** `201`

---

## /api/:restaurantId/menu/shortcodes/:id

**Keys:** `x-api-key`

**Supports:** `GET`, `PUT`, `DELETE`

**Syncs to Convex:** ✅

### GET — Get single shortcode
### PUT — Update shortcode (`code`, `is_active`, `reference_id`)
### DELETE — Delete shortcode

---

## Data Flow

```
Client → Express → PostgreSQL (write first, source of truth)
                 → Convex     (mirror after PG success, non-blocking)
                              (if Convex fails, request still succeeds)
```

**All IDs:** UUID v4, auto-generated by PostgreSQL.
**All timestamps:** `BIGINT` milliseconds (`Date.now()`).
**`:restaurantId` in URL** = the `short_id` string, not the UUID.
