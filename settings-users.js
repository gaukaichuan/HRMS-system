
(() => {
  'use strict';

  const nav = document.querySelector('.sidebar nav');
  const main = document.querySelector('.main-content');

  if (!nav || !main || document.querySelector('#view-user-management')) {
    return;
  }

  // Add User Management to the main sidebar
  const navItem = document.createElement('button');
  navItem.className = 'nav-item';
  navItem.dataset.view = 'user-management';
  navItem.innerHTML = '<span aria-hidden="true">♙</span> User Management';
  nav.append(navItem);

  // Create the User Management page
  const view = document.createElement('section');
  view.className = 'view';
  view.id = 'view-user-management';

  view.innerHTML = `
    <div class="page-heading">
      <div>
        <p class="eyebrow">ADMINISTRATION</p>
        <h1>User Management</h1>
        <p class="subtitle">
          Create employee sign-in accounts and manage existing users.
        </p>
      </div>
    </div>

    <p id="um-feedback" class="um-feedback"
       role="status" aria-live="polite"></p>

    <section class="panel um-login" id="um-login-panel">
      <div class="um-card-heading">
        <div>
          <h2>Administrator sign-in</h2>
          <p>Sign in with your HRMS administrator account to manage users.</p>
        </div>
      </div>

      <form id="um-login-form" class="um-form">
        <label>
          Administrator email
          <input name="email" type="email"
                 autocomplete="username" maxlength="254" required>
        </label>

        <label>
          Password
          <input name="password" type="password"
                 autocomplete="current-password" maxlength="200" required>
        </label>

        <button class="button button-primary" type="submit">
          Sign in
        </button>
      </form>

      <p class="um-hint">
        API: <span id="um-api-address"></span>
      </p>
    </section>

    <div id="um-manager" hidden>
      <div class="um-session">
        <span id="um-signed-in"></span>
        <button class="button button-secondary"
                id="um-signout" type="button">
          Sign out
        </button>
      </div>

      <div class="um-layout">

        <!-- CREATE USER -->
        <section class="panel um-card">
          <div class="um-card-heading">
            <div>
              <h2>Create User</h2>
              <p>Add a new employee account.</p>
            </div>
            <span class="um-icon">＋</span>
          </div>

          <form id="um-create-form" class="um-form">

            <label>
              User ID
              <input name="loginId" autocomplete="off"
                     minlength="3" maxlength="50"
                     pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}"
                     required>
            </label>

            <small>
              3–50 characters: letters, numbers, dots,
              underscores or hyphens.
            </small>

            <label>
              Full name
              <input name="displayName" autocomplete="name"
                     maxlength="120" required>
            </label>

            <label>
              Email address
              <input name="email" type="email"
                     autocomplete="off" maxlength="254" required>
            </label>

            <label>
              Initial password
              <input name="password" type="password"
                     autocomplete="new-password"
                     minlength="12" maxlength="72" required>
            </label>

            <small>
              Password must contain at least 12 characters.
              Passwords are never displayed in the user list.
            </small>

            <button class="button button-primary" type="submit">
              Create user
            </button>

          </form>
        </section>

        <!-- USER LIST -->
        <section class="panel um-card um-list-card">

          <div class="um-card-heading">
            <div>
              <h2>User List</h2>
              <p id="um-count">Loading users…</p>
            </div>

            <button class="button button-secondary"
                    id="um-refresh" type="button">
              ↻ Refresh
            </button>
          </div>

          <div class="um-list-toolbar">
            <input id="um-search" type="search"
                   placeholder="Search by user ID, name or email"
                   aria-label="Search users">

            <select id="um-status-filter"
                    aria-label="Filter by status">
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div class="um-table-wrap">
            <table class="um-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody id="um-users-body">
                <tr>
                  <td colspan="6" class="um-empty">
                    Sign in to view users.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </section>
      </div>
    </div>
  `;

  // Insert the new page after Clock
  const clock = document.querySelector('#view-clock');

  if (clock) {
    clock.insertAdjacentElement('afterend', view);
  } else {
    main.append(view);
  }

  // Page styling
  const style = document.createElement('style');

  style.textContent = `
    #view-user-management .um-feedback {
      min-height: 20px;
      margin: 0 0 12px;
      color: #218c68;
      font-size: 12px;
    }

    #view-user-management .um-feedback[data-error="true"] {
      color: #a12232;
    }

    #view-user-management .um-login {
      max-width: 480px;
      padding: 22px;
    }

    #view-user-management .um-layout {
      display: grid;
      grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    #view-user-management .um-card {
      padding: 20px;
      min-width: 0;
    }

    #view-user-management .um-card-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    #view-user-management .um-card-heading h2 {
      font: 700 16px Manrope;
      margin: 0;
    }

    #view-user-management .um-card-heading p {
      font-size: 11px;
      color: #9295a3;
      margin: 6px 0 0;
    }

    #view-user-management .um-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: #f1efff;
      color: #6857e8;
      font-size: 20px;
    }

    #view-user-management .um-form {
      display: grid;
      gap: 12px;
    }

    #view-user-management .um-form label {
      display: grid;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #55596a;
    }

    #view-user-management .um-form input,
    #view-user-management .um-list-toolbar input,
    #view-user-management .um-list-toolbar select {
      width: 100%;
      min-height: 38px;
      padding: 9px 11px;
      border: 1px solid #dfe2eb;
      border-radius: 7px;
      background: #fff;
      color: #343848;
      font: 12px 'DM Sans', sans-serif;
    }

    #view-user-management .um-form small {
      font-size: 10px;
      color: #9295a3;
      line-height: 1.5;
      margin-top: -7px;
    }

    #view-user-management .um-hint {
      font-size: 10px;
      color: #9295a3;
      margin: 16px 0 0;
      overflow-wrap: anywhere;
    }

    #view-user-management .um-session {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 0 14px;
      font-size: 11px;
      color: #777b8d;
    }

    #view-user-management .um-list-toolbar {
      display: flex;
      gap: 9px;
      margin: 0 0 14px;
    }

    #view-user-management .um-list-toolbar input {
      flex: 1;
      min-width: 120px;
    }

    #view-user-management .um-list-toolbar select {
      width: auto;
      min-width: 125px;
    }

    #view-user-management .um-table-wrap {
      overflow-x: auto;
    }

    #view-user-management .um-table {
      width: 100%;
      border-collapse: collapse;
      white-space: nowrap;
    }

    #view-user-management .um-table th {
      background: #fafbfc;
      color: #9295a3;
      font-size: 9px;
      letter-spacing: .5px;
      padding: 11px;
      text-align: left;
    }

    #view-user-management .um-table td {
      padding: 12px 11px;
      border-top: 1px solid #f1f2f6;
      font-size: 11px;
      color: #676b7c;
    }

    #view-user-management .um-table td:first-child {
      color: #444858;
      font-weight: 600;
    }

    #view-user-management .um-status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 20px;
      background: #e9f7f1;
      color: #248963;
      font-size: 9px;
      font-weight: 700;
    }

    #view-user-management .um-status.inactive {
      background: #f0f1f4;
      color: #777b8a;
    }

    #view-user-management .um-action {
      border: 1px solid #eceef3;
      background: #fff;
      border-radius: 6px;
      padding: 6px 9px;
      color: #55596a;
      font: 600 10px 'DM Sans';
      cursor: pointer;
    }

    #view-user-management .um-action:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    #view-user-management .um-empty {
      text-align: center !important;
      padding: 28px !important;
      color: #9295a3 !important;
      font-weight: 400 !important;
    }

    @media(max-width: 1000px) {
      #view-user-management .um-layout {
        grid-template-columns: 1fr;
      }
    }

    @media(max-width: 600px) {
      #view-user-management .um-list-toolbar {
        flex-direction: column;
      }

      #view-user-management .um-list-toolbar select {
        width: 100%;
      }
    }
  `;

  document.head.append(style);

  // API configuration
  const $ = (selector) => view.querySelector(selector);

  const apiBase = String(
    window.HRMS_CONFIG?.apiBaseUrl || ''
  ).replace(/\/$/, '');

  $('#um-api-address').textContent = apiBase || 'Not configured';

  let token = '';
  let currentAdmin = null;
  let users = [];

  // Display success and error messages
  function feedback(message, error = false) {
    const node = $('#um-feedback');

    node.textContent = message;
    node.dataset.error = error ? 'true' : 'false';
  }

  // API request helper
  async function request(path, options = {}) {
    if (!apiBase) {
      throw new Error(
        'Backend address is missing. Configure apiBaseUrl in hrms-config.js.'
      );
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...options,

      headers: {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),

        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),

        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed (${response.status}).`
      );
    }

    return data;
  }

  // Display users in the table
  function renderUsers() {
    const query = $('#um-search').value.trim().toLowerCase();
    const status = $('#um-status-filter').value;

    const filtered = users.filter((user) => {
      const matches = `
        ${user.loginId}
        ${user.displayName}
        ${user.email}
      `.toLowerCase().includes(query);

      return matches &&
        (
          status === 'all' ||
          (status === 'active' ? user.active : !user.active)
        );
    });

    $('#um-count').textContent =
      `${filtered.length} of ${users.length} user${users.length === 1 ? '' : 's'}`;

    $('#um-users-body').innerHTML = filtered.length
      ? filtered.map((user) => {
          const created = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : '—';

          const safe = (value) =>
            String(value ?? '').replace(/[&<>"']/g, (char) => ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;'
            }[char]));

          return `
            <tr>
              <td>
                ${safe(user.displayName)}
                <br>
                <small>${safe(user.email)}</small>
              </td>

              <td>${safe(user.loginId)}</td>
              <td>${safe(user.role)}</td>

              <td>
                <span class="um-status ${user.active ? '' : 'inactive'}">
                  ${user.active ? 'Active' : 'Inactive'}
                </span>
              </td>

              <td>${safe(created)}</td>

              <td>
                <button
                  class="um-action"
                  type="button"
                  data-toggle-user="${safe(user.id)}"
                  data-next-active="${!user.active}">
                  ${user.active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          `;
        }).join('')
      : `
        <tr>
          <td colspan="6" class="um-empty">
            No users match your search.
          </td>
        </tr>
      `;
  }

  // Retrieve users from backend
  async function loadUsers() {
    const result = await request('/v1/admin/users');

    users = Array.isArray(result.users)
      ? result.users
      : [];

    renderUsers();
  }

  // Administrator login
  $('#um-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');

    button.disabled = true;
    feedback('Signing in…');

    try {
      const result = await request('/v1/auth/login', {
        method: 'POST',

        body: JSON.stringify({
          email: form.elements.email.value.trim(),
          password: form.elements.password.value
        })
      });

      if (result.employee?.role !== 'admin') {
        throw new Error(
          'This page requires an administrator account.'
        );
      }

      token = result.accessToken;
      currentAdmin = result.employee;

      $('#um-login-panel').hidden = true;
      $('#um-manager').hidden = false;

      $('#um-signed-in').textContent =
        `Signed in as ${currentAdmin.displayName} (${currentAdmin.email})`;

      form.reset();

      await loadUsers();

      feedback('');

    } catch (error) {
      token = '';
      feedback(error.message, true);

    } finally {
      button.disabled = false;
    }
  });

  // Create new employee user
  $('#um-create-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');

    const payload = Object.fromEntries(
      new FormData(form).entries()
    );

    button.disabled = true;
    feedback('Creating user…');

    try {
      await request('/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      form.reset();

      await loadUsers();

      feedback('User created successfully.');

    } catch (error) {
      feedback(error.message, true);

    } finally {
      button.disabled = false;
    }
  });

  // Activate or deactivate a user
  $('#um-users-body').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-toggle-user]');

    if (!button) return;

    const id = button.dataset.toggleUser;
    const active = button.dataset.nextActive === 'true';

    if (!window.confirm(
      `${active ? 'Activate' : 'Deactivate'} this user account?`
    )) {
      return;
    }

    button.disabled = true;

    try {
      await request(
        `/v1/admin/users/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ active })
        }
      );

      await loadUsers();

      feedback(`User ${active ? 'activated' : 'deactivated'}.`);

    } catch (error) {
      feedback(error.message, true);
      button.disabled = false;
    }
  });

  // Search users
  $('#um-search').addEventListener('input', renderUsers);

  // Filter account status
  $('#um-status-filter').addEventListener('change', renderUsers);

  // Refresh user list
  $('#um-refresh').addEventListener('click', async () => {
    try {
      await loadUsers();
      feedback('User list refreshed.');

    } catch (error) {
      feedback(error.message, true);
    }
  });

  // Administrator logout
  $('#um-signout').addEventListener('click', () => {
    token = '';
    currentAdmin = null;
    users = [];

    $('#um-manager').hidden = true;
    $('#um-login-panel').hidden = false;

    $('#um-users-body').innerHTML = `
      <tr>
        <td colspan="6" class="um-empty">
          Sign in to view users.
        </td>
      </tr>
    `;

    $('#um-count').textContent = 'Sign in to view users.';

    feedback('You have signed out.');
  });

  // Navigate to User Management
  navItem.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach((item) => {
      item.classList.toggle(
        'active',
        item.id === 'view-user-management'
      );
    });

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item === navItem);
    });

    const breadcrumb = document.querySelector('#breadcrumb-current');

    if (breadcrumb) {
      breadcrumb.textContent = 'User Management';
    }
  });

})();
