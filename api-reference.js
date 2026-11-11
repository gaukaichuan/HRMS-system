(() => {
  'use strict';

  const view = document.querySelector('#view-settings');
  const home = document.querySelector('#master-data-home');
  const note = view?.querySelector('.master-note');
  if (!view || !home || !note) return;

  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'master-data-tile api-reference-tile';
  tile.dataset.openApiReference = 'true';
  tile.innerHTML = `
    <span class="master-data-icon api-reference-icon" aria-hidden="true">⌘</span>
    <span class="master-data-tile-copy">
      <strong>API reference</strong>
      <small>Copy the local API base URL, endpoints, and request examples.</small>
    </span>
    <span class="master-data-arrow" aria-hidden="true">→</span>
  `;
  home.append(tile);

  const section = document.createElement('section');
  section.className = 'master-data-section api-reference-section';
  section.id = 'master-section-api-reference';
  section.hidden = true;
  section.innerHTML = `
    <div class="master-section-heading">
      <button type="button" class="button button-secondary" data-api-back>
        ← Settings
      </button>
      <div>
        <span class="master-data-icon api-reference-icon" aria-hidden="true">⌘</span>
        <div>
          <h2>API reference</h2>
          <p>Starter attendance API · local development</p>
        </div>
      </div>
    </div>

    <div class="panel api-reference-card">
      <div class="api-callout" role="note">
        <strong>Not connected yet</strong>
        <span>This is a copyable reference for the starter backend. The mobile clock frontend does not send requests to this API yet. Start the server and change the base URL when you deploy it.</span>
      </div>

      <label class="api-base-field" for="api-base-url">
        API base URL
        <span class="api-base-control">
          <input id="api-base-url" type="url" value="http://localhost:3000" autocomplete="url" spellcheck="false">
          <button type="button" class="button button-secondary" data-copy-base>Copy URL</button>
        </span>
        <small>For a phone, localhost means the phone itself. Use your computer's reachable LAN address during local testing, or your deployed HTTPS URL.</small>
      </label>

      <div class="api-auth-note">
        <strong>Authentication</strong>
        <span>Sign in first. Add the returned access token to protected requests as <code>Authorization: Bearer &lt;accessToken&gt;</code>. Never paste passwords or access tokens into this reference or a public place.</span>
      </div>

      <div class="api-endpoints">
        <h3>Endpoints</h3>
        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method post">POST</span><code>/v1/auth/login</code><span class="api-access public">Public</span></div>
          <p>Sign in and receive a short-lived access token.</p>
          <pre><code>{
  "email": "employee@example.com",
  "password": "your-password"
}</code></pre>
          <button type="button" class="api-copy" data-copy-path="/v1/auth/login">Copy full URL</button>
        </article>

        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method get">GET</span><code>/v1/me</code><span class="api-access protected">Bearer token</span></div>
          <p>Get the profile for the signed-in employee.</p>
          <button type="button" class="api-copy" data-copy-path="/v1/me">Copy full URL</button>
        </article>

        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method get">GET</span><code>/v1/clocking/methods</code><span class="api-access protected">Bearer token</span></div>
          <p>Check which clocking methods are configured on the server. Face verification is currently disabled.</p>
          <button type="button" class="api-copy" data-copy-path="/v1/clocking/methods">Copy full URL</button>
        </article>

        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method get">GET</span><code>/v1/attendance/today</code><span class="api-access protected">Bearer token</span></div>
          <p>Get today's attendance for the signed-in employee.</p>
          <button type="button" class="api-copy" data-copy-path="/v1/attendance/today">Copy full URL</button>
        </article>

        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method post">POST</span><code>/v1/attendance/clock-in</code><span class="api-access protected">Bearer token</span></div>
          <p>Record a clock-in. The server supplies the timestamp.</p>
          <pre><code>{ "method": "wifi" }</code></pre>
          <p class="api-or">Or, with a user-granted location reading:</p>
          <pre><code>{
  "method": "location",
  "location": {
    "latitude": 0,
    "longitude": 0,
    "accuracyMeters": 25
  }
}</code></pre>
          <button type="button" class="api-copy" data-copy-path="/v1/attendance/clock-in">Copy full URL</button>
        </article>

        <article class="api-endpoint">
          <div class="api-endpoint-heading"><span class="api-method post">POST</span><code>/v1/attendance/clock-out</code><span class="api-access protected">Bearer token</span></div>
          <p>Record a clock-out using the same request body as clock-in.</p>
          <button type="button" class="api-copy" data-copy-path="/v1/attendance/clock-out">Copy full URL</button>
        </article>
      </div>

      <div class="api-response-note">
        <strong>Common responses</strong>
        <span><code>401</code> sign in again · <code>403</code> verification failed · <code>409</code> duplicate or invalid clock sequence. The API README has setup instructions and method limitations.</span>
      </div>
      <p class="api-copy-status" role="status" aria-live="polite"></p>
    </div>
  `;
  note.before(section);

  const copyStatus = section.querySelector('.api-copy-status');
  const baseInput = section.querySelector('#api-base-url');

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const temporary = document.createElement('textarea');
        temporary.value = value;
        temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.append(temporary);
        temporary.select();
        const copied = document.execCommand('copy');
        temporary.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      copyStatus.textContent = 'Copied to clipboard.';
      copyStatus.classList.remove('is-error');
    } catch {
      copyStatus.textContent = 'Could not copy automatically. Select and copy the URL manually.';
      copyStatus.classList.add('is-error');
    }
  }

  view.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-api-reference]');
    if (open) {
      home.hidden = true;
      view.querySelectorAll('.master-data-section').forEach((item) => {
        item.hidden = item !== section;
      });
      note.hidden = true;
      const feedback = view.querySelector('#settings-feedback');
      if (feedback) feedback.textContent = '';
      copyStatus.textContent = '';
      section.querySelector('[data-api-back]').focus();
      return;
    }

    if (event.target.closest('[data-api-back]')) {
      section.hidden = true;
      home.hidden = false;
      note.hidden = false;
      home.querySelector('[data-open-api-reference]').focus();
      return;
    }

    if (event.target.closest('[data-copy-base]')) {
      copyText(baseInput.value.trim().replace(/\/+$/, ''));
      return;
    }

    const endpoint = event.target.closest('[data-copy-path]');
    if (endpoint) {
      const base = baseInput.value.trim().replace(/\/+$/, '');
      if (!base) {
        copyStatus.textContent = 'Enter the API base URL first.';
        copyStatus.classList.add('is-error');
        baseInput.focus();
        return;
      }
      copyText(`${base}${endpoint.dataset.copyPath}`);
    }
  });
})();
