const sampleEmployees = [
  {
    name: 'Jordan Lee',
    initials: 'JL',
    id: 'EMP-0042',
    department: 'Engineering',
    role: 'Software Engineer',
    email: 'jordan.lee@example.com',
    phone: '+1 555 010 0042',
    startDate: '2024-06-12',
    status: 'Active',
    employmentStatus: 'Confirmed',
    employmentType: 'Permanent',
    emergencyContactName: 'Morgan Lee',
    emergencyContactPhone: '+1 555 010 1042',
    emergencyContactRelationship: 'Spouse',
    checkIn: '08:57 AM',
    checkOut: '—',
    method: 'Face (planned)',
    attendance: 'Present',
    color: ''
  },
  {
    name: 'Maya Patel',
    initials: 'MP',
    id: 'EMP-0038',
    department: 'Finance',
    role: 'Finance Analyst',
    email: 'maya.patel@example.com',
    phone: '+1 555 010 0038',
    startDate: '2023-10-02',
    status: 'Active',
    employmentStatus: 'Confirmed',
    employmentType: 'Permanent',
    emergencyContactName: 'Ravi Patel',
    emergencyContactPhone: '+1 555 010 1038',
    emergencyContactRelationship: 'Parent',
    checkIn: '09:18 AM',
    checkOut: '—',
    method: 'Manual',
    attendance: 'Late',
    color: 'coral'
  },
  {
    name: 'Sam Rivera',
    initials: 'SR',
    id: 'EMP-0051',
    department: 'People & Culture',
    role: 'People Partner',
    email: 'sam.rivera@example.com',
    phone: '+1 555 010 0051',
    startDate: '2022-03-21',
    status: 'Active',
    employmentStatus: 'Confirmed',
    employmentType: 'Permanent',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    checkIn: '08:42 AM',
    checkOut: '—',
    method: 'Manual',
    attendance: 'Present',
    color: 'mint'
  },
  {
    name: 'Avery Kim',
    initials: 'AK',
    id: 'EMP-0027',
    department: 'Design',
    role: 'Product Designer',
    email: 'avery.kim@example.com',
    phone: '+1 555 010 0027',
    startDate: '2024-01-15',
    status: 'Active',
    employmentStatus: 'Probation',
    employmentType: 'Contract',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    checkIn: '09:02 AM',
    checkOut: '—',
    method: 'Face (planned)',
    attendance: 'Present',
    color: 'blue-tint'
  },
  {
    name: 'Noah Williams',
    initials: 'NW',
    id: 'EMP-0064',
    department: 'Operations',
    role: 'Operations Lead',
    email: 'noah.williams@example.com',
    phone: '+1 555 010 0064',
    startDate: '2021-08-09',
    status: 'Active',
    employmentStatus: 'Confirmed',
    employmentType: 'Permanent',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    checkIn: '—',
    checkOut: '—',
    method: '—',
    attendance: 'Incomplete',
    color: 'gold'
  },
  {
    name: 'Taylor Morgan',
    initials: 'TM',
    id: 'EMP-0019',
    department: 'Engineering',
    role: 'QA Engineer',
    email: 'taylor.morgan@example.com',
    phone: '+1 555 010 0019',
    startDate: '2023-04-03',
    status: 'Active',
    employmentStatus: 'Confirmed',
    employmentType: 'Part-time',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    checkIn: '08:49 AM',
    checkOut: '—',
    method: 'Manual',
    attendance: 'Present',
    color: 'coral'
  },
  {
    name: 'Riley Chen',
    initials: 'RC',
    id: 'EMP-0072',
    department: 'Finance',
    role: 'Payroll Specialist',
    email: 'riley.chen@example.com',
    phone: '+1 555 010 0072',
    startDate: '2020-11-16',
    status: 'Inactive',
    employmentStatus: 'Resigned',
    employmentType: 'Permanent',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    checkIn: '—',
    checkOut: '—',
    method: '—',
    attendance: '—',
    color: 'mint'
  }
];

const STORAGE_KEY = 'peopledesk-employees-v1';
const DELETED_KEY = 'peopledesk-deleted-employees-v1';
const OVERRIDES_KEY = 'peopledesk-employee-overrides-v1';
const MASTER_DATA_KEY = 'peopledesk-master-data-v1';

const DEFAULT_LEAVE_TYPES = [
  {
    id: 'annual',
    name: 'Annual leave',
    defaultDays: 14,
    tracksBalance: true,
    active: true
  },
  {
    id: 'medical',
    name: 'Medical leave',
    defaultDays: 14,
    tracksBalance: true,
    active: true
  },
  {
    id: 'emergency',
    name: 'Emergency leave',
    defaultDays: 3,
    tracksBalance: true,
    active: true
  },
  {
    id: 'wfh',
    name: 'WFH (Work from home)',
    defaultDays: 0,
    tracksBalance: false,
    active: true
  }
];

function withBuiltInLeaveTypes(values) {
  const list = Array.isArray(values)
    ? values.map((item) => ({ ...item }))
    : [];

  DEFAULT_LEAVE_TYPES.forEach((item) => {
    if (!list.some((type) => type.id === item.id)) {
      list.push({ ...item });
    }
  });

  return list;
}

const DEFAULT_MASTER_DATA = {
  leaveTypes: DEFAULT_LEAVE_TYPES.map(
    (type) => ({ ...type })
  ),

  departments: [
    'Engineering',
    'Finance',
    'People & Culture',
    'Design',
    'Operations'
  ],

  employmentTypes: [
    'Permanent',
    'Contract',
    'Part-time',
    'Temporary',
    'Intern'
  ]
};

const EMPLOYMENT_STATUSES = [
  'Probation',
  'Confirmed',
  'On leave',
  'Resigned',
  'Terminated'
];

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => [
  ...document.querySelectorAll(selector)
];

const escapeHtml = (value) => String(value ?? '').replace(
  /[&<>"']/g,
  (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]
);

let bulkMode = false;
let editingEmployeeId = null;

const selectedEmployeeIds = new Set();

function readStoredArray(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key)
    );

    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn(
      `Could not read prototype storage: ${key}`,
      error
    );

    return [];
  }
}

function readMasterData() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(MASTER_DATA_KEY)
    );

    return {
      leaveTypes: withBuiltInLeaveTypes(
        stored?.leaveTypes
      ),

      departments: Array.isArray(stored?.departments)
        ? [
            ...new Set(
              stored.departments.filter(
                (item) => (
                  typeof item === 'string' &&
                  item.trim()
                )
              )
            )
          ]
        : [...DEFAULT_MASTER_DATA.departments],

      employmentTypes: Array.isArray(
        stored?.employmentTypes
      )
        ? [
            ...new Set(
              stored.employmentTypes.filter(
                (item) => (
                  typeof item === 'string' &&
                  item.trim()
                )
              )
            )
          ]
        : [...DEFAULT_MASTER_DATA.employmentTypes]
    };
  } catch (error) {
    console.warn('Could not read master data.', error);
    return structuredClone(DEFAULT_MASTER_DATA);
  }
}

