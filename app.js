const employees = [
  { name: 'Jordan Lee', initials: 'JL', id: 'EMP-0042', department: 'Engineering', role: 'Software Engineer', status: 'Active', checkIn: '08:57 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: '' },
  { name: 'Maya Patel', initials: 'MP', id: 'EMP-0038', department: 'Finance', role: 'Finance Analyst', status: 'Active', checkIn: '09:18 AM', checkOut: '—', method: 'Manual', attendance: 'Late', color: 'coral' },
  { name: 'Sam Rivera', initials: 'SR', id: 'EMP-0051', department: 'People & Culture', role: 'People Partner', status: 'Active', checkIn: '08:42 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'mint' },
  { name: 'Avery Kim', initials: 'AK', id: 'EMP-0027', department: 'Design', role: 'Product Designer', status: 'Active', checkIn: '09:02 AM', checkOut: '—', method: 'Face (planned)', attendance: 'Present', color: 'blue-tint' },
  { name: 'Noah Williams', initials: 'NW', id: 'EMP-0064', department: 'Operations', role: 'Operations Lead', status: 'Active', checkIn: '—', checkOut: '—', method: '—', attendance: 'Incomplete', color: 'gold' },
  { name: 'Taylor Morgan', initials: 'TM', id: 'EMP-0019', department: 'Engineering', role: 'QA Engineer', status: 'Active', checkIn: '08:49 AM', checkOut: '—', method: 'Manual', attendance: 'Present', color: 'coral' },
  { name: 'Riley Chen', initials: 'RC', id: 'EMP-0072', department: 'Finance', role: 'Payroll Specialist', status: 'Inactive', checkIn: '—', checkOut: '—', method: '—', attendance: '—', color: 'mint' }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const initialsAvatar = (employee) => `<span class="person-avatar ${employee.color}">${employee.initials}</span>`;
const personCell = (employee) => `<div class="person-cell">${initialsAvatar(employee)}<span><strong>${employee.name}</strong><small>${employee.id}</small></span></div>`;
const badge = (status) => {
  const className = status === 'Present' ? 'green-pill' : status === 'Late' ? 'orange-pill' : 'neutral-pill';
  return `<span class="status-pill ${className}">${status}</span>`;
};

function renderDashboard() {
  $('#dashboard-attendance').innerHTML = employees.slice(0, 5).map((employee) => `<tr><td>${personCell(employee)}</td><td>${employee.department}</td><td>${employee.checkIn}</td><td>${badge(employee.attendance)}</td></tr>`).join('');
}

function renderEmployees(search = '') {
  const query = search.trim().toLowerCase();
  const visible = employees.filter((employee) => `${employee.name} ${employee.id} ${employee.department} ${employee.role}`.toLowerCase().includes(query));
  $('#employee-count').textContent = `${visible.length} employees`;
  $('#employee-rows').innerHTML = visible.length ? visible.map((employee) => `<tr><td>${personCell(employee)}</td><td>${employee.id}</td><td>${employee.department}</td><td>${employee.role}</td><td><span class="employee-status ${employee.status.toLowerCase()}">${employee.status}</span></td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No employees match your search.</td></tr>';
}

function renderAttendance() {
  const records = employees.filter((employee) => employee.attendance !== '—');
  $('#attendance-rows').innerHTML = records.map((employee) => `<tr><td>${personCell(employee)}</td><td>${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>${employee.checkIn}</td><td>${employee.checkOut}</td><td>${employee.method}</td><td>${badge(employee.attendance)}</td></tr>`).join('');
}

function navigate(viewName) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  const title = { dashboard: 'Dashboard', employees: 'Employees', attendance: 'Attendance', clock: 'Clock in / out' }[viewName];
  $('#breadcrumb-current').textContent = title;
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
  $('#attendance-rows').innerHTML = rows.length ? rows.map((employee) => `<tr><td>${personCell(employee)}</td><td>${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>${employee.checkIn}</td><td>${employee.checkOut}</td><td>${employee.method}</td><td>${badge(employee.attendance)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">No records in this category.</td></tr>';
}));

$('#demo-clock').addEventListener('click', () => {
  const name = $('#demo-employee').value;
  $('#clock-feedback').textContent = `Demo only: ${name} clock-in preview recorded locally at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. This is not saved.`;
});
$('#manual-punch').addEventListener('click', () => { $('#clock-feedback').textContent = 'Demo only: a manual punch request would be sent to a manager for review.'; });
$('#add-employee').addEventListener('click', () => window.alert('Employee creation is planned for the next implementation phase.'));
$('#request-correction').addEventListener('click', () => window.alert('Attendance correction requests are planned for the next implementation phase.'));
$('#download-report').addEventListener('click', () => window.alert('Report export is planned for the next implementation phase.'));

renderDashboard();
renderEmployees();
renderAttendance();
