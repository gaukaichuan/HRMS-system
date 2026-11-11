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

  // Remove the earlier standalone panel, if present.
  // Do not load both settings-users.js and user-management.js.
  document.querySelector('#view-users')?.remove();
  document.querySelector('[data-view="users"]')?.remove();

  // --------------------------------------------------
  // Styles
  // --------------------------------------------------

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
      margin: 0 0 12px;
    }

    #view-users .up-head,
    #view-users .up-tools {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    #view-users .up-notice {
      padding: 16px;
      background: #f0edff;
      color: #493c78;
      border-radius: 12px;
      line-height: 1.6;
    }

    #view-users .up-card {
      padding: 22px;
      border: 1px solid #e1e4ec;
      border-radius: 14px;
      background: #fff;
      min-width: 0;
    }

    #users-login-panel {
      max-width: 520px;
    }

    #view-users .up-grid {
      display: grid;
      grid-template-columns:
        minmax(240px, 320px)
        minmax(0, 1fr);
      gap: 22px;
      align-items: start;
    }

    #view-users form,
    #view-users label {
      display: grid;
      gap: 9px;
    }

    #view-users form {
      gap: 16px;
    }

    #view-users label {
      font-size: 14px;
      font-weight: 600;
    }

    #view-users input,
    #view-users select {
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 10px 12px;
      border: 1px solid #cdd2df;
      border-radius: 8px;
      background: #fff;
      color: #20273a;
      font: inherit;
    }

    #view-users small,
    #view-users .up-muted {
      color: #596278;
      line-height: 1.6;
    }

    #view-users .up-filters {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px;
      gap: 16px;
      margin-top: 18px;
    }

    #view-users .up-scroll {
      overflow-x: auto;
    }

    #view-users table {
      width: 100%;
      border-collapse: collapse;
    }

    #view-users th,
    #view-users td {
      padding: 14px 10px;
      text-align: left;
      border-bottom: 1px solid #edf0f5;
    }

    #view-users th {
      background: #f8f9fc;
    }

    #view-users td:first-child {
      min-width: 150px;
      overflow-wrap: anywhere;
    }

    #view-users td strong,
    #view-users td small {
      display: block;
    }

    #view-users .up-badge {
      padding: 5px 9px;
      border-radius: 20px;
      background: #f1f2f6;
      color: #565d6f;
      white-space: nowrap;
    }

    #view-users .up-badge.active {
      background: #e5f4eb;
      color: #1a623d;
    }

    #view-users button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    #view-users button:focus-visible,
    #view-users input:focus-visible,
    #view-users select:focus-visible {
      outline: 3px solid #8170dc;
      outline-offset: 3px;
    }

    #users-feedback:not(:empty) {
      padding: 14px;
      background: #edf6ef;
      color: #215b36;
      border-radius: 8px;
    }

    #users-feedback[data-error="true"]:not(:empty) {
      background: #fff0ef;
      color: #932e2e;
    }

    #users-status-dialog {
      width: min(440px, calc(100vw - 40px));
      box-sizing: border-box;
      padding: 24px;
      border: 0;
      border-radius: 14px;
    }

    #users-status-dialog::backdrop {
      background: rgb(20 26 45 / 45%);
    }

    #users-confirm-message {
      overflow-wrap: anywhere;
      line-height: 1.6;
    }

    @media (max-width: 1100px) {
      #view-users .up-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 600px) {
      #view-users .up-filters {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 700px) {
      body:has(#view-settings.active)
      .sidebar .nav-item {
        font-size: 0;
        overflow: hidden;
      }

      body:has(#view-settings.active)
      .sidebar .nav-label {
        display: none;
      }

      body:has(#view-settings.active)
      .sidebar .nav-item span {
        font-size: 17px;
      }
    }
  `;

  document.head.append(style);

  // --------------------------------------------------
  // Settings menu tile
  // --------------------------------------------------

  const tile = document.createElement('button');

  tile.type = 'button';
  tile.className = 'master-data-tile';
  tile.dataset.openUsers = 'true';

  tile.innerHTML = `
    <span class="master-data-icon" aria-hidden="true">
      ♙
    </span>

    <span class="master-data-tile-copy">
      <strong>Users</strong>
      <small>
        Manage backend login accounts.
        Administrator sign-in required.
      </small>
    </span>

    <span class="master-data-arrow" aria-hidden="true">
      →
    </span>
  `;

  home.append(tile);

  // --------------------------------------------------
  // Users panel
  // --------------------------------------------------

  const section = document.createElement('section');

  section.id = 'master-section-users';
  section.className = 'master-data-section';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'users-title');

  section.innerHTML = `
    <button
      type="button"
      class="button button-secondary"
      data-users-back
    >
      ← Settings
    </button>

    <div id="view-users">
      <div class="up-head">
        <div>
          <h2 id="users-title">Users</h2>

          <p class="up-muted">
            Manage PeopleDesk backend login accounts.
          </p>
        </div>

        <button
          class="button"
          type="button"
          id="users-signout"
          hidden
        >
          Sign out
        </button>
      </div>

      <p class="up-notice">
        Backend accounts are separate from the sample
        employee directory and mobile clock demo.
        This panel does not add frontend page permissions.
        No connection is made until you sign in.
      </p>

      <p
        id="users-feedback"
        role="status"
        aria-live="polite"
      ></p>

      <div id="users-login-panel" class="up-card">
        <h3>Administrator sign-in</h3>

        <form id="users-login-form">
          <label>
            API address

            <input
              id="users-api"
              type="url"
              value="http://localhost:3000"
              required
              autocomplete="off"
              aria-describedby="users-api-help"
            >
          </label>

          <small id="users-api-help">
            Use only your trusted backend.
            HTTPS is required except on localhost.
            Your credentials are sent to this address.
          </small>

          <label>
            Administrator email

            <input
              name="email"
              type="email"
              required
              maxlength="254"
              autocomplete="username"
            >
          </label>

          <label>
            Password

            <input
              name="password"
              type="password"
              required
              maxlength="200"
              autocomplete="current-password"
            >
          </label>

          <button
            class="button button-primary"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p class="up-muted">
          Use the administrator created with the backend
          bootstrap command. The session stays in memory
          only; reloading signs you out.
        </p>
      </div>

      <div id="users-workspace" hidden>
        <p id="users-identity" class="up-muted"></p>

        <div class="up-grid">
          <div class="up-card">
            <h3>Create employee login</h3>

            <p class="up-muted">
              New accounts have the Employee role.
            </p>

            <form id="users-create-form">
              <label>
                Display name

                <input
                  name="displayName"
                  required
                  maxlength="120"
                  autocomplete="off"
                >
              </label>

              <label>
                Email address

                <input
                  name="email"
                  type="email"
                  required
                  maxlength="254"
                  autocomplete="off"
                >
              </label>

              <label>
                Initial password

                <input
                  name="password"
                  type="password"
                  required
                  minlength="12"
                  maxlength="200"
                  autocomplete="new-password"
                  aria-describedby="users-password-help"
                >
              </label>

              <small id="users-password-help">
                Use at least 12 characters.
                Share credentials only through an
                approved secure channel.
              </small>

              <button
                class="button button-primary"
                type="submit"
              >
                Create account
              </button>
            </form>
          </div>

          <div class="up-card">
            <div class="up-tools">
              <h3>Login accounts</h3>

              <button
                class="button"
                id="users-refresh"
                type="button"
              >
                Refresh
              </button>
            </div>

            <div class="up-filters">
              <label>
                Search accounts

                <input
                  id="users-search"
                  type="search"
                  placeholder="Name or email"
                >
              </label>

              <label>
                Status

                <select id="users-status-filter">
                  <option value="all">
                    All accounts
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </label>
            </div>

            <p
              id="users-count"
              class="up-muted"
              aria-live="polite"
            ></p>

            <div class="up-scroll">
              <table aria-label="Backend login accounts">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Access</th>
                  </tr>
                </thead>

                <tbody id="users-rows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <dialog
        id="users-status-dialog"
        aria-labelledby="users-confirm-title"
      >
        <form method="dialog">
          <h3 id="users-confirm-title">
            Change account access?
          </h3>

          <p id="users-confirm-message"></p>

          <div class="up-tools">
            <button
              class="button"
              value="cancel"
              autofocus
            >
              Cancel
            </button>

            <button
              class="button button-primary"
              value="confirm"
              id="users-confirm-button"
            >
              Confirm
            </button>
          </div>
        </form>
      </dialog>
    </div>
  `;

  const note = settings.querySelector('.master-note');

  if (note) {
    note.before(section);
  } else {
    settings.append(section);
  }

  // --------------------------------------------------
  // State and helpers
  // --------------------------------------------------

  const el = (id) => section.querySelector(`#${id}`);

  const root = el('view-users');
  const login = el('users-login-form');
  const create = el('users-create-form');
  const dialog = el('users-status-dialog');

  let token = '';
  let base = '';
  let actor = null;
  let users = [];
  let busy = false;
  let ready = false;

  let timer;
  let pending = null;
  let generation = 0;

  let controller = new AbortController();

  function feedback(message, error = false) {
    el('users-feedback').textContent = message;
    el('users-feedback').dataset.error = String(error);
  }

  function setBusy(value) {
    busy = value;

    root.setAttribute('aria-busy', String(value));

    login.querySelector('button').disabled = value;

    create.querySelector('button').disabled =
      value || !ready;

    el('users-refresh').disabled = value;

    root.querySelectorAll('[data-user-id]')
      .forEach((button) => {
        button.disabled = value || !ready;
      });
  }

  function signOut(
    message = 'Signed out.',
    error = false
  ) {
    generation++;

    controller.abort();
    controller = new AbortController();

    clearTimeout(timer);

    token = '';
    actor = null;
    users = [];
    ready = false;
    pending = null;

    if (dialog.open) {
      dialog.close('cancel');
    }

    login.elements.password.value = '';
    create.reset();

    el('users-rows').replaceChildren();
    el('users-identity').textContent = '';

    el('users-workspace').hidden = true;
    el('users-signout').hidden = true;
    el('users-login-panel').hidden = false;

    setBusy(false);
    feedback(message, error);
  }

  function apiOrigin(value) {
    if (location.protocol === 'file:') {
      throw new Error(
        'Serve the frontend over HTTP instead of ' +
        'opening index.html directly.'
      );
    }

    const url = new URL(value);

    const local = [
      'localhost',
      '127.0.0.1',
      '[::1]'
    ].includes(url.hostname);

    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (
        url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && local)
      )
    ) {
      throw new Error(
        'Enter a trusted HTTPS API origin, or ' +
        'http://localhost:3000 for development.'
      );
    }

    return url.origin;
  }

  // --------------------------------------------------
  // Backend requests
  // --------------------------------------------------

  async function request(
    path,
    method = 'GET',
    body
  ) {
    const stamp = generation;
    const authenticated = Boolean(token);
    const headers = {};

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    if (authenticated) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
      response = await fetch(base + path, {
        method,
        headers,

        body: body
          ? JSON.stringify(body)
          : undefined,

        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error'
      });
    } catch (error) {
      if (
        error.name === 'AbortError' ||
        stamp !== generation
      ) {
        throw new DOMException(
          'Session changed.',
          'AbortError'
        );
      }

      throw new Error(
        'Cannot reach the API. Check its address, ' +
        'backend server, HTTPS and CORS_ORIGINS.'
      );
    }

    const data = await response.json()
      .catch(() => ({}));

    if (stamp !== generation) {
      throw new DOMException(
        'Session changed.',
        'AbortError'
      );
    }

    if (
      authenticated &&
      [401, 403].includes(response.status)
    ) {
      signOut(
        response.status === 401
          ? 'Your session expired or the account ' +
            'was disabled. Sign in again.'
          : 'Administrator access is no longer available.',
        true
      );

      throw new DOMException(
        'Session ended.',
        'AbortError'
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        `Request failed (${response.status}).`
      );
    }

    return data;
  }

  // --------------------------------------------------
  // Account table
  // --------------------------------------------------

  function render() {
    const query = el('users-search').value
      .trim()
      .toLowerCase();

    const filter = el('users-status-filter').value;

    const visible = users.filter((user) => {
      const matchesSearch =
        `${user.displayName} ${user.email}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        filter === 'all' ||
        user.active === (filter === 'active');

      return matchesSearch && matchesStatus;
    });

    el('users-count').textContent = ready
      ? `${visible.length} of ${users.length} accounts`
      : 'Account list unavailable. Refresh to try again.';

    const rows = document.createDocumentFragment();

    for (const user of visible) {
      const row = document.createElement('tr');
      const name = document.createElement('strong');
      const email = document.createElement('small');

      // Use textContent for account data, never innerHTML.
      name.textContent = user.displayName;
      email.textContent = user.email;

      row.insertCell().append(name, email);

      row.insertCell().textContent =
        user.role === 'admin'
          ? 'Administrator'
          : 'Employee';

      const badge = document.createElement('span');

      badge.className =
        `up-badge${user.active ? ' active' : ''}`;

      badge.textContent =
        user.active ? 'Active' : 'Inactive';

      row.insertCell().append(badge);

      const cell = row.insertCell();

      const lastAdmin =
        user.role === 'admin' &&
        user.active &&
        users.filter((item) => (
          item.role === 'admin' && item.active
        )).length <= 1;

      if (user.id === actor?.id || lastAdmin) {
        cell.textContent =
          user.id === actor?.id
            ? 'Your account'
            : 'Last active admin';
      } else {
        const button =
          document.createElement('button');

        button.type = 'button';
        button.className = 'button';
        button.dataset.userId = user.id;

        button.textContent =
          user.active ? 'Deactivate' : 'Activate';

        button.setAttribute(
          'aria-label',
          `${button.textContent} ${user.displayName}`
        );

        button.disabled = busy || !ready;

        cell.append(button);
      }

      rows.append(row);
    }

    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = row.insertCell();

      cell.colSpan = 4;

      cell.textContent = ready
        ? 'No accounts match these filters.'
        : 'Refresh to load accounts.';

      rows.append(row);
    }

    el('users-rows').replaceChildren(rows);
  }

  async function refresh() {
    ready = false;

    try {
      const data = await request('/v1/admin/users');

      if (!Array.isArray(data.users)) {
        throw new Error(
          'Invalid account list returned by the API.'
        );
      }

      users = data.users;
      ready = true;

      render();
    } catch (error) {
      users = [];

      if (token) {
        render();
      }

      throw error;
    }
  }

  async function run(action) {
    if (busy) return;

    setBusy(true);

    try {
      await action();
    } catch (error) {
      if (error.name !== 'AbortError') {
        feedback(error.message, true);
      }
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Settings navigation
  // --------------------------------------------------

  settings.addEventListener('click', (event) => {
    const opening = event.target.closest(
      '[data-open-users]'
    );

    const closing = event.target.closest(
      '[data-users-back]'
    );

    if (opening || closing) {
      settings.querySelectorAll(
        '.master-data-section'
      ).forEach((item) => {
        item.hidden = !opening || item !== section;
      });

      home.hidden = Boolean(opening);

      if (note) {
        note.hidden = Boolean(opening);
      }

      const status = settings.querySelector(
        '#settings-feedback'
      );

      if (status) {
        status.textContent = '';
      }

      const focusTarget = opening
        ? section.querySelector('[data-users-back]')
        : tile;

      focusTarget.focus();
    } else if (
      event.target.closest(
        '[data-open-master-section], ' +
        '[data-open-api-reference], ' +
        '[data-back-to-master], ' +
        '[data-api-back]'
      )
    ) {
      section.hidden = true;
    }
  }, true);

  // --------------------------------------------------
  // Administrator sign-in
  // --------------------------------------------------

  login.addEventListener('submit', (event) => {
    event.preventDefault();

    run(async () => {
      feedback('Signing in…');

      try {
        base = apiOrigin(
          el('users-api').value.trim()
        );

        const data = await request(
          '/v1/auth/login',
          'POST',
          {
            email: login.elements.email.value.trim(),
            password: login.elements.password.value
          }
        );

        if (
          !data.accessToken ||
          data.employee?.role !== 'admin'
        ) {
          signOut(
            'This panel requires an administrator account.',
            true
          );

          return;
        }

        token = data.accessToken;
        actor = data.employee;

        const seconds = Number(data.expiresIn);

        const lifetime =
          Number.isFinite(seconds) && seconds > 0
            ? Math.min(seconds, 900)
            : 900;

        timer = setTimeout(() => {
          signOut(
            'Your session expired. Sign in again.',
            true
          );
        }, lifetime * 1000);

        el('users-login-panel').hidden = true;
        el('users-workspace').hidden = false;
        el('users-signout').hidden = false;

        el('users-identity').textContent =
          `Signed in as ${actor.displayName} · ${actor.email}`;

        await refresh();

        feedback(
          'Accounts loaded. Changes are saved to the backend.'
        );
      } finally {
        login.elements.password.value = '';
      }
    });
  });

  // --------------------------------------------------
  // Create employee login
  // --------------------------------------------------

  create.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!token || !ready) return;

    run(async () => {
      let saved = false;

      try {
        const data = await request(
          '/v1/admin/users',
          'POST',
          {
            displayName:
              create.elements.displayName.value.trim(),

            email:
              create.elements.email.value.trim(),

            password:
              create.elements.password.value
          }
        );

        saved = true;

        create.reset();

        await refresh();

        feedback(
          `Account created for ${data.user.displayName}.`
        );
      } catch (error) {
        if (
          saved &&
          error.name !== 'AbortError'
        ) {
          error.message =
            'Account created, but the list could not refresh. ' +
            error.message;
        }

        throw error;
      } finally {
        create.elements.password.value = '';
      }
    });
  });

  // --------------------------------------------------
  // Refresh
  // --------------------------------------------------

  el('users-refresh').addEventListener('click', () => {
    if (!token) return;

    run(async () => {
      await refresh();
      feedback('Account list refreshed.');
    });
  });

  // --------------------------------------------------
  // Activate / deactivate confirmation
  // --------------------------------------------------

  el('users-rows').addEventListener('click', (event) => {
    const button = event.target.closest(
      '[data-user-id]'
    );

    if (!button || busy || !ready) return;

    const user = users.find((item) => (
      item.id === button.dataset.userId
    ));

    if (!user) return;

    pending = {
      id: user.id,
      active: !user.active
    };

    el('users-confirm-title').textContent =
      user.active
        ? 'Deactivate account?'
        : 'Activate account?';

    el('users-confirm-message').textContent =
      user.active
        ? `${user.displayName} (${user.email}) will lose ` +
          'API access while inactive. Employee and ' +
          'attendance records are kept.'
        : `${user.displayName} (${user.email}) can sign ` +
          'in again with the existing password.';

    el('users-confirm-button').textContent =
      user.active ? 'Deactivate' : 'Activate';

    // Reset this before every opening so Escape cannot
    // reuse a previous "confirm" return value.
    dialog.returnValue = 'cancel';
    dialog.showModal();
  });

  dialog.addEventListener('cancel', () => {
    pending = null;
  });

  dialog.addEventListener('close', () => {
    const change = pending;

    pending = null;

    if (
      dialog.returnValue !== 'confirm' ||
      !change ||
      !token
    ) {
      return;
    }

    run(async () => {
      let saved = false;

      try {
        await request(
          `/v1/admin/users/${encodeURIComponent(change.id)}/status`,
          'PATCH',
          {
            active: change.active
          }
        );

        saved = true;

        await refresh();

        feedback(
          change.active
            ? 'Account activated.'
            : 'Account deactivated.'
        );
      } catch (error) {
        if (
          saved &&
          error.name !== 'AbortError'
        ) {
          error.message =
            'Access changed, but the list could not refresh. ' +
            error.message;
        }

        throw error;
      }
    });
  });

  // --------------------------------------------------
  // Search, filters and session cleanup
  // --------------------------------------------------

  el('users-search').addEventListener(
    'input',
    render
  );

  el('users-status-filter').addEventListener(
    'change',
    render
  );

  el('users-signout').addEventListener(
    'click',
    () => signOut()
  );

  window.addEventListener('pagehide', () => {
    signOut('Sign in to manage accounts.');
  });

  setBusy(false);
})();