const masterData = readMasterData();

let leaveMasterRaw = null;

try {
  leaveMasterRaw = localStorage.getItem(MASTER_DATA_KEY);
} catch {
  // Storage writes will report failure.
}

const deletedEmployeeIds = new Set(
  readStoredArray(DELETED_KEY)
);

function loadEmployees() {
  const overrides = new Map(
    readStoredArray(OVERRIDES_KEY)
      .filter((item) => item?.id)
      .map((item) => [item.id, item])
  );

  const custom = readStoredArray(STORAGE_KEY).filter(
    (employee) => (
      employee?.id &&
      !deletedEmployeeIds.has(employee.id)
    )
  );

  const samples = sampleEmployees
    .filter(
      (employee) => !deletedEmployeeIds.has(employee.id)
    )
    .map((employee) => ({
      ...employee,
      ...overrides.get(employee.id)
    }));

  return [...samples, ...custom];
}

const employees = loadEmployees();

// Employees created before passwords existed (including the
// sample records) receive a generated password once, then keep it.
const revealedPasswordIds = new Set();

(function backfillEmployeePasswords() {
  let changed = false;

  employees.forEach((employee) => {
    if (!employee.password) {
      employee.password = generateTemporaryPassword();
      changed = true;
    }
  });

  if (changed) persistEmployeeState();
})();

const initialsAvatar = (employee) => (
  `<span class="person-avatar ${escapeHtml(employee.color)}">` +
  `${escapeHtml(employee.initials)}</span>`
);

const personCell = (employee) => (
  `<div class="person-cell">${initialsAvatar(employee)}` +
  `<span><strong>${escapeHtml(employee.name)}</strong>` +
  `<small>${escapeHtml(employee.id)}</small></span></div>`
);

const badge = (status) => (
  `<span class="status-pill ${
    status === 'Present'
      ? 'green-pill'
      : status === 'Late'
        ? 'orange-pill'
        : 'neutral-pill'
  }">${escapeHtml(status)}</span>`
);

function renderDashboard() {
  $('#dashboard-attendance').innerHTML = employees
    .slice(0, 5)
    .map((employee) => (
      `<tr>` +
      `<td>${personCell(employee)}</td>` +
      `<td>${escapeHtml(employee.department)}</td>` +
      `<td>${escapeHtml(employee.checkIn)}</td>` +
      `<td>${badge(employee.attendance)}</td>` +
      `</tr>`
    ))
    .join('');
}

function renderEmployees(
  search = $('#employee-search').value
) {
  const query = search.trim().toLowerCase();

  const visible = employees.filter((employee) => (
    `${employee.name} ${employee.id} ` +
    `${employee.department} ${employee.role} ` +
    `${employee.email} ${employee.employmentType} ` +
    `${employee.employmentStatus}`
  ).toLowerCase().includes(query));

  $('#employee-count').textContent =
    `${visible.length} employees`;

  const table = $('#employee-rows').closest('table');

  table.querySelector('thead tr').innerHTML = `
    ${
      bulkMode
        ? `
          <th>
            <input
              type="checkbox"
              id="select-visible-employees"
              aria-label="Select all visible employees"
            >
          </th>
        `
        : ''
    }
    <th>EMPLOYEE</th>
    <th>EMPLOYEE ID</th>
    <th>PASSWORD</th>
    <th>DEPARTMENT</th>
    <th>JOB TITLE</th>
    <th>EMPLOYMENT TYPE</th>
    <th>EMPLOYMENT STATUS</th>
    <th>STATUS</th>
    <th>ACTIONS</th>
  `;

  $('#employee-rows').innerHTML = visible.length
    ? visible.map((employee) => `
        <tr>
          ${
            bulkMode
              ? `
                <td>
                  <input
                    type="checkbox"
                    class="employee-select"
                    data-employee-id="${escapeHtml(employee.id)}"
                    aria-label="Select ${escapeHtml(employee.name)}"
                    ${
                      selectedEmployeeIds.has(employee.id)
                        ? 'checked'
                        : ''
                    }
                  >
                </td>
              `
              : ''
          }

          <td>${personCell(employee)}</td>
          <td>${escapeHtml(employee.id)}</td>

          <td>
            <div class="credential-cell">
              <code class="credential-value">${
                revealedPasswordIds.has(employee.id)
                  ? escapeHtml(employee.password)
                  : '••••••••••••'
              }</code>

              <button
                type="button"
                class="row-action"
                data-action="toggle-password"
                data-employee-id="${escapeHtml(employee.id)}"
                aria-label="${
                  revealedPasswordIds.has(employee.id)
                    ? 'Hide'
                    : 'Show'
                } password for ${escapeHtml(employee.name)}"
              >
                ${
                  revealedPasswordIds.has(employee.id)
                    ? 'Hide'
                    : 'Show'
                }
              </button>

              <button
                type="button"
                class="row-action"
                data-action="copy-password"
                data-employee-id="${escapeHtml(employee.id)}"
                aria-label="Copy password for ${escapeHtml(employee.name)}"
              >
                Copy
              </button>
            </div>
          </td>

          <td>${escapeHtml(employee.department)}</td>
          <td>${escapeHtml(employee.role)}</td>
          <td>${escapeHtml(employee.employmentType || '—')}</td>
          <td>${escapeHtml(employee.employmentStatus || '—')}</td>

          <td>
            <span class="employee-status ${employee.status.toLowerCase()}">
              ${escapeHtml(employee.status)}
            </span>
          </td>

          <td>
            <div class="employee-row-actions">
              <button
                class="row-action"
                data-action="edit"
                data-employee-id="${escapeHtml(employee.id)}"
              >
                Edit
              </button>

              <button
                class="row-action"
                data-action="toggle-status"
                data-employee-id="${escapeHtml(employee.id)}"
              >
                ${
                  employee.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'
                }
              </button>

              <button
                class="row-action danger"
                data-action="delete"
                data-employee-id="${escapeHtml(employee.id)}"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      `).join('')
    : `
        <tr>
          <td
            colspan="${bulkMode ? 10 : 9}"
            class="empty-state"
          >
            No employees match your search.
          </td>
        </tr>
      `;

  updateBulkControls(visible);
}

function renderAttendance() {
  const records = employees.filter(
    (employee) => employee.attendance !== '—'
  );

  $('#attendance-rows').innerHTML = records.map(
    (employee) => `
      <tr>
        <td>${personCell(employee)}</td>
        <td>
          ${
            new Date().toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          }
        </td>
        <td>${escapeHtml(employee.checkIn)}</td>
        <td>${escapeHtml(employee.checkOut)}</td>
        <td>${escapeHtml(employee.method)}</td>
        <td>${badge(employee.attendance)}</td>
      </tr>
    `
  ).join('');
}

