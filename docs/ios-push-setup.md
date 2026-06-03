# iOS Push Notifications — Setup & Validation

Kindred is a **web app**, so on iPhone it uses the **Web Push standard** (VAPID),
not APNs directly. Apple's WebKit relays Web Push messages to APNs on your
behalf — you do **not** need an Apple Developer account, APNs key, or APNs
certificate for this to work.

The trade-off: iOS imposes strict requirements that desktop browsers don't.

---

## Hard requirements on iPhone

For push to fire on iOS, **all** of the following must be true:

1. **iOS 16.4 or later.** Earlier iOS versions have *no* Web Push support at all — no permission prompt, no notifications, period.
2. **The site is served over HTTPS** with a valid certificate. `lovable.app` domains and custom domains added through Lovable already satisfy this.
3. **The app is installed to the Home Screen.** Web Push on iOS only works for PWAs added via *Share → Add to Home Screen*. It does **not** work in a regular Safari tab. (This is different from Android/desktop Chrome.)
4. **Launched from the Home Screen icon at least once**, and notification permission granted from inside that installed PWA (not from Safari).
5. **A registered service worker** that handles `push` events.
6. **A valid Web App Manifest** with at least `name`, `icons`, `start_url`, and `display: "standalone"` (or `"fullscreen"`).
7. **Focus / Notification Settings allow it.** On the device: Settings → Notifications → *Kindred* → Allow Notifications. Focus modes (Do Not Disturb, Sleep) will silence them.

If any one of these is missing, the *Enable notifications* button will either do nothing or the permission prompt will never appear.

---

## What we have today vs. what's still needed

The current build uses the browser **`Notification` API directly**, which only fires while the app is **open in a tab/PWA window**. That's enough for desktop and Android in many cases, but on iOS it effectively means "notifications only when you're already using the app" — which defeats the purpose.

To get real background push on iPhone we need to add:

| Piece | Status | Needed for iOS push |
|---|---|---|
| Notification permission prompt | ✅ Implemented | Yes |
| `Notification(...)` foreground alerts | ✅ Implemented | No (foreground only) |
| Web App Manifest (`manifest.webmanifest`) | ❌ Missing | **Yes** |
| Service worker with `push` event handler | ❌ Missing | **Yes** |
| VAPID key pair (public + private) | ❌ Missing | **Yes** |
| `PushManager.subscribe({ applicationServerKey })` | ❌ Missing | **Yes** |
| `push_subscriptions` table to store endpoints | ❌ Missing | **Yes** |
| Server function that POSTs to each subscription's endpoint | ❌ Missing | **Yes** |
| `pg_cron` daily job calling that function | ❌ Missing | **Yes** |

Until those are added, **the *Enable notifications* button will not produce background pushes on iPhone**, regardless of how the user installs the app. It will only show alerts while the PWA window is in the foreground.

> ⚠️ Heads-up about Lovable previews: service workers are intentionally **disabled inside the editor preview iframe** to avoid stale caches. Push must be tested on the **published** `.lovable.app` URL (or your custom domain) — not the preview.

---

## End-to-end validation checklist (once Web Push is wired up)

Run this on a physical iPhone, not the simulator (the simulator does not deliver real pushes):

1. **Device prep**
   - [ ] iPhone on iOS **16.4+** (Settings → General → About → Software Version).
   - [ ] Connected to the internet, not in Airplane / Low Power / Focus mode.

2. **Install to Home Screen**
   - [ ] Open the **published** site in Safari (not Chrome, not in-app browsers like Instagram or Slack).
   - [ ] Tap Share → *Add to Home Screen* → *Add*.
   - [ ] Close Safari. Launch the app from the new home-screen icon.

3. **Grant permission**
   - [ ] Tap *Enable notifications* inside the installed PWA.
   - [ ] Confirm the iOS system prompt → *Allow*.
   - [ ] On device: Settings → Notifications → Kindred → confirm *Allow Notifications* is on, with *Banners* and *Sounds* as desired.

4. **Verify subscription was stored**
   - [ ] Backend: a new row exists in `push_subscriptions` for this user with a non-empty `endpoint`, `p256dh`, and `auth`.

5. **Force a test push**
   - [ ] Trigger the send function manually (or insert a test row that the function picks up).
   - [ ] Confirm the notification appears on the lock screen **with the PWA closed and the phone locked**. This is the real test — foreground alerts don't prove background delivery.

6. **Verify the 3-day rule end-to-end**
   - [ ] Create a test person with `birthdate` exactly 3 days from today.
   - [ ] Manually trigger the daily cron endpoint.
   - [ ] Confirm exactly one notification arrives and a row is written to `reminder_log` so the same birthday is not re-sent.

---

## Common iPhone-specific failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| *Enable notifications* button does nothing | App opened in Safari tab, not installed PWA | Add to Home Screen, open from icon |
| No system permission prompt appears | iOS < 16.4, or already denied previously | Update iOS; or Settings → Notifications → Kindred → re-enable |
| Permission granted but pushes never arrive | No service worker registered, or VAPID public key on client doesn't match private key on server | Re-check SW registration in DevTools (via Mac Safari → Develop → iPhone); re-issue VAPID keys |
| Pushes work for 1–2 days then stop | Subscription `endpoint` expired/rotated by Apple and wasn't refreshed | On every app launch, call `pushManager.getSubscription()` and upsert into `push_subscriptions`; delete rows when the send function gets a 404/410 |
| Notifications arrive in the editor preview but not in production (or vice versa) | Different origins → different SW scopes → different subscriptions | Always test on the published URL; treat preview as foreground-only |
| Notification arrives but app icon doesn't open it | `notificationclick` handler missing in the SW | Add `self.addEventListener('notificationclick', e => clients.openWindow('/'))` |

---

## Appendix: native iOS app via Capacitor (only if you ever wrap it)

If we later wrap Kindred as a real native iOS app (App Store), Web Push is replaced by **native APNs** and the setup changes significantly. You would then need:

1. A paid **Apple Developer Program** membership ($99/yr).
2. An **App ID** with the *Push Notifications* capability enabled in https://developer.apple.com/account/resources/identifiers/list.
3. An **APNs Auth Key** (`.p8`) created at https://developer.apple.com/account/resources/authkeys/list — note the **Key ID** and your **Team ID**.
4. The `.p8`, Key ID, and Team ID stored as backend secrets so the server can sign APNs JWTs.
5. In the Capacitor project, install `@capacitor/push-notifications`, add the *Push Notifications* and *Background Modes → Remote notifications* capabilities in Xcode, and call `PushNotifications.register()` to obtain the device token.
6. POST the device token to your backend so it can be used as the APNs recipient.
7. Send pushes via `https://api.push.apple.com/3/device/<token>` with the JWT signed by the `.p8` key.

This is a meaningful amount of work and an annual cost. It's only worth doing if Web Push limitations (must be installed PWA, no rich actions, no critical alerts) become a real blocker.
