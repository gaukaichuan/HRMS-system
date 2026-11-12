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
      <strong>User control</strong>
      <small>Manage system users and prepare new user accounts.</small>
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
      <button
        type="button"
        class="button button-secondary"
        data-users-back
      >
        ← Settings
      </button>

      <div class="user-control-heading">
        <div>
          <h2 id="users-title">User control</h2>
          <p>Set up and review user accounts for the HRMS.</p>
        </div>
      </div>

      <p class="user-control-notice" role="note">
        This is the user-control panel preview. Account creation and user management
        are not connected yet.
      </p>

      <div class="user-control-grid">
        <section class="user-control-card" aria-labelledby="user-create-title">
          <h3 id="user-create-title">Create a new user</h3>
          <p>Enter the account details below. Creation will be enabled in a later update.</p>

          <form class="user-control-form">
            <label>
              User ID
              <input name="loginId" autocomplete="off" placeholder="e.g. jsmith">
            </label>

            <label>
              Full name
              <input name="displayName" autocomplete="name" placeholder="Enter the user's name">
            </label>

            <label>
              Email address
              <input name="email" type="email" autocomplete="email" placeholder="name@example.com">
            </label>

            <label>
              Role
              <select name="role">
                <option value="">Select a role</option>
                <option value="admin">Administrator</option>
                <option value="employee">Employee</option>
              </select>
            </label>

            <label>
              Temporary password
              <input name="password" type="password" autocomplete="new-password" placeholder="Set an initial password">
            </label>

            <button class="button button-primary" type="button" disabled>
              Create user · coming soon
            </button>
          </form>

          <p class="user-control-note">
            The form is visual only for now; details are not saved or sent anywhere.
          </p>
        </section>

        <section class="user-control-card" aria-labelledby="user-list-title">
          <h3 id="user-list-title">Users</h3>
          <p>Accounts will appear here when user management is connected.</p>

          <div class="user-control-table-wrap">
            <table class="user-control-table" aria-label="User accounts">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="user-control-empty" colspan="4">
                    No user records to display yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;

  const note = settings.querySelector('.master-note');

  if (note) {
    note.before(section);
  } else {
    settings.append(section);
  }

  settings.addEventListener('click', (event) => {
    const opening = event.target.closest('[data-open-users]');
    const closing = event.target.closest('[data-users-back]');

    if (opening || closing) {
      settings.querySelectorAll('.master-data-section').forEach((item) => {
        item.hidden = !opening || item !== section;
      });

      home.hidden = Boolean(opening);

      if (note) {
        note.hidden = Boolean(opening);
      }

      const status = settings.querySelector('#settings-feedback');

      if (status) {
        status.textContent = '';
      }

      (opening
        ? section.querySelector('[data-users-back]')
        : tile
      ).focus();
    } else if (
      event.target.closest(
        '[data-open-master-section], [data-open-api-reference], ' +
        '[data-back-to-master], [data-api-back]'
      )
    ) {
      section.hidden = true;
    }
  }, true);
})();