function navigate(viewName) {
  $$('.view').forEach((view) => {
    view.classList.toggle(
      'active',
      view.id === `view-${viewName}`
    );
  });

  $$('.nav-item').forEach((item) => {
    item.classList.toggle(
      'active',
      item.dataset.view === viewName
    );
  });

 const title = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave management',
  'leave-calendar': 'Leave calendar',
  clock: 'Clock in / out',
   settings: 'Settings'
}[viewName];

  $('#breadcrumb-current').textContent = title;
}

function persistEmployeeState() {
  const custom = employees.filter(
    (employee) => !sampleEmployees.some(
      (sample) => sample.id === employee.id
    )
  );

  const overrides = employees.filter((employee) => (
    sampleEmployees.some(
      (sample) => sample.id === employee.id
    ) &&
    JSON.stringify(employee) !== JSON.stringify(
      sampleEmployees.find(
        (sample) => sample.id === employee.id
      )
    )
  ));

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(custom)
    );

    localStorage.setItem(
      DELETED_KEY,
      JSON.stringify([...deletedEmployeeIds])
    );

    localStorage.setItem(
      OVERRIDES_KEY,
      JSON.stringify(overrides)
    );

    return true;
  } catch (error) {
    console.error(
      'Could not save prototype employee changes.',
      error
    );

    return false;
  }
}

function persistMasterData() {
  try {
    localStorage.setItem(
      MASTER_DATA_KEY,
      JSON.stringify(masterData)
    );

    leaveMasterRaw = localStorage.getItem(
      MASTER_DATA_KEY
    );

    return true;
  } catch (error) {
    console.error(
      'Could not save prototype master data.',
      error
    );

    return false;
  }
}

function updateBulkControls(visibleEmployees = []) {
  const count = selectedEmployeeIds.size;

  $('#selection-count').textContent =
    `${count} selected`;

  $$('#bulk-actions button[data-bulk-action]').forEach(
    (button) => {
      button.disabled = count === 0;
    }
  );

  const selectVisible = $('#select-visible-employees');

  if (selectVisible) {
    selectVisible.checked =
      visibleEmployees.length > 0 &&
      visibleEmployees.every(
        (employee) => selectedEmployeeIds.has(employee.id)
      );

    selectVisible.indeterminate =
      visibleEmployees.some(
        (employee) => selectedEmployeeIds.has(employee.id)
      ) &&
      !selectVisible.checked;
  }
}

function setBulkMode(enabled) {
  bulkMode = enabled;

  if (!enabled) {
    selectedEmployeeIds.clear();
  }

  $('#toggle-bulk-mode').textContent =
    enabled ? 'Done selecting' : 'Select employees';

  $('#bulk-actions').hidden = !enabled;

  renderEmployees();
}

function refreshEmployeeViews() {
  renderEmployees();
  renderDashboard();
  renderAttendance();
}

function toggleEmployeeStatus(id) {
  const employee = employees.find(
    (item) => item.id === id
  );

  if (!employee) return;

  const oldStatus = employee.status;

  employee.status =
    oldStatus === 'Active' ? 'Inactive' : 'Active';

  if (!persistEmployeeState()) {
    employee.status = oldStatus;

    window.alert(
      'Could not save this change in this browser. ' +
      'Please try again.'
    );

    return;
  }

  refreshEmployeeViews();
}

function deleteEmployees(ids) {
  if (!ids.length) return;

  const names = ids
    .map(
      (id) => employees.find(
        (employee) => employee.id === id
      )?.name
    )
    .filter(Boolean);

  const confirmation = ids.length === 1
    ? `Delete ${names[0]} from this prototype?`
    : `Delete these ${ids.length} employees from this prototype?`;

  if (
    !window.confirm(
      `${confirmation} This cannot be undone here.`
    )
  ) {
    return;
  }

  const originalEmployees = [...employees];
  const originalDeleted = new Set(deletedEmployeeIds);

  ids.forEach((id) => {
    const index = employees.findIndex(
      (employee) => employee.id === id
    );

    if (index >= 0) {
      employees.splice(index, 1);
    }

    deletedEmployeeIds.add(id);
    selectedEmployeeIds.delete(id);
  });

  if (!persistEmployeeState()) {
    employees.splice(
      0,
      employees.length,
      ...originalEmployees
    );

    deletedEmployeeIds.clear();

    originalDeleted.forEach(
      (id) => deletedEmployeeIds.add(id)
    );

    window.alert(
      'Could not save this deletion in this browser. ' +
      'Please try again.'
    );
  }

  refreshEmployeeViews();
}

function setSelectedStatus(status) {
  if (!selectedEmployeeIds.size) return;

  const previous = employees.map(
    (employee) => [employee, employee.status]
  );

  employees.forEach((employee) => {
    if (selectedEmployeeIds.has(employee.id)) {
      employee.status = status;
    }
  });

  if (!persistEmployeeState()) {
    previous.forEach(([employee, oldStatus]) => {
      employee.status = oldStatus;
    });

    window.alert(
      'Could not save these changes in this browser. ' +
      'Please try again.'
    );
  }

  selectedEmployeeIds.clear();
  setBulkMode(false);
  refreshEmployeeViews();
}

