const sampleEmployees = [
  { name: 'Jordan Lee', initials: 'JL', id: 'EMP-0042', department: 'Engineering', role: 'Software Engineer', email: 'jordan.lee@example.com', phone: '+1 555 010 0042', startDate: '2024-06-12', status: 'Active', checkIn: '08:57 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: '' },
  { name: 'Maya Patel', initials: 'MP', id: 'EMP-0038', department: 'Finance', role: 'Finance Analyst', email: 'maya.patel@example.com', phone: '+1 555 010 0038', startDate: '2023-10-02', status: 'Active', checkIn: '09:18 AM', checkOut: '—', method: 'Manual', attendance: 'Late', color: 'coral' },
  { name: 'Sam Rivera', initials: 'SR', id: 'EMP-0051', department: 'People & Culture', role: 'People Partner', email: 'sam.rivera@example.com', phone: '+1 555 010 0051', startDate: '2022-03-21', status: 'Active', checkIn: '08:42 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'mint' },
  { name: 'Avery Kim', initials: 'AK', id: 'EMP-0027', department: 'Design', role: 'Product Designer', email: 'avery.kim@example.com', phone: ' +1 555 010 0027', startDate: '2024-01-15', status: 'Active', checkIn: '09:02 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: 'blue-tint' },
  { name: 'Noah Williams', initials: 'NW', id: 'EMP-0064', department: 'Operations', role: 'Operations Lead', email: 'noah.williams@example.com', phone: '+1 555 010 0064', startDate: '2021-08-09', status: 'Active', checkIn: '—', checkOut: '—', method: '—', attendance: 'Incomplete', color: 'gold' },
  { name: 'Taylor Morgan', initials: 'TM', id: 'EMP-0019', department: 'Engineering', role: 'QA Engineer', email: 'taylor.morgan@example.com', phone: ' +1 555 010 0019', startDate: '2023-04-03', status: 'Active', checkIn: '08:49 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'coral' },
  { name: 'Riley Chen', initials: 'RC', id: 'EMP-0072', department: 'Finance', role: 'Payroll Specialist', email: 'riley.chen@example.com', phone: '+1 555 010 0072', startDate: '2020-11-16', status: 'Inactive', checkIn: '—', checkOut: '—', method: '—', attendance: '—', color: 'mint' }
];

const STORAGE_KEY = 'peopledesk-employees-v1';
const DELETED_KEY = 'peopledesk-deleted-employees-v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
let bulkMode = false;
const selectedEmployeeIds = new Set();

function loadDeletedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(DELETED_KEY));
    return new Set(Array.isArray(stored) ? stored : []);
  } catch (error) {
    console.warn('Could not read deleted prototype employee records.', error);
    return new Set();
  }
}

const deletedEmployeeIds = loadDeletedIds();
function loadEmployees() {
  let saved = [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(value)) saved = value;
  } catch (error) {
    console.warn('Could not read saved prototype employee records.', error);
  }
  const custom = saved.filter((employee) => employee && employee.id && !deletedEmployeeIds.has(employee.id));
  return [...sampleEmployees.filter((employee) => !deletedEmployeeIds.has(employee.id)), ...custom];
}
const employees = loadEmployees();

const initialsAvatar = (employee) => `<span class="person-avatar ${escapeHtml(employee.color)}">${escapeHtml(employee.initials)}</span>`;
const personCell = (employee) => `<div class="person-cell">${initialsAvatar(employee)}<span><strong>${escapeHtml(employee.name)}</strong><small>${escapeHtml(employee.id)}</small></span></div>`;
const badge = (status) => {
  const className = status === 'Present' ? 'green-pill' : status === 'Late' ? 'orange-pill' : 'neutral-pill';
  return `<span class="status-pill ${className}">${escapeHtml(status)}</span>`;
};

function renderDashboard() {
  $('#dashboard-attendance').innerHTML = employees.slice(0, 5).map((employee) => `<tr><td>${personCell(employee)}</td><td>${escapeHtml(employee.department)}</td><td>${escapeHtml(employee.checkIn)}</td><td>${badge(employee.attendance)}</td></tr>`).join('');
}

