require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const ipaddr = require('ipaddr.js');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const { z } = require('zod');

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || '';
const ISSUER = 'peopledesk-hrms-api';
const AUDIENCE = 'peopledesk-hrms-client';
const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || 'UTC';

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random secret of at least 32 characters.');
}

// Validate the timezone at startup rather than silently mis-key attendance days.
new Intl.DateTimeFormat('en', { timeZone: BUSINESS_TIME_ZONE });

const parseOptionalNumber = (name) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number.`);
  return value;
};

const geofence = {
  latitude: parseOptionalNumber('HRMS_GEOFENCE_LATITUDE'),
  longitude: parseOptionalNumber('HRMS_GEOFENCE_LONGITUDE'),
  radiusMeters: parseOptionalNumber('HRMS_GEOFENCE_RADIUS_METERS')
};

const geofenceValues = Object.values(geofence);
if (geofenceValues.some((value) => value !== null) && geofenceValues.some((value) => value === null)) {
  throw new Error('Set all geofence settings (latitude, longitude, and radius) or leave all empty.');
}
if (
  geofence.latitude !== null &&
  (geofence.latitude < -90 || geofence.latitude > 90 ||
   geofence.longitude < -180 || geofence.longitude > 180 ||
   geofence.radiusMeters < 25 || geofence.radiusMeters > 10000)
) {
  throw new Error('Geofence coordinates or radius are outside the allowed range (25–10000 m).');
}

const wifiCidrs = (process.env.HRMS_ALLOWED_WIFI_CIDRS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

for (const cidr of wifiCidrs) {
  try {
    ipaddr.parseCIDR(cidr);
  } catch {
    throw new Error(`Invalid CIDR in HRMS_ALLOWED_WIFI_CIDRS: ${cidr}`);
  }
}

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Requests without Origin include native clients and local health checks.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(express.json({ limit: '16kb', strict: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' }
});

const databasePath = path.resolve(__dirname, process.env.DATABASE_PATH || './data/hrms.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee'
      CHECK (role IN ('employee', 'admin')),
    active INTEGER NOT NULL DEFAULT 1
      CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance_days (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    business_date TEXT NOT NULL,
    clock_in_at TEXT NOT NULL,
    clock_in_method TEXT NOT NULL
      CHECK (clock_in_method IN ('wifi', 'location')),
    clock_out_at TEXT,
    clock_out_method TEXT
      CHECK (clock_out_method IS NULL OR clock_out_method IN ('wifi', 'location')),
    UNIQUE (employee_id, business_date),
    CHECK ((clock_out_at IS NULL) = (clock_out_method IS NULL))
  );

  CREATE INDEX IF NOT EXISTS attendance_employee_date
    ON attendance_days (employee_id, business_date DESC);
`);

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200)
}).strict();

const clockSchema = z.object({
  method: z.enum(['wifi', 'location', 'face']),
  location: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().positive().max(10000)
  }).strict().optional()
}).strict();

function businessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addressMatchesCidr(addressText, cidr) {
  let address;
  let range;
  try {
    address = ipaddr.parse(addressText);
    range = ipaddr.parseCIDR(cidr);
  } catch {
    return false;
  }
  if (address.kind() === 'ipv6' && address.isIPv4MappedAddress()) {
    address = address.toIPv4Address();
  }
  let [network] = range;
  if (network.kind() === 'ipv6' && network.isIPv4MappedAddress()) {
    network = network.toIPv4Address();
    range = [network, range[1] - 96];
  }
  return address.kind() === network.kind() && address.match(range);
}

function verifyClockMethod(method, location, req) {
  if (method === 'face') {
    return { status: 501, error: 'Face verification is not configured. Use an approved alternative method.' };
  }

  if (method === 'wifi') {
    // Check the direct socket peer only. Do not trust SSIDs or forwarded headers
    // supplied by the browser. Deploy this endpoint behind a network-aware,
    // trusted gateway if the app is not directly reachable on the office LAN.
    const peer = req.socket.remoteAddress || '';
    if (!wifiCidrs.some((cidr) => addressMatchesCidr(peer, cidr))) {
      return { status: 403, error: 'Clock-in/out is only available from an approved network.' };
    }
    return null;
  }

  if (!location || geofence.latitude === null) {
    return { status: 503, error: 'Location clocking is not configured.' };
  }
  if (location.accuracyMeters > 100) {
    return { status: 422, error: 'Location accuracy is too low. Try again outdoors or use another method.' };
  }
  const distance = distanceMeters(
    geofence.latitude,
    geofence.longitude,
    location.latitude,
    location.longitude
  );
  // Allow for the reported device accuracy, but cap the tolerance to avoid
  // accepting a very imprecise location as proof of presence.
  if (distance > geofence.radiusMeters + Math.min(location.accuracyMeters, 50)) {
    return { status: 403, error: 'Your location is outside the approved clocking area.' };
  }
  return null;
}

function attendanceRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    businessDate: row.business_date,
    clockInAt: row.clock_in_at,
    clockInMethod: row.clock_in_method,
    clockOutAt: row.clock_out_at,
    clockOutMethod: row.clock_out_method
  };
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return res.status(401).json({ error: 'Sign in to continue.' });

  try {
    const claims = jwt.verify(match[1], JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256']
    });
    req.auth = { employeeId: claims.sub, role: claims.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Your sign-in has expired. Sign in again.' });
  }
}

