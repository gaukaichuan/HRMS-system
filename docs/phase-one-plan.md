# Phase 1 — Plan and project foundation

This document captures initial decisions and open questions for the HRMS MVP. It is a draft for stakeholder review, not legal advice or a finalized technical specification.

## Objective

Create a secure HRMS MVP for employee records and attendance. Face verification is a possible clocking method, but must be opt-in, privacy-reviewed, and accompanied by a non-biometric alternative.

## Phase 1 deliverables

- [x] Static, responsive UI prototype using fictional sample data
- [x] Initial scope and privacy boundaries documented
- [ ] Confirm requirements with HR, managers, employees, and payroll
- [ ] Confirm operating jurisdictions and obtain privacy/legal review for biometric processing
- [ ] Select production technology stack and hosting
- [ ] Agree on data model, authentication, authorization, and API conventions
- [ ] Define retention, deletion, backup, incident response, and audit requirements
- [ ] Create application, database, configuration, CI, and automated-test foundations

## Proposed MVP scope

1. Employee profiles: create, list/search, update, and deactivate.
2. Attendance: daily records, clock-in/out events, attendance status, and history.
3. Corrections: employee request and authorized manager approval, preserving an audit trail.
4. Clock station: server-validated clocking with an explicit manual fallback.
5. Administration: role-limited access and an audit log for sensitive changes.

Not included in this UI prototype: leave management, payroll processing, integrations, production authentication, or biometric enrollment/verification.

## Questions to resolve before implementation

### People and policy
- Which employee fields are required, and which are sensitive?
- What are the work schedules, time zones, grace periods, breaks, overtime rules, and holiday calendars?
- Who may create, view, edit, deactivate, and correct employee or attendance records?
- What correction evidence and approval steps are required?

### Privacy and biometrics
- In which countries or regions will the system operate?
- Is face verification necessary and proportionate for the use case?
- What consent, notice, alternative attendance process, retention period, deletion process, and appeal process are required?
- Can verification be performed without retaining face images, and how will templates be protected and access audited?
- How will false matches, failed verification, accessibility needs, camera outages, and spoofing attempts be handled?

### Technology and operations
- Preferred frontend/backend languages and hosting environment?
- Existing identity provider, email service, time-clock hardware, or HR/payroll integrations?
- Expected user count, availability needs, backup objectives, and support ownership?

## Provisional architecture direction

Use a browser-based frontend backed by an authenticated server API and a relational database. Keep authoritative timestamps and attendance rules on the server. Enforce role checks on every protected API operation, encrypt traffic and sensitive stored data, and maintain auditable records for administrative changes. Select specific technologies only after stakeholder and hosting constraints are known.

For face verification, treat the browser as an untrusted client: do not accept a client-supplied timestamp or an unverified identity claim. Use a purpose-built, reviewed provider or service only after privacy/security review, and do not store raw face imagery by default. This prototype does not implement any biometric processing.

## Acceptance criteria for Phase 1

- Stakeholders approve the MVP scope, attendance policy, and role matrix.
- Privacy/legal review identifies applicable biometric and employment-data obligations before any biometric feature is built.
- A documented stack and deployment approach are selected.
- Repository setup includes configuration handling, linting, tests, and CI before production features are added.
- Prototype limitations and non-biometric alternative are clear to reviewers.