function installStyles() {
  const style = document.createElement('style');

  style.textContent = `
    #view-employees th {
      font-size:11px;
      padding-top:13px;
      padding-bottom:13px;
    }

    #view-employees td {
      font-size:13px;
      padding-top:15px;
      padding-bottom:15px;
    }

    #view-employees .person-cell strong {
      font-size:13px;
    }

    #view-employees .person-cell small {
      font-size:11px;
    }

    #view-employees .person-avatar {
      width:34px;
      height:34px;
      font-size:10px;
    }

    #view-employees .employee-status {
      font-size:11px;
      padding:5px 8px;
    }

    #view-employees .search-box input,
    #view-employees .record-count {
      font-size:12px;
    }

    #view-employees input[type=checkbox] {
      width:16px;
      height:16px;
      accent-color:#6857e8;
      cursor:pointer;
    }

    .employee-actions {
      display:flex;
      align-items:center;
      gap:9px;
    }

    .employee-row-actions {
      display:flex;
      gap:7px;
      align-items:center;
    }

    .row-action {
      border:1px solid #e8e9f0;
      border-radius:6px;
      background:#fff;
      color:#5f53cd;
      padding:6px 8px;
      font:600 10px 'DM Sans';
      cursor:pointer;
      white-space:nowrap;
    }

    .row-action:hover {
      background:#f6f5ff;
    }

    .row-action.danger {
      color:#b74e4e;
    }

    .row-action.danger:hover {
      background:#fff2f1;
    }

    .bulk-actions {
      display:flex;
      align-items:center;
      flex-wrap:wrap;
      gap:8px;
      padding:11px 18px;
      background:#faf9ff;
      border-bottom:1px solid #efedff;
    }

    .bulk-actions[hidden] {
      display:none;
    }

    .bulk-actions .selection-count {
      color:#686b7b;
      font-size:11px;
      margin-right:auto;
    }

    .bulk-actions button {
      min-height:30px;
      border:1px solid #e6e3ff;
      border-radius:6px;
      background:#fff;
      padding:0 9px;
      color:#5d50c9;
      font:600 10px 'DM Sans';
      cursor:pointer;
    }

    .bulk-actions button:disabled {
      opacity:.45;
      cursor:not-allowed;
    }

    .bulk-actions button.bulk-delete {
      color:#b74e4e;
      border-color:#f1dddd;
    }

    .employee-dialog,
    .master-dialog {
      width:min(600px,calc(100vw - 32px));
      max-height:min(90vh,800px);
      overflow:auto;
      padding:0;
      border:1px solid #eceef3;
      border-radius:14px;
      color:#1f2332;
      box-shadow:0 24px 80px #1f233244;
    }

    .employee-dialog::backdrop,
    .master-dialog::backdrop {
      background:#17192a80;
      backdrop-filter:blur(2px);
    }

    .employee-dialog form,
    .master-dialog form {
      padding:24px;
    }

    .employee-dialog-header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      margin-bottom:20px;
    }

    .employee-dialog-header h2 {
      font:700 20px Manrope,sans-serif;
      margin:0;
    }

    .employee-dialog-header p {
      color:#85899a;
      font-size:12px;
      margin:6px 0 0;
    }

    .dialog-close {
      border:0;
      background:#f6f7fb;
      border-radius:7px;
      color:#686c7b;
      font-size:20px;
      width:32px;
      height:32px;
      cursor:pointer;
    }

    .employee-form-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
    }

    .employee-form-field {
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .employee-form-field.full {
      grid-column:1/-1;
    }

    .employee-form-field label {
      color:#55596a;
      font-size:12px;
      font-weight:600;
    }

    .employee-form-field input,
    .employee-form-field select {
      width:100%;
      min-height:40px;
      border:1px solid #e4e6ed;
      border-radius:7px;
      background:#fff;
      padding:0 10px;
      color:#343848;
      font:13px 'DM Sans',sans-serif;
    }

    .employee-form-field input:focus,
    .employee-form-field select:focus {
      outline:2px solid #c9c3ff;
      border-color:#8072ec;
    }

    .employee-form-field .required {
      color:#d75c5c;
    }

    .employee-form-section {
      grid-column:1/-1;
      border-top:1px solid #eff0f5;
      padding-top:14px;
      margin-top:3px;
    }

    .employee-form-section h3 {
      font:700 13px Manrope,sans-serif;
      margin:0 0 12px;
    }

    .employee-form-help {
      color:#9295a3;
      font-size:11px;
      line-height:1.5;
      margin:16px 0 0;
    }

    .employee-form-error {
      color:#b83f3f;
      background:#fff0ef;
      border-radius:6px;
      font-size:12px;
      padding:9px 10px;
      margin:12px 0 0;
    }

    .employee-form-error[hidden] {
      display:none;
    }

    .employee-dialog-actions {
      display:flex;
      justify-content:flex-end;
      gap:9px;
      border-top:1px solid #eff0f5;
      padding-top:17px;
      margin-top:20px;
    }

    .employee-dialog-actions .button-secondary {
      min-height:37px;
    }

    .settings-button {
      font-size:15px;
    }

    .settings-layout {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
    }

    .master-card {
      padding:18px;
    }

    .master-card h2 {
      font:700 15px Manrope,sans-serif;
      margin:0;
    }

    .master-card>p {
      font-size:11px;
      color:#9093a2;
      margin:6px 0 15px;
    }

    .master-add-form {
      display:flex;
      gap:8px;
      margin-bottom:13px;
    }

    .master-add-form input {
      min-width:0;
      flex:1;
      height:36px;
      border:1px solid #e4e6ed;
      border-radius:7px;
      padding:0 10px;
      font:12px 'DM Sans';
    }

    .master-list {
      list-style:none;
      margin:0;
      padding:0;
    }

    .master-list li {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:10px 0;
      border-top:1px solid #f0f1f5;
      font-size:12px;
    }

    .master-list button {
      border:1px solid #f1dddd;
      border-radius:6px;
      color:#b74e4e;
      background:white;
      padding:5px 8px;
      font:600 10px 'DM Sans';
      cursor:pointer;
    }

    .master-list button:disabled {
      opacity:.4;
      cursor:not-allowed;
    }

    .master-note {
      color:#9295a3;
      font-size:10px;
      line-height:1.5;
      margin-top:16px;
    }

    .settings-feedback {
      color:#248963;
      font-size:11px;
      min-height:16px;
      margin-top:12px;
    }

    @media(max-width:900px) {
      .settings-layout {
        grid-template-columns:1fr;
      }
    }

    @media(max-width:700px) {
      .employee-row-actions {
        align-items:flex-start;
        flex-direction:column;
      }

      .employee-actions {
        align-items:flex-end;
        flex-direction:column-reverse;
      }
    }

    @media(max-width:520px) {
      .employee-dialog form,
      .master-dialog form {
        padding:19px;
      }

      .employee-form-grid {
        grid-template-columns:1fr;
      }

      .employee-form-field.full,
      .employee-form-section {
        grid-column:auto;
      }
    }
  `;

  document.head.append(style);
}

function optionMarkup(options, selected, placeholder) {
  const choices = [
    ...new Set([
      ...options,
      ...(
        selected && !options.includes(selected)
          ? [selected]
          : []
      )
    ])
  ];

  return (
    `<option value="">${escapeHtml(placeholder)}</option>` +
    choices.map((item) => (
      `<option value="${escapeHtml(item)}" ` +
      `${item === selected ? 'selected' : ''}>` +
      `${escapeHtml(item)}</option>`
    )).join('')
  );
}

