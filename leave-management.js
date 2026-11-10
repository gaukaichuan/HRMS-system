/* Local-only leave management for the existing PeopleDesk prototype. */
(() => {
  'use strict';

  const R = window.LeaveRules;
  const KEY = 'peopledesk-leave-v1';

  const $ = (selector, root = document) => (
    root.querySelector(selector)
  );

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

  const view = $('#view-leave');

  let state = R.emptyState();
  let storedRaw = null;
  let storageError = '';

  let selectedEmployee = '';
  let selectedYear = new Date().getFullYear();
  let selectedStatus = 'All';
  let allEmployees = false;

  const localDate = () => {
    const d = new Date();

    return (
      `${d.getFullYear()}-` +
      `${String(d.getMonth() + 1).padStart(2, '0')}-` +
      `${String(d.getDate()).padStart(2, '0')}`
    );
  };

  const formatDate = (date) => {
    try {
      return R.parseDate(date).toLocaleDateString(
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

  const formatTimestamp = (at) => {
    const d = new Date(at);

    return Number.isNaN(d.valueOf())
      ? '—'
      : d.toLocaleString();
  };

  function readStorage() {
    try {
      const raw = localStorage.getItem(KEY);

      state = raw === null
        ? R.emptyState()
        : R.validateState(JSON.parse(raw));

      storedRaw = raw;
      storageError = '';
    } catch {
      state = R.emptyState();

      storageError =
        'Leave storage is unavailable or contains an ' +
        'unsupported record. Leave editing is disabled ' +
        'to protect existing data. Do not clear browser ' +
        'data; keep a backup and request support.';
    }
  }

  function save(next) {
    if (storageError) {
      throw new Error(storageError);
    }

    R.validateState(next);

    if (localStorage.getItem(KEY) !== storedRaw) {
      readStorage();
      render();

      throw new Error(
        'Leave data changed in another tab. Review ' +
        'the refreshed balances and try again.'
      );
    }

    const json = JSON.stringify(next);

    try {
      localStorage.setItem(KEY, json);
    } catch {
      throw new Error(
        'Could not save leave in this browser. ' +
        'No changes were applied. Check browser ' +
        'storage settings.'
      );
    }

    state = next;
    storedRaw = json;
  }

  const clone = () => JSON.parse(JSON.stringify(state));

  function employeeOptions(activeOnly = false) {
    const list = employees
      .filter((e) => !activeOnly || e.status === 'Active')
      .map((e) => ({
        id: e.id,
        name: e.name,
        inactive: e.status !== 'Active'
      }));

    if (!activeOnly) {
      state.requests.forEach((r) => {
        if (!list.some((e) => e.id === r.employeeId)) {
          list.push({
            id: r.employeeId,
            name: r.employeeName,
            inactive: true
          });
        }
      });
    }

    return list.map((e) => `
      <option value="${esc(e.id)}">
        ${esc(e.name)} · ${esc(e.id)}${
          e.inactive ? ' (inactive / removed)' : ''
        }
      </option>
    `).join('');
  }

  view.innerHTML = `
    <div class="page-heading">
      <div>
        <p class="eyebrow">TIME OFF</p>
        <h1>Leave management</h1>
        <p class="subtitle">
          Apply for leave, review requests,
          and track annual balances.
        </p>
      </div>

      <button
        class="button button-primary"
        id="leave-apply"
        type="button">
        ＋ Apply for leave
      </button>
    </div>

    <div class="leave-notice">
      <strong>
        Local prototype · Approval simulation only
      </strong>
      <p>
        No login or role enforcement: anyone with this
        browser can act as a reviewer. Use fictional
        data only. Nothing is shared with other devices
        or sent for approval.
      </p>
    </div>

    <p
      id="leave-storage-error"
      class="leave-error"
      role="alert"
      hidden>
    </p>

    <section class="panel leave-controls">
      <label>
        Employee
        <select id="leave-employee"></select>
      </label>

      <label>
        Balance year
        <input
          id="leave-year"
          type="number"
          min="1900"
          max="9999"
          step="1">
      </label>

      <button
        class="button button-secondary"
        id="leave-entitlements"
        type="button">
        Edit demo entitlements
      </button>
    </section>

    <div class="leave-balances" id="leave-balances"></div>

    <p class="leave-policy">
      Demo rules: full days; Monday–Friday only;
      public holidays are not excluded.
      Available = entitlement − approved − pending.
      Cross-year requests use each year's allowance.
      No accrual, carryover, proration, or half-days.
      Emergency leave is a separate demo allowance.
    </p>

    <section class="panel">
      <div class="toolbar leave-toolbar">
        <div>
          <h2>Leave applications</h2>
          <p class="leave-muted" id="leave-count"></p>
        </div>

        <div class="leave-filters">
          <label class="leave-check">
            <input
              type="checkbox"
              id="leave-all-employees">
            All employees
          </label>

          <label>
            Status
            <select id="leave-status">
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Cancelled</option>
            </select>
          </label>
        </div>
      </div>

      <div class="table-wrap">
        <table class="leave-table">
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>TYPE</th>
              <th>DATES</th>
              <th>WORKING DAYS</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody id="leave-rows"></tbody>
        </table>
      </div>

      <div class="table-footer">
        <span>
          Pending requests reserve balance.
          Rejection or cancellation releases it.
        </span>
      </div>
    </section>

    <p
      class="leave-feedback"
      id="leave-feedback"
      role="status"
      aria-live="polite">
    </p>
  `;

  function makeDialog(id, title, body, submitLabel) {
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
            type="button"
            class="dialog-close"
            aria-label="Close dialog">
            ×
          </button>
        </div>

        ${body}

        <p class="leave-error" role="alert" hidden></p>

        <div class="leave-dialog-actions">
          <button
            class="button button-secondary"
            type="button"
            data-close>
            Close
          </button>

          ${
            submitLabel
              ? `
                <button
                  class="button button-primary"
                  type="submit">
                  ${submitLabel}
                </button>
              `
              : ''
          }
        </div>
      </form>
    `;

    document.body.append(dialog);

    dialog.addEventListener('click', (e) => {
      if (
        e.target === dialog ||
        e.target.closest('[data-close], .dialog-close')
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
        Demo application on behalf of a selected
        employee. Do not enter sensitive medical
        information.
      </p>

      <div class="leave-form-grid">
        <label class="leave-full">
          Employee
          <select name="employeeId" required></select>
        </label>

        <label class="leave-full">
          Leave type
          <select name="type">
            ${
              Object.entries(R.TYPES).map(
                ([key, label]) => `
                  <option value="${key}">
                    ${label}
                  </option>
                `
              ).join('')
            }
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

        <label class="leave-full">
          Reason (demo data only)
          <textarea
            name="reason"
            rows="3"
            maxlength="500"
            required
            placeholder="Brief reason; no diagnosis or medical documents"
          ></textarea>
        </label>
      </div>

      <div
        id="leave-preview"
        class="leave-preview"
        aria-live="polite">
      </div>
    `,
    'Submit application'
  );

  const policyDialog = makeDialog(
    'leave-policy-dialog',
    'Demo leave entitlements',
    `
      <p
        class="leave-muted"
        id="leave-policy-context">
      </p>

      <p class="leave-muted">
        Illustrative full-year allowances, not
        statutory policy. Changes apply only to
        this employee and year. You cannot reduce
        an allowance below approved plus pending days.
      </p>

      <div class="leave-form-grid">
        ${
          Object.entries(R.TYPES).map(
            ([type, label]) => `
              <label class="leave-full">
                ${label} (days)
                <input
                  type="number"
                  name="${type}"
                  min="0"
                  max="366"
                  step="1"
                  required>
              </label>
            `
          ).join('')
        }
      </div>
    `,
    'Save entitlements'
  );

  const decisionDialog = makeDialog(
    'leave-decision-dialog',
    'Review application',
    `
      <div
        id="leave-decision-summary"
        class="leave-preview">
      </div>

      <p class="leave-muted">
        Simulation only. The reviewer name is
        entered manually and is not authenticated.
      </p>

      <label>
        Demo reviewer name
        <input
          name="actor"
          maxlength="100"
          value="Demo HR reviewer"
          required>
      </label>

      <label>
        Decision note
        <textarea
          name="note"
          maxlength="500"
          rows="3"
        ></textarea>
      </label>
    `,
    'Confirm decision'
  );

  const historyDialog = makeDialog(
    'leave-history-dialog',
    'Application details',
    '<div id="leave-history-content"></div>',
    ''
  );

  let decisionId = '';
  let decisionAction = '';
  let policyEmployee = '';
  let policyYear = 0;

  function showError(dialog, message) {
    const p = $('.leave-error', dialog);

    p.textContent = message;
    p.hidden = !message;
  }

  function feedback(message) {
    $('#leave-feedback').textContent = message;
  }

  function render() {
    const choices = employeeOptions();

    $('#leave-employee').innerHTML = choices;

    if (
      !employees.some((e) => e.id === selectedEmployee) &&
      !state.requests.some(
        (r) => r.employeeId === selectedEmployee
      )
    ) {
      selectedEmployee =
        employees.find((e) => e.status === 'Active')?.id ||
        employees[0]?.id ||
        state.requests[0]?.employeeId ||
        '';
    }

    $('#leave-employee').value = selectedEmployee;
    $('#leave-year').value = selectedYear;
    $('#leave-status').value = selectedStatus;
    $('#leave-all-employees').checked = allEmployees;

    const alert = $('#leave-storage-error');

    alert.textContent = storageError;
    alert.hidden = !storageError;

    $('#leave-apply').disabled =
      !!storageError ||
      !employees.some((e) => e.status === 'Active');

    $('#leave-entitlements').disabled =
      !!storageError ||
      !employees.some((e) => e.id === selectedEmployee);

    $('#leave-balances').innerHTML = storageError
      ? `
        <p class="leave-muted">
          Balances unavailable until stored data
          can be read safely.
        </p>
      `
      : Object.entries(R.TYPES).map(([type, label]) => {
        const b = R.balance(
          state,
          selectedEmployee,
          selectedYear,
          type
        );

        return `
          <article class="panel leave-balance ${type}">
            <span class="leave-type">${label}</span>

            <strong class="leave-available">
              ${b.available}<small> days available</small>
            </strong>

            <div class="leave-balance-details">
              <span>
                Entitlement
                <b>${b.entitlement}</b>
              </span>

              <span>
                Approved / used
                <b>${b.used}</b>
              </span>

              <span>
                Pending / reserved
                <b>${b.pending}</b>
              </span>
            </div>
          </article>
        `;
      }).join('');

    const rows = state.requests.filter((r) => (
      (allEmployees || r.employeeId === selectedEmployee) &&
      (selectedStatus === 'All' || r.status === selectedStatus) &&
      r.start <= `${selectedYear}-12-31` &&
      r.end >= `${selectedYear}-01-01`
    )).slice().reverse();

    $('#leave-count').textContent =
      `${rows.length} application(s) touching ${selectedYear}` +
      (allEmployees ? ' · all employees' : '');

    $('#leave-rows').innerHTML = rows.length
      ? rows.map((r) => {
        const count = R.days(r.start, r.end);

        const currentName =
          employees.find((e) => e.id === r.employeeId)?.name ||
          r.employeeName;

        const actions =
          !storageError && r.status === 'Pending'
            ? `
              <button
                class="row-action"
                data-leave-action="approve"
                data-id="${esc(r.id)}">
                Approve
              </button>

              <button
                class="row-action danger"
                data-leave-action="reject"
                data-id="${esc(r.id)}">
                Reject
              </button>
            `
            : '';

        const cancel =
          !storageError &&
          ['Pending', 'Approved'].includes(r.status)
            ? `
              <button
                class="row-action"
                data-leave-action="cancel"
                data-id="${esc(r.id)}">
                Cancel leave
              </button>
            `
            : '';

        return `
          <tr>
            <td>
              <strong>${esc(currentName)}</strong>
              <small class="leave-cell-small">
                ${esc(r.employeeId)}
              </small>
            </td>

            <td>${esc(R.TYPES[r.type])}</td>

            <td>
              ${esc(formatDate(r.start))}
              <small class="leave-cell-small">
                to ${esc(formatDate(r.end))}
              </small>
            </td>

            <td>${count}</td>

            <td>
              <span class="leave-status ${r.status.toLowerCase()}">
                ${r.status}
              </span>
            </td>

            <td>
              <div class="leave-row-actions">
                <button
                  class="row-action"
                  data-leave-action="details"
                  data-id="${esc(r.id)}">
                  Details
                </button>

                ${actions}
                ${cancel}
              </div>
            </td>
          </tr>
        `;
      }).join('')
      : `
        <tr>
          <td colspan="6" class="empty-state">
            No leave applications match these filters.
          </td>
        </tr>
      `;
  }

  function preview() {
    const f = new FormData($('form', applyDialog));
    const box = $('#leave-preview');

    try {
      const split = R.allocations(
        String(f.get('start')),
        String(f.get('end'))
      );

      const employeeId = String(f.get('employeeId'));
      const type = String(f.get('type'));

      const total = Object.values(split).reduce(
        (a, b) => a + b,
        0
      );

      box.textContent =
        `${total} working day(s). ` +
        Object.entries(split).map(([year, count]) => {
          const available = R.balance(
            state,
            employeeId,
            year,
            type
          ).available;

          return (
            `${year}: ${count} requested / ` +
            `${available} available` +
            (
              count > available
                ? ' — insufficient balance'
                : ''
            )
          );
        }).join(' · ');
    } catch (e) {
      box.textContent = e.message;
    }
  }

  $('#leave-apply').addEventListener('click', () => {
    const form = $('form', applyDialog);

    form.reset();

    $('[name="employeeId"]', form).innerHTML =
      employeeOptions(true);

    if (employees.some((e) => (
      e.id === selectedEmployee &&
      e.status === 'Active'
    ))) {
      $('[name="employeeId"]', form).value =
        selectedEmployee;
    }

    $('[name="start"]', form).value = localDate();
    $('[name="end"]', form).value = localDate();

    showError(applyDialog, '');
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

  $('form', applyDialog).addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      const f = new FormData(event.currentTarget);

      const application = {
        employeeId: String(f.get('employeeId')),
        type: String(f.get('type')),
        start: String(f.get('start')),
        end: String(f.get('end')),
        reason: String(f.get('reason')).trim()
      };

      try {
        R.validateApplication(
          state,
          application,
          employees
        );

        const employee = employees.find(
          (e) => e.id === application.employeeId
        );

        const next = clone();
        const at = new Date().toISOString();

        next.requests.push({
          ...application,
          id: crypto.randomUUID(),
          employeeName: employee.name,
          status: 'Pending',
          history: [
            {
              status: 'Pending',
              actor: 'Demo application form (unverified)',
              note: 'Submitted locally; no notification sent.',
              at
            }
          ]
        });

        save(next);

        selectedEmployee = employee.id;

        selectedYear = Number(
          application.start.slice(0, 4)
        );

        selectedStatus = 'All';

        applyDialog.close();
        render();

        feedback(
          'Application saved as Pending. Days are ' +
          'reserved; approval has not been sent to anyone.'
        );
      } catch (e) {
        showError(applyDialog, e.message);
      }
    }
  );

  $('#leave-employee').addEventListener(
    'change',
    (e) => {
      selectedEmployee = e.target.value;
      render();
    }
  );

  $('#leave-year').addEventListener('change', (e) => {
    const value = Number(e.target.value);

    if (
      !e.target.value ||
      !Number.isInteger(value) ||
      value < 1900 ||
      value > 9999
    ) {
      e.target.value = selectedYear;

      feedback(
        'Year must be a whole number from 1900 to 9999.'
      );

      return;
    }

    selectedYear = value;
    render();
  });

  $('#leave-status').addEventListener('change', (e) => {
    selectedStatus = e.target.value;
    render();
  });

  $('#leave-all-employees').addEventListener(
    'change',
    (e) => {
      allEmployees = e.target.checked;
      render();
    }
  );

  $('#leave-entitlements').addEventListener(
    'click',
    () => {
      policyEmployee = selectedEmployee;
      policyYear = selectedYear;

      const employee = employees.find(
        (e) => e.id === policyEmployee
      );

      $('#leave-policy-context').textContent =
        `${employee.name} · ${policyYear}`;

      Object.keys(R.TYPES).forEach((type) => {
        $(`[name="${type}"]`, policyDialog).value =
          R.entitlement(
            state,
            policyEmployee,
            policyYear,
            type
          );
      });

      showError(policyDialog, '');
      policyDialog.showModal();
    }
  );

  $('form', policyDialog).addEventListener(
    'submit',
    (event) => {
      event.preventDefault();

      try {
        const f = new FormData(event.currentTarget);
        const values = {};

        Object.keys(R.TYPES).forEach((type) => {
          values[type] = Number(f.get(type));
        });

        if (!employees.some(
          (e) => e.id === policyEmployee
        )) {
          throw new Error('Employee no longer exists.');
        }

        R.validateEntitlements(
          state,
          policyEmployee,
          policyYear,
          values
        );

        const next = clone();

        if (!Object.hasOwn(
          next.entitlements,
          policyEmployee
        )) {
          next.entitlements[policyEmployee] = {};
        }

        next.entitlements[policyEmployee][policyYear] =
          values;

        save(next);
        policyDialog.close();
        render();

        feedback(
          `Demo entitlements saved for ${policyYear}. ` +
          'Balances recalculated.'
        );
      } catch (e) {
        showError(policyDialog, e.message);
      }
    }
  );

  $('#leave-rows').addEventListener('click', (event) => {
    const button = event.target.closest(
      '[data-leave-action]'
    );

    if (!button) return;

    const r = state.requests.find(
      (item) => item.id === button.dataset.id
    );

    if (!r) return;

    const action = button.dataset.leaveAction;

    if (action === 'details') {
      $('#leave-history-content').innerHTML = `
        <p>
          <strong>
            ${esc(r.employeeName)} ·
            ${esc(R.TYPES[r.type])}
          </strong>
        </p>

        <p>
          ${esc(formatDate(r.start))}
          to ${esc(formatDate(r.end))}
          · ${R.days(r.start, r.end)} working day(s)
        </p>

        <p class="leave-prewrap"><strong>Reason:</strong> ${esc(r.reason)}</p>

        <h3>
          Local decision history (unverified identities)
        </h3>

        <ol class="leave-history">
          ${
            r.history.map((h) => `
              <li>
                <strong>${esc(h.status)}</strong>
                · ${esc(h.actor)}
                <small>
                  ${esc(formatTimestamp(h.at))}
                </small>
                <p class="leave-prewrap">${esc(h.note || 'No note')}</p>
              </li>
            `).join('')
          }
        </ol>
      `;

      historyDialog.showModal();
      return;
    }

    decisionId = r.id;
    decisionAction = action;

    const verb = {
      approve: 'Approve',
      reject: 'Reject',
      cancel: 'Cancel'
    }[action];

    $('#leave-decision-dialog-title').textContent =
      `${verb} leave`;

    $('#leave-decision-summary').textContent =
      `${r.employeeName} · ${R.TYPES[r.type]} · ` +
      `${formatDate(r.start)} to ${formatDate(r.end)} · ` +
      `${R.days(r.start, r.end)} working day(s). ` +
      (
        action === 'cancel'
          ? 'Confirm cancellation: reserved or used days will be released.'
          : ''
      );

    $('[name="note"]', decisionDialog).value = '';

    $('[name="note"]', decisionDialog).required =
      action === 'reject';

    $('button[type="submit"]', decisionDialog).textContent =
      `${verb} leave`;

    showError(decisionDialog, '');
    decisionDialog.showModal();
  });

  $('form', decisionDialog).addEventListener(
    'submit',
    (event) => {
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

        next.requests = next.requests.map((r) => (
          r.id === decisionId ? replacement : r
        ));

        save(next);
        decisionDialog.close();
        render();

        feedback(
          `Application ${replacement.status.toLowerCase()}. ` +
          'Balances recalculated. This decision is ' +
          'local and unverified.'
        );
      } catch (e) {
        showError(decisionDialog, e.message);
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

  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) {
      readStorage();
      render();
      preview();

      feedback(
        'Leave data refreshed from another tab.'
      );
    }
  });

  readStorage();
  render();
})();
