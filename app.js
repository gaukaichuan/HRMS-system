const sampleEmployees = [
  { name: 'Jordan Lee', initials: 'JL', id: 'EMP-0042', department: 'Engineering', role: 'Software Engineer', email: 'jordan.lee@example.com', phone: '+1 555 010 0042', startDate: '2024-06-12', status: 'Active', checkIn: '08:57 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: '' },
  { name: 'Maya Patel', initials: 'MP', id: 'EMP-0038', department: 'Finance', role: 'Finance Analyst', email: 'maya.patel@example.com', phone: '+1 555 010 0038', startDate: '2023-10-02', status: 'Active', checkIn: '09:18 AM', checkOut: '—', method: 'Manual', attendance: 'Late', color: 'coral' },
  { name: 'Sam Rivera', initials: 'SR', id: 'EMP-0051', department: 'People & Culture', role: 'People Partner', email: 'sam.rivera@example.com', phone: '+1 555 010 0051', startDate: '2022-03-21', status: 'Active', checkIn: '08:42 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'mint' },
  { name: 'Avery Kim', initials: 'AK', id: 'EMP-0027', department: 'Design', role: 'Product Designer', email: 'avery.kim@example.com', phone: '+1 555 010 0027', startDate: '2024-01-15', status: 'Active', checkIn: '09:02 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: 'blue-tint' },
  { name: 'Noah Williams', initials: 'NW', id: 'EMP-0064', department: 'Operations', role: 'Operations Lead', email: 'noah.williams@example.com', phone: '+1 555 010 0064', startDate: '2021-08-09', status: 'Active', checkIn: '—', checkOut: '—', method: '—', attendance: 'Incomplete', color: 'gold' },
  { name: 'Taylor Morgan', initials: 'TM', id: 'EMP-0019', department: 'Engineering', role: 'QA Engineer', email: 'taylor.morgan@example.com', phone: '+1 555 010 0019', startDate: '2023-04-03', status: 'Active', checkIn: '08:49 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'coral' },
  { name: 'Riley Chen', initials: 'RC', id: 'EMP-0072', department: 'Finance', role: 'Payroll Specialist', email: 'riley.chen@example.com', phone: '+1 555 010 0072', startDate: '2020-11-16', status: 'Inactive', checkIn: '—', checkOut: '—', method: '—', attendance: '—', color: 'mint' }
];

const STORAGE_KEY = 'peopledesk-employees-v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function loadEmployees() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return [...sampleEmployees, ...saved];
  } catch (error) {
    console.warn('Could not read saved prototype employee records.', error);
  }
  return [...sampleEmployees];
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

function renderEmployees(search = '') {
  const query = search.trim().toLowerCase();
  const visible = employees.filter((employee) => `${employee.name} ${employee.id} ${employee.department} ${employee.role} ${employee.email}`.toLowerCase().includes(query));
  $('#employee-count').textContent = `${visible.length} employees`;
  $('#employee-rows').innerHTML = visible.length ? visible.map((employee) => `<tr><td>${personCell(employee)}</td><td>${escapeHtml(employee.id)}</td><td>${escapeHtml(employee.department)}</td><td>${escapeHtml(employee.role)}</td><td><span class="employee-status ${employee.status.toLowerCase()}">${escapeHtml(employee.status)}</span></td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No employees match your search.</td></tr>';
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

function saveEmployee(employee) {
  const customEmployees = employees.filter((item) => !sampleEmployees.some((sample) => sample.id === item.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...customEmployees, employee]));
    employees.push(employee);
    return true;
  } catch (error) {
    console.error('Could not save this prototype employee record.', error);
    return false;
  }
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
    const duplicateEmail = employees.some((employee) => employee.email.toLowerCase() === email.toLowerCase());
    const error = $('#employee-form-error');
    if (duplicateEmail) {
      error.textContent = 'An employee with this email address already exists.';
      error.hidden = false;
      $('#employee-email').focus();
      return;
    }
    const name = `${firstName} ${lastName}`;
    const employee = {
      name,
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      id: nextEmployeeId(),
      department: String(values.get('department')).trim(),
      role: String(values.get('role')).trim(),
      email,
      phone: String(values.get('phone')).trim(),
      startDate: String(values.get('startDate')),
      status: String(values.get('status')),
      checkIn: '—', checkOut: '—', method: '—', attendance: '—', color: 'blue-tint'
    };
    if (!saveEmployee(employee)) {
      error.textContent = 'Could not save this record in this browser. Check available storage and try again.';
      error.hidden = false;
      return;
    }
    renderEmployees($('#employee-search').value);
    renderDashboard();
    renderAttendance();
    closeDialog();
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
setupEmployeeDialog();
renderDashboard();
renderEmployees();
renderAttendance();