function buildEmployeeDialog() {
  const dialog = document.createElement('dialog');

  dialog.className = 'employee-dialog';

  dialog.setAttribute(
    'aria-labelledby',
    'employee-dialog-title'
  );

  dialog.innerHTML = `
    <form id="employee-form">
      <div class="employee-dialog-header">
        <div>
          <h2 id="employee-dialog-title">Add employee</h2>
          <p id="employee-dialog-description">
            Create a profile in the employee directory.
          </p>
        </div>

        <button
          class="dialog-close"
          type="button"
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>

      <div class="employee-form-grid">
        <div class="employee-form-field">
          <label for="employee-first-name">
            First name <span class="required">*</span>
          </label>
          <input
            id="employee-first-name"
            name="firstName"
            autocomplete="given-name"
            required
            maxlength="60"
          >
        </div>

        <div class="employee-form-field">
          <label for="employee-last-name">
            Last name <span class="required">*</span>
          </label>
          <input
            id="employee-last-name"
            name="lastName"
            autocomplete="family-name"
            required
            maxlength="60"
          >
        </div>

        <div class="employee-form-field full">
          <label for="employee-email">
            Work email <span class="required">*</span>
          </label>
          <input
            id="employee-email"
            name="email"
            type="email"
            autocomplete="email"
            required
            maxlength="120"
          >
        </div>

        <div class="employee-form-field">
          <label for="employee-department">
            Department <span class="required">*</span>
          </label>
          <select
            id="employee-department"
            name="department"
            required
          ></select>
        </div>

        <div class="employee-form-field">
          <label for="employee-role">
            Job title <span class="required">*</span>
          </label>
          <input
            id="employee-role"
            name="role"
            required
            maxlength="80"
            placeholder="e.g. Analyst"
          >
        </div>

        <div class="employee-form-field">
          <label for="employee-type">
            Employment type <span class="required">*</span>
          </label>
          <select
            id="employee-type"
            name="employmentType"
            required
          ></select>
        </div>

        <div class="employee-form-field">
          <label for="employee-status">
            Employment status
          </label>
          <select
            id="employee-status"
            name="employmentStatus"
          ></select>
        </div>

        <div class="employee-form-field">
          <label for="employee-phone">
            Work phone (optional)
          </label>
          <input
            id="employee-phone"
            name="phone"
            type="tel"
            autocomplete="tel"
            maxlength="30"
          >
        </div>

        <div class="employee-form-field">
          <label for="employee-start-date">
            Start date <span class="required">*</span>
          </label>
          <input
            id="employee-start-date"
            name="startDate"
            type="date"
            required
          >
        </div>

        <div class="employee-form-field full">
          <label for="employee-record-status">
            Record status
          </label>
          <select
            id="employee-record-status"
            name="status"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div class="employee-form-section">
          <h3>Clock-in sign-in</h3>
        </div>

        <div class="employee-form-field full">
          <label for="employee-id-display">Employee ID</label>
          <input
            id="employee-id-display"
            readonly
            tabindex="-1"
          >
        </div>

        <div class="employee-form-field full">
          <label for="employee-password">Password</label>

          <div class="password-input-row">
            <input
              id="employee-password"
              name="password"
              type="text"
              autocomplete="off"
              spellcheck="false"
              maxlength="72"
            >

            <button
              class="button button-secondary"
              id="generate-password"
              type="button"
            >
              Generate
            </button>
          </div>

          <small id="employee-password-hint"></small>
        </div>

        <div class="employee-form-section">
          <h3>Emergency contact</h3>
        </div>

        <div class="employee-form-field">
          <label for="emergency-name">Contact name</label>
          <input
            id="emergency-name"
            name="emergencyContactName"
            autocomplete="off"
            maxlength="100"
          >
        </div>

        <div class="employee-form-field">
          <label for="emergency-relationship">
            Relationship
          </label>
          <input
            id="emergency-relationship"
            name="emergencyContactRelationship"
            maxlength="60"
            placeholder="e.g. Parent"
          >
        </div>

        <div class="employee-form-field full">
          <label for="emergency-phone">Contact phone</label>
          <input
            id="emergency-phone"
            name="emergencyContactPhone"
            type="tel"
            autocomplete="off"
            maxlength="30"
          >
        </div>
      </div>

      <p class="employee-form-help">
        Prototype storage: data is saved only in this
        browser on this device. Do not enter real or
        sensitive employee information.
      </p>

      <p
        class="employee-form-error"
        id="employee-form-error"
        role="alert"
        hidden
      ></p>

      <div class="employee-dialog-actions">
        <button
          class="button button-secondary"
          type="button"
          data-cancel
        >
          Cancel
        </button>

        <button
          class="button button-primary"
          id="employee-save-button"
          type="submit"
        >
          Save employee
        </button>
      </div>
    </form>
  `;

  document.body.append(dialog);

  return dialog;
}

function nextEmployeeId() {
  const highest = employees.reduce((max, employee) => {
    const match = /^EMP-(\d+)$/.exec(employee.id);

    return match
      ? Math.max(max, Number(match[1]))
      : max;
  }, 0);

  return `EMP-${String(highest + 1).padStart(4, '0')}`;
}

function generateTemporaryPassword() {
  const characters =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!';

  const values = new Uint32Array(16);
  crypto.getRandomValues(values);

  return Array.from(values, value =>
    characters[value % characters.length]
  ).join('');
}

