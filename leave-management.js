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

  let typeConfigError = '';

  function syncTypeConfig() {
    try {
      R.configureTypes(masterData.leaveTypes);
      typeConfigError = '';
    } catch (error) {
      typeConfigError = error.message;
    }
  }

  syncTypeConfig();

  const KEY = 'peopledesk-leave-v1';

  const $ = (selector, root = document) =>
    root.querySelector(selector);

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
    {
      maximumFractionDigits: 1
    }
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
      return R.parseDate(value).toLocaleDateString(
        undefined,
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC'
        }
      );
    } catch {
      return '—';
    }
  };

  const atLabel = (at) => {
    const date = new Date(at);

    return Number.isNaN(date.valueOf())
      ? '—'
      : date.toLocaleString();
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

  const clone = () =>
    JSON.parse(JSON.stringify(state));

  function readStorage() {
    try {
      if (typeConfigError) {
        throw new Error(typeConfigError);
      }

      const raw = localStorage.getItem(KEY);

      state = raw === null
        ? R.emptyState()
        : R.validateState(JSON.parse(raw));

      storedRaw = raw;
      storageError = '';
    } catch {
      storageError = typeConfigError ||
        'Leave records could not be read safely. Editing is disabled; existing storage is preserved. Do not clear browser data. Keep a backup and request support.';

      state = R.emptyState();
    }
  }

  function save(next) {
    if (storageError) {
      throw new Error(storageError);
    }

    const validated = R.validateState(next);

    if (
      localStorage.getItem(KEY) !== storedRaw
    ) {
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

    next.notifications =
      next.notifications.slice(0, 100);
  }

  const person = (request) =>
    employees.find(
      (employee) => employee.id === request.employeeId
    ) || {
      id: request.employeeId,
      name: request.employeeName,
      department: request.department || 'Unassigned'
    };

  function employeeList(activeOnly = false) {
    const list = employees
      .filter(
        (employee) => (
          !activeOnly ||
          employee.status === 'Active'
        )
      )
      .map(
        (employee) => ({ ...employee })
      );

    if (!activeOnly) {
      state.requests.forEach((request) => {
        if (
          !list.some(
            (employee) => (
              employee.id === request.employeeId
            )
          )
        ) {
          list.push({
            id: request.employeeId,
            name: request.employeeName,
            department: request.department,
            status: 'Removed'
          });
        }
      });
    }

    return list;
  }

  const employeeOptions = (activeOnly = false) =>
    employeeList(activeOnly).map((employee) => `
      <option value="${esc(employee.id)}">
        ${esc(employee.name)} · ${esc(employee.id)}${
          employee.status !== 'Active'
            ? ' (inactive / removed)'
            : ''
        }
      </option>
    `).join('');

  const typeOptions = (includeInactive = false) =>
    Object.entries(R.TYPES)
      .filter(
        ([key]) => (
          includeInactive ||
          R.isTypeActive(key)
        )
      )
      .map(([key, label]) => `
        <option value="${esc(key)}">
          ${esc(label)}${
            R.isTypeActive(key)
              ? ''
              : ' (inactive)'
          }
        </option>
      `)
      .join('');

  const policyFields = () =>
    Object.entries(R.TYPES)
      .filter(
        ([type]) => R.tracksBalance(type)
      )
      .map(([type, label]) => `
        <label>
          ${esc(label)} base (days)
          <input
            name="${esc(type)}"
            type="number"
            min="0"
            max="366"
            step="0.5"
            required
          >
        </label>
      `)
      .join('') +
      `
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
      `;

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

        <button
          class="button button-primary"
          id="leave-apply"
        >
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

    <div
      class="leave-balances"
      id="leave-balances"
    ></div>

    <p
      class="leave-policy"
      id="leave-policy-summary"
    ></p>

    <section class="panel leave-applications">
      <div class="leave-app-heading">
        <div>
          <h2>Leave applications</h2>
          <p class="leave-muted" id="leave-count"></p>
        </div>

        <button
          class="button button-secondary"
          id="leave-export"
        >
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

            ${
              R.STATUSES.map(
                (status) => `<option>${status}</option>`
              ).join('')
            }

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
          <input
            id="leave-all-employees"
            type="checkbox"
            checked
          >
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

  // The separate calendar shares the list's state,
  // storage key and filters.
  const calendarView = document.querySelector(
    '#view-leave-calendar'
  );

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

        <div class="leave-heading-actions">
          <button
            type="button"
            class="button button-secondary"
            id="leave-import-holidays"
          >
            Import public holidays
          </button>

          <button
            type="button"
            class="button button-secondary"
            id="leave-calendar-open-list"
          >
            Open leave list
          </button>
        </div>
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

      <p
        class="leave-muted leave-calendar-sync-note"
        id="leave-holiday-import-status"
        role="status"
        aria-live="polite"
      ></p>

      <section class="panel leave-calendar-panel">
        <div class="leave-calendar-heading">
          <div>
            <h2 id="leave-calendar-title">
              Team leave calendar
            </h2>

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

  function makeDialog(
    id,
    title,
    body,
    submitLabel
  ) {
    const dialog = document.createElement('dialog');

    dialog.id = id;
    dialog.className = 'leave-dialog';

    dialog.setAttribute(
      'aria-labelledby',
      `${id}-title`
    );

    dialog.innerHTML = `
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

        <p
          class="leave-error"
          role="alert"
          hidden
        ></p>

        <div class="leave-dialog-actions">
          <button
            class="button button-secondary"
            type="button"
            data-close
          >
            Close
          </button>

          ${
            submitLabel
              ? `
                <button
                  class="button button-primary"
                  type="submit"
                >
                  ${submitLabel}
                </button>
              `
              : ''
          }
        </div>
      </form>
    `;

    document.body.append(dialog);

    dialog.addEventListener('click', (event) => {
      if (
        event.target === dialog ||
        event.target.closest(
          '[data-close], .dialog-close'
        )
      ) {
        dialog.close();
      }
    });

    return dialog;
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
      <p
        class="leave-muted"
        id="leave-policy-context"
      ></p>

      <div class="leave-form-grid">
        ${policyFields()}
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
        Public holidays for
        <span id="leave-holiday-year"></span>

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
      <div
        id="leave-decision-summary"
        class="leave-preview"
      ></div>

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
        <textarea
          name="note"
          rows="3"
          maxlength="500"
        ></textarea>
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

  const error = (dialog, message) => {
    const el = $('.leave-error', dialog);

    el.textContent = message;
    el.hidden = !message;
  };

  const feedback = (message) => {
    $('#leave-feedback').textContent = message;
  };

  const statusBadge = (request) => `
    <span class="leave-status ${request.status.toLowerCase()}">
      ${esc(request.status)}
    </span>

    ${
      request.cancellation
        ? `
          <small class="leave-cell-small leave-cancel-label">
            Cancellation requested
          </small>
        `
        : ''
    }
  `;

  function filterError() {
    let message = '';

    try {
      if (filter.from) {
        R.parseDate(filter.from);
      }

      if (filter.to) {
        R.parseDate(filter.to);
      }

      if (
        filter.from &&
        filter.to &&
        filter.to < filter.from
      ) {
        message =
          'Filter end date must not be earlier than start date.';
      }
    } catch (error) {
      message = error.message;
    }

    const el = $('#leave-filter-error');

    el.textContent = message;
    el.hidden = !message;

    return !!message;
  }

  function filteredRequests(calendarRange) {
    if (filterError()) return [];

    return state.requests.filter((request) => {
      const employee = person(request);
      const query = filter.search.trim().toLowerCase();

      return (
        (
          filter.all ||
          request.employeeId === selectedEmployee
        ) &&
        (
          !query ||
          `${employee.name} ${request.employeeId}`
            .toLowerCase()
            .includes(query)
        ) &&
        (
          !filter.type ||
          request.type === filter.type
        ) &&
        (
          !filter.department ||
          employee.department === filter.department
        ) &&
        (
          !filter.status ||
          (
            filter.status === 'Cancellation requested'
              ? !!request.cancellation
              : request.status === filter.status
          )
        ) &&
        request.start <= (
          calendarRange?.end ||
          `${year}-12-31`
        ) &&
        request.end >= (
          calendarRange?.start ||
          `${year}-01-01`
        ) &&
        (
          !filter.from ||
          request.end >= filter.from
        ) &&
        (
          !filter.to ||
          request.start <= filter.to
        )
      );
    }).slice().reverse();
  }

  function renderInbox() {
    $('#leave-unread').textContent =
      state.notifications.filter(
        (notification) => !notification.read
      ).length;

    $('#leave-inbox-content').innerHTML =
      state.notifications.length
        ? state.notifications.map((notification) => `
            <article class="leave-inbox-item ${
              notification.read ? '' : 'unread'
            }">
              <p>${esc(notification.message)}</p>

              <small>
                ${esc(atLabel(notification.at))} ·
                ${notification.read ? 'Read' : 'Unread'}
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
      !state.notifications.some(
        (notification) => !notification.read
      );
  }

  function renderBalances() {
    $('#leave-balances').innerHTML = storageError
      ? `
          <p class="leave-muted">
            Balances unavailable until stored records can be read safely.
          </p>
        `
      : Object.entries(R.TYPES)
          .filter(([type]) => {
            const balance = R.balance(
              state,
              selectedEmployee,
              year,
              type
            );

            return (
              R.isTypeActive(type) ||
              balance.used > 0 ||
              balance.pending > 0
            );
          })
          .map(([type, label]) => {
            const balance = R.balance(
              state,
              selectedEmployee,
              year,
              type
            );

            if (!balance.tracked) {
              return `
                <article class="panel leave-balance ${esc(type)}">
                  <span class="leave-type">
                    ${esc(label)}
                  </span>

                  <strong class="leave-available leave-uncapped-title">
                    No fixed limit
                  </strong>

                  <p class="leave-balance-ratio">
                    Approval required · no leave allowance deduction
                  </p>

                  <div class="leave-balance-details">
                    <span>
                      Approved days
                      <b>${num(balance.used)}</b>
                    </span>

                    <span>
                      Pending days
                      <b>${num(balance.pending)}</b>
                    </span>

                    <span>
                      Allowance
                      <b>Not capped</b>
                    </span>
                  </div>

                  <small class="leave-carry">
                    Tracked separately; Annual, Medical and Emergency
                    balances are unchanged.
                  </small>
                </article>
              `;
            }

            const denominator = balance.entitlement || 1;

            const used = Math.min(
              100,
              balance.used / denominator * 100
            );

            const pending = Math.min(
              100 - used,
              balance.pending / denominator * 100
            );

            return `
              <article class="panel leave-balance ${type}">
                <span class="leave-type">
                  ${esc(label)}
                </span>

                <strong class="leave-available">
                  ${num(balance.available)}
                  <small> days available</small>
                </strong>

                <p class="leave-balance-ratio">
                  ${num(balance.available)} /
                  ${num(balance.entitlement)} days available
                </p>

                <div
                  class="leave-progress"
                  role="img"
                  aria-label="${esc(label)}: ${num(balance.used)} used, ${num(balance.pending)} pending, ${num(balance.available)} available"
                >
                  <span
                    class="used"
                    style="width:${used}%"
                  ></span>

                  <span
                    class="reserved"
                    style="width:${pending}%"
                  ></span>
                </div>

                <div class="leave-balance-details">
                  <span>
                    Entitled
                    <b>${num(balance.entitlement)}</b>
                  </span>

                  <span>
                    Used / approved
                    <b>${num(balance.used)}</b>
                  </span>

                  <span>
                    Pending
                    <b>${num(balance.pending)}</b>
                  </span>
                </div>

                <small class="leave-carry">
                  Base ${num(balance.base)}${
                    type === 'annual'
                      ? ` + ${num(balance.carryForward)} carry-forward credit`
                      : ''
                  }
                </small>
              </article>
            `;
          })
          .join('');

    $('#leave-policy-summary').textContent =
      'Local demo only; no login, role enforcement, shared storage, or email delivery. ' +
      'Working days: Monday–Friday, excluding configured public holidays. ' +
      'Half-days: ' +
      (
        state.policy.allowHalfDays
          ? 'enabled'
          : 'disabled'
      ) +
      '. ' +
      Object.keys(state.policy.holidays)
        .filter(
          (date) => date.startsWith(`${year}-`)
        ).length +
      ` public holiday(s) configured for ${year}. ` +
      'Existing applications keep their original day calculation. ' +
      'No accrual or automatic carry-forward. ' +
      'WFH has no fixed day limit and does not deduct other leave balances.';
  }

  function renderRows(rows) {
    $('#leave-rows').innerHTML = rows.length
      ? rows.map((request) => {
          const employee = person(request);
          const actions = [];

          if (!storageError) {
            if (request.cancellation) {
              actions.push(
                [
                  'confirmCancel',
                  'Approve cancellation'
                ],
                [
                  'rejectCancel',
                  'Decline cancellation'
                ]
              );
            } else {
              if (request.status === 'Pending') {
                actions.push(
                  ['approve', 'Approve'],
                  ['reject', 'Reject']
                );
              }

              if (
                ['Pending', 'Approved'].includes(
                  request.status
                )
              ) {
                actions.push([
                  'requestCancel',
                  'Request cancellation'
                ]);
              }
            }
          }

          return `
            <tr>
              <td>
                <strong>${esc(employee.name)}</strong>

                <small class="leave-cell-small">
                  ${esc(request.employeeId)} ·
                  ${esc(employee.department || 'Unassigned')}
                </small>
              </td>

              <td>
                <span class="leave-type-dot ${request.type}"></span>

                ${esc(R.TYPES[request.type])}

                ${
                  request.attachment
                    ? `
                      <small class="leave-cell-small">
                        Demo attachment
                      </small>
                    `
                    : ''
                }
              </td>

              <td>
                ${esc(dateLabel(request.start))}

                <small class="leave-cell-small">
                  ${
                    request.end === request.start
                      ? esc(periodLabel(request.duration))
                      : `to ${esc(dateLabel(request.end))}`
                  }
                </small>
              </td>

              <td>${num(R.requestDays(request))}</td>

              <td>${statusBadge(request)}</td>

              <td>
                <div class="leave-row-actions">
                  <button
                    class="row-action"
                    data-leave-action="details"
                    data-id="${esc(request.id)}"
                  >
                    View details
                  </button>

                  ${
                    actions.map(([action, label]) => `
                      <button
                        class="row-action ${
                          ['reject', 'rejectCancel'].includes(action)
                            ? 'danger'
                            : ''
                        }"
                        data-leave-action="${action}"
                        data-id="${esc(request.id)}"
                      >
                        ${label}
                      </button>
                    `).join('')
                  }
                </div>
              </td>
            </tr>
          `;
        }).join('')
      : `
          <tr>
            <td class="empty-state" colspan="6">
              No applications match these filters.
              Try another year or reset filters.
            </td>
          </tr>
        `;
  }

  function renderCalendar() {
    if (!calendarView) return;

    $('#leave-import-holidays').disabled =
      !!storageError ||
      !window.PeopleDeskHolidayImport;

    $('.leave-legend', calendarView).innerHTML =
      Object.entries(R.TYPES)
        .map(([type, label]) => `
          <span class="${esc(type)}">
            ${esc(label)}
          </span>
        `)
        .join('') +
      `
        <span>
          Dashed = pending · ★ = public holiday · AM / PM = half-day
        </span>
      `;

    $('#leave-month').value = calendarMonth;

    $('#leave-calendar-storage-error').textContent =
      storageError;

    $('#leave-calendar-storage-error').hidden =
      !storageError;

    $('#leave-calendar-employee').innerHTML =
      '<option value="">All employees</option>' +
      employeeOptions();

    $('#leave-calendar-employee').value =
      filter.all ? '' : selectedEmployee;

    $('#leave-calendar-type').value =
      filter.type;

    $('#leave-calendar-department').innerHTML =
      $('#leave-department').innerHTML;

    $('#leave-calendar-department').value =
      filter.department;

    $('#leave-calendar-status').value =
      filter.status;

    const shared = [];

    if (filter.search) {
      shared.push(
        `Employee search: ${filter.search}`
      );
    }

    if (filter.from) {
      shared.push(
        `From: ${dateLabel(filter.from)}`
      );
    }

    if (filter.to) {
      shared.push(
        `To: ${dateLabel(filter.to)}`
      );
    }

    $('#leave-calendar-filter-note').textContent =
      shared.length
        ? (
            'Also using list filters — ' +
            shared.join(' · ') +
            '. Reset shared filters to show all.'
          )
        : (
            'Employee, leave type, department and status filters are shared with the list.'
          );

    const first = R.parseDate(
      `${calendarMonth}-01`
    );

    const offset = (
      first.getUTCDay() + 6
    ) % 7;

    const gridStart =
      first.valueOf() - offset * R.DAY;

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

    const active = rows.filter(
      (request) => (
        ['Pending', 'Approved'].includes(
          request.status
        )
      )
    );

    const count = active.filter(
      (request) => (
        R.requestUnits(request).some((day) => (
          day.date.startsWith(calendarMonth) &&
          (
            !filter.from ||
            day.date >= filter.from
          ) &&
          (
            !filter.to ||
            day.date <= filter.to
          )
        ))
      )
    ).length;

    $('#leave-calendar-title').textContent =
      first.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });

    $('#leave-calendar-count').textContent =
      storageError
        ? 'Calendar unavailable until saved data can be read safely.'
        : filterError()
          ? $('#leave-filter-error').textContent
          : (
              `${count} matching pending / approved application(s) this month. ` +
              'Click an event for details.'
            );

    $('#leave-month-prev').disabled =
      calendarMonth === '1900-01';

    $('#leave-month-next').disabled =
      calendarMonth === '9999-12';

    const headings = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun'
    ].map((day) => `
      <div class="leave-weekday">
        ${day}
      </div>
    `).join('');

    $('#leave-calendar-grid').innerHTML =
      headings +
      Array.from({ length: 42 }, (_, i) => {
        const current = new Date(
          gridStart + i * R.DAY
        );

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

        const outside =
          !date.startsWith(calendarMonth);

        const holiday =
          state.policy.holidays[date];

        const events = active.filter(
          (request) => (
            R.requestUnits(request).some(
              (day) => day.date === date
            ) &&
            (
              !filter.from ||
              date >= filter.from
            ) &&
            (
              !filter.to ||
              date <= filter.to
            )
          )
        );

        return `
          <div class="leave-calendar-day
            ${outside ? 'outside' : ''}
            ${
              [0, 6].includes(current.getUTCDay())
                ? 'weekend'
                : ''
            }
            ${date === localToday() ? 'today' : ''}
          ">
            <time datetime="${date}">
              ${current.getUTCDate()}
            </time>

            ${
              holiday
                ? `
                  <span
                    class="leave-holiday"
                    title="${esc(holiday)}"
                  >
                    ★ ${esc(holiday)}
                  </span>
                `
                : ''
            }

            ${
              events.map((request) => `
                <button
                  type="button"
                  class="leave-event ${request.type} ${request.status.toLowerCase()}"
                  data-leave-action="details"
                  data-id="${esc(request.id)}"
                  title="${esc(person(request).name)} · ${esc(R.TYPES[request.type])} · ${request.status}"
                >
                  ${esc(person(request).name)}${
                    request.duration !== 'full'
                      ? ` · ${request.duration.toUpperCase()}`
                      : ''
                  }${
                    request.cancellation
                      ? ' · Cancellation requested'
                      : ''
                  }
                </button>
              `).join('')
            }
          </div>
        `;
      }).join('');
  }

  function renderApplications() {
    const rows = filteredRequests();

    $('#leave-count').textContent =
      `${rows.length} application(s) · ${year} · ` +
      (
        filter.all
          ? 'All employees'
          : 'Selected employee'
      );

    renderRows(rows);

    $('#leave-export').disabled =
      !!storageError || !rows.length;

    renderCalendar();
  }

  function render() {
    const list = employeeList();

    if (
      !list.some(
        (employee) => employee.id === selectedEmployee
      )
    ) {
      selectedEmployee =
        list.find(
          (employee) => employee.status === 'Active'
        )?.id ||
        list[0]?.id ||
        '';
    }

    $('#leave-employee').innerHTML =
      employeeOptions();

    $('#leave-employee').value =
      selectedEmployee;

    $('#leave-year').value =
      year;

    const departments = [
      ...new Set(
        list.map(
          (employee) => employee.department
        ).filter(Boolean)
      )
    ].sort();

    $('#leave-department').innerHTML =
      '<option value="">All departments</option>' +
      departments.map(
        (department) => `
          <option>${esc(department)}</option>
        `
      ).join('');

    if (
      !departments.includes(filter.department)
    ) {
      filter.department = '';
    }

    $('#leave-type').innerHTML =
      '<option value="">All types</option>' +
      typeOptions(true);

    if (calendarView) {
      $('#leave-calendar-type').innerHTML =
        '<option value="">All types</option>' +
        typeOptions(true);
    }

    if (
      !Object.hasOwn(R.TYPES, filter.type)
    ) {
      filter.type = '';
    }

    $('#leave-department').value =
      filter.department;

    $('#leave-search').value =
      filter.search;

    $('#leave-type').value =
      filter.type;

    $('#leave-status').value =
      filter.status;

    $('#leave-from').value =
      filter.from;

    $('#leave-to').value =
      filter.to;

    $('#leave-all-employees').checked =
      filter.all;

    const alert = $('#leave-storage-error');

    alert.textContent = storageError;
    alert.hidden = !storageError;

    $('#leave-apply').disabled =
      !!storageError ||
      !employees.some(
        (employee) => employee.status === 'Active'
      ) ||
      !Object.keys(R.TYPES).some(
        R.isTypeActive
      );

    $('#leave-entitlements').disabled =
      !!storageError ||
      !employees.some(
        (employee) => employee.id === selectedEmployee
      );

    renderBalances();
    renderApplications();
    renderInbox();
  }

  function preview() {
    const formData = new FormData(
      $('form', applyDialog)
    );

    try {
      const units = R.dayUnits(
        String(formData.get('start')),
        String(formData.get('end')),
        String(formData.get('duration')),
        state.policy.holidays
      );

      const total = units.reduce(
        (sum, day) => sum + day.units,
        0
      );

      $('#leave-preview').textContent =
        `${num(total)} working day(s) after weekend / public-holiday exclusions. ` +
        Object.entries(
          R.splitUnits(units)
        ).map(([requestYear, count]) => {
          const type = String(
            formData.get('type')
          );

          const available = R.balance(
            state,
            String(formData.get('employeeId')),
            requestYear,
            type
          ).available;

          if (!R.tracksBalance(type)) {
            return (
              `${requestYear}: ${num(count)} requested · ` +
              'no fixed day limit; other leave balances are unchanged'
            );
          }

          return (
            `${requestYear}: ${num(count)} requested / ${num(available)} available` +
            (
              count > available
                ? ' — insufficient balance'
                : ''
            )
          );
        }).join(' · ');
    } catch (error) {
      $('#leave-preview').textContent =
        error.message;
    }
  }

  $('#leave-apply').addEventListener('click', () => {
    const form = $('form', applyDialog);

    form.reset();

    $('[name="type"]', form).innerHTML =
      typeOptions();

    $('[name="type"]', form).required =
      true;

    $('[name="employeeId"]', form).innerHTML =
      employeeOptions(true);

    if (
      employees.some((employee) => (
        employee.id === selectedEmployee &&
        employee.status === 'Active'
      ))
    ) {
      $('[name="employeeId"]', form).value =
        selectedEmployee;
    }

    $('[name="start"]', form).value =
      localToday();

    $('[name="end"]', form).value =
      localToday();

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

  $('form', applyDialog).addEventListener(
    'input',
    preview
  );

  $('form', applyDialog).addEventListener(
    'change',
    preview
  );

  async function attachmentFrom(file) {
    if (!file || !file.size) {
      return null;
    }

    if (
      file.size > 262144 ||
      file.name.length > 150 ||
      ['application/pdf', 'image/png', 'image/jpeg']
        .includes(file.type) === false
    ) {
      throw new Error(
        'Use a fictional PDF, PNG, or JPEG up to 256 KB, with a filename under 151 characters.'
      );
    }

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    const valid = file.type === 'application/pdf'
      ? (
          String.fromCharCode(
            ...bytes.slice(0, 5)
          ) === '%PDF-'
        )
      : file.type === 'image/png'
        ? (
            [
              137,
              80,
              78,
              71,
              13,
              10,
              26,
              10
            ].every(
              (value, index) => bytes[index] === value
            )
          )
        : (
            bytes[0] === 255 &&
            bytes[1] === 216 &&
            bytes[2] === 255
          );

    if (!valid) {
      throw new Error(
        'Attachment content does not match its PDF / image file type.'
      );
    }

    const data = await new Promise(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () =>
          resolve(reader.result);

        reader.onerror = () =>
          reject(
            new Error(
              'Could not read the attachment.'
            )
          );

        reader.readAsDataURL(file);
      }
    );

    const result = {
      name: file.name,
      type: file.type,
      size: file.size,
      data
    };

    R.validateAttachment(result);

    return result;
  }

  $('form', applyDialog).addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      if (submitting) return;

      submitting = true;

      const submit = $(
        'button[type="submit"]',
        applyDialog
      );

      submit.disabled = true;

      try {
        const formData = new FormData(
          event.currentTarget
        );

        const draft = {
          employeeId: String(
            formData.get('employeeId')
          ),

          type: String(
            formData.get('type')
          ),

          duration: String(
            formData.get('duration')
          ),

          start: String(
            formData.get('start')
          ),

          end: String(
            formData.get('end')
          ),

          reason: String(
            formData.get('reason')
          ).trim(),

          contact: String(
            formData.get('contact')
          ).trim()
        };

        R.validateApplication(
          state,
          draft,
          employees
        );

        const attachment = await attachmentFrom(
          formData.get('attachment')
        );

        const units = R.validateApplication(
          state,
          draft,
          employees
        );

        const employee = employees.find(
          (item) => item.id === draft.employeeId
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

        calendarMonth =
          draft.start.slice(0, 7);

        applyDialog.close();
        render();

        feedback(
          'Application submitted locally. Pending days are reserved. A message was added to the local demo inbox; no email was sent.'
        );
      } catch (caught) {
        error(
          applyDialog,
          caught.message
        );
      } finally {
        submitting = false;
        submit.disabled = false;
      }
    }
  );

  $('#leave-employee').addEventListener(
    'change',
    (event) => {
      selectedEmployee = event.target.value;
      render();
    }
  );

  $('#leave-year').addEventListener(
    'change',
    (event) => {
      const value = +event.target.value;

      if (
        !event.target.value ||
        !Number.isInteger(value) ||
        value < 1900 ||
        value > 9999
      ) {
        event.target.value = year;

        feedback(
          'Choose a year from 1900 to 9999.'
        );

        return;
      }

      year = value;

      calendarMonth =
        `${year}-${calendarMonth.slice(5)}`;

      render();
    }
  );

  [
    ['leave-search', 'search', 'input'],
    ['leave-type', 'type', 'change'],
    ['leave-department', 'department', 'change'],
    ['leave-status', 'status', 'change'],
    ['leave-from', 'from', 'change'],
    ['leave-to', 'to', 'change']
  ].forEach(([id, key, eventName]) => {
    $('#' + id).addEventListener(
      eventName,
      (event) => {
        filter[key] = event.target.value;
        renderApplications();
      }
    );
  });

  $('#leave-all-employees').addEventListener(
    'change',
    (event) => {
      filter.all = event.target.checked;
      renderApplications();
    }
  );

  $('#leave-reset-filters').addEventListener(
    'click',
    () => {
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

      $('#leave-all-employees').checked =
        true;

      renderApplications();
    }
  );

  $('#leave-entitlements').addEventListener(
    'click',
    () => {
      policyEmployee = selectedEmployee;
      policyYear = year;

      $('#leave-policy-context').textContent =
        `${
          employees.find(
            (employee) => employee.id === policyEmployee
          ).name
        } · ${policyYear}. ` +
        'Demo rules only; confirm HR policy before production.';

      $('#leave-holiday-year').textContent =
        policyYear;

      $('.leave-form-grid', policyDialog).innerHTML =
        policyFields();

      Object.keys(R.TYPES)
        .filter(R.tracksBalance)
        .forEach((type) => {
          $(
            `[name="${type}"]`,
            policyDialog
          ).value = R.baseEntitlement(
            state,
            policyEmployee,
            policyYear,
            type
          );
        });

      $('[name="carry"]', policyDialog).value =
        state.carryForward[policyEmployee]?.[policyYear] ||
        0;

      $('[name="halfDays"]', policyDialog).checked =
        state.policy.allowHalfDays;

      $('[name="holidays"]', policyDialog).value =
        Object.entries(state.policy.holidays)
          .filter(
            ([date]) => (
              date.startsWith(`${policyYear}-`)
            )
          )
          .sort(
            ([a], [b]) => a.localeCompare(b)
          )
          .map(
            ([date, label]) => `${date} | ${label}`
          )
          .join('\n');

      error(policyDialog, '');
      policyDialog.showModal();
    }
  );

  $('form', policyDialog).addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      try {
        const formData = new FormData(
          event.currentTarget
        );

        const values = Object.fromEntries(
          Object.keys(R.TYPES)
            .filter(R.tracksBalance)
            .map((type) => [
              type,
              Number(formData.get(type))
            ])
        );

        const carried = Number(
          formData.get('carry')
        );

        if (
          !employees.some(
            (employee) => employee.id === policyEmployee
          )
        ) {
          throw new Error(
            'Selected employee no longer exists.'
          );
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
            .filter(
              ([date]) => (
                !date.startsWith(`${policyYear}-`)
              )
            )
        );

        const seen = new Set();

        for (
          const line of String(
            formData.get('holidays')
          )
            .split(/\r?\n/)
            .filter(
              (value) => value.trim()
            )
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

        if (
          !Object.hasOwn(
            next.entitlements,
            policyEmployee
          )
        ) {
          next.entitlements[policyEmployee] = {};
        }

        if (
          !Object.hasOwn(
            next.carryForward,
            policyEmployee
          )
        ) {
          next.carryForward[policyEmployee] = {};
        }

        next.entitlements[policyEmployee][policyYear] = {
          ...(
            next.entitlements[policyEmployee][policyYear] ||
            {}
          ),
          ...values
        };

        next.carryForward[policyEmployee][policyYear] =
          carried;

        next.policy = {
          allowHalfDays:
            formData.get('halfDays') === 'on',

          holidays
        };

        save(next);

        policyDialog.close();
        render();

        feedback(
          'Policy saved. New applications use the new holiday calendar; existing day counts remain unchanged.'
        );
      } catch (caught) {
        error(
          policyDialog,
          caught.message
        );
      }
    }
  );

  function showDetails(request) {
    $('#leave-history-content').innerHTML = `
      <div class="leave-details-summary">
        <strong>
          ${esc(request.employeeName)} ·
          ${esc(R.TYPES[request.type])}
        </strong>

        <p>
          ${esc(dateLabel(request.start))}
          to ${esc(dateLabel(request.end))}
          · ${num(R.requestDays(request))} working day(s)
        </p>

        ${statusBadge(request)}

        <p>
          ${esc(periodLabel(request.duration))}
        </p>
      </div>

      <p class="leave-prewrap"><b>Reason:</b> ${esc(request.reason)}</p>

      <p>
        <b>Contact:</b>
        ${esc(request.contact || 'Not supplied')}
      </p>

      ${
        request.attachment
          ? `
            <p>
              <b>Fictional local attachment:</b>
              ${esc(request.attachment.name)}
              (${num(request.attachment.size / 1024)} KB)
            </p>

            <button
              type="button"
              class="button button-secondary"
              id="leave-download-attachment"
              data-id="${esc(request.id)}"
            >
              Download demo attachment
            </button>
          `
          : `
            <p class="leave-muted">
              No attachment.
            </p>
          `
      }

      ${
        request.cancellation
          ? `
            <div class="leave-preview">
              <b>Cancellation awaiting review</b>

              <p class="leave-prewrap">${esc(request.cancellation.reason)}</p>

              <small>
                Balance is not released until cancellation is approved.
              </small>
            </div>
          `
          : ''
      }

      <h3>Working-day snapshot</h3>

      <p class="leave-muted">
        ${
          Object.entries(
            R.requestAllocations(request)
          )
            .map(
              ([requestYear, count]) => (
                `${requestYear}: ${num(count)} days`
              )
            )
            .join(' · ')
        }.
        Stored at submission, including the policy exclusions in effect
        then.
      </p>

      <h3>Local decision history (unverified)</h3>

      <ol class="leave-history">
        ${
          request.history.map((entry) => `
            <li>
              <strong>${esc(entry.status)}</strong> ·
              ${esc(entry.actor)}

              <small>
                ${esc(atLabel(entry.at))}
              </small>

              <p class="leave-prewrap">${esc(entry.note || 'No note')}</p>
            </li>
          `).join('')
        }
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
    const button = event.target.closest(
      '[data-leave-action]'
    );

    if (!button) return;

    const request = state.requests.find(
      (item) => item.id === button.dataset.id
    );

    if (!request) return;

    if (
      button.dataset.leaveAction === 'details'
    ) {
      showDetails(request);
      return;
    }

    decisionId = request.id;

    decisionAction =
      button.dataset.leaveAction;

    $('#leave-decision-dialog-title').textContent =
      actionLabels[decisionAction];

    $('#leave-decision-summary').textContent =
      `${request.employeeName} · ${R.TYPES[request.type]} · ` +
      `${dateLabel(request.start)} to ${dateLabel(request.end)} · ` +
      `${num(R.requestDays(request))} day(s). ` +
      (
        request.cancellation
          ? `Cancellation reason: ${request.cancellation.reason}. `
          : ''
      ) +
      (
        decisionAction === 'requestCancel'
          ? 'This requests review; balance remains committed until approved.'
          : decisionAction === 'confirmCancel'
            ? 'Confirm cancellation: this will release the committed days.'
            : ''
      );

    $('[name="note"]', decisionDialog).value =
      '';

    $('[name="note"]', decisionDialog).required =
      [
        'reject',
        'requestCancel',
        'rejectCancel'
      ].includes(decisionAction);

    $(
      'button[type="submit"]',
      decisionDialog
    ).textContent = actionLabels[decisionAction];

    error(decisionDialog, '');
    decisionDialog.showModal();
  }

  $('#leave-rows').addEventListener(
    'click',
    handleAction
  );

  $('form', decisionDialog).addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      try {
        const formData = new FormData(
          event.currentTarget
        );

        const replacement = R.transition(
          state,
          decisionId,
          decisionAction,
          String(formData.get('actor')),
          String(formData.get('note')),
          employees
        );

        const next = clone();

        next.requests = next.requests.map(
          (request) => (
            request.id === decisionId
              ? replacement
              : request
          )
        );

        const last =
          replacement.history.at(-1);

        addNotice(
          next,
          replacement,
          `${replacement.employeeName}: ${R.TYPES[replacement.type]} — ` +
          `${last.status}${
            last.note
              ? ': ' + last.note
              : '.'
          }`
        );

        save(next);

        decisionDialog.close();
        render();

        feedback(
          `${last.status}. Balances recalculated; local inbox updated. No email was sent.`
        );
      } catch (caught) {
        error(
          decisionDialog,
          caught.message
        );
      }
    }
  );

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.append(link);

    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      1000
    );
  }

  detailsDialog.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest(
        '#leave-download-attachment'
      );

      if (!button) return;

      try {
        const attachment = state.requests.find(
          (request) => request.id === button.dataset.id
        )?.attachment;

        R.validateAttachment(attachment);

        if (!attachment) return;

        const base64 = attachment.data.slice(
          attachment.data.indexOf(',') + 1
        );

        const bytes = Uint8Array.from(
          atob(base64),
          (character) => character.charCodeAt(0)
        );

        const extension = {
          'application/pdf': 'pdf',
          'image/png': 'png',
          'image/jpeg': 'jpg'
        }[attachment.type];

        const safeName = attachment.name
          .replace(/\.[^.]*$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 80) ||
          'demo-attachment';

        download(
          new Blob(
            [bytes],
            {
              type: attachment.type
            }
          ),
          `${safeName}.${extension}`
        );
      } catch (caught) {
        error(
          detailsDialog,
          caught.message
        );
      }
    }
  );

  $('#leave-export').addEventListener(
    'click',
    () => {
      const rows = filteredRequests();

      const cells = (value) => {
        let text = String(value ?? '');

        if (
          /^[\s\u0000-\u001f]*[=+@-]/.test(text)
        ) {
          text = "'" + text;
        }

        return (
          '"' +
          text.replace(/"/g, '""') +
          '"'
        );
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

        ...rows.map((request) => [
          person(request).name,
          request.employeeId,
          person(request).department,
          R.TYPES[request.type],
          request.start,
          request.end,
          periodLabel(request.duration),
          R.requestDays(request),
          request.status,
          request.cancellation ? 'Yes' : 'No',
          request.reason,
          request.history.at(-1)?.note || ''
        ])
      ];

      const csv = '\uFEFF' +
        data.map(
          (row) => row.map(cells).join(',')
        ).join('\r\n');

      download(
        new Blob(
          [csv],
          {
            type: 'text/csv;charset=utf-8;'
          }
        ),
        `PeopleDesk-leave-${year}-list.csv`
      );

      feedback(
        'Filtered applications exported as CSV. Attachments and contact details are not included.'
      );
    }
  );

  $('#leave-notifications-button').addEventListener(
    'click',
    () => {
      renderInbox();
      inboxDialog.showModal();
    }
  );

  $('#leave-mark-read').addEventListener(
    'click',
    () => {
      try {
        const next = clone();

        next.notifications.forEach(
          (notification) => {
            notification.read = true;
          }
        );

        save(next);
        renderInbox();
      } catch (caught) {
        error(
          inboxDialog,
          caught.message
        );
      }
    }
  );

  $('[data-view="leave"]').addEventListener(
    'click',
    () => {
      readStorage();
      render();
    }
  );

  window.addEventListener('storage', (event) => {
    if (
      event.key === KEY ||
      event.key === null
    ) {
      readStorage();
      render();
      preview();

      feedback(
        'Local leave data refreshed from another tab.'
      );
    }
  });

  if (calendarView) {
    $('#leave-calendar-open-list').addEventListener(
      'click',
      () => $('[data-view="leave"]').click()
    );

    $('[data-view="leave-calendar"]').addEventListener(
      'click',
      () => {
        readStorage();
        render();
      }
    );

    $('#leave-calendar-grid').addEventListener(
      'click',
      handleAction
    );

    $('#leave-calendar-employee').addEventListener(
      'change',
      (event) => {
        filter.all = !event.target.value;

        if (event.target.value) {
          selectedEmployee = event.target.value;
        }

        render();
      }
    );

    [
      ['leave-calendar-type', 'type'],
      ['leave-calendar-department', 'department'],
      ['leave-calendar-status', 'status']
    ].forEach(([id, key]) => {
      $('#' + id).addEventListener(
        'change',
        (event) => {
          filter[key] = event.target.value;
          render();
        }
      );
    });

    $('#leave-calendar-reset').addEventListener(
      'click',
      () => {
        $('#leave-reset-filters').click();
        render();
      }
    );

    $('#leave-month').addEventListener(
      'change',
      (event) => {
        try {
          R.parseDate(
            `${event.target.value}-01`
          );

          calendarMonth =
            event.target.value;

          year = +calendarMonth.slice(0, 4);

          render();
        } catch {
          event.target.value = calendarMonth;
        }
      }
    );

    const shiftMonth = (delta) => {
      const date = R.parseDate(
        `${calendarMonth}-01`
      );

      date.setUTCMonth(
        date.getUTCMonth() + delta
      );

      if (
        date.getUTCFullYear() < 1900 ||
        date.getUTCFullYear() > 9999
      ) {
        return;
      }

      calendarMonth =
        R.isoDate(date).slice(0, 7);

      year = date.getUTCFullYear();

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

  window.addEventListener(
    'peopledesk-eleave-types-changed',
    () => {
      syncTypeConfig();
      readStorage();

      if (policyDialog.open) {
        policyDialog.close();
      }

      if (applyDialog.open) {
        const select = $(
          '[name="type"]',
          applyDialog
        );

        const selected = select.value;

        select.innerHTML = typeOptions();

        if (R.isTypeActive(selected)) {
          select.value = selected;
        }
      }

      render();

      if (applyDialog.open) {
        preview();
      }
    }
  );

  // Import company-wide public holidays without touching request snapshots.
  function setupHolidayImport() {
    if (!calendarView) return;

    const H = window.PeopleDeskHolidayImport;
    const openButton = $('#leave-import-holidays');

    if (!H) {
      openButton.disabled = true;
      openButton.title =
        'holiday-import.js could not load. Check script order.';
      return;
    }

    const dialog = makeDialog(
      'leave-holiday-import-dialog',
      'Import public holidays',
      `
        <p class="leave-muted">
          Upload a CSV or UTF-8 .txt file, or paste text below.
          CSV columns: <strong>Date,Holiday</strong>.
          Plain text: <strong>YYYY-MM-DD | Holiday name</strong>, one per line.
          You can also paste two tab-separated columns from Excel.
          Import one year at a time, including 2027 or later years.
        </p>

        <p class="leave-muted">
          Company-wide calendar: these dates apply to every employee.
          Include only holidays approved for your workforce's location.
          Existing dates are kept, not overwritten. New applications use
          these holidays; existing application day counts stay unchanged.
          This is a manual import, not an automatic holiday feed.
        </p>

        <label>
          Holiday year
          <input
            id="holiday-import-year"
            type="number"
            min="1900"
            max="9999"
            step="1"
            required
          >
        </label>

        <label>
          Import from
          <select id="holiday-import-source">
            <option value="file">Upload CSV or text file</option>
            <option value="paste">Paste holiday text</option>
          </select>
        </label>

        <div id="holiday-file-section">
          <label>
            Holiday file (CSV or UTF-8 TXT, maximum 512 KB)
            <input
              id="holiday-import-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              required
            >
          </label>
        </div>

        <div id="holiday-text-section" hidden>
          <label>
            Paste holidays (maximum 512 KB)
            <textarea
              id="holiday-import-text"
              rows="7"
              disabled
              placeholder="YYYY-MM-DD | Holiday name"
            ></textarea>
          </label>
        </div>

        <div class="leave-heading-actions">
          <button
            type="button"
            class="button button-secondary"
            id="holiday-download-template"
          >
            Download CSV template
          </button>

          <button
            type="button"
            class="button button-secondary"
            id="holiday-download-text-template"
          >
            Download text template
          </button>

          <button
            type="button"
            class="button button-secondary"
            id="holiday-preview"
          >
            Preview import
          </button>
        </div>

        <p class="leave-muted">
          Templates contain only column headers.
          Add your verified holiday dates before uploading.
          Pasted text does not need a header.
          Only the selected input source will be imported.
        </p>

        <div
          id="holiday-import-preview"
          class="leave-preview"
          role="status"
          aria-live="polite"
        >
          Select a year and file or pasted text, then preview.
        </div>
      `,
      'Import new holidays'
    );

    const yearInput = $('#holiday-import-year', dialog);
    const fileInput = $('#holiday-import-file', dialog);
    const sourceInput = $('#holiday-import-source', dialog);
    const textInput = $('#holiday-import-text', dialog);
    const previewBox = $('#holiday-import-preview', dialog);
    const previewButton = $('#holiday-preview', dialog);
    const submitButton = $('[type="submit"]', dialog);

    let draft = null;
    let generation = 0;

    function resetPreview() {
      generation += 1;
      draft = null;

      submitButton.disabled = true;
      previewButton.disabled = false;

      previewBox.textContent =
        'Select a year and file or pasted text, then preview.';

      error(dialog, '');
    }

    yearInput.addEventListener(
      'input',
      resetPreview
    );

    fileInput.addEventListener(
      'change',
      resetPreview
    );

    textInput.addEventListener(
      'input',
      resetPreview
    );

    function updateSource() {
      const paste =
        sourceInput.value === 'paste';

      $('#holiday-file-section', dialog).hidden =
        paste;

      $('#holiday-text-section', dialog).hidden =
        !paste;

      fileInput.disabled = paste;
      fileInput.required = !paste;

      textInput.disabled = !paste;
      textInput.required = paste;

      resetPreview();
    }

    sourceInput.addEventListener(
      'change',
      updateSource
    );

    dialog.addEventListener(
      'close',
      resetPreview
    );

    openButton.addEventListener('click', () => {
      readStorage();
      render();

      if (storageError) return;

      resetPreview();

      yearInput.value =
        calendarMonth.slice(0, 4);

      fileInput.value = '';
      textInput.value = '';
      sourceInput.value = 'file';

      updateSource();
      dialog.showModal();
    });

    $('#holiday-download-template', dialog).addEventListener(
      'click',
      () => {
        const url = URL.createObjectURL(
          new Blob(
            ['\uFEFFDate,Holiday\r\n'],
            {
              type: 'text/csv;charset=utf-8'
            }
          )
        );

        const link = document.createElement('a');

        link.href = url;
        link.download =
          'PeopleDesk-public-holidays-template.csv';

        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(
          () => URL.revokeObjectURL(url),
          1000
        );
      }
    );

    $('#holiday-download-text-template', dialog).addEventListener(
      'click',
      () => {
        const url = URL.createObjectURL(
          new Blob(
            ['Date | Holiday\r\n'],
            {
              type: 'text/plain;charset=utf-8'
            }
          )
        );

        const link = document.createElement('a');

        link.href = url;
        link.download =
          'PeopleDesk-public-holidays-template.txt';

        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(
          () => URL.revokeObjectURL(url),
          1000
        );
      }
    );

    previewButton.addEventListener(
      'click',
      async () => {
        resetPreview();

        const ticket = generation;

        previewButton.disabled = true;

        try {
          if (storageError) {
            throw new Error(storageError);
          }

          const chosenYear = H.validYear(
            yearInput.value
          );

          const snapshot = storedRaw;
          const source = sourceInput.value;

          let text;
          let format = 'auto';

          if (source === 'paste') {
            text = textInput.value;

            if (!text.trim()) {
              throw new Error(
                'Paste at least one holiday: YYYY-MM-DD | Holiday name.'
              );
            }
          } else {
            const file = fileInput.files[0];

            if (
              !file ||
              !/\.(csv|txt)$/i.test(file.name)
            ) {
              throw new Error(
                'Choose a .csv or UTF-8 .txt file.'
              );
            }

            if (file.size > H.MAX_BYTES) {
              throw new Error(
                'Choose a file no larger than 512 KB.'
              );
            }

            format = /\.csv$/i.test(file.name)
              ? 'csv'
              : 'auto';

            text = await file.text();
          }

          if (
            ticket !== generation ||
            !dialog.open
          ) {
            return;
          }

          if (
            storedRaw !== snapshot ||
            localStorage.getItem(KEY) !== snapshot
          ) {
            throw new Error(
              'Leave data changed while reading the file. Close and reopen the import, then preview again.'
            );
          }

          const parsed = H.parseInput(
            text,
            chosenYear,
            format
          );

          const plan = H.plan(
            parsed,
            state.policy.holidays
          );

          draft = {
            plan,
            snapshot,
            chosenYear,
            source,
            pastedText:
              source === 'paste'
                ? text
                : null
          };

          previewBox.innerHTML = `
            <p>
              <strong>
                ${plan.additions.length} new holiday(s)
              </strong>
              for ${esc(chosenYear)}.
            </p>

            <p>
              ${plan.duplicates} duplicate row(s) skipped;
              ${plan.conflicts} conflicting date(s) skipped.
              Existing holiday names will not change.
            </p>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Holiday</th>
                    <th>Result</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    plan.rows.map((row) => `
                      <tr>
                        <td>${esc(row.date)}</td>
                        <td>${esc(row.name)}</td>
                        <td>
                          ${
                            row.status === 'add'
                              ? 'Add'
                              : row.status === 'duplicate'
                                ? 'Skip duplicate'
                                : 'Skip — keeping: ' +
                                  esc(row.existingName)
                          }
                        </td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>

            <p>
              ${
                plan.additions.length
                  ? 'Review the dates, then choose Import new holidays to save.'
                  : 'Nothing new to import. No saved data will change.'
              }
            </p>
          `;

          submitButton.disabled =
            plan.additions.length === 0;
        } catch (cause) {
          if (
            ticket !== generation ||
            !dialog.open
          ) {
            return;
          }

          draft = null;
          submitButton.disabled = true;

          error(dialog, cause.message);
        } finally {
          if (ticket === generation) {
            previewButton.disabled = false;
          }
        }
      }
    );

    $('form', dialog).addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        try {
          if (
            !draft ||
            draft.chosenYear !== yearInput.value ||
            draft.source !== sourceInput.value ||
            (
              draft.source === 'paste' &&
              draft.pastedText !== textInput.value
            ) ||
            !draft.plan.additions.length
          ) {
            throw new Error(
              'Preview a valid file or pasted list with new holidays before importing.'
            );
          }

          if (storageError) {
            throw new Error(storageError);
          }

          if (
            storedRaw !== draft.snapshot ||
            localStorage.getItem(KEY) !== draft.snapshot
          ) {
            throw new Error(
              'Leave data changed after the preview. Close and reopen the import, then preview again.'
            );
          }

          const next = clone();

          draft.plan.additions.forEach((row) => {
            next.policy.holidays[row.date] =
              row.name;
          });

          const count =
            draft.plan.additions.length;

          const importedYear =
            draft.chosenYear;

          save(next);

          year = Number(importedYear);
          calendarMonth = importedYear + '-01';

          dialog.close();
          render();

          $('#leave-holiday-import-status').textContent =
            `${count} public holiday(s) imported for ${importedYear}. ` +
            'Showing January; navigate months to view the rest. ' +
            'Existing leave applications are unchanged.';
        } catch (cause) {
          error(dialog, cause.message);
        }
      }
    );
  }

  setupHolidayImport();

  readStorage();
  render();
})();
