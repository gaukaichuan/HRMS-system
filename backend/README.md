# PeopleDesk attendance API (starter)

This is the first server-backed attendance API for the mobile clock-in/out frontend. It uses Node.js, Express, and SQLite. The repository's current UI is a static prototype; this API does not yet migrate the existing browser-only employee records or automatically connect the current pages.

## Requirements

- Node.js 20 or newer
- npm

From this directory:

```sh
npm install
cp .env.example .env
```

Set a random `JWT_SECRET` of at least 32 characters. Keep `.env` private and out of version control. Optionally configure the business timezone and approved Wi-Fi/geofence settings. `BUSINESS_TIME_ZONE` determines which business day an event belongs to; timestamps returned by the API are UTC ISO-8601 values.

Create the first administrator account. The bootstrap password must be at least 12 characters:

```sh
# Set HRMS_BOOTSTRAP_EMAIL, HRMS_BOOTSTRAP_NAME and HRMS_BOOTSTRAP_PASSWORD in .env first.
npm run bootstrap-user
```

The account is stored in the local SQLite database. This starter has no public signup or employee-management API; add an authenticated admin workflow before enrolling other employees. Never use real employee information in a local prototype.

Start the API:

```sh
npm run dev
```

Health check: `GET http://localhost:3000/health`.

## API

All clocking routes require `Authorization: Bearer <accessToken>`. Sign-in tokens expire after 15 minutes. The browser/mobile client must keep the token out of URLs and must not log it.

- `POST /v1/auth/login` — JSON `{ "email": "...", "password": "..." }`
- `GET /v1/me` — current signed-in employee
- `GET /v1/clocking/methods` — reports configured methods; face verification is deliberately disabled
- `GET /v1/attendance/today` — current employee's business-day attendance
- `POST /v1/attendance/clock-in` — JSON `{ "method": "wifi" }` or `{ "method": "location", "location": { "latitude": 0, "longitude": 0, "accuracyMeters": 25 } }`
- `POST /v1/attendance/clock-out` — same request shape

The server sets event timestamps. Do not send a client timestamp. Duplicate clock-ins/outs return `409` and the current attendance state. Clock-out requires a same-business-day clock-in. This initial data model supports one shift per employee per business day; overnight and multiple-shift rules need an agreed policy before implementation.

Example login:

```sh
curl -X POST http://localhost:3000/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"replace-with-your-secret"}'
```

## Clocking method limitations and safeguards

- **Wi-Fi:** A web page cannot reliably or securely read a phone's Wi-Fi SSID. This API checks the direct network peer IP against `HRMS_ALLOWED_WIFI_CIDRS`; it does not trust a client-reported network name or forwarded-IP header. Configure this only when the server can see the real office-network peer address. If deployed behind a proxy, use a properly secured network-aware gateway rather than enabling arbitrary forwarded headers.
- **Location:** Browser location requires user permission and HTTPS (except localhost). Configure all three `HRMS_GEOFENCE_*` values to enable it. The API checks reported accuracy and distance on the server and does not persist coordinates. Device location can be inaccurate or spoofed; it is not proof of identity.
- **Face:** Not implemented and always unavailable. Do not collect face images or templates in this starter. Before considering a reviewed third-party verification service, decide jurisdiction-specific legal basis, informed consent, retention/deletion, security, false-rejection handling, accessibility, and a non-biometric alternative.

## Before production

This is a development foundation, **not production-ready**. Before real employee use, add and review: HTTPS and secure hosting, managed secrets, database backups/migrations, admin provisioning and deactivation, password reset and revocable sessions, audit/retention controls, monitoring, rate limits appropriate to the deployment, security testing, and the applicable employment/privacy review. SQLite is intended for local development or a small single-instance prototype; choose a managed database and deployment architecture for production. Do not expose this starter with sample or real employee data on a public network.

The frontend should call this API over HTTPS, use the signed-in employee identity from `/v1/me`, display server-returned timestamps, refresh `/v1/attendance/today` after clock actions, and handle `401`, `403`, `409`, and network failures explicitly. For mobile testing, serve the frontend from an origin listed in `CORS_ORIGINS`; opening HTML with `file://` is not a suitable API setup.