function setupEmployeeDialog() {
  const dialog = buildEmployeeDialog();
  const form = $('#employee-form');

  const setField = (name, value) => {
    form.elements.namedItem(name).value = value ?? '';
  };

  function updateOptions(employee = null) {
    $('#employee-department').innerHTML = optionMarkup(
      masterData.departments,
      employee?.department,
      'Select department'
    );

    $('#employee-type').innerHTML = optionMarkup(
      masterData.employmentTypes,
      employee?.employmentType,
      'Select employment type'
    );

    $('#employee-status').innerHTML = optionMarkup(
      EMPLOYMENT_STATUSES,
      employee?.employmentStatus || 'Probation',
      'Select employment status'
    );
  }

  const openDialog = (employee = null) => {
    editingEmployeeId = employee?.id ?? null;

    form.reset();
    $('#employee-form-error').hidden = true;

    $('#employee-dialog-title').textContent =
      employee ? 'Edit employee' : 'Add employee';

    $('#employee-dialog-description').textContent =
      employee
        ? `Update the profile for ${employee.name}.`
        : 'Create a profile in the employee directory.';

    $('#employee-save-button').textContent =
      employee ? 'Save changes' : 'Save employee';

    updateOptions(employee);

    setField(
      'firstName',
      employee?.name.split(' ')[0] ?? ''
    );

    setField(
      'lastName',
      employee
        ? employee.name.split(' ').slice(1).join(' ')
        : ''
    );

    setField('email', employee?.email ?? '');
    setField('department', employee?.department ?? '');
    setField('role', employee?.role ?? '');

    setField(
      'employmentType',
      employee?.employmentType ?? ''
    );

    setField(
      'employmentStatus',
      employee?.employmentStatus || 'Probation'
    );

    setField('phone', employee?.phone ?? '');

    setField(
      'startDate',
      employee?.startDate ??
      new Date().toISOString().slice(0, 10)
    );

    setField('status', employee?.status ?? 'Active');

    setField(
      'emergencyContactName',
      employee?.emergencyContactName ?? ''
    );

    setField(
      'emergencyContactPhone',
      employee?.emergencyContactPhone ?? ''
    );

    setField(
      'emergencyContactRelationship',
      employee?.emergencyContactRelationship ?? ''
    );

    // Sign-in details: a new employee gets a temporary password
    // that can be edited; when editing, a blank field keeps the
    // current password.
    $('#employee-id-display').value =
      employee?.id ?? nextEmployeeId();

    if (employee) {
      $('#employee-password').value = '';

      $('#employee-password').placeholder =
        'Leave blank to keep the current password';

      $('#employee-password-hint').textContent =
        'Type a new password (12–72 characters) to change it, ' +
        'or press Generate for a random one.';
    } else {
      $('#employee-password').value =
        generateTemporaryPassword();

      $('#employee-password').placeholder = '';

      $('#employee-password-hint').textContent =
        'A temporary password was generated automatically. ' +
        'You can change it now or later by editing the employee.';
    }

    dialog.showModal();
    $('#employee-first-name').focus();
  };

  $('#generate-password').addEventListener('click', () => {
    $('#employee-password').value = generateTemporaryPassword();
  });

  $('#add-employee').addEventListener(
    'click',
    () => openDialog()
  );

  dialog.querySelector('.dialog-close').addEventListener(
    'click',
    () => dialog.close()
  );

  dialog.querySelector('[data-cancel]').addEventListener(
    'click',
    () => dialog.close()
  );

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const values = new FormData(form);

    const firstName = String(
      values.get('firstName')
    ).trim();

    const lastName = String(
      values.get('lastName')
    ).trim();

    const email = String(
      values.get('email')
    ).trim();

    const target = editingEmployeeId
      ? employees.find(
          (employee) => employee.id === editingEmployeeId
        )
      : null;

    const error = $('#employee-form-error');

    if (
      employees.some((employee) => (
        employee.id !== editingEmployeeId &&
        employee.email.toLowerCase() === email.toLowerCase()
      ))
    ) {
      error.textContent =
        'An employee with this email address already exists.';

      error.hidden = false;
      $('#employee-email').focus();

      return;
    }

    // Password: blank keeps the current one (or generates one for a
    // new employee). Matches the backend rule: 12+ characters, at most
    // 72 UTF-8 bytes.
    const typedPassword = String(values.get('password') ?? '');

    if (
      typedPassword &&
      (
        typedPassword.length < 12 ||
        new TextEncoder().encode(typedPassword).length > 72
      )
    ) {
      error.textContent =
        'Password must be at least 12 characters and at most ' +
        '72 bytes. Press Generate for a random one.';

      error.hidden = false;
      $('#employee-password').focus();

      return;
    }

    const updated = {
      ...(target ?? {}),

      name: `${firstName} ${lastName}`,

      initials: (
        firstName.charAt(0) + lastName.charAt(0)
      ).toUpperCase(),

      id: target?.id ?? nextEmployeeId(),

      // Temporary password is generated when the employee is created;
      // it only changes when a new one is typed or generated.
      password:
        typedPassword ||
        target?.password ||
        generateTemporaryPassword(),

      department: String(values.get('department')),

      role: String(values.get('role')).trim(),

      email,

      employmentType: String(
        values.get('employmentType')
      ),

      employmentStatus: String(
        values.get('employmentStatus')
      ),

      phone: String(values.get('phone')).trim(),

      startDate: String(values.get('startDate')),

      status: String(values.get('status')),

      emergencyContactName: String(
        values.get('emergencyContactName')
      ).trim(),

      emergencyContactPhone: String(
        values.get('emergencyContactPhone')
      ).trim(),

      emergencyContactRelationship: String(
        values.get('emergencyContactRelationship')
      ).trim(),

      checkIn: target?.checkIn ?? '—',
      checkOut: target?.checkOut ?? '—',
      method: target?.method ?? '—',
      attendance: target?.attendance ?? '—',
      color: target?.color ?? 'blue-tint'
    };

    const before = target ? { ...target } : null;

    if (target) {
      Object.assign(target, updated);
    } else {
      employees.push(updated);
    }

    if (!persistEmployeeState()) {
      if (target) {
        Object.assign(target, before);
      } else {
        employees.pop();
      }

      error.textContent =
        'Could not save this record in this browser. ' +
        'Check available storage and try again.';

      error.hidden = false;

      return;
    }

    refreshEmployeeViews();
    dialog.close();
  });

  return { openDialog };
}

function setupEmployeeActions(employeeDialog) {
  const heading = $('#view-employees .page-heading');
  const addButton = $('#add-employee');

  const actions = document.createElement('div');
  actions.className = 'employee-actions';

  addButton.parentNode.insertBefore(actions, addButton);
  actions.append(addButton);

  const selectButton = document.createElement('button');
  selectButton.id = 'toggle-bulk-mode';
  selectButton.className = 'button button-secondary';
  selectButton.type = 'button';
  selectButton.textContent = 'Select employees';

  actions.insertBefore(selectButton, addButton);

  const bulkToolbar = document.createElement('div');
  bulkToolbar.id = 'bulk-actions';
  bulkToolbar.className = 'bulk-actions';
  bulkToolbar.hidden = true;

  bulkToolbar.innerHTML = `
    <span class="selection-count" id="selection-count">
      0 selected
    </span>

    <button type="button" data-bulk-action="activate">
      Activate selected
    </button>

    <button type="button" data-bulk-action="deactivate">
      Deactivate selected
    </button>

    <button
      type="button"
      class="bulk-delete"
      data-bulk-action="delete"
    >
      Delete selected
    </button>
  `;

  heading.insertAdjacentElement('afterend', bulkToolbar);

  selectButton.addEventListener(
    'click',
    () => setBulkMode(!bulkMode)
  );

  bulkToolbar.addEventListener('click', (event) => {
    const button = event.target.closest(
      '[data-bulk-action]'
    );

    if (!button) return;

    if (
      button.dataset.bulkAction === 'activate' ||
      button.dataset.bulkAction === 'deactivate'
    ) {
      setSelectedStatus(
        button.dataset.bulkAction === 'activate'
          ? 'Active'
          : 'Inactive'
      );
    }

    if (button.dataset.bulkAction === 'delete') {
      deleteEmployees([...selectedEmployeeIds]);
    }
  });

  $('#employee-rows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');

    if (!button) return;

    const employee = employees.find(
      (item) => item.id === button.dataset.employeeId
    );

    if (
      button.dataset.action === 'edit' &&
      employee
    ) {
      employeeDialog.openDialog(employee);
    }

    if (button.dataset.action === 'toggle-status') {
      toggleEmployeeStatus(button.dataset.employeeId);
    }

    if (button.dataset.action === 'delete') {
      deleteEmployees([button.dataset.employeeId]);
    }

    if (
      button.dataset.action === 'toggle-password' &&
      employee
    ) {
      if (revealedPasswordIds.has(employee.id)) {
        revealedPasswordIds.delete(employee.id);
      } else {
        revealedPasswordIds.add(employee.id);
      }

      renderEmployees();
    }

    if (
      button.dataset.action === 'copy-password' &&
      employee?.password
    ) {
      const original = button.textContent;

      navigator.clipboard
        .writeText(employee.password)
        .then(() => { button.textContent = 'Copied'; })
        .catch(() => { button.textContent = 'Failed'; })
        .finally(() => {
          setTimeout(() => {
            button.textContent = original;
          }, 1500);
        });
    }
  });

  $('#employee-rows').addEventListener('change', (event) => {
    const checkbox = event.target;

    if (checkbox.id === 'select-visible-employees') {
      const query = $('#employee-search')
        .value.trim().toLowerCase();

      employees.filter((employee) => (
        `${employee.name} ${employee.id} ` +
        `${employee.department} ${employee.role} ` +
        `${employee.email} ${employee.employmentType} ` +
        `${employee.employmentStatus}`
      ).toLowerCase().includes(query)).forEach((employee) => {
        if (checkbox.checked) {
          selectedEmployeeIds.add(employee.id);
        } else {
          selectedEmployeeIds.delete(employee.id);
        }
      });
    } else if (checkbox.matches('.employee-select')) {
      if (checkbox.checked) {
        selectedEmployeeIds.add(
          checkbox.dataset.employeeId
        );
      } else {
        selectedEmployeeIds.delete(
          checkbox.dataset.employeeId
        );
      }
    }

    renderEmployees();
  });
}

