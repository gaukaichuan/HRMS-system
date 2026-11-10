/* PeopleDesk dashboard:
   Derived from existing local records, never fixed sample totals. */

(() => {
  'use strict';

  const view = document.querySelector('#view-dashboard');
  if (!view) return;

  const $ = (selector) => document.querySelector(selector);

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

  const today = () => {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  };

  const validDate = (value) => (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
  );

  const set = (id, value) => {
    const el = $('#' + id);

    if (el) {
      el.textContent = value;
    }
  };

  function readArray(key) {
    const raw = localStorage.getItem(key);

    if (raw === null) {
      return [];
    }

    const value = JSON.parse(raw);

    if (!Array.isArray(value)) {
      throw new Error('Invalid local data');
    }

    return value;
  }

  function parseTime(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const m = value.trim().match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );

    if (!m) {
      return null;
    }

    let hour = Number(m[1]);
    const minute = Number(m[2]);
    const second = Number(m[3] || 0);

    if (minute > 59 || second > 59) {
      return null;
    }

    if (m[4]) {
      if (hour < 1 || hour > 12) {
        return null;
      }

      hour = hour % 12 + (
        m[4].toUpperCase() === 'PM' ? 12 : 0
      );
    } else if (hour > 23) {
      return null;
    }

    return {
      seconds: hour * 3600 + minute * 60 + second,

      label: new Date(
        2000,
        0,
        1,
        hour,
        minute,
        second
      ).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  let directoryError = false;

  function refreshDirectoryFromStorage() {
    try {
      const removed = readArray(
        'peopledesk-deleted-employees-v1'
      );

      const custom = readArray(
        'peopledesk-employees-v1'
      );

      const overrides = readArray(
        'peopledesk-employee-overrides-v1'
      );

      const invalidRemoved = removed.some(
        (id) => typeof id !== 'string'
      );

      const invalidStoredProfiles = [
        ...custom,
        ...overrides
      ].some(
        (employee) => (
          !employee ||
          typeof employee.id !== 'string'
        )
      );

      if (invalidRemoved || invalidStoredProfiles) {
        throw new Error('Invalid employee data');
      }

      const deleted = new Set(removed);

      const updates = new Map(
        overrides.map((employee) => [
          employee.id,
          employee
        ])
      );

      const next = [
        ...sampleEmployees
          .filter(
            (employee) => !deleted.has(employee.id)
          )
          .map((employee) => ({
            ...employee,
            ...updates.get(employee.id)
          })),

        ...custom.filter(
          (employee) => !deleted.has(employee.id)
        )
      ];

      const invalidProfile = next.some((employee) => (
        typeof employee.name !== 'string' ||
        (
          employee.status !== 'Active' &&
          employee.status !== 'Inactive'
        )
      ));

      const duplicateIds = new Set(
        next.map((employee) => employee.id)
      ).size !== next.length;

      if (invalidProfile || duplicateIds) {
        throw new Error('Invalid employee profile');
      }

      employees.splice(
        0,
        employees.length,
        ...next
      );

      deletedEmployeeIds.clear();

      removed.forEach(
        (id) => deletedEmployeeIds.add(id)
      );

      directoryError = false;

      renderEmployees();
    } catch {
      directoryError = true;
    }
  }

  function currentAttendance(active) {
    const rows = readArray(
      'peopledesk-manual-attendance-v1'
    );

    if (
      rows.some((record) => (
        !record ||
        typeof record.employeeId !== 'string' ||
        !validDate(record.date)
      ))
    ) {
      throw new Error('Invalid attendance data');
    }

    // Count unique employees, not individual punch rows.
    const byId = new Map();

    for (const record of rows) {
      if (
        record.date !== today() ||
        !active.has(record.employeeId)
      ) {
        continue;
      }

      const checkIn = parseTime(record.clockIn);
      const previous = byId.get(record.employeeId);

      if (
        !previous ||
        (
          checkIn &&
          (
            !previous.checkIn ||
            checkIn.seconds < previous.checkIn.seconds
          )
        )
      ) {
        byId.set(record.employeeId, {
          ...record,
          checkIn
        });
      }
    }

    return [...byId.values()].sort(
      (a, b) => (
        (a.checkIn?.seconds ?? Infinity) -
        (b.checkIn?.seconds ?? Infinity)
      )
    );
  }

  function currentLeave(active) {
    const R = window.LeaveRules;

    if (!R) {
      throw new Error('Leave rules unavailable');
    }

    R.configureTypes(masterData.leaveTypes);

    const raw = localStorage.getItem(
      'peopledesk-leave-v1'
    );

    const state = raw === null
      ? R.emptyState()
      : R.validateState(JSON.parse(raw));

    const leave = new Set();
    const wfh = new Set();

    for (const request of state.requests) {
      if (
        request.status !== 'Approved' ||
        !active.has(request.employeeId) ||
        !R.requestUnits(request).some(
          (day) => day.date === today()
        )
      ) {
        continue;
      }

      if (request.type === 'wfh') {
        wfh.add(request.employeeId);
      } else {
        leave.add(request.employeeId);
      }
    }

    return {
      leave,
      wfh
    };
  }

  function renderSyncedDashboard() {
    const roster = new Map(
      employees.map((employee) => [
        employee.id,
        employee
      ])
    );

    const active = new Set(
      employees
        .filter(
          (employee) => employee.status === 'Active'
        )
        .map((employee) => employee.id)
    );

    const notes = [];

    if (directoryError) {
      [
        'dashboard-total-employees',
        'dashboard-present-today',
        'dashboard-late-today',
        'dashboard-on-leave'
      ].forEach((id) => set(id, '—'));

      set(
        'dashboard-employee-note',
        'Saved employee profiles could not be read safely.'
      );

      set(
        'dashboard-present-note',
        'Unavailable until employee data can be read.'
      );

      set(
        'dashboard-late-note',
        'Unavailable until employee data can be read.'
      );

      set(
        'dashboard-leave-note',
        'Unavailable until employee data can be read.'
      );

      set(
        'dashboard-attendance-count',
        'Employee data unavailable'
      );

      $('#dashboard-attendance').innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            Employee data unavailable.
            Existing records have not been cleared.
          </td>
        </tr>
      `;

      set(
        'dashboard-data-status',
        'Some saved employee data could not be read safely. Do not clear browser storage.'
      );

      return;
    }

    set(
      'dashboard-total-employees',
      roster.size
    );

    set(
      'dashboard-employee-note',
      `${active.size} active · ${roster.size - active.size} inactive`
    );

    try {
      const attendance = currentAttendance(active);

      const present = attendance.filter(
        (record) => !!record.checkIn
      ).length;

      const late = attendance.filter(
        (record) => (
          !!record.checkIn &&
          record.status === 'Late'
        )
      ).length;

      set(
        'dashboard-present-today',
        present
      );

      set(
        'dashboard-present-note',
        `${present} of ${active.size} active employees have a saved check-in · includes late arrivals`
      );

      set(
        'dashboard-late-today',
        late
      );

      set(
        'dashboard-late-note',
        'Saved Late status · included in Present today'
      );

      const visible = attendance.slice(0, 5);

      $('#dashboard-attendance').innerHTML = visible.length
        ? visible.map((record) => {
            const employee = roster.get(
              record.employeeId
            );

            const status = record.checkIn
              ? (
                  record.status === 'Late'
                    ? 'Late'
                    : 'Present'
                )
              : 'Incomplete';

            const color = status === 'Late'
              ? 'orange-pill'
              : status === 'Present'
                ? 'green-pill'
                : 'neutral-pill';

            const initials = employee.initials ||
              employee.name
                .split(/\s+/)
                .map((part) => part[0])
                .slice(0, 2)
                .join('');

            return `
              <tr>
                <td>
                  <div class="person-cell">
                    <span class="person-avatar">
                      ${esc(initials)}
                    </span>

                    <span>
                      <strong>${esc(employee.name)}</strong>
                      <small>${esc(employee.id)}</small>
                    </span>
                  </div>
                </td>

                <td>
                  ${esc(employee.department || 'Unassigned')}
                </td>

                <td>
                  ${esc(record.checkIn?.label || '—')}
                </td>

                <td>
                  <span class="status-pill ${color}">
                    ${status}
                  </span>
                </td>
              </tr>
            `;
          }).join('')
        : `
            <tr>
              <td colspan="4" class="empty-state">
                No saved attendance for active employees today.
              </td>
            </tr>
          `;

      set(
        'dashboard-attendance-count',
        `Showing ${visible.length} of ${attendance.length} employees with a saved attendance record today`
      );
    } catch {
      set(
        'dashboard-present-today',
        '—'
      );

      set(
        'dashboard-late-today',
        '—'
      );

      set(
        'dashboard-present-note',
        'Saved attendance is unavailable.'
      );

      set(
        'dashboard-late-note',
        'Saved attendance is unavailable.'
      );

      $('#dashboard-attendance').innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            Attendance data could not be read safely.
          </td>
        </tr>
      `;

      set(
        'dashboard-attendance-count',
        'Attendance unavailable'
      );

      notes.push(
        'Some saved attendance data could not be read safely.'
      );
    }

    try {
      const {
        leave,
        wfh
      } = currentLeave(active);

      set(
        'dashboard-on-leave',
        leave.size
      );

      set(
        'dashboard-leave-note',
        `${leave.size} on approved leave · ${wfh.size} approved WFH · includes half-days`
      );
    } catch {
      set(
        'dashboard-on-leave',
        '—'
      );

      set(
        'dashboard-leave-note',
        'Saved leave data is unavailable.'
      );

      notes.push(
        'Some saved leave or eLeave master data could not be read safely.'
      );
    }

    const currentDateLabel = new Date().toLocaleDateString(
      undefined,
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );

    set(
      'dashboard-data-status',
      notes.length
        ? (
            notes.join(' ') +
            ' Existing records have not been cleared.'
          )
        : (
            `Calculated from saved records for ${currentDateLabel}. ` +
            'Browser-local prototype; seeded demo attendance is included if present.'
          )
    );
  }

  // Existing employee add/edit/activate/delete handlers
  // already call renderDashboard().
  renderDashboard = renderSyncedDashboard;

  let scheduled;

  function schedule() {
    clearTimeout(scheduled);

    scheduled = setTimeout(
      renderSyncedDashboard,
      0
    );
  }

  [
    '#employee-rows',
    '#attendance-rows',
    '#leave-rows'
  ].forEach((selector) => {
    const target = $(selector);

    if (target) {
      new MutationObserver(schedule).observe(
        target,
        {
          childList: true,
          subtree: true
        }
      );
    }
  });

  document.addEventListener(
    'submit',
    schedule
  );

  document.addEventListener('click', (event) => {
    if (
      event.target.closest(
        '[data-view="dashboard"],[data-go="dashboard"]'
      )
    ) {
      schedule();
    }
  });

  window.addEventListener(
    'peopledesk-eleave-types-changed',
    schedule
  );

  const employeeKeys = [
    'peopledesk-employees-v1',
    'peopledesk-deleted-employees-v1',
    'peopledesk-employee-overrides-v1'
  ];

  window.addEventListener('storage', (event) => {
    if (
      event.key === null ||
      employeeKeys.includes(event.key)
    ) {
      refreshDirectoryFromStorage();
    }

    schedule();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      schedule();
    }
  });

  // Refresh the local-day calculations while the page stays open.
  setInterval(
    schedule,
    60000
  );

  refreshDirectoryFromStorage();
  renderSyncedDashboard();
})();