function getActiveEmployee(id) {
  return db.prepare(
    'SELECT id, email, display_name, role, active FROM employees WHERE id = ?'
  ).get(id);
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/v1/auth/login', loginLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }

  const employee = db.prepare(
    'SELECT id, email, display_name, password_hash, role, active FROM employees WHERE email = ?'
  ).get(parsed.data.email.toLowerCase());

  if (
    !employee ||
    !employee.active ||
    !bcrypt.compareSync(parsed.data.password, employee.password_hash)
  ) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const token = jwt.sign(
    { role: employee.role },
    JWT_SECRET,
    {
      subject: employee.id,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: '15m',
      algorithm: 'HS256'
    }
  );

  return res.json({
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 900,
    employee: {
      id: employee.id,
      email: employee.email,
      displayName: employee.display_name,
      role: employee.role
    }
  });
});

app.get('/v1/me', requireAuth, (req, res) => {
  const employee = getActiveEmployee(req.auth.employeeId);
  if (!employee) return res.status(401).json({ error: 'Account is unavailable.' });
  return res.json({
    id: employee.id,
    email: employee.email,
    displayName: employee.display_name,
    role: employee.role
  });
});

app.get('/v1/clocking/methods', requireAuth, (_req, res) => {
  res.json({
    methods: [
      { id: 'wifi', enabled: wifiCidrs.length > 0, note: 'Verified by the API using the direct network peer address; phones cannot securely report their Wi-Fi name.' },
      { id: 'location', enabled: geofence.latitude !== null, note: 'Requires location permission and a server-configured geofence; coordinates are checked but not stored.' },
      { id: 'face', enabled: false, note: 'Not available until a reviewed verification provider, consent flow, retention policy, and accessible alternative are approved.' }
    ]
  });
});

app.get('/v1/attendance/today', requireAuth, (req, res) => {
  const employee = getActiveEmployee(req.auth.employeeId);
  if (!employee) return res.status(401).json({ error: 'Account is unavailable.' });
  const date = businessDate();
  const row = db.prepare(`
    SELECT * FROM attendance_days WHERE employee_id = ? AND business_date = ?
  `).get(employee.id, date);
  return res.json({
    businessDate: date,
    timeZone: BUSINESS_TIME_ZONE,
    attendance: attendanceRecord(row)
  });
});

function clock(action) {
  return (req, res) => {
    const parsed = clockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Choose a supported clocking method and provide valid method details.' });
    }

    const methodError = verifyClockMethod(
      parsed.data.method,
      parsed.data.location,
      req
    );
    if (methodError) {
      return res.status(methodError.status).json({ error: methodError.error });
    }

    const employee = getActiveEmployee(req.auth.employeeId);
    if (!employee) return res.status(401).json({ error: 'Account is unavailable.' });

    const date = businessDate();
    const now = new Date().toISOString();
    const transaction = db.transaction(() => {
      const existing = db.prepare(`
        SELECT * FROM attendance_days WHERE employee_id = ? AND business_date = ?
      `).get(employee.id, date);

      if (action === 'in') {
        if (existing) return { conflict: 'A clock-in is already recorded for today.', row: existing };
        const row = {
          id: crypto.randomUUID(),
          employee_id: employee.id,
          business_date: date,
          clock_in_at: now,
          clock_in_method: parsed.data.method,
          clock_out_at: null,
          clock_out_method: null
        };
        db.prepare(`
          INSERT INTO attendance_days
            (id, employee_id, business_date, clock_in_at, clock_in_method)
          VALUES (?, ?, ?, ?, ?)
        `).run(row.id, row.employee_id, row.business_date, row.clock_in_at, row.clock_in_method);
        return { row };
      }

      if (!existing) return { conflict: 'Clock in before recording a clock-out.', row: null };
      if (existing.clock_out_at) return { conflict: 'A clock-out is already recorded for today.', row: existing };
      db.prepare(`
        UPDATE attendance_days
        SET clock_out_at = ?, clock_out_method = ?
        WHERE id = ? AND clock_out_at IS NULL
      `).run(now, parsed.data.method, existing.id);
      return {
        row: db.prepare('SELECT * FROM attendance_days WHERE id = ?').get(existing.id)
      };
    });

    try {
      const result = transaction.immediate();
      if (result.conflict) {
        return res.status(409).json({
          error: result.conflict,
          businessDate: date,
          attendance: attendanceRecord(result.row)
        });
      }
      return res.status(action === 'in' ? 201 : 200).json({
        businessDate: date,
        timeZone: BUSINESS_TIME_ZONE,
        attendance: attendanceRecord(result.row)
      });
    } catch (error) {
      console.error('Attendance transaction failed:', error.message);
      return res.status(500).json({ error: 'Could not save your attendance. Please try again.' });
    }
  };
}

app.post('/v1/attendance/clock-in', requireAuth, clock('in'));
app.post('/v1/attendance/clock-out', requireAuth, clock('out'));

app.use((error, _req, res, _next) => {
  if (error.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ error: 'This web origin is not allowed.' });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Unhandled API error:', error.message);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const server = app.listen(PORT, () => {
  console.log(`PeopleDesk attendance API listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