function renderEmployees(search = $('#employee-search').value) {
  const query = search.trim().toLowerCase();
  const visible = employees.filter((employee) => `${employee.name} ${employee.id} ${employee.department} ${employee.role} ${employee.email}`.toLowerCase().includes(query));
  $('#employee-count').textContent = `${visible.length} employees`;
  const table = $('#employee-rows').closest('table');
  table.querySelector('thead tr').innerHTML = `${bulkMode ? '<th><input type="checkbox" id="select-visible-employees" aria-label="Select all visible employees"></th>' : ''}<th>EMPLOYEE</th><th>EMPLOYEE ID</th><th>DEPARTMENT</th><th>JOB TITLE</th><th>STATUS</th><th>ACTIONS</th>`;
  $('#employee-rows').innerHTML = visible.length ? visible.map((employee) => `<tr>${bulkMode ? `<td><input type="checkbox" class="employee-select" data-employee-id="${escapeHtml(employee.id)}" aria-label="Select ${escapeHtml(employee.name)}" ${selectedEmployeeIds.has(employee.id) ? 'checked' : ''}></td>` : ''}<td>${personCell(employee)}</td><td>${escapeHtml(employee.id)}</td><td>${escapeHtml(employee.department)}</td><td>${escapeHtml(employee.role)}</td><td><span class="employee-status ${employee.status.toLowerCase()}">${escapeHtml(employee.status)}</span></td><td><div class="employee-row-actions"><button class="row-action" data-action="toggle-status" data-employee-id="${escapeHtml(employee.id)}">${employee.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button class="row-action danger" data-action="delete" data-employee-id="${escapeHtml(employee.id)}">Delete</button></div></td></tr>`).join('') : `<tr><td colspan="${bulkMode ? 7 : 6}" class="empty-state">No employees match your search.</td></tr>`;
  updateBulkControls(visible);
}

function renderAttendance() {
  const records = employees.filter((employee) => employee.attendance !== '—');
  $('#attendance-rows').innerHTML = records.map((employee) => `<tr><td>${personCell(employee)}</td><td>${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>${escapeHtml(employee.checkIn)}</td><td>${escapeHtml(employee.checkOut)}</td><td>${escapeHtml(employee.method)}</td><td>${badge(employee.attendance)}</td></tr>`).join('');
}

function navigate(viewName) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  const title = { dashboard: 'Dashboard', employees: 'Employees', attendance: 'Attendance', clock: 'Clock in / out' }[viewName];
  $('#breadcrumb-current').textContent = title;
}

function persistEmployeeState() {
  const customEmployees = employees.filter((employee) => !sampleEmployees.some((sample) => sample.id === employee.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customEmployees));
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedEmployeeIds]));
    return true;
  } catch (error) {
    console.error('Could not save prototype employee changes.', error);
    return false;
  }
}

function updateBulkControls(visibleEmployees = []) {
  const count = selectedEmployeeIds.size;
  $('#selection-count').textContent = `${count} selected`;
  $$('#bulk-actions button[data-bulk-action]').forEach((button) => { button.disabled = count === 0; });
  const selectVisible = $('#select-visible-employees');
  if (selectVisible) {
    selectVisible.checked = visibleEmployees.length > 0 && visibleEmployees.every((employee) => selectedEmployeeIds.has(employee.id));
    selectVisible.indeterminate = visibleEmployees.some((employee) => selectedEmployeeIds.has(employee.id)) && !selectVisible.checked;
  }
}

function setBulkMode(enabled) {
  bulkMode = enabled;
  if (!enabled) selectedEmployeeIds.clear();
  $('#toggle-bulk-mode').textContent = enabled ? 'Done selecting' : 'Select employees';
  $('#bulk-actions').hidden = !enabled;
  renderEmployees();
}

function refreshEmployeeViews() {
  renderEmployees();
  renderDashboard();
  renderAttendance();
}

function toggleEmployeeStatus(id) {
  const employee = employees.find((item) => item.id === id);
  if (!employee) return;
  const oldStatus = employee.status;
  employee.status = oldStatus === 'Active' ? 'Inactive' : 'Active';
  if (!persistEmployeeState()) {
    employee.status = oldStatus;
    window.alert('Could not save this change in this browser. Please try again.');
    return;
  }
  refreshEmployeeViews();
}

