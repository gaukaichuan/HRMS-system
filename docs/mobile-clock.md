# Mobile clock frontend preview

The mobile-first clock page is `clock.html` at the repository root. Once the frontend is deployed to a static web host, its address will be:

```text
https://YOUR-HOST/clock.html
```

There is no public URL until you deploy the repository. For a quick local preview, run a static web server from the repository root (for example `python3 -m http.server 8000`) and open `http://localhost:8000/clock.html` on the same computer. To test from a phone on the same network, open `http://YOUR-COMPUTER-LAN-IP:8000/clock.html`; location permission generally requires HTTPS, except on localhost.

## What the preview does

- Fits phone screens and offers installable-web-app metadata (`manifest.webmanifest`). Android Chrome may offer **Add to Home screen** when hosted on HTTPS. This is a PWA-style install, not an APK.
- Shows local time and date, a fictional demo employee, shift state, and clock-in/out controls.
- Lets you try a location permission prompt. Coordinates are not persisted or sent anywhere.
- Saves preview clock state only in this browser's local storage. It does not sync to the API, verify Wi-Fi, or create official attendance records.
- Leaves face verification disabled and does not access the camera.

The service worker caches the page shell for display offline only. It does not queue clock actions; the page clearly treats them as a local preview. Do not enter real employee data.

## APK later

Yes. After the backend and authentication are connected and the page has a stable HTTPS deployment URL, the web frontend can be packaged as an Android app, for example with Capacitor. The app should use the hosted web app or a maintained web build, and be tested for secure token storage, location permission, app lifecycle, and offline behavior. A PWA install by itself does not produce an APK.
