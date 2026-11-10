(() => {
  'use strict';

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector)
  ];

  const esc = (value) => String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]
  );

  const ATTENDANCE_KEY =
    'peopledesk-manual-attendance-v1';

  const AUDIT_KEY =
    'peopledesk-audit-log-v1';

  const employeesData = employees;

  let attendanceFilter = 'All records';

  function readList(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key)
      );

      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn(
        `Could not read ${key}`,
        error
      );

      return [];
    }
  }

  function writeList(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error(
        `Could not save ${key}`,
        error
      );

      return false;
    }
  }

  function timestamp() {
    return new Date().toISOString();
  }

  function dateToday() {
    return new Date().toLocaleDateString('en-CA');
  }

  function displayDate(date) {
    if (!date) return '—';

    const parsed = new Date(
      `${date}T00:00:00`
    );

    return Number.isNaN(parsed.valueOf())
      ? date
      : parsed.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
  }

  function displayTime(time) {
    // Supports "08:57 AM" and HTML time-input values like "08:57".
    if (typeof time !== 'string') return '—';

    const match = time.trim().match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );

    if (!match) return '—';

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    const period = match[4]?.toUpperCase();

    if (
      minute > 59 ||
      second > 59
    ) {
      return '—';
    }

    if (period) {
      if (
        hour < 1 ||
        hour > 12
      ) {
        return '—';
      }

      // 12 AM = midnight; 12 PM = noon.
      hour = (
        hour % 12
      ) + (
        period === 'PM' ? 12 : 0
      );
    } else if (hour > 23) {
      return '—';
    }

    return new Date(
      2000,
      0,
      1,
      hour,
      minute,
      second
    ).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const auditEntries = readList(AUDIT_KEY);

  function logAction(action, detail) {
    auditEntries.unshift({
      id: (
        `${Date.now()}-` +
        Math.random().toString(36).slice(2, 8)
      ),

      action,
      detail,
      actor: 'Alex Chen',
      at: timestamp()
    });

    auditEntries.splice(100);

    writeList(
      AUDIT_KEY,
      auditEntries
    );

    renderAudit();
  }

  function renderAudit() {
    const list = $('#audit-list');

    if (!list) return;

    list.innerHTML = auditEntries.length
      ? auditEntries.slice(0, 30).map((entry) => `
          <article class="audit-entry">
            <span
              class="audit-marker"
              aria-hidden="true"
            >•</span>

            <div class="audit-entry-copy">
              <strong>${esc(entry.action)}</strong>

              <small>
                ${esc(entry.detail)} · ${esc(entry.actor)}
              </small>
            </div>

            <time datetime="${esc(entry.at)}">
              ${
                new Date(entry.at).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              }
            </time>
          </article>
        `).join('')
      : `
          <p class="audit-empty">
            No recorded actions yet. Employee changes and attendance
            punches will appear here.
          </p>
        `;
  }

  function attendanceSeed() {
    return employeesData
      .filter((employee) => (
        employee.attendance &&
        employee.attendance !== '—'
      ))
      .map((employee) => ({
        id: `sample-${employee.id}-${dateToday()}`,

        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        date: dateToday(),

        clockIn: employee.checkIn === '—'
          ? ''
          : employee.checkIn,

        clockOut: employee.checkOut === '—'
          ? ''
          : employee.checkOut,

        method: employee.method || 'Sample',
        status: employee.attendance
      }));
  }

  let attendanceEntries = readList(
    ATTENDANCE_KEY
  );

  if (!attendanceEntries.length) {
    attendanceEntries = attendanceSeed();

    writeList(
      ATTENDANCE_KEY,
      attendanceEntries
    );
  }

  function renderAttendanceRows() {
    const tbody = $('#attendance-rows');

    if (!tbody) return;

    const selectedDate =
      $('#attendance-date')?.value || '';

    const rows = attendanceEntries
      .filter((record) => {
        const statusMatches =
          attendanceFilter === 'All records' ||
          record.status === attendanceFilter;

        return (
          statusMatches &&
          (
            !selectedDate ||
            record.date === selectedDate
          )
        );
      })
      .sort((a, b) =>
        `${b.date}${b.clockIn}`.localeCompare(
          `${a.date}${a.clockIn}`
        )
      );

    tbody.innerHTML = rows.length
      ? rows.map((record) => `
          <tr>
            <td>
              <div class="person-cell">
                <span class="person-avatar">
                  ${
                    esc(
                      (record.employeeName || '?')
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    )
                  }
                </span>

                <span>
                  <strong>${esc(record.employeeName)}</strong>
                  <small>${esc(record.employeeId)}</small>
                </span>
              </div>
            </td>

            <td>${esc(displayDate(record.date))}</td>
            <td>${esc(displayTime(record.clockIn))}</td>
            <td>${esc(displayTime(record.clockOut))}</td>
            <td>${esc(record.method || 'Manual')}</td>

            <td>
              <span class="status-pill ${
                record.status === 'Present'
                  ? 'green-pill'
                  : record.status === 'Late'
                    ? 'orange-pill'
                    : 'neutral-pill'
              }">
                ${esc(record.status || 'Incomplete')}
              </span>
            </td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="6" class="empty-state">
              No attendance records for this date and filter.
            </td>
          </tr>
        `;
  }

  function makeAttendanceDialog() {
    const dialog = document.createElement('dialog');

    dialog.className = 'attendance-dialog';

    dialog.setAttribute(
      'aria-labelledby',
      'attendance-dialog-title'
    );

    dialog.innerHTML = `
      <form id="attendance-form">
        <div class="attendance-dialog-heading">
          <div>
            <h2 id="attendance-dialog-title">
              Record attendance
            </h2>
            <p>Enter a manual punch for one employee.</p>
          </div>

          <button
            type="button"
            class="dialog-close"
            aria-label="Close dialog"
          >×</button>
        </div>

        <div class="attendance-form-fields">
          <label>
            Employee
            <select name="employeeId" required></select>
          </label>

          <label>
            Action
            <select name="punchType" required>
              <option value="in">Clock in</option>
              <option value="out">Clock out</option>
            </select>
          </label>

          <label>
            Date
            <input name="date" type="date" required>
          </label>

          <label>
            Time
            <input name="time" type="time" required>
          </label>
        </div>

        <p
          class="attendance-form-error"
          role="alert"
          hidden
        ></p>

        <p class="attendance-form-note">
          Manual attendance record. This prototype stores data in this
          browser only.
        </p>

        <div class="employee-dialog-actions">
          <button
            type="button"
            class="button button-secondary"
            data-attendance-cancel
          >
            Cancel
          </button>

          <button
            type="submit"
            class="button button-primary"
          >
            Save attendance
          </button>
        </div>
      </form>
    `;

    document.body.append(dialog);

    return dialog;
  }

  const attendanceDialog = makeAttendanceDialog();

  const attendanceForm = $(
    '#attendance-form',
    attendanceDialog
  );

  const employeeSelect = $(
    '[name="employeeId"]',
    attendanceForm
  );

  const punchTypeSelect = $(
    '[name="punchType"]',
    attendanceForm
  );

  function openAttendanceDialog(punchType) {
    const eligible = employeesData.filter(
      (employee) => employee.status === 'Active'
    );

    employeeSelect.innerHTML = eligible.map(
      (employee) => `
        <option value="${esc(employee.id)}">
          ${esc(employee.name)} · ${esc(employee.id)}
        </option>
      `
    ).join('');

    if (!eligible.length) {
      window.alert(
        'There are no active employees available to record attendance for.'
      );

      return;
    }

    attendanceForm.reset();

    $('[name="date"]', attendanceForm).value =
      $('#attendance-date')?.value || dateToday();

    $('[name="time"]', attendanceForm).value =
      new Date().toTimeString().slice(0, 5);

    punchTypeSelect.value = punchType;

    $('.attendance-form-error', attendanceForm).hidden = true;

    $('#attendance-dialog-title', attendanceDialog).textContent =
      punchType === 'in'
        ? 'Record clock in'
        : 'Record clock out';

    attendanceDialog.showModal();
  }

  $('#record-clock-in')?.addEventListener(
    'click',
    () => openAttendanceDialog('in')
  );

  $('#record-clock-out')?.addEventListener(
    'click',
    () => openAttendanceDialog('out')
  );

  $('.dialog-close', attendanceDialog).addEventListener(
    'click',
    () => attendanceDialog.close()
  );

  $('[data-attendance-cancel]', attendanceDialog).addEventListener(
    'click',
    () => attendanceDialog.close()
  );

  attendanceDialog.addEventListener('click', (event) => {
    if (event.target === attendanceDialog) {
      attendanceDialog.close();
    }
  });

  attendanceForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const values = new FormData(attendanceForm);

    const employee = employeesData.find(
      (item) => item.id === values.get('employeeId')
    );

    const type = String(values.get('punchType'));
    const date = String(values.get('date'));
    const time = String(values.get('time'));

    const error = $(
      '.attendance-form-error',
      attendanceForm
    );

    if (!employee) {
      error.textContent =
        'Select an employee to continue.';

      error.hidden = false;

      return;
    }

    let record = attendanceEntries.find(
      (item) => (
        item.employeeId === employee.id &&
        item.date === date
      )
    );

    const created = !record;

    if (!record) {
      record = {
        id: `manual-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        date,
        clockIn: '',
        clockOut: '',
        method: 'Manual',
        status: 'Incomplete'
      };

      attendanceEntries.push(record);
    }

    record.employeeName = employee.name;
    record.department = employee.department;
    record.method = 'Manual';

    if (type === 'in') {
      if (record.clockIn) {
        error.textContent =
          'A clock-in is already recorded for this employee and date.';

        error.hidden = false;

        if (created) {
          attendanceEntries.pop();
        }

        return;
      }

      record.clockIn = time;
      record.status = 'Present';
    } else {
      if (!record.clockIn) {
        error.textContent =
          'Record the clock-in first for this employee and date.';

        error.hidden = false;

        if (created) {
          attendanceEntries.pop();
        }

        return;
      }

      if (record.clockOut) {
        error.textContent =
          'A clock-out is already recorded for this employee and date.';

        error.hidden = false;

        if (created) {
          attendanceEntries.pop();
        }

        return;
      }

      if (time < record.clockIn) {
        error.textContent =
          'Clock-out time cannot be earlier than clock-in time.';

        error.hidden = false;

        if (created) {
          attendanceEntries.pop();
        }

        return;
      }

      record.clockOut = time;
    }

    if (
      !writeList(
        ATTENDANCE_KEY,
        attendanceEntries
      )
    ) {
      if (type === 'in') {
        record.clockIn = '';
      } else {
        record.clockOut = '';
      }

      if (created) {
        attendanceEntries.pop();
      }

      error.textContent =
        'Could not save attendance in this browser. Please try again.';

      error.hidden = false;

      return;
    }

    renderAttendanceRows();

    const punchLabel = type === 'in'
      ? 'clock-in'
      : 'clock-out';

    logAction(
      `Manual ${punchLabel} recorded`,
      `${employee.name} (${employee.id}) · ${displayDate(date)} at ${displayTime(time)}`
    );

    attendanceDialog.close();
  });

  function installStyles() {
    const style = document.createElement('style');

    style.textContent = `
      body:has(dialog[open]) {
        overflow:hidden;
      }

      dialog[open] {
        overscroll-behavior:contain;
      }

      .attendance-actions {
        display:flex;
        gap:9px;
        flex-wrap:wrap;
      }

      .attendance-dialog {
        width:min(520px,calc(100vw - 32px));
        max-height:min(90vh,760px);
        overflow:auto;
        padding:0;
        border:1px solid #eceef3;
        border-radius:14px;
        color:#1f2332;
        box-shadow:0 24px 80px #1f233244;
      }

      .attendance-dialog::backdrop {
        background:#17192a80;
        backdrop-filter:blur(2px);
      }

      .attendance-dialog form {
        padding:24px;
      }

      .attendance-dialog-heading {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        margin-bottom:20px;
      }

      .attendance-dialog-heading h2 {
        font:700 20px Manrope,sans-serif;
        margin:0;
      }

      .attendance-dialog-heading p {
        color:#85899a;
        font-size:12px;
        margin:6px 0 0;
      }

      .attendance-form-fields {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:14px;
      }

      .attendance-form-fields label {
        display:grid;
        gap:6px;
        color:#55596a;
        font-size:12px;
        font-weight:600;
      }

      .attendance-form-fields input,
      .attendance-form-fields select {
        width:100%;
        min-height:40px;
        border:1px solid #e4e6ed;
        border-radius:7px;
        background:#fff;
        padding:0 10px;
        color:#343848;
        font:13px 'DM Sans',sans-serif;
      }

      .attendance-form-error {
        color:#b83f3f;
        background:#fff0ef;
        border-radius:6px;
        font-size:12px;
        padding:9px 10px;
        margin:12px 0 0;
      }

      .attendance-form-error[hidden] {
        display:none;
      }

      .attendance-form-note {
        color:#9295a3;
        font-size:11px;
        line-height:1.5;
        margin:15px 0 0;
      }

      .attendance-dialog .employee-dialog-actions {
        display:flex;
        justify-content:flex-end;
        gap:9px;
        border-top:1px solid #eff0f5;
        padding-top:17px;
        margin-top:20px;
      }

      .audit-panel {
        margin-top:18px;
      }

      .audit-list {
        padding:0 18px 8px;
        max-height:350px;
        overflow:auto;
      }

      .audit-entry {
        display:flex;
        align-items:flex-start;
        gap:10px;
        padding:12px 0;
        border-top:1px solid #f1f2f6;
      }

      .audit-marker {
        width:22px;
        height:22px;
        flex:none;
        display:grid;
        place-items:center;
        border-radius:7px;
        color:#6655d8;
        background:#f0edff;
        font-size:20px;
        line-height:10px;
      }

      .audit-entry-copy {
        flex:1;
        min-width:0;
      }

      .audit-entry-copy strong,
      .audit-entry-copy small {
        display:block;
      }

      .audit-entry-copy strong {
        color:#45495a;
        font-size:11px;
      }

      .audit-entry-copy small {
        color:#9093a2;
        font-size:10px;
        margin-top:4px;
      }

      .audit-entry time {
        color:#999cab;
        font-size:9px;
        white-space:nowrap;
      }

      .audit-empty {
        color:#9699a8;
        font-size:11px;
        padding:12px 0;
      }

      .master-data-home {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;
        max-width:900px;
      }

      .master-data-tile {
        display:flex;
        align-items:center;
        gap:15px;
        min-height:125px;
        padding:20px;
        text-align:left;
        border:1px solid #eceef3;
        border-radius:12px;
        background:#fff;
        box-shadow:0 6px 24px rgba(34,40,70,.045);
        cursor:pointer;
      }

      .master-data-tile:hover {
        border-color:#d9d4ff;
        box-shadow:0 10px 28px rgba(55,46,130,.09);
      }

      .master-data-icon {
        width:46px;
        height:46px;
        flex:none;
        display:grid;
        place-items:center;
        border-radius:13px;
        font-size:22px;
        font-weight:700;
      }

      .department-icon {
        color:#6655d8;
        background:#f0edff;
      }

      .employment-icon {
        color:#258c69;
        background:#e8f7f1;
      }

      .master-data-tile-copy {
        display:grid;
        gap:6px;
        flex:1;
      }

      .master-data-tile-copy strong {
        font:700 15px Manrope,sans-serif;
        color:#303445;
      }

      .master-data-tile-copy small {
        color:#898d9d;
        font-size:11px;
        line-height:1.5;
      }

      .master-data-arrow {
        font-size:20px;
        color:#999cab;
      }

      .master-data-section[hidden],
      .master-data-home[hidden] {
        display:none;
      }

      .master-section-heading {
        display:grid;
        gap:18px;
        margin-bottom:16px;
      }

      .master-section-heading>div {
        display:flex;
        align-items:center;
        gap:12px;
      }

      .master-section-heading h2 {
        margin:0;
        font:700 18px Manrope,sans-serif;
      }

      .master-section-heading p {
        margin:5px 0 0;
        color:#9295a3;
        font-size:11px;
      }

      .master-section-heading .master-data-icon {
        width:40px;
        height:40px;
        font-size:19px;
      }

      .master-data-section .master-card {
        max-width:700px;
      }

      @media(max-width:700px) {
        .attendance-actions {
          align-items:flex-end;
          flex-direction:column;
        }

        .master-data-home {
          grid-template-columns:1fr;
        }

        .master-data-tile {
          min-height:105px;
          padding:15px;
        }
      }

      @media(max-width:520px) {
        .attendance-dialog form {
          padding:19px;
        }

        .attendance-form-fields {
          grid-template-columns:1fr;
        }
      }
    `;

    document.head.append(style);
  }

  function setupMasterDataTiles() {
    const view = $('#view-settings');

    if (!view) return;

    // Preserve the eLeave form and its existing event bindings.
    const eleaveCard = $(
      '.eleave-master-card',
      view
    );

    view.innerHTML = `
      <div class="page-heading">
        <div>
          <p class="eyebrow">CONFIGURATION</p>
          <h1>Settings</h1>
          <p class="subtitle">
            Choose a master data section to manage employee dropdown options.
          </p>
        </div>
      </div>

      <div class="master-data-home" id="master-data-home">
        <button
          type="button"
          class="master-data-tile"
          data-open-master-section="departments"
        >
          <span
            class="master-data-icon department-icon"
            aria-hidden="true"
          >▦</span>

          <span class="master-data-tile-copy">
            <strong>Departments</strong>
            <small>
              Manage department options used in employee profiles.
            </small>
          </span>

          <span class="master-data-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          class="master-data-tile"
          data-open-master-section="employmentTypes"
        >
          <span
            class="master-data-icon employment-icon"
            aria-hidden="true"
          >▤</span>

          <span class="master-data-tile-copy">
            <strong>Employment types</strong>
            <small>
              Manage employment type options used in employee profiles.
            </small>
          </span>

          <span class="master-data-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          class="master-data-tile"
          data-open-master-section="leaveTypes"
        >
          <span
            class="master-data-icon department-icon"
            aria-hidden="true"
          >☼</span>

          <span class="master-data-tile-copy">
            <strong>eLeave types</strong>
            <small>
              Manage leave and WFH categories used by applications
              and the calendar.
            </small>
          </span>

          <span class="master-data-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <section
        class="master-data-section"
        id="master-section-departments"
        hidden
      >
        <div class="master-section-heading">
          <button
            type="button"
            class="button button-secondary"
            data-back-to-master
          >
            ← Master data
          </button>

          <div>
            <span
              class="master-data-icon department-icon"
              aria-hidden="true"
            >▦</span>

            <div>
              <h2>Departments</h2>
              <p>Department dropdown options for employee records.</p>
            </div>
          </div>
        </div>

        <div class="panel master-card">
          <form
            class="master-add-form"
            data-master-form="departments"
          >
            <input
              name="value"
              maxlength="80"
              required
              placeholder="Add a department"
              aria-label="New department"
            >

            <button class="button button-primary" type="submit">
              Add department
            </button>
          </form>

          <ul
            class="master-list"
            id="department-list"
            aria-label="Department master data"
          ></ul>
        </div>
      </section>

      <section
        class="master-data-section"
        id="master-section-employmentTypes"
        hidden
      >
        <div class="master-section-heading">
          <button
            type="button"
            class="button button-secondary"
            data-back-to-master
          >
            ← Master data
          </button>

          <div>
            <span
              class="master-data-icon employment-icon"
              aria-hidden="true"
            >▤</span>

            <div>
              <h2>Employment types</h2>
              <p>Employment type dropdown options for employee records.</p>
            </div>
          </div>
        </div>

        <div class="panel master-card">
          <form
            class="master-add-form"
            data-master-form="employmentTypes"
          >
            <input
              name="value"
              maxlength="80"
              required
              placeholder="Add an employment type"
              aria-label="New employment type"
            >

            <button class="button button-primary" type="submit">
              Add type
            </button>
          </form>

          <ul
            class="master-list"
            id="employment-type-list"
            aria-label="Employment type master data"
          ></ul>
        </div>
      </section>

      <p class="master-note">
        Master data is stored in this browser only in the prototype.
        An option currently assigned to an employee cannot be deleted.
      </p>

      <div
        class="settings-feedback"
        id="settings-feedback"
        aria-live="polite"
      ></div>
    `;

    if (eleaveCard) {
      const leaveSection = document.createElement('section');

      leaveSection.className = 'master-data-section';
      leaveSection.id = 'master-section-leaveTypes';
      leaveSection.hidden = true;

      leaveSection.innerHTML = `
        <div class="master-section-heading">
          <button
            type="button"
            class="button button-secondary"
            data-back-to-master
          >
            ← Master data
          </button>

          <div>
            <span
              class="master-data-icon department-icon"
              aria-hidden="true"
            >☼</span>

            <div>
              <h2>eLeave types</h2>
              <p>Leave and WFH application categories.</p>
            </div>
          </div>
        </div>
      `;

      leaveSection.append(eleaveCard);

      $('.master-note', view).before(
        leaveSection
      );
    }

    const home = $(
      '#master-data-home',
      view
    );

    const sections = $$(
      '.master-data-section',
      view
    );

    const showHome = () => {
      home.hidden = false;

      sections.forEach((section) => {
        section.hidden = true;
      });

      $('.master-note', view).hidden = false;
      $('#settings-feedback', view).textContent = '';
    };

    view.addEventListener('click', (event) => {
      const open = event.target.closest(
        '[data-open-master-section]'
      );

      if (open) {
        home.hidden = true;

        sections.forEach((section) => {
          section.hidden = (
            section.id !==
            `master-section-${open.dataset.openMasterSection}`
          );
        });

        $('.master-note', view).hidden = true;
        $('#settings-feedback', view).textContent = '';

        if (typeof renderMasterData === 'function') {
          renderMasterData();
        }
      } else if (
        event.target.closest('[data-back-to-master]')
      ) {
        showHome();
      }
    });
  }

  function auditEmployeeActions() {
    document.addEventListener('click', (event) => {
      const actionButton = event.target.closest(
        '#employee-rows [data-action]'
      );

      if (
        actionButton &&
        actionButton.dataset.action !== 'edit'
      ) {
        const employee = employeesData.find(
          (item) => (
            item.id === actionButton.dataset.employeeId
          )
        );

        const action = actionButton.dataset.action;

        const name = employee?.name ||
          actionButton.dataset.employeeId;

        setTimeout(() => {
          if (
            action === 'toggle-status' &&
            employee
          ) {
            logAction(
              `Employee ${employee.status.toLowerCase()}`,
              `${name} (${employee.id})`
            );
          }

          if (
            action === 'delete' &&
            employee &&
            !employeesData.includes(employee)
          ) {
            logAction(
              'Employee deleted',
              `${name} (${employee.id})`
            );
          }
        }, 0);
      }

      const bulkButton = event.target.closest(
        '#bulk-actions [data-bulk-action]'
      );

      if (bulkButton) {
        const action = bulkButton.dataset.bulkAction;
        const ids = [...selectedEmployeeIds];

        const names = ids.map(
          (id) => (
            employeesData.find(
              (item) => item.id === id
            )?.name || id
          )
        );

        setTimeout(() => {
          if (action === 'delete') {
            const remaining = names.filter(
              (name) => employeesData.some(
                (item) => item.name === name
              )
            );

            if (remaining.length !== names.length) {
              logAction(
                'Bulk employee deletion',
                `${names.length - remaining.length} employee record(s)`
              );
            }
          } else if (
            action === 'activate' ||
            action === 'deactivate'
          ) {
            logAction(
              `Bulk employee ${action}d`,
              `${ids.length} employee record(s)`
            );
          }
        }, 0);
      }

      const masterDelete = event.target.closest(
        '#view-settings [data-master-delete]'
      );

      if (masterDelete) {
        const value = masterDelete.dataset.masterValue;

        setTimeout(() => {
          const stillExists = masterData[
            masterDelete.dataset.masterDelete
          ]?.includes(value);

          if (!stillExists) {
            logAction(
              'Master data option removed',
              value
            );
          }
        }, 0);
      }
    }, true);

    document.addEventListener('submit', (event) => {
      if (event.target.id === 'employee-form') {
        const form = event.target;
        const isEdit = Boolean(editingEmployeeId);

        const person = (
          `${form.elements.firstName.value.trim()} ` +
          `${form.elements.lastName.value.trim()}`
        ).trim();

        setTimeout(() => {
          if (
            !$('#employee-dialog')?.open &&
            !$('.employee-dialog')?.open
          ) {
            return;
          }

          // Successful app.js saves close the dialog;
          // validation failures keep it open.
        }, 0);

        setTimeout(() => {
          const wasSaved =
            !$('.employee-dialog')?.open;

          if (wasSaved) {
            logAction(
              isEdit
                ? 'Employee record updated'
                : 'Employee record created',

              person || 'Employee profile'
            );
          }
        }, 30);
      }

      const masterForm = event.target.closest(
        '#view-settings [data-master-form]'
      );

      if (masterForm) {
        const value = String(
          new FormData(masterForm).get('value') || ''
        ).trim();

        const key = masterForm.dataset.masterForm;

        setTimeout(() => {
          if (masterData[key]?.includes(value)) {
            logAction(
              'Master data option added',
              value
            );
          }
        }, 0);
      }
    }, true);
  }

  function setupModalScrollLock() {
    const style = document.createElement('style');

    style.textContent = `
      body:has(dialog[open]) {
        overflow:hidden!important;
      }

      dialog[open] {
        overscroll-behavior:contain;
      }
    `;

    document.head.append(style);
  }

  // app.js has initialized its views and event handlers
  // before this script runs.
  $$('.nav-item[data-view="clock"]').forEach(
    (item) => item.remove()
  );

  $('#view-clock')?.remove();

  const settingsView = $('#view-settings');
  const footer = $('.app-footer');

  if (settingsView && footer) {
    footer.before(settingsView);
  }

  setupModalScrollLock();
  installStyles();
  setupMasterDataTiles();
  auditEmployeeActions();

  $('#clear-audit-log')?.addEventListener('click', () => {
    if (!auditEntries.length) return;

    if (
      !window.confirm(
        'Clear the activity history stored in this browser?'
      )
    ) {
      return;
    }

    auditEntries.splice(
      0,
      auditEntries.length
    );

    writeList(
      AUDIT_KEY,
      auditEntries
    );

    renderAudit();
  });

  $('#attendance-date')?.addEventListener(
    'change',
    renderAttendanceRows
  );

  $('#view-attendance')?.addEventListener(
    'click',
    (event) => {
      const chip = event.target.closest('.filter-chip');

      if (!chip) return;

      attendanceFilter = chip.textContent.trim();

      renderAttendanceRows();
    }
  );

  renderAttendanceRows();
  renderAudit();
})();