function deleteEmployees(ids) {
  if (!ids.length) return;
  const names = ids.map((id) => employees.find((employee) => employee.id === id)?.name).filter(Boolean);
  const confirmation = ids.length === 1 ? `Delete ${names[0]} from this prototype?` : `Delete these ${ids.length} employees from this prototype?`;
  if (!window.confirm(`${confirmation} This cannot be undone here.`)) return;
  const originalEmployees = [...employees];
  const originalDeleted = new Set(deletedEmployeeIds);
  for (const id of ids) {
    const index = employees.findIndex((employee) => employee.id === id);
    if (index >= 0) employees.splice(index, 1);
    deletedEmployeeIds.add(id);
    selectedEmployeeIds.delete(id);
  }
  if (!persistEmployeeState()) {
    employees.splice(0, employees.length, ...originalEmployees);
    deletedEmployeeIds.clear();
    originalDeleted.forEach((id) => deletedEmployeeIds.add(id));
    window.alert('Could not save this deletion in this browser. Please try again.');
  }
  refreshEmployeeViews();
}

function setSelectedStatus(status) {
  if (!selectedEmployeeIds.size) return;
  const previous = employees.map((employee) => [employee, employee.status]);
  employees.forEach((employee) => { if (selectedEmployeeIds.has(employee.id)) employee.status = status; });
  if (!persistEmployeeState()) {
    previous.forEach(([employee, oldStatus]) => { employee.status = oldStatus; });
    window.alert('Could not save these changes in this browser. Please try again.');
  }
  selectedEmployeeIds.clear();
  setBulkMode(false);
  refreshEmployeeViews();
}

function installEmployeeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #view-employees th { font-size: 11px; padding-top: 13px; padding-bottom: 13px; }
    #view-employees td { font-size: 13px; padding-top: 15px; padding-bottom: 15px; }
    #view-employees .person-cell strong { font-size: 13px; }
    #view-employees .person-cell small { font-size: 11px; }
    #view-employees .person-avatar { width: 34px; height: 34px; font-size: 10px; }
    #view-employees .employee-status { font-size: 11px; padding: 5px 8px; }
    #view-employees .search-box input, #view-employees .record-count { font-size: 12px; }
    #view-employees input[type=checkbox] { width: 16px; height: 16px; accent-color: #6857e8; cursor: pointer; }
    .employee-actions { display:flex; align-items:center; gap:9px; }
    .employee-row-actions { display:flex; gap:7px; align-items:center; }
    .row-action { border:1px solid #e8e9f0; border-radius:6px; background:#fff; color:#5f53cd; padding:6px 8px; font:600 10px 'DM Sans'; cursor:pointer; }
    .row-action:hover { background:#f6f5ff; }
    .row-action.danger { color:#b74e4e; }
    .row-action.danger:hover { background:#fff2f1; }
    .bulk-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:11px 18px; background:#faf9ff; border-bottom:1px solid #efedff; }
    .bulk-actions[hidden] { display:none; }
    .bulk-actions .selection-count { color:#686b7b; font-size:11px; margin-right:auto; }
    .bulk-actions button { min-height:30px; border:1px solid #e6e3ff; border-radius:6px; background:#fff; padding:0 9px; color:#5d50c9; font:600 10px 'DM Sans'; cursor:pointer; }
    .bulk-actions button:disabled { opacity:.45; cursor:not-allowed; }
    .bulk-actions button.bulk-delete { color:#b74e4e; border-color:#f1dddd; }
    .employee-dialog { width: min(560px, calc(100vw - 32px)); max-height: min(90vh, 760px); padding: 0; border: 1px solid #eceef3; border-radius: 14px; color: #1f2332; box-shadow: 0 24px 80px #1f233244; }
    .employee-dialog::backdrop { background: #17192a80; backdrop-filter: blur(2px); }
    .employee-dialog form { padding: 24px; }
    .employee-dialog-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .employee-dialog-header h2 { font:700 20px Manrope,sans-serif; margin:0; }
    .employee-dialog-header p { color:#85899a; font-size:12px; margin:6px 0 0; }
    .dialog-close { border:0; background:#f6f7fb; border-radius:7px; color:#686c7b; font-size:20px; width:32px; height:32px; cursor:pointer; }
    .employee-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .employee-form-field { display:flex; flex-direction:column; gap:6px; }
    .employee-form-field.full { grid-column:1/-1; }
    .employee-form-field label { color:#55596a; font-size:12px; font-weight:600; }
    .employee-form-field input,.employee-form-field select { width:100%; min-height:40px; border:1px solid #e4e6ed; border-radius:7px; background:white; padding:0 10px; color:#343848; font:13px 'DM Sans',sans-serif; }
    .employee-form-field input:focus,.employee-form-field select:focus { outline:2px solid #c9c3ff; border-color:#8072ec; }
    .employee-form-field .required { color:#d75c5c; }
    .employee-form-help { color:#9295a3; font-size:11px; line-height:1.5; margin:16px 0 0; }
    .employee-form-error { color:#b83f3f; background:#fff0ef; border-radius:6px; font-size:12px; padding:9px 10px; margin:12px 0 0; }
    .employee-form-error[hidden] { display:none; }
    .employee-dialog-actions { display:flex; justify-content:flex-end; gap:9px; border-top:1px solid #eff0f5; padding-top:17px; margin-top:20px; }
    .employee-dialog-actions .button-secondary { min-height:37px; }
    @media(max-width:700px) { .employee-row-actions { align-items:flex-start; flex-direction:column; } .employee-actions { align-items:flex-end; flex-direction:column-reverse; } }
    @media(max-width:520px) { .employee-dialog form { padding:19px; } .employee-form-grid { grid-template-columns:1fr; } .employee-form-field.full { grid-column:auto; } }
  `;
  document.head.append(style);
}

function buildEmployeeDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'employee-dialog';
  dialog.setAttribute('aria-labelledby', 'employee-dialog-title');
  dialog.innerHTML = `
    <form id="employee-form">
      <div class="employee-dialog-header"><div><h2 id="employee-dialog-title">Add employee</h2><p>Create a profile in the employee directory.</p></div><button class="dialog-close" type="button" aria-label="Close dialog">×</button></div>
      <div class="employee-form-grid">
        <div class="employee-form-field"><label for="employee-first-name">First name <span class="required">*</span></label><input id="employee-first-name" name="firstName" autocomplete="given-name" required maxlength="60"></div>
        <div class="employee-form-field"><label for="employee-last-name">Last name <span class="required">*</span></label><input id="employee-last-name" name="lastName" autocomplete="family-name" required maxlength="60"></div>
        <div class="employee-form-field full"><label for="employee-email">Work email <span class="required">*</span></label><input id="employee-email" name="email" type="email" autocomplete="email" required maxlength="120"></div>
        <div class="employee-form-field"><label for="employee-department">Department <span class="required">*</span></label><input id="employee-department" name="department" required maxlength="80" placeholder="e.g. Engineering"></div>
        <div class="employee-form-field"><label for="employee-role">Job title <span class="required">*</span></label><input id="employee-role" name="role" required maxlength="80" placeholder="e.g. Analyst"></div>
        <div class="employee-form-field"><label for="employee-phone">Phone (optional)</label><input id="employee-phone" name="phone" type="tel" autocomplete="tel" maxlength="30"></div>
        <div class="employee-form-field"><label for="employee-start-date">Start date <span class="required">*</span></label><input id="employee-start-date" name="startDate" type="date" required></div>
        <div class="employee-form-field"><label for="employee-status">Status</label><select id="employee-status" name="status"><option>Active</option><option>Inactive</option></select></div>
      </div>
      <p class="employee-form-help">Prototype storage: this record is saved only in this browser on this device. Do not enter real or sensitive employee information.</p>
      <p class="employee-form-error" id="employee-form-error" role="alert" hidden></p>
      <div class="employee-dialog-actions"><button class="button button-secondary" type="button" data-cancel>Cancel</button><button class="button button-primary" type="submit">Save employee</button></div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

function nextEmployeeId() {
  const highest = employees.reduce((max, employee) => {
    const match = /^EMP-(\d+)$/.exec(employee.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `EMP-${String(highest + 1).padStart(4, '0')}`;
}

function setupEmployeeDialog() {
  const dialog = buildEmployeeDialog();
  const form = $('#employee-form');
  const closeDialog = () => dialog.close();
  $('#add-employee').addEventListener('click', () => {
    form.reset();
    $('#employee-form-error').hidden = true;
    $('#employee-start-date').value = new Date().toISOString().slice(0, 10);
    dialog.showModal();
    $('#employee-first-name').focus();
  });
  dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
  dialog.querySelector('[data-cancel]').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const firstName = String(values.get('firstName')).trim();
    const lastName = String(values.get('lastName')).trim();
    const email = String(values.get('email')).trim();
    const error = $('#employee-form-error');
    if (employees.some((employee) => employee.email.toLowerCase() === email.toLowerCase())) {
      error.textContent = 'An employee with this email address already exists.';
      error.hidden = false;
      $('#employee-email').focus();
      return;
    }
    const employee = {
      name: `${firstName} ${lastName}`, initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(), id: nextEmployeeId(),
      department: String(values.get('department')).trim(), role: String(values.get('role')).trim(), email,
      phone: String(values.get('phone')).trim(), startDate: String(values.get('startDate')), status: String(values.get('status')),
      checkIn: '—', checkOut: '—', method: '—', attendance: '—', color: 'blue-tint'
    };
    employees.push(employee);
    if (!persistEmployeeState()) {
      employees.pop();
      error.textContent = 'Could not save this record in this browser. Check available storage and try again.';
      error.hidden = false;
      return;
    }
    refreshEmployeeViews();
    closeDialog();
  });
}

function setupEmployeeActions() {
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
  bulkToolbar.innerHTML = '<span class="selection-count" id="selection-count">0 selected</span><button type="button" data-bulk-action="activate">Activate selected</button><button type="button" data-bulk-action="deactivate">Deactivate selected</button><button type="button" class="bulk-delete" data-bulk-action="delete">Delete selected</button>';
  heading.insertAdjacentElement('afterend', bulkToolbar);

  selectButton.addEventListener('click', () => setBulkMode(!bulkMode));
  bulkToolbar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-bulk-action]');
    if (!button) return;
    const action = button.dataset.bulkAction;
    if (action === 'activate' || action === 'deactivate') setSelectedStatus(action === 'activate' ? 'Active' : 'Inactive');
    if (action === 'delete') deleteEmployees([...selectedEmployeeIds]);
  });
  $('#employee-rows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'toggle-status') toggleEmployeeStatus(button.dataset.employeeId);
    if (button.dataset.action === 'delete') deleteEmployees([button.dataset.employeeId]);
  });
  $('#employee-rows').addEventListener('change', (event) => {
    const checkbox = event.target;
    if (checkbox.id === 'select-visible-employees') {
      const query = $('#employee-search').value.trim().toLowerCase();
      const visible = employees.filter((employee) => `${employee.name} ${employee.id} ${employee.department} ${employee.role} ${employee.email}`.toLowerCase().includes(query));
      visible.forEach((employee) => checkbox.checked ? selectedEmployeeIds.add(employee.id) : selectedEmployeeIds.delete(employee.id));
    } else if (checkbox.matches('.employee-select')) {
      checkbox.checked ? selectedEmployeeIds.add(checkbox.dataset.employeeId) : selectedEmployeeIds.delete(checkbox.dataset.employeeId);
    }
    renderEmployees();
  });
}

$$('.nav-item').forEach((item) => item.addEventListener('click', () => navigate(item.dataset.view)));
$$('[data-go]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.go)));
$('#employee-search').addEventListener('input', (event) => renderEmployees(event.target.value));
$('#today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
$('#attendance-date').value = new Date().toISOString().slice(0, 10);

$$('.filter-chip').forEach((chip) => chip.addEventListener('click', () => {
  $$('.filter-chip').forEach((item) => item.classList.remove('selected'));
  chip.classList.add('selected');
  const filter = chip.textContent.trim();
  const rows = employees.filter((employee) => employee.attendance !== '—' && (filter === 'All records' || employee.attendance === filter));
  $('#attendance-rows').innerHTML = rows.length ? rows.map((employee) => `<tr><td>${personCell(employee)}</td><td>${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>${escapeHtml(employee.checkIn)}</td><td>${escapeHtml(employee.checkOut)}</td><td>${escapeHtml(employee.method)}</td><td>${badge(employee.attendance)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">No records in this category.</td></tr>';
}));

$('#demo-clock').addEventListener('click', () => {
  const name = $('#demo-employee').value;
  $('#clock-feedback').textContent = `Demo only: ${name} clock-in preview recorded locally at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. This is not saved.`;
});
$('#manual-punch').addEventListener('click', () => { $('#clock-feedback').textContent = 'Demo only: a manual punch request would be sent to a manager for review.'; });
$('#request-correction').addEventListener('click', () => window.alert('Attendance correction requests are planned for the next implementation phase.'));
$('#download-report').addEventListener('click', () => window.alert('Report export is planned for the next implementation phase.'));

installEmployeeStyles();
setupEmployeeActions();
setupEmployeeDialog();
renderDashboard();
renderEmployees();
renderAttendance();
