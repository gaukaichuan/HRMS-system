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
        filter.from &&
        filter.to &&
        filter.to < filter.from
      ) {
        message = 'Filter end date must not be earlier than start date.';
      }
    } catch (e) {
      message = e.message;
    }

    const el = $('#leave-filter-error');
    el.textContent = message;
    el.hidden = !message;

    return !!message;
  }

  function filteredRequests(calendarRange) {
    if (filterError()) return [];

    return state.requests.filter((r) => {
      const p = person(r);
      const query = filter.search.trim().toLowerCase();

      return (
        (filter.all || r.employeeId === selectedEmployee) &&
        (
          !query ||
          `${p.name} ${r.employeeId}`.toLowerCase().includes(query)
        ) &&
        (!filter.type || r.type === filter.type) &&
        (!filter.department || p.department === filter.department) &&
        (
          !filter.status ||
          (
            filter.status === 'Cancellation requested'
              ? !!r.cancellation
              : r.status === filter.status
          )
        ) &&
        r.start <= (calendarRange?.end || `${year}-12-31`) &&
        r.end >= (calendarRange?.start || `${year}-01-01`) &&
        (!filter.from || r.end >= filter.from) &&
        (!filter.to || r.start <= filter.to)
      );
    }).slice().reverse();
  }

  function renderInbox() {
    $('#leave-unread').textContent = state.notifications
      .filter((n) => !n.read).length;

    $('#leave-inbox-content').innerHTML = state.notifications.length
      ? state.notifications.map((n) => `
          <article class="leave-inbox-item ${n.read ? '' : 'unread'}">
            <p>${esc(n.message)}</p>
            <small>
              ${esc(atLabel(n.at))} · ${n.read ? 'Read' : 'Unread'}
            </small>
          </article>
        `).join('')
      : `
          <p class="leave-muted">
            No local notifications yet. Submissions and decisions will
            appear here.
          </p>
        `;

    $('#leave-mark-read').disabled =
      !!storageError ||
      !state.notifications.some((n) => !n.read);
  }

  function renderBalances() {
    $('#leave-balances').innerHTML = storageError
      ? `
          <p class="leave-muted">
            Balances unavailable until stored records can be read safely.
          </p>
        `
      : Object.entries(R.TYPES).map(([type, label]) => {
          const b = R.balance(state, selectedEmployee, year, type);
          const denom = b.entitlement || 1;

          const used = Math.min(100, b.used / denom * 100);
          const pending = Math.min(
            100 - used,
            b.pending / denom * 100
          );

          return `
            <article class="panel leave-balance ${type}">
              <span class="leave-type">${label}</span>

              <strong class="leave-available">
                ${num(b.available)}
                <small> days available</small>
              </strong>

              <p class="leave-balance-ratio">
                ${num(b.available)} / ${num(b.entitlement)} days available
              </p>

              <div
                class="leave-progress"
                role="img"
                aria-label="${esc(label)}: ${num(b.used)} used, ${num(b.pending)} pending, ${num(b.available)} available"
              >
                <span class="used" style="width:${used}%"></span>
                <span class="reserved" style="width:${pending}%"></span>
              </div>

              <div class="leave-balance-details">
                <span>
                  Entitled
                  <b>${num(b.entitlement)}</b>
                </span>
                <span>
                  Used / approved
                  <b>${num(b.used)}</b>
                </span>
                <span>
                  Pending
                  <b>${num(b.pending)}</b>
                </span>
              </div>

              <small class="leave-carry">
                Base ${num(b.base)}${
                  type === 'annual'
                    ? ` + ${num(b.carryForward)} carry-forward credit`
                    : ''
                }
              </small>
            </article>
          `;
        }).join('');

    $('#leave-policy-summary').textContent =
      'Local demo only; no login, role enforcement, shared storage, or email delivery. Working days: Monday–Friday, excluding configured public holidays. ' +
      'Half-days: ' +
      (state.policy.allowHalfDays ? 'enabled' : 'disabled') +
      '. ' +
      Object.keys(state.policy.holidays)
        .filter((d) => d.startsWith(`${year}-`)).length +
      ` public holiday(s) configured for ${year}. ` +
      'Existing applications keep their original day calculation. ' +
      'No accrual or automatic carry-forward.';
  }

  function renderRows(rows) {
    $('#leave-rows').innerHTML = rows.length
      ? rows.map((r) => {
          const p = person(r);
          const actions = [];

          if (!storageError) {
            if (r.cancellation) {
              actions.push(
                ['confirmCancel', 'Approve cancellation'],
                ['rejectCancel', 'Decline cancellation']
              );
            } else {
              if (r.status === 'Pending') {
                actions.push(
                  ['approve', 'Approve'],
                  ['reject', 'Reject']
                );
              }

              if (['Pending', 'Approved'].includes(r.status)) {
                actions.push(['requestCancel', 'Request cancellation']);
              }
            }
          }

          return `
            <tr>
              <td>
                <strong>${esc(p.name)}</strong>
                <small class="leave-cell-small">
                  ${esc(r.employeeId)} ·
                  ${esc(p.department || 'Unassigned')}
                </small>
              </td>

              <td>
                <span class="leave-type-dot ${r.type}"></span>
                ${esc(R.TYPES[r.type])}
                ${r.attachment ? `
                  <small class="leave-cell-small">
                    Demo attachment
                  </small>
                ` : ''}
              </td>

              <td>
                ${esc(dateLabel(r.start))}
                <small class="leave-cell-small">
                  ${
                    r.end === r.start
                      ? esc(periodLabel(r.duration))
                      : `to ${esc(dateLabel(r.end))}`
                  }
                </small>
              </td>

              <td>${num(R.requestDays(r))}</td>

              <td>${statusBadge(r)}</td>

              <td>
                <div class="leave-row-actions">
                  <button
                    class="row-action"
                    data-leave-action="details"
                    data-id="${esc(r.id)}"
                  >
                    View details
                  </button>

                  ${actions.map(([action, label]) => `
                    <button
                      class="row-action ${
                        ['reject', 'rejectCancel'].includes(action)
                          ? 'danger'
                          : ''
                      }"
                      data-leave-action="${action}"
                      data-id="${esc(r.id)}"
                    >
                      ${label}
                    </button>
                  `).join('')}
                </div>
              </td>
            </tr>
          `;
        }).join('')
      : `
          <tr>
            <td class="empty-state" colspan="6">
              No applications match these filters. Try another year or
              reset filters.
            </td>
          </tr>
        `;
  }

  function renderCalendar() {
    if (!calendarView) return;

    $('#leave-month').value = calendarMonth;

    $('#leave-calendar-storage-error').textContent = storageError;
    $('#leave-calendar-storage-error').hidden = !storageError;

    $('#leave-calendar-employee').innerHTML =
      '<option value="">All employees</option>' + employeeOptions();

    $('#leave-calendar-employee').value =
      filter.all ? '' : selectedEmployee;

    $('#leave-calendar-type').value = filter.type;

    $('#leave-calendar-department').innerHTML =
      $('#leave-department').innerHTML;

    $('#leave-calendar-department').value = filter.department;
    $('#leave-calendar-status').value = filter.status;

    const shared = [];

    if (filter.search) {
      shared.push(`Employee search: ${filter.search}`);
    }

    if (filter.from) {
      shared.push(`From: ${dateLabel(filter.from)}`);
    }

    if (filter.to) {
      shared.push(`To: ${dateLabel(filter.to)}`);
    }

    $('#leave-calendar-filter-note').textContent = shared.length
      ? (
          'Also using list filters — ' +
          shared.join(' · ') +
          '. Reset shared filters to show all.'
        )
      : (
          'Employee, leave type, department and status filters are shared with the list.'
        );

    const first = R.parseDate(`${calendarMonth}-01`);
    const offset = (first.getUTCDay() + 6) % 7;
    const gridStart = first.valueOf() - offset * R.DAY;

    const lower = Math.max(
      gridStart,
      R.parseDate('1900-01-01').valueOf()
    );

    const upper = Math.min(
      gridStart + 41 * R.DAY,
      R.parseDate('9999-12-31').valueOf()
    );

    const rows = storageError
      ? []
      : filteredRequests({
          start: R.isoDate(new Date(lower)),
          end: R.isoDate(new Date(upper))
        });

    const active = rows.filter((r) =>
      ['Pending', 'Approved'].includes(r.status)
    );

    const count = active.filter((r) =>
      R.requestUnits(r).some((day) =>
        day.date.startsWith(calendarMonth) &&
        (!filter.from || day.date >= filter.from) &&
        (!filter.to || day.date <= filter.to)
      )
    ).length;

    $('#leave-calendar-title').textContent =
      first.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });

    $('#leave-calendar-count').textContent = storageError
      ? 'Calendar unavailable until saved data can be read safely.'
      : filterError()
        ? $('#leave-filter-error').textContent
        : (
            `${count} matching pending / approved application(s) this month. ` +
            'Click an event for details.'
          );

    $('#leave-month-prev').disabled = calendarMonth === '1900-01';
    $('#leave-month-next').disabled = calendarMonth === '9999-12';

    const headings = [
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    ].map((day) => `
      <div class="leave-weekday">${day}</div>
    `).join('');

    $('#leave-calendar-grid').innerHTML = headings +
      Array.from({ length: 42 }, (_, i) => {
        const current = new Date(gridStart + i * R.DAY);

        if (
          current.getUTCFullYear() < 1900 ||
          current.getUTCFullYear() > 9999
        ) {
          return (
            '<div class="leave-calendar-day outside" ' +
            'aria-hidden="true"></div>'
          );
        }

        const date = R.isoDate(current);
        const outside = !date.startsWith(calendarMonth);
        const holiday = state.policy.holidays[date];

        const events = active.filter((r) =>
          R.requestUnits(r).some((day) => day.date === date) &&
          (!filter.from || date >= filter.from) &&
          (!filter.to || date <= filter.to)
        );

        return `
          <div class="leave-calendar-day
            ${outside ? 'outside' : ''}
            ${[0, 6].includes(current.getUTCDay()) ? 'weekend' : ''}
            ${date === localToday() ? 'today' : ''}
          ">
            <time datetime="${date}">
              ${current.getUTCDate()}
            </time>

            ${holiday ? `
              <span class="leave-holiday" title="${esc(holiday)}">
                ★ ${esc(holiday)}
              </span>
            ` : ''}

            ${events.map((r) => `
              <button
                type="button"
                class="leave-event ${r.type} ${r.status.toLowerCase()}"
                data-leave-action="details"
                data-id="${esc(r.id)}"
                title="${esc(person(r).name)} · ${esc(R.TYPES[r.type])} · ${r.status}"
              >
                ${esc(person(r).name)}${
                  r.duration !== 'full'
                    ? ` · ${r.duration.toUpperCase()}`
                    : ''
                }${
                  r.cancellation
                    ? ' · Cancellation requested'
                    : ''
                }
              </button>
            `).join('')}
          </div>
        `;
      }).join('');
  }

  function renderApplications() {
    const rows = filteredRequests();

    $('#leave-count').textContent =
      `${rows.length} application(s) · ${year} · ` +
      (filter.all ? 'All employees' : 'Selected employee');

    renderRows(rows);

    $('#leave-export').disabled = !!storageError || !rows.length;

    renderCalendar();
  }

  function render() {
    const list = employeeList();

    if (!list.some((e) => e.id === selectedEmployee)) {
      selectedEmployee =
        list.find((e) => e.status === 'Active')?.id ||
        list[0]?.id ||
        '';
    }

    $('#leave-employee').innerHTML = employeeOptions();
    $('#leave-employee').value = selectedEmployee;
    $('#leave-year').value = year;

    const departments = [
      ...new Set(list.map((e) => e.department).filter(Boolean))
    ].sort();

    $('#leave-department').innerHTML =
      '<option value="">All departments</option>' +
      departments.map((d) => `<option>${esc(d)}</option>`).join('');

    if (!departments.includes(filter.department)) {
      filter.department = '';
    }

    $('#leave-department').value = filter.department;
    $('#leave-search').value = filter.search;
    $('#leave-type').value = filter.type;
    $('#leave-status').value = filter.status;
    $('#leave-from').value = filter.from;
    $('#leave-to').value = filter.to;
    $('#leave-all-employees').checked = filter.all;

    const alert = $('#leave-storage-error');

    alert.textContent = storageError;
    alert.hidden = !storageError;

    $('#leave-apply').disabled =
      !!storageError ||
      !employees.some((e) => e.status === 'Active');

    $('#leave-entitlements').disabled =
      !!storageError ||
      !employees.some((e) => e.id === selectedEmployee);

    renderBalances();
    renderApplications();
    renderInbox();
  }

  function preview() {
    const f = new FormData($('form', applyDialog));

    try {
      const units = R.dayUnits(
        String(f.get('start')),
        String(f.get('end')),
        String(f.get('duration')),
        state.policy.holidays
      );

      const total = units.reduce((sum, d) => sum + d.units, 0);

      $('#leave-preview').textContent =
        `${num(total)} working day(s) after weekend / public-holiday exclusions. ` +
        Object.entries(R.splitUnits(units)).map(([y, count]) => {
          const available = R.balance(
            state,
            String(f.get('employeeId')),
            y,
            String(f.get('type'))
          ).available;

          return (
            `${y}: ${num(count)} requested / ${num(available)} available` +
            (count > available ? ' — insufficient balance' : '')
          );
        }).join(' · ');
    } catch (e) {
      $('#leave-preview').textContent = e.message;
    }
  }

  $('#leave-apply').addEventListener('click', () => {
    const form = $('form', applyDialog);

    form.reset();

    $('[name="employeeId"]', form).innerHTML = employeeOptions(true);

    if (
      employees.some((e) =>
        e.id === selectedEmployee &&
        e.status === 'Active'
      )
    ) {
      $('[name="employeeId"]', form).value = selectedEmployee;
    }

    $('[name="start"]', form).value = localToday();
    $('[name="end"]', form).value = localToday();

    $('[name="duration"]', form).innerHTML =
      '<option value="full">Full day(s)</option>' +
      (
        state.policy.allowHalfDays
          ? `
              <option value="am">Half day · morning</option>
              <option value="pm">Half day · afternoon</option>
            `
          : ''
      );

    error(applyDialog, '');
    preview();
    applyDialog.showModal();
  });

  $('form', applyDialog).addEventListener('input', preview);
  $('form', applyDialog).addEventListener('change', preview);

  async function attachmentFrom(file) {
    if (!file || !file.size) return null;

    if (
      file.size > 262144 ||
      file.name.length > 150 ||
      !\['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)
    ) {
      throw new Error(
        'Use a fictional PDF, PNG, or JPEG up to 256 KB, with a filename under 151 characters.'
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const valid = file.type === 'application/pdf'
      ? String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
      : file.type === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every(
            (n, i) => bytes[i] === n
          )
        : bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255;

    if (!valid) {
      throw new Error(
        'Attachment content does not match its PDF / image file type.'
      );
    }

    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      reader.onerror = () => reject(
        new Error('Could not read the attachment.')
      );

      reader.readAsDataURL(file);
    });

    const result = {
      name: file.name,
      type: file.type,
      size: file.size,
      data
    };

    R.validateAttachment(result);
    return result;
  }

  $('form', applyDialog).addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitting) return;

    submitting = true;

    const submit = $('button[type="submit"]', applyDialog);
    submit.disabled = true;

    try {
      const f = new FormData(event.currentTarget);

      const draft = {
        employeeId: String(f.get('employeeId')),
        type: String(f.get('type')),
        duration: String(f.get('duration')),
        start: String(f.get('start')),
        end: String(f.get('end')),
        reason: String(f.get('reason')).trim(),
        contact: String(f.get('contact')).trim()
      };

      R.validateApplication(state, draft, employees);

      const attachment = await attachmentFrom(f.get('attachment'));
      const units = R.validateApplication(state, draft, employees);

      const employee = employees.find(
        (e) => e.id === draft.employeeId
      );

      const at = new Date().toISOString();

      const request = {
        ...draft,
        id: crypto.randomUUID(),
        employeeName: employee.name,
        department: employee.department,
        status: 'Pending',
        dayUnits: units,
        attachment,
        cancellation: null,
        history: [
          {
            status: 'Pending',
            actor: 'Demo application (unverified)',
            note: 'Submitted locally; no email sent.',
            at
          }
        ]
      };

      const next = clone();

      next.requests.push(request);

      addNotice(
        next,
        request,
        `${employee.name}: ${R.TYPES[request.type]} application submitted for review (${num(R.requestDays(request))} days).`
      );

      save(next);

      selectedEmployee = employee.id;
      year = +draft.start.slice(0, 4);
      calendarMonth = draft.start.slice(0, 7);

      applyDialog.close();
      render();

      feedback(
        'Application submitted locally. Pending days are reserved. A message was added to the local demo inbox; no email was sent.'
      );
    } catch (e) {
      error(applyDialog, e.message);
    } finally {
      submitting = false;
      submit.disabled = false;
    }
  });

  $('#leave-employee').addEventListener('change', (e) => {
    selectedEmployee = e.target.value;
    render();
  });

  $('#leave-year').addEventListener('change', (e) => {
    const value = +e.target.value;

    if (
      !e.target.value ||
      !Number.isInteger(value) ||
      value < 1900 ||
      value > 9999
    ) {
      e.target.value = year;
      feedback('Choose a year from 1900 to 9999.');
      return;
    }

    year = value;
    calendarMonth = `${year}-${calendarMonth.slice(5)}`;

    render();
  });

  [
    ['leave-search', 'search', 'input'],
    ['leave-type', 'type', 'change'],
    ['leave-department', 'department', 'change'],
    ['leave-status', 'status', 'change'],
    ['leave-from', 'from', 'change'],
    ['leave-to', 'to', 'change']
  ].forEach(([id, key, event]) => {
    $('#' + id).addEventListener(event, (e) => {
      filter[key] = e.target.value;
      renderApplications();
    });
  });

  $('#leave-all-employees').addEventListener('change', (e) => {
    filter.all = e.target.checked;
    renderApplications();
  });

  $('#leave-reset-filters').addEventListener('click', () => {
    filter = {
      all: true,
      search: '',
      type: '',
      department: '',
      status: '',
      from: '',
      to: ''
    };

    [
      'leave-search',
      'leave-type',
      'leave-department',
      'leave-status',
      'leave-from',
      'leave-to'
    ].forEach((id) => {
      $('#' + id).value = '';
    });

    $('#leave-all-employees').checked = true;

    renderApplications();
  });

  $('#leave-entitlements').addEventListener('click', () => {
    policyEmployee = selectedEmployee;
    policyYear = year;

    $('#leave-policy-context').textContent =
      `${employees.find((e) => e.id === policyEmployee).name} · ${policyYear}. ` +
      'Demo rules only; confirm HR policy before production.';

    $('#leave-holiday-year').textContent = policyYear;

    Object.keys(R.TYPES).forEach((type) => {
      $(`[name="${type}"]`, policyDialog).value = R.baseEntitlement(
        state,
        policyEmployee,
        policyYear,
        type
      );
    });

    $('[name="carry"]', policyDialog).value =
      state.carryForward[policyEmployee]?.[policyYear] || 0;

    $('[name="halfDays"]', policyDialog).checked =
      state.policy.allowHalfDays;

    $('[name="holidays"]', policyDialog).value =
      Object.entries(state.policy.holidays)
        .filter(([date]) => date.startsWith(`${policyYear}-`))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, label]) => `${date} | ${label}`)
        .join('\n');

    error(policyDialog, '');
    policyDialog.showModal();
  });

  $('form', policyDialog).addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      const f = new FormData(event.currentTarget);

      const values = Object.fromEntries(
        Object.keys(R.TYPES).map((type) => [
          type,
          Number(f.get(type))
        ])
      );

      const carried = Number(f.get('carry'));

      if (!employees.some((e) => e.id === policyEmployee)) {
        throw new Error('Selected employee no longer exists.');
      }

      R.validateEntitlements(
        state,
        policyEmployee,
        policyYear,
        values,
        carried
      );

      const holidays = Object.fromEntries(
        Object.entries(state.policy.holidays)
          .filter(([date]) => !date.startsWith(`${policyYear}-`))
      );

      const seen = new Set();

      for (
        const line of String(f.get('holidays'))
          .split(/\r?\n/)
          .filter((line) => line.trim())
      ) {
        const match = line.trim().match(
          /^(\d{4}-\d{2}-\d{2})\s*\|\s*(.+)$/
        );

        if (!match) {
          throw new Error(
            'Holiday format: YYYY-MM-DD | Holiday name, one per line.'
          );
        }

        const date = match[1];
        const label = match[2].trim();

        R.parseDate(date);

        if (
          !date.startsWith(`${policyYear}-`) ||
          !label ||
          label.length > 100 ||
          seen.has(date)
        ) {
          throw new Error(
            'Holiday dates must be unique, in the selected year, with names of 1–100 characters.'
          );
        }

        seen.add(date);
        holidays[date] = label;
      }

      const next = clone();

      if (!Object.hasOwn(next.entitlements, policyEmployee)) {
        next.entitlements[policyEmployee] = {};
      }

      if (!Object.hasOwn(next.carryForward, policyEmployee)) {
        next.carryForward[policyEmployee] = {};
      }

      next.entitlements[policyEmployee][policyYear] = values;
      next.carryForward[policyEmployee][policyYear] = carried;

      next.policy = {
        allowHalfDays: f.get('halfDays') === 'on',
        holidays
      };

      save(next);
      policyDialog.close();
      render();

      feedback(
        'Policy saved. New applications use the new holiday calendar; existing day counts remain unchanged.'
      );
    } catch (e) {
      error(policyDialog, e.message);
    }
  });

  function showDetails(r) {
    $('#leave-history-content').innerHTML = `
      <div class="leave-details-summary">
        <strong>
          ${esc(r.employeeName)} · ${esc(R.TYPES[r.type])}
        </strong>

        <p>
          ${esc(dateLabel(r.start))} to ${esc(dateLabel(r.end))}
          · ${num(R.requestDays(r))} working day(s)
        </p>

        ${statusBadge(r)}

        <p>${esc(periodLabel(r.duration))}</p>
      </div>

      <p class="leave-prewrap"><b>Reason:</b> ${esc(r.reason)}</p>
      <p><b>Contact:</b> ${esc(r.contact || 'Not supplied')}</p>

      ${r.attachment ? `
        <p>
          <b>Fictional local attachment:</b>
          ${esc(r.attachment.name)}
          (${num(r.attachment.size / 1024)} KB)
        </p>

        <button
          type="button"
          class="button button-secondary"
          id="leave-download-attachment"
          data-id="${esc(r.id)}"
        >
          Download demo attachment
        </button>
      ` : '<p class="leave-muted">No attachment.</p>'}

      ${r.cancellation ? `
        <div class="leave-preview">
          <b>Cancellation awaiting review</b>
          <p class="leave-prewrap">${esc(r.cancellation.reason)}</p>
          <small>
            Balance is not released until cancellation is approved.
          </small>
        </div>
      ` : ''}

      <h3>Working-day snapshot</h3>

      <p class="leave-muted">
        ${
          Object.entries(R.requestAllocations(r))
            .map(([y, count]) => `${y}: ${num(count)} days`)
            .join(' · ')
        }.
        Stored at submission, including the policy exclusions in effect
        then.
      </p>

      <h3>Local decision history (unverified)</h3>

      <ol class="leave-history">
        ${r.history.map((h) => `
          <li>
            <strong>${esc(h.status)}</strong> · ${esc(h.actor)}
            <small>${esc(atLabel(h.at))}</small>
            <p class="leave-prewrap">${esc(h.note || 'No note')}</p>
          </li>
        `).join('')}
      </ol>
    `;

    detailsDialog.showModal();
  }

  const actionLabels = {
    approve: 'Approve leave',
    reject: 'Reject leave',
    requestCancel: 'Request cancellation',
    confirmCancel: 'Approve cancellation',
    rejectCancel: 'Decline cancellation'
  };

  function handleAction(event) {
    const button = event.target.closest('[data-leave-action]');
    if (!button) return;

    const r = state.requests.find(
      (item) => item.id === button.dataset.id
    );

    if (!r) return;

    if (button.dataset.leaveAction === 'details') {
      showDetails(r);
      return;
    }

    decisionId = r.id;
    decisionAction = button.dataset.leaveAction;

    $('#leave-decision-dialog-title').textContent =
      actionLabels[decisionAction];

    $('#leave-decision-summary').textContent =
      `${r.employeeName} · ${R.TYPES[r.type]} · ` +
      `${dateLabel(r.start)} to ${dateLabel(r.end)} · ` +
      `${num(R.requestDays(r))} day(s). ` +
      (
        r.cancellation
          ? `Cancellation reason: ${r.cancellation.reason}. `
          : ''
      ) +
      (
        decisionAction === 'requestCancel'
          ? 'This requests review; balance remains committed until approved.'
          : decisionAction === 'confirmCancel'
            ? 'Confirm cancellation: this will release the committed days.'
            : ''
      );

    $('[name="note"]', decisionDialog).value = '';

    $('[name="note"]', decisionDialog).required =
      ['reject', 'requestCancel', 'rejectCancel']
        .includes(decisionAction);

    $('button[type="submit"]', decisionDialog).textContent =
      actionLabels[decisionAction];

    error(decisionDialog, '');
    decisionDialog.showModal();
  }

  $('#leave-rows').addEventListener('click', handleAction);

  $('form', decisionDialog).addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      const f = new FormData(event.currentTarget);

      const replacement = R.transition(
        state,
        decisionId,
        decisionAction,
        String(f.get('actor')),
        String(f.get('note')),
        employees
      );

      const next = clone();

      next.requests = next.requests.map((r) =>
        r.id === decisionId ? replacement : r
      );

      const last = replacement.history.at(-1);

      addNotice(
        next,
        replacement,
        `${replacement.employeeName}: ${R.TYPES[replacement.type]} — ` +
        `${last.status}${last.note ? ': ' + last.note : '.'}`
      );

      save(next);
      decisionDialog.close();
      render();

      feedback(
        `${last.status}. Balances recalculated; local inbox updated. No email was sent.`
      );
    } catch (e) {
      error(decisionDialog, e.message);
    }
  });

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  detailsDialog.addEventListener('click', (event) => {
    const button = event.target.closest('#leave-download-attachment');
    if (!button) return;

    try {
      const attachment = state.requests.find(
        (r) => r.id === button.dataset.id
      )?.attachment;

      R.validateAttachment(attachment);

      if (!attachment) return;

      const base64 = attachment.data.slice(
        attachment.data.indexOf(',') + 1
      );

      const bytes = Uint8Array.from(
        atob(base64),
        (c) => c.charCodeAt(0)
      );

      const ext = {
        'application/pdf': 'pdf',
        'image/png': 'png',
        'image/jpeg': 'jpg'
      }[attachment.type];

      const safeName = attachment.name
        .replace(/\.[^.]*$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 80) || 'demo-attachment';

      download(
        new Blob([bytes], { type: attachment.type }),
        `${safeName}.${ext}`
      );
    } catch (e) {
      error(detailsDialog, e.message);
    }
  });

  $('#leave-export').addEventListener('click', () => {
    const rows = filteredRequests();

    const cells = (value) => {
      let text = String(value ?? '');

      if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    };

    const data = [
      [
        'Employee',
        'Employee ID',
        'Department',
        'Leave type',
        'Start',
        'End',
        'Duration',
        'Working days',
        'Status',
        'Cancellation requested',
        'Reason',
        'Latest decision note'
      ],
      ...rows.map((r) => [
        person(r).name,
        r.employeeId,
        person(r).department,
        R.TYPES[r.type],
        r.start,
        r.end,
        periodLabel(r.duration),
        R.requestDays(r),
        r.status,
        r.cancellation ? 'Yes' : 'No',
        r.reason,
        r.history.at(-1)?.note || ''
      ])
    ];

    const csv = '\uFEFF' +
      data.map((row) => row.map(cells).join(',')).join('\r\n');

    download(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `PeopleDesk-leave-${year}-list.csv`
    );

    feedback(
      'Filtered applications exported as CSV. Attachments and contact details are not included.'
    );
  });

  $('#leave-notifications-button').addEventListener('click', () => {
    renderInbox();
    inboxDialog.showModal();
  });

  $('#leave-mark-read').addEventListener('click', () => {
    try {
      const next = clone();

      next.notifications.forEach((n) => n.read = true);

      save(next);
      renderInbox();
    } catch (e) {
      error(inboxDialog, e.message);
    }
  });

  $('[data-view="leave"]').addEventListener('click', () => {
    readStorage();
    render();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) {
      readStorage();
      render();
      preview();

      feedback('Local leave data refreshed from another tab.');
    }
  });

  if (calendarView) {
    $('#leave-calendar-open-list').addEventListener(
      'click',
      () => $('[data-view="leave"]').click()
    );

    $('[data-view="leave-calendar"]').addEventListener('click', () => {
      readStorage();
      render();
    });

    $('#leave-calendar-grid').addEventListener('click', handleAction);

    $('#leave-calendar-employee').addEventListener('change', (event) => {
      filter.all = !event.target.value;

      if (event.target.value) {
        selectedEmployee = event.target.value;
      }

      render();
    });

    [
      ['leave-calendar-type', 'type'],
      ['leave-calendar-department', 'department'],
      ['leave-calendar-status', 'status']
    ].forEach(([id, key]) => {
      $('#' + id).addEventListener('change', (event) => {
        filter[key] = event.target.value;
        render();
      });
    });

    $('#leave-calendar-reset').addEventListener('click', () => {
      $('#leave-reset-filters').click();
      render();
    });

    $('#leave-month').addEventListener('change', (event) => {
      try {
        R.parseDate(`${event.target.value}-01`);

        calendarMonth = event.target.value;
        year = +calendarMonth.slice(0, 4);

        render();
      } catch {
        event.target.value = calendarMonth;
      }
    });

    const shiftMonth = (delta) => {
      const d = R.parseDate(`${calendarMonth}-01`);

      d.setUTCMonth(d.getUTCMonth() + delta);

      if (
        d.getUTCFullYear() < 1900 ||
        d.getUTCFullYear() > 9999
      ) {
        return;
      }

      calendarMonth = R.isoDate(d).slice(0, 7);
      year = d.getUTCFullYear();

      render();
    };

    $('#leave-month-prev').addEventListener(
      'click',
      () => shiftMonth(-1)
    );

    $('#leave-month-next').addEventListener(
      'click',
      () => shiftMonth(1)
    );
  }

  readStorage();
  render();
})();