function buildSettingsView() {
  const view = document.createElement('section');

  view.className = 'view';
  view.id = 'view-settings';

  view.innerHTML = `
    <div class="page-heading">
      <div>
        <p class="eyebrow">CONFIGURATION</p>
        <h1>Settings</h1>
        <p class="subtitle">
          Manage the master lists used by employee records.
        </p>
      </div>
    </div>

    <div class="settings-layout">
      <section class="panel master-card">
        <h2>Departments</h2>
        <p>Department options available in employee profiles.</p>

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
            Add
          </button>
        </form>

        <ul class="master-list" id="department-list"></ul>
      </section>

      <section class="panel master-card">
        <h2>Employment types</h2>
        <p>Employment type options available in employee profiles.</p>

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
            Add
          </button>
        </form>

        <ul
          class="master-list"
          id="employment-type-list"
        ></ul>
      </section>
    </div>

    <section class="panel master-card eleave-master-card">
      <h2>eLeave types</h2>

      <p>
        Categories used by leave applications, balance cards, filters
        and the calendar. WFH is a work arrangement and does not deduct
        Annual, Medical or Emergency leave.
      </p>

      <form class="eleave-add-form" id="eleave-add-form">
        <label>
          Type name
          <input
            name="name"
            maxlength="80"
            required
            placeholder="e.g. Compassionate leave"
          >
        </label>

        <label>
          Balance mode
          <select name="mode">
            <option value="capped">Annual allowance</option>
            <option value="uncapped">No fixed day limit</option>
          </select>
        </label>

        <label>
          Default days / year
          <input
            name="days"
            type="number"
            min="0"
            max="366"
            step="0.5"
            value="0"
            required
          >
        </label>

        <button type="submit" class="button button-primary">
          Add eLeave type
        </button>
      </form>

      <div id="eleave-type-list"></div>

      <p class="eleave-master-note">
        Defaults apply when an employee/year has no individual override.
        Deactivate categories instead of deleting them so existing
        records remain readable. Existing pending applications can still
        be reviewed. Balance mode is fixed after creation. All changes
        remain local to this browser.
      </p>
    </section>

    <p class="master-note">
      Master data is stored in this browser only in the
      prototype. An option currently assigned to an
      employee cannot be deleted. Employment status and
      employee record activation are managed separately.
    </p>

    <div
      class="settings-feedback"
      id="settings-feedback"
      aria-live="polite"
    ></div>
  `;

  $('#view-clock').insertAdjacentElement('afterend', view);

  return view;
}

function renderLeaveTypeMasterData() {
  const container = $('#eleave-type-list');

  if (!container) return;

  container.innerHTML = masterData.leaveTypes.map((type) => `
    <form
      class="eleave-type-row"
      data-eleave-edit="${escapeHtml(type.id)}"
    >
      <label>
        Name
        <input
          name="name"
          value="${escapeHtml(type.name)}"
          maxlength="80"
          required
        >
      </label>

      <label>
        Default days / year
        <input
          name="days"
          type="number"
          min="0"
          max="366"
          step="0.5"
          value="${escapeHtml(type.defaultDays)}"
          ${type.tracksBalance ? 'required' : 'disabled'}
        >
      </label>

      <label class="eleave-active">
        <input
          name="active"
          type="checkbox"
          ${type.active ? 'checked' : ''}
        >
        Active
      </label>

      <span class="eleave-mode">
        ${
          type.tracksBalance
            ? 'Annual allowance'
            : 'No fixed day limit · no leave deduction'
        }
      </span>

      <button type="submit" class="button button-secondary">
        Save type
      </button>
    </form>
  `).join('');
}

function saveLeaveTypeMasterData(nextTypes) {
  const R = window.LeaveRules;

  if (!R) {
    throw new Error(
      'Leave rules could not load. Fix leave-rules.js before editing eLeave types.'
    );
  }

  if (
    localStorage.getItem(MASTER_DATA_KEY) !== leaveMasterRaw
  ) {
    throw new Error(
      'Master data changed in another tab. Reopen Settings and review the latest values.'
    );
  }

  const before = masterData.leaveTypes;

  try {
    R.configureTypes(nextTypes);

    const raw = localStorage.getItem(
      'peopledesk-leave-v1'
    );

    const leave = raw === null
      ? R.emptyState()
      : R.validateState(JSON.parse(raw));

    const seen = new Set();

    for (const request of leave.requests) {
      if (
        !['Pending', 'Approved'].includes(request.status) ||
        !R.tracksBalance(request.type)
      ) {
        continue;
      }

      for (
        const year of Object.keys(
          R.requestAllocations(request)
        )
      ) {
        const key = JSON.stringify([
          request.employeeId,
          year,
          request.type
        ]);

        if (seen.has(key)) continue;

        seen.add(key);

        if (
          R.balance(
            leave,
            request.employeeId,
            year,
            request.type
          ).available < 0
        ) {
          throw new Error(
            'This default would be lower than approved plus pending days. Increase the allowance or review individual policy overrides first.'
          );
        }
      }
    }

    masterData.leaveTypes = nextTypes;

    if (!persistMasterData()) {
      throw new Error(
        'Could not save eLeave types in this browser. No type changes were applied.'
      );
    }
  } catch (error) {
    masterData.leaveTypes = before;
    R.configureTypes(before);

    throw error;
  }

  window.dispatchEvent(
    new CustomEvent('peopledesk-eleave-types-changed')
  );

  renderLeaveTypeMasterData();
}

function renderMasterData() {
  renderLeaveTypeMasterData();

  const renderList = (key, target, label) => {
    $(target).innerHTML = masterData[key].map((value) => {
      const inUse = employees.some(
        (employee) => (
          employee[
            key === 'departments'
              ? 'department'
              : 'employmentType'
          ] === value
        )
      );

      return `
        <li>
          <span>${escapeHtml(value)}</span>

          <button
            type="button"
            data-master-delete="${key}"
            data-master-value="${escapeHtml(value)}"
            ${
              inUse
                ? 'disabled title="This option is used by an employee"'
                : ''
            }
          >
            Remove
          </button>
        </li>
      `;
    }).join('') || `
      <li class="empty-state">No options yet.</li>
    `;

    $(target).setAttribute('aria-label', label);
  };

  renderList(
    'departments',
    '#department-list',
    'Department master data'
  );

  renderList(
    'employmentTypes',
    '#employment-type-list',
    'Employment type master data'
  );
}

