# PeopleDesk HRMS — Phase 1 prototype

A small, static browser prototype for the HRMS concept: employee directory, attendance dashboard, and a clock-in/out screen preview. It uses fictional sample data and does not connect to a server or process face data.

## Run locally

Open `index.html` in a modern browser. No package installation or build step is required.

## What is included

- Dashboard overview with sample attendance metrics and records
- Employee directory with a working search filter
- Attendance table with status filters
- Clock-in/out screen mockup with a local-only demo interaction
- Responsive layout for desktop and mobile
- Phase 1 planning notes in [`docs/phase-one-plan.md`](docs/phase-one-plan.md)

## Prototype boundaries

This is a UI prototype, not a production HRMS. Employee and attendance data are hard-coded in `app.js`; changes are not persisted. Authentication, database, APIs, face recognition, liveness detection, and real attendance capture are not implemented. The clock-in action only displays a demo message.

Face-based attendance must not be enabled without a privacy/legal review, informed consent, appropriate security and retention controls, and an accessible non-biometric alternative. Do not put real employee or biometric data into this prototype.

## Next step

Review the Phase 1 decisions in `docs/phase-one-plan.md`, then agree on the backend, frontend, database, hosting, identity provider, and jurisdiction-specific privacy requirements before implementation.
