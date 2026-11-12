(() => {
  'use strict';

  const settings = document.querySelector('#view-settings');
  const home = document.querySelector('#master-data-home');

  if (
    !settings ||
    !home ||
    document.querySelector('#master-section-users')
  ) {
    return;
  }

  const style = document.createElement('style');

  style.textContent = `
    #master-section-users[hidden],
    #view-users [hidden] {
      display: none !important;
    }

    #master-section-users {
      margin-top: 24px;
    }

    #view-users {
      margin-top: 22px;
    }

    #view-users h2 {
      margin: 0;
      font: 700 18px Manrope, sans-serif;
    }

    #view-users h3 {
      margin: 0;
      font: 700 15px Manrope, sans-serif;
    }

    #view-users .user-control-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin: 22px 0 16px;
    }

    #view-users .user-control-heading p,
    #view-users .user-control-card > p,
    #view-users .user-control-note {
      color: #777b8d;
      line-height: 1.6;
    }

    #view-users .user-control-heading p {
      margin: 6px 0 0;
    }

    #view-users .user-control-notice {
      padding: 14px 16px;
      margin: 0 0 18px;
      border: 1px solid #eeecff;
      border-radius: 9px;
      background: #f7f6ff;
      color: #5549b7;
      line-height: 1.6;
    }

    #view-users .user-control-grid {
      display: grid;
      grid-template-columns: minmax(260px, 380px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    #view-users .user-control-card {
      min-width: 0;
      padding: 20px;
      border: 1px solid #eceef3;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 6px 24px rgba(34, 40, 70, .045);
    }

    #view-users .user-control-card > p {
      margin: 7px 0 18px;
      font-size: 12px;
    }

    #view-users .user-control-form,
    #view-users .user-control-form label {
      display: grid;
      gap: 8px;
    }

    #view-users .user-control-form {
      gap: 15px;
    }

    #view-users .user-control-form label {
      color: #4d5061;
      font-size: 12px;
      font-weight: 600;
    }

    #view-users .user-control-form input,
    #view-users .user-control-form select {
      width: 100%;
      min-height: 40px;
      padding: 9px 11px;
      border: 1px solid #dfe2eb;
      border-radius: 7px;
      background: #fff;
      color: #343848;
      font: inherit;
    }

    #view-users .user-control-form input:focus-visible,
    #view-users .user-control-form select:focus-visible,
    #view-users button:focus-visible {
      outline: 3px solid #8170dc;
      outline-offset: 2px;
    }

    #view-users .user-control-form button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    #view-users .user-control-note {
      margin: 13px 0 0;
      font-size: 11px;
    }

    #view-users .user-control-empty {
      padding: 32px 16px;
      color: #777b8d;
      text-align: center;
      line-height: 1.6;
    }

    #view-users .user-control-table-wrap {
      overflow-x: auto;
      margin-top: 14px;
    }

    #view-users .user-control-table {
      width: 100%;
      border-collapse: collapse;
    }

    #view-users .user-control-table th,
    #view-users .user-control-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #edf0f5;
      text-align: left;
    }

    #view-users .user-control-table th {
      background: #f8f9fc;
      color: #777b8d;
      font-size: 11px;
    }

    #view-users .user-control-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
    }

    #view-users .user-control-toolbar input {
      min-width: 180px;
      flex: 1;
      padding: 10px;
      border: 1px solid #dfe2eb;
      border-radius: 7px;
    }

    #view-users .user-control-status {
      min-height: 1.5em;
      line-height: 1.6;
    }

    #view-users .user-control-status[data-error="true"] {
      color: #a12232;
    }

    #view-users .user-control-table td {
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    #view-users .user-control-table button {
      white-space: nowrap;
    }

    #view-users .user-control-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 20px;
      background: #eef7f1;
      color: #216942;
    }

    #view-users .user-control-badge[data-active="false"] {
      background: #f2f2f5;
      color: #656575;
    }

    #view-users button:disabled {
      opacity: .6;
      cursor: not-allowed;
    }

    @media (max-width: 900px) {
      #view-users .user-control-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  document.head.append(style);

  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'master-data-tile';
  tile.dataset.openUsers = 'true';
  tile.innerHTML = `
    <span class="master-data-icon department-icon" aria-hidden="true">♙</span>
    <span class="master-data-tile-copy">
      <strong>Users</strong>
      <small>Create and manage employee clock-in/out accounts.</small>
    </span>
    <span class="master-data-arrow" aria-hidden="true">→</span>
  `;
  home.append(tile);

  const section = document.createElement('section');
  section.id = 'master-section-users';
  section.className = 'master-data-section';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'users-title');
  section.innerHTML = `
    <div id="view-users">
      <button type="button" class="button button-secondary" data-users-back>← Settings</button>
      <div class="user-control-heading">
        <div>
          <h2 id="users-title">Users</h2>
          <p>Create and manage the accounts used to sign in to the employee clock screen.</p>
        </div>
      </div>
      <p class="user-control-notice">
        Create an employee User ID and password here, then use those same details on
        <a href="clock.html">the clock-in / clock-out screen</a>.
        Administrator sign-in protects this account list. It does not protect the rest of the HRMS workspace.
      </p>
      <p id="users-feedback" class="user-control-status" role="status" aria-live="polite"></p>
      <section class="user-control-card" id="users-login-panel" aria-labelledby="users-login-title" style="max-width: 440px">
        <h3 id="users-login-title">Administrator sign-in</h3>
        <p>Use the administrator created with the backend bootstrap command.</p>
        <form id="users-login-form" class="user-control-form">
          <label>Administrator email
            <input name="email" type="email" autocomplete="username" maxlength="254" required>
          </label>
          <label>Password
            <input name="password" type="password" autocomplete="current-password" maxlength="200" required>
          </label>
          <button class="button button-primary" type="submit">Sign in</button>
        </form>
        <p class="user-control-note">API: <span id="users-api-address"></span>.
          Set the trusted backend address in hrms-config.js; both pages use this configuration.
          Your session stays in memory only. Reloading requires sign-in again.</p>
      </section>
      <div id="users-manager" hidden>
        <div class="user-control-toolbar">
          <span id="users-signed-in"></span>
          <button type="button" class="button button-secondary" id="users-signout">Sign out</button>
        </div>
        <div class="user-control-grid">
          <section class="user-control-card" aria-labelledby="user-create-title">
            <h3 id="user-create-title">Create a new user</h3>
            <p>New accounts are active employees, ready to sign in to clock in and clock out.</p>
            <form id="users-create-form" class="user-control-form">
              <label>User ID
                <input name="loginId" autocomplete="off" minlength="3" maxlength="50"
                  pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,49}" required aria-describedby="users-login-id-help">
              </label>
              <small id="users-login-id-help">3–50 letters, digits, dots, underscores or hyphens; start with a letter or digit.</small>
              <label>Full name
                <input name="displayName" autocomplete="name" maxlength="120" required>
              </label>
              <label>Email address
                <input name="email" type="email" autocomplete="off" maxlength="254" required>
              </label>
              <label>Initial password
                <input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="72"
                  required aria-describedby="users-password-help">
              </label>
              <small id="users-password-help">At least 12 characters, at most 72 UTF-8 bytes. Passwords are never shown in the list.</small>
              <p class="user-control-note">Role: Employee. Administrator creation remains a backend-only operation.</p>
              <button class="button button-primary" type="submit">Create user</button>
            </form>
          </section>
          <section class="user-control-card" aria-labelledby="user-list-title">
            <h3 id="user-list-title">Created users</h3>
            <p id="users-count"></p>
            <div class="user-control-toolbar">
              <label for="users-search">Search users</label>
              <input id="users-search" type="search" placeholder="User ID, name or email">
              <button type="button" class="button
