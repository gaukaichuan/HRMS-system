/* PeopleDesk upgraded leave UI.
   All records, files and decisions remain local. */
(() => {
  'use strict';

  const view = document.querySelector('#view-leave');
  if (!view) return;

  const R = window.LeaveRules;

  if (!R) {
    view.textContent =
      'Leave rules could not load. Check leave-rules.js and refresh; your stored data has not been cleared.';
    return;
  }

  const KEY = 'peopledesk-leave-v1';

  const $ = (selector, root = document) => root.querySelector(selector);

  const esc = (value) => String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]
  );

  const num = (n) => Number(n).toLocaleString(
    undefined,
    { maximumFractionDigits: 1 }
  );

  const localToday = () => {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  };

  const dateLabel = (value) => {
    try {
      return R.parseDate(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return '—';
    }
  };

  const atLabel = (at) => {
    const date = new Date(at);
    return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString();
  };

  const periodLabel = (value) => ({
    full: 'Full day(s)',
    am: 'Half day · morning',
    pm: 'Half day · afternoon'
  })[value || 'full'];

  let state = R.emptyState();
  let storedRaw = null;
  let storageError = '';

  let selectedEmployee = '';
  let year = Number(localToday().slice(0, 4));
  let calendarMonth = localToday().slice(0, 7);

  let filter = {
    all: true,
    search: '',
    type: '',
    department: '',
    status: '',
    from: '',
    to: ''
  };

  const clone = () => JSON.parse(JSON.stringify(state));

  function readStorage() {
    try {
      const raw = localStorage.getItem(KEY);

      state = raw === null
        ? R.emptyState()
        : R.validateState(JSON.parse(raw));

      storedRaw = raw;
      storageError = '';
    } catch {
      storageError =
        'Leave records could not be read safely. Editing is disabled; existing storage is preserved. Do not clear browser data. Keep a backup and request support.';

      state = R.emptyState();
    }
  }

  function save(next) {
    if (storageError) {
      throw new Error(storageError);
    }

    const validated = R.validateState(next);

    if (localStorage.getItem(KEY) !== storedRaw) {
      readStorage();
      render();

      throw new Error(
        'Another tab changed leave data. Review the refreshed records and try again.'
      );
    }

    const json = JSON.stringify(validated);

    try {
      localStorage.setItem(KEY, json);
    } catch {
      throw new Error(
        'Could not save in this browser (storage may be full). No leave changes were applied. Try a smaller fictional attachment; do not clear existing records.'
      );
    }

    state = validated;
    storedRaw = json;
  }

  function addNotice(next, request, message) {
    next.notifications.unshift({
      id: crypto.randomUUID(),
      requestId: request.id,
      employeeId: request.employeeId,
      message,
      at: new Date().toISOString(),
      read: false
    });

    next.notifications = next.notifications.slice(0, 100);
  }

  const person = (request) =>
    employees.find((e) => e.id === request.employeeId) || {
      id: request.employeeId,
      name: request.employeeName,
      department: request.department || 'Unassigned'
    };

  function employeeList(activeOnly = false) {
    const list = employees
      .filter((e) => !activeOnly || e.status === 'Active')
      .map((e) => ({ ...e }));

    if (!activeOnly) {
      state.requests.forEach((r) => {
        if (!list.some((e) => e.id === r.employeeId)) {
          list.push({
            id: r.employeeId,
            name: r.employeeName,
            department: r.department,
            status: 'Removed'
          });
        }
      });
    }

    return list;
  }

  const employeeOptions = (activeOnly = false) =>
    employeeList(activeOnly).map((e) => `
      <option value="${esc(e.id)}">
        ${esc(e.name)} · ${esc(e.id)}${
          e.status !== 'Active' ? ' (inactive / removed)' : ''
        }
      </option>
    `).join('');

  const typeOptions = () => Object.entries(R.TYPES)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join('');

  view.innerHTML = `
    <div class="page-heading">
      <div>
        <p class="eyebrow">PEOPLE & TIME OFF</p>
        <h1>Leave management</h1>
        <p class="subtitle">
          Manage employee leave, team availability, and review decisions.
        </p>
      </div>

      <div class="leave-heading-actions">
        <button
          class="button button-secondary"
          id="leave-notifications-button"
        >
          Local inbox <span id="leave-unread">0</span>
        </button>

        <button class="button button-primary" id="leave-apply">
          ＋ Apply for leave
        </button>
      </div>
    </div>

    <p
      class="leave-error"
      id="leave-storage-error"
      role="alert"
      hidden
    ></p>

    <section class="panel leave-controls">
      <label>
        Employee
        <select id="leave-employee"></select>
      </label>

      <label>
        Balance / list year
        <input
          id="leave-year"
          type="number"
          min="1900"
          max="9999"
          step="1"
        >
      </label>

      <button
        class="button button-secondary"
        id="leave-entitlements"
      >
        Leave policy & holidays
      </button>
    </section>

    <div class="leave-balances" id="leave-balances"></div>
    <p class="leave-policy" id="leave-policy-summary"></p>

    <section class="panel leave-applications">
      <div class="leave-app-heading">
        <div>
          <h2>Leave applications</h2>
          <p class="leave-muted" id="leave-count"></p>
        </div>

        <button class="button button-secondary" id="leave-export">
          Export CSV
        </button>
      </div>

      <div class="leave-filter-grid">
        <label class="leave-search">
          Search employee / ID
          <input
            id="leave-search"
            type="search"
            placeholder="Search name or employee ID"
          >
        </label>

        <label>
          Leave type
          <select id="leave-type">
            <option value="">All types</option>
            ${typeOptions()}
          </select>
        </label>

        <label>
          Department
          <select id="leave-department">
            <option value="">All departments</option>
          </select>
        </label>

        <label>
          Status
          <select id="leave-status">
            <option value="">All statuses</option>
            ${R.STATUSES.map((s) => `<option>${s}</option>`).join('')}
            <option>Cancellation requested</option>
          </select>
        </label>

        <label>
          From
          <input id="leave-from" type="date">
        </label>

        <label>
          To
          <input id="leave-to" type="date">
        </label>

        <label class="leave-check">
          <input id="leave-all-employees" type="checkbox" checked>
          All employees
        </label>

        <button
          class="button button-secondary"
          id="leave-reset-filters"
        >
          Reset filters
        </button>
      </div>

      <p
        class="leave-error leave-filter-error"
        id="leave-filter-error"
        role="alert"
        hidden
      ></p>

      <div id="leave-list">
        <div class="table-wrap">
          <table class="leave-table">
            <thead>
              <tr>
                <th>EMPLOYEE / DEPARTMENT</th>
                <th>LEAVE TYPE</th>
                <th>DATES</th>
                <th>DAYS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody id="leave-rows"></tbody>
          </table>
        </div>
      </div>

      <div class="table-footer">
        <span>
          Available = base entitlement + annual carry-forward − approved
          − pending. Days stay reserved while cancellation awaits review.
        </span>
      </div>
    </section>

    <p
      class="leave-feedback"
      id="leave-feedback"
      role="status"
      aria-live="polite"
    ></p>
  `;

  // The separate calendar shares the list's state, storage key and filters.
  const calendarView = document.querySelector('#view-leave-calendar');

  if (calendarView) {
    calendarView.innerHTML = `
      <div class="page-heading">
        <div>
          <p class="eyebrow">PEOPLE & TIME OFF</p>
          <h1>Leave calendar</h1>
          <p class="subtitle">
            Team availability, linked to the Leave Management list.
          </p>
        </div>

        <button
          type="button"
          class="button button-secondary"
          id="leave-calendar-open-list"
        >
          Open leave list
        </button>
      </div>

      <p class="leave-muted leave-calendar-sync-note">
        Uses the same saved applications as the list. Pending and approved
        leave only; rejected and cancelled applications remain in the list.
        Sync is limited to this browser and same-site browser tabs.
      </p>

      <p
        class="leave-error"
        id="leave-calendar-storage-error"
        role="alert"
        hidden
      ></p>

      <section class="panel leave-calendar-panel">
        <div class="leave-calendar-heading">
          <div>
            <h2 id="leave-calendar-title">Team leave calendar</h2>
            <p
              class="leave-muted"
              id="leave-calendar-count"
              aria-live="polite"
            ></p>
          </div>

          <div class="leave-month-controls">
            <button
              type="button"
              class="button button-secondary"
              id="leave-month-prev"
              aria-label="Previous month"
            >←</button>

            <label>
              Month
              <input
                id="leave-month"
                type="month"
                min="1900-01"
                max="9999-12"
              >
            </label>

            <button
              type="button"
              class="button button-secondary"
              id="leave-month-next"
              aria-label="Next month"
            >→</button>
          </div>
        </div>

        <div class="leave-calendar-filter-grid">
          <label>
            Employee
            <select id="leave-calendar-employee"></select>
          </label>

          <label>
            Leave type
            <select id="leave-calendar-type">
              <option value="">All types</option>
              ${typeOptions()}
            </select>
          </label>

          <label>
            Department
            <select id="leave-calendar-department"></select>
          </label>

          <label>
            Status
            <select id="leave-calendar-status">
              <option value="">All statuses</option>
              ${
                R.STATUSES.map(
                  (status) => `<option>${status}</option>`
                ).join('')
              }
              <option>Cancellation requested</option>
            </select>
          </label>
        </div>

        <p
          class="leave-muted leave-calendar-filter-note"
          id="leave-calendar-filter-note"
        ></p>

        <button
          type="button"
          class="text-button leave-calendar-reset"
          id="leave-calendar-reset"
        >
          Reset shared filters
        </button>

        <div class="leave-legend">
          <span class="annual">Annual</span>
          <span class="medical">Medical</span>
          <span class="emergency">Emergency</span>
          <span>
            Dashed = pending · ★ = public holiday · AM / PM = half-day
          </span>
        </div>

        <div class="leave-calendar-scroll">
          <div
            class="leave-calendar-grid"
            id="leave-calendar-grid"
          ></div>
        </div>
      </section>
    `;
  }

  function makeDialog(id, title, body, submitLabel) {
    const d = document.createElement('dialog');

    d.id = id;
    d.className = 'leave-dialog';
    d.setAttribute('aria-labelledby', `${id}-title`);

    d.innerHTML = `
      <form>
        <div class="leave-dialog-heading">
          <h2 id="${id}-title">${title}</h2>
          <button
            class="dialog-close"
            type="button"
            aria-label="Close dialog"
          >×</button>
        </div>

        ${body}

        <p class="leave-error" role="alert" hidden></p>

        <div class="leave-dialog-actions">
          <button
            class="button button-secondary"
            type="button"
            data-close
          >
            Close
          </button>

          ${submitLabel ? `
            <button class="button button-primary" type="submit">
              ${submitLabel}
            </button>
          ` : ''}
        </div>
      </form>
    `;

    document.body.append(d);

    d.addEventListener('click', (e) => {
      if (
        e.target === d ||
        e.target.closest('[data-close], .dialog-close')
      ) {
        d.close();
      }
    });

    return d;
  }

  const applyDialog = makeDialog(
    'leave-application-dialog',
    'Apply for leave',
    `
      <p class="leave-muted">
        Submit on behalf of an active employee. Demo only—no medical
        diagnoses or real documents.
      </p>

      <div class="leave-form-grid">
        <label class="leave-full">
          Employee
          <select name="employeeId" required></select>
        </label>

        <label>
          Leave type
          <select name="type">${typeOptions()}</select>
        </label>

        <label>
          Duration
          <select name="duration">
            <option value="full">Full day(s)</option>
            <option value="am">Half day · morning</option>
            <option value="pm">Half day · afternoon</option>
          </select>
        </label>

        <label>
          Start date
          <input name="start" type="date" required>
        </label>

        <label>
          End date
          <input name="end" type="date" required>
        </label>

        <div
          id="leave-preview"
          class="leave-preview leave-full"
          aria-live="polite"
        ></div>

        <label class="leave-full">
          Reason
          <textarea
            name="reason"
            rows="3"
            maxlength="500"
            required
            placeholder="Brief fictional reason; no diagnosis"
          ></textarea>
        </label>

        <label class="leave-full">
          Contact during leave (optional)
          <input
            name="contact"
            maxlength="100"
            placeholder="Fictional contact number or email"
          >
        </label>

        <label class="leave-full">
          Demo attachment (optional)
          <input
            name="attachment"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          >
        </label>

        <p class="leave-muted leave-full">
          One fictional PDF, PNG, or JPEG, maximum 256 KB. File contents
          are saved unencrypted in browser storage—not uploaded to a
          server. Never use a real medical certificate.
        </p>
      </div>
    `,
    'Submit application'
  );

  const policyDialog = makeDialog(
    'leave-policy-dialog',
    'Leave policy & holidays',
    `
      <p class="leave-muted" id="leave-policy-context"></p>

      <div class="leave-form-grid">
        ${Object.entries(R.TYPES).map(([type, label]) => `
          <label>
            ${label} base (days)
            <input
              name="${type}"
              type="number"
              min="0"
              max="366"
              step="0.5"
              required
            >
          </label>
        `).join('')}

        <label>
          Annual carry-forward credit
          <input
            name="carry"
            type="number"
            min="0"
            max="366"
            step="0.5"
            required
          >
        </label>
      </div>

      <p class="leave-muted">
        Entitlements and carry-forward credit apply to this employee/year
        only. Carry-forward is a manually approved credit, not an
        automatic transfer or expiry calculation.
      </p>

      <hr>

      <label class="leave-check">
        <input name="halfDays" type="checkbox">
        Allow half-day applications (all employees)
      </label>

      <label>
        Public holidays for <span id="leave-holiday-year"></span>
        <textarea
          name="holidays"
          rows="5"
          placeholder="2026-12-25 | Example holiday"
        ></textarea>
      </label>

      <p class="leave-muted">
        One date per line: YYYY-MM-DD | Holiday name. This calendar applies
        to all employees, Monday–Friday schedules only. Enter HR-approved
        dates; no jurisdiction is assumed. Policy changes affect new
        applications, not the saved day counts of existing ones.
      </p>
    `,
    'Save policy'
  );

  const decisionDialog = makeDialog(
    'leave-decision-dialog',
    'Review leave',
    `
      <div id="leave-decision-summary" class="leave-preview"></div>

      <p class="leave-muted">
        Simulation: actor names are typed, not authenticated. Check team
        availability in the separate Leave calendar tab before deciding.
      </p>

      <label>
        Demo actor / reviewer name
        <input
          name="actor"
          value="Demo HR reviewer"
          maxlength="100"
          required
        >
      </label>

      <label>
        Reason / decision note
        <textarea name="note" rows="3" maxlength="500"></textarea>
      </label>
    `,
    'Confirm decision'
  );

  const detailsDialog = makeDialog(
    'leave-history-dialog',
    'Application details',
    '<div id="leave-history-content"></div>',
    ''
  );

  const inboxDialog = makeDialog(
    'leave-inbox-dialog',
    'Local demo inbox',
    `
      <p class="leave-muted">
        Shared local activity feed—not an employee portal or email
        service. Latest 100 messages only. Anyone using this browser
        can read them.
      </p>

      <button
        class="button button-secondary"
        type="button"
        id="leave-mark-read"
      >
        Mark all as read
      </button>

      <div id="leave-inbox-content"></div>
    `,
    ''
  );

  let policyEmployee = '';
  let policyYear = 0;
  let decisionId = '';
  let decisionAction = '';
  let submitting = false;

  const error = (d, message) => {
    const el = $('.leave-error', d);
    el.textContent = message;
    el.hidden = !message;
  };

  const feedback = (message) => {
    $('#leave-feedback').textContent = message;
  };

  const statusBadge = (r) => `
    <span class="leave-status ${r.status.toLowerCase()}">
      ${esc(r.status)}
    </span>
    ${r.cancellation ? `
      <small class="leave-cell-small leave-cancel-label">
        Cancellation requested
      </small>
    ` : ''}
  `;

  function filterError() {
    let message = '';

    try {
      if (filter.from) R.parseDate(filter.from);
      if (filter.to) R.parseDate(filter.to);

      if (
        filter.from