function setupSettings() {
  const view = buildSettingsView();

  const settingsButton = document.createElement('button');

  settingsButton.className = 'icon-button settings-button';
  settingsButton.type = 'button';

  settingsButton.setAttribute(
    'aria-label',
    'Settings and master data'
  );

  settingsButton.title = 'Settings';
  settingsButton.textContent = '⚙';

  settingsButton.addEventListener('click', () => {
    renderMasterData();
    navigate('settings');
  });

  $('.top-actions').insertBefore(
    settingsButton,
    $('.top-actions').firstChild
  );

  const addTypeForm = $('#eleave-add-form');

  const updateBalanceMode = () => {
    const uncapped =
      addTypeForm.elements.mode.value === 'uncapped';

    addTypeForm.elements.days.disabled = uncapped;

    if (uncapped) {
      addTypeForm.elements.days.value = '0';
    }
  };

  addTypeForm.elements.mode.addEventListener(
    'change',
    updateBalanceMode
  );

  view.addEventListener('submit', (event) => {
    const form = event.target;

    if (
      form.id !== 'eleave-add-form' &&
      !form.matches('[data-eleave-edit]')
    ) {
      return;
    }

    event.preventDefault();

    try {
      const f = new FormData(form);

      const next = masterData.leaveTypes.map(
        (type) => ({ ...type })
      );

      if (form.id === 'eleave-add-form') {
        const tracksBalance =
          f.get('mode') === 'capped';

        next.push({
          id: (
            'custom-' +
            crypto.randomUUID()
              .replace(/-/g, '')
              .slice(0, 24)
          ),

          name: String(f.get('name')).trim(),

          defaultDays: tracksBalance
            ? Number(f.get('days'))
            : 0,

          tracksBalance,
          active: true
        });
      } else {
        const type = next.find(
          (item) => item.id === form.dataset.eleaveEdit
        );

        if (!type) {
          throw new Error(
            'Type no longer exists. Reopen Settings.'
          );
        }

        type.name = String(f.get('name')).trim();

        type.defaultDays = type.tracksBalance
          ? Number(f.get('days'))
          : 0;

        type.active = f.get('active') === 'on';
      }

      saveLeaveTypeMasterData(next);

      if (form.id === 'eleave-add-form') {
        form.reset();
        updateBalanceMode();
      }

      $('#settings-feedback').textContent =
        'eLeave types saved. Application choices, balances, list and calendar are updated.';
    } catch (error) {
      $('#settings-feedback').textContent = error.message;
    }
  });

  view.addEventListener('submit', (event) => {
    const form = event.target.closest(
      '[data-master-form]'
    );

    if (!form) return;

    event.preventDefault();

    const key = form.dataset.masterForm;

    const value = String(
      new FormData(form).get('value')
    ).trim();

    const feedback = $('#settings-feedback');

    if (
      masterData[key].some(
        (item) => (
          item.toLowerCase() === value.toLowerCase()
        )
      )
    ) {
      feedback.textContent =
        `“${value}” already exists in this list.`;

      return;
    }

    masterData[key].push(value);

    if (!persistMasterData()) {
      masterData[key].pop();

      feedback.textContent =
        'Could not save master data in this browser.';

      return;
    }

    form.reset();
    feedback.textContent = `${value} added.`;

    renderMasterData();
  });

  view.addEventListener('click', (event) => {
    const button = event.target.closest(
      '[data-master-delete]'
    );

    if (!button) return;

    const key = button.dataset.masterDelete;
    const value = button.dataset.masterValue;

    const usedByEmployee = employees.some(
      (employee) => (
        employee[
          key === 'departments'
            ? 'department'
            : 'employmentType'
        ] === value
      )
    );

    if (usedByEmployee) {
      $('#settings-feedback').textContent =
        'This option is assigned to an employee ' +
        'and cannot be removed.';

      return;
    }

    const index = masterData[key].indexOf(value);

    if (index < 0) return;

    masterData[key].splice(index, 1);

    if (!persistMasterData()) {
      masterData[key].splice(index, 0, value);

      $('#settings-feedback').textContent =
        'Could not save master data in this browser.';
    } else {
      $('#settings-feedback').textContent =
        `${value} removed.`;
    }

    renderMasterData();
  });

  renderMasterData();
}

$$('.nav-item').forEach((item) => {
  item.addEventListener(
    'click',
    () => navigate(item.dataset.view)
  );
});

$$('[data-go]').forEach((button) => {
  button.addEventListener(
    'click',
    () => navigate(button.dataset.go)
  );
});

$('#employee-search').addEventListener(
  'input',
  (event) => renderEmployees(event.target.value)
);

$('#today-label').textContent =
  new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

$('#attendance-date').value =
  new Date().toISOString().slice(0, 10);

$$('.filter-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('.filter-chip').forEach(
      (item) => item.classList.remove('selected')
    );

    chip.classList.add('selected');

    const filter = chip.textContent.trim();

    const rows = employees.filter((employee) => (
      employee.attendance !== '—' &&
      (
        filter === 'All records' ||
        employee.attendance === filter
      )
    ));

    $('#attendance-rows').innerHTML = rows.length
      ? rows.map((employee) => `
          <tr>
            <td>${personCell(employee)}</td>

            <td>
              ${
                new Date().toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              }
            </td>

            <td>${escapeHtml(employee.checkIn)}</td>
            <td>${escapeHtml(employee.checkOut)}</td>
            <td>${escapeHtml(employee.method)}</td>
            <td>${badge(employee.attendance)}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="6" class="empty-state">
              No records in this category.
            </td>
          </tr>
        `;
  });
});

$('#demo-clock').addEventListener('click', () => {
  const name = $('#demo-employee').value;

  $('#clock-feedback').textContent =
    `Demo only: ${name} clock-in preview recorded ` +
    `locally at ${
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }. This is not saved.`;
});

$('#manual-punch').addEventListener('click', () => {
  $('#clock-feedback').textContent =
    'Demo only: a manual punch request would be ' +
    'sent to a manager for review.';
});

$('#request-correction').addEventListener('click', () => {
  window.alert(
    'Attendance correction requests are planned ' +
    'for the next implementation phase.'
  );
});

$('#download-report').addEventListener('click', () => {
  window.alert(
    'Report export is planned for the next ' +
    'implementation phase.'
  );
});

installStyles();

const employeeDialog = setupEmployeeDialog();

setupEmployeeActions(employeeDialog);
setupSettings();
renderDashboard();
renderEmployees();
renderAttendance();

window.addEventListener('storage', (event) => {
  if (
    event.key !== MASTER_DATA_KEY &&
    event.key !== null
  ) {
    return;
  }

  Object.assign(
    masterData,
    readMasterData()
  );

  try {
    leaveMasterRaw = localStorage.getItem(
      MASTER_DATA_KEY
    );
  } catch {
    // Keep edits guarded.
  }

  renderMasterData();

  window.dispatchEvent(
    new CustomEvent('peopledesk-eleave-types-changed')
  );
});
