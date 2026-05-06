# Production Launch Checklist

## 1) Domain and DNS

- [ ] Buy the domain and set DNS A/AAAA/CNAME records for app and www.
- [ ] Configure canonical host redirect (www -> root or root -> www).
- [ ] Verify DNS propagation in at least 2 public DNS checkers.

## 2) TLS and Security Headers

- [ ] Enforce HTTPS with auto redirect from HTTP.
- [ ] Install and renew TLS certificates automatically.
- [ ] Set HSTS, X-Content-Type-Options, Referrer-Policy, and frame protections.
- [ ] Review Content Security Policy to allow only required origins.

## 3) Environment and Secrets

- [ ] Populate production env vars (database, auth, firebase, payment providers).
- [ ] Rotate all development secrets and API keys.
- [ ] Ensure NEXTAUTH_URL points to the production domain.
- [ ] Verify no secret is committed in repository history.

## 4) Database and Data Safety

- [ ] Run Prisma migrations on production database.
- [ ] Create daily backup policy and verify restore procedure.
- [ ] Add alerting for failed migrations and DB connectivity.
- [ ] Validate seed data required for core app flows.

## 5) Payments and Financial Integrity

- [ ] Validate payment webhooks with production callback URLs.
- [ ] Verify owner withdrawable calculation after 1% operating reserve change.
- [ ] Verify monthly carry-over fields in financial report.
- [ ] Run one full payment -> ledger -> withdrawal reconciliation sample.

## 6) Notifications and Realtime

- [ ] Confirm FCM foreground and background notifications on Android and desktop.
- [ ] Confirm badge count updates on supported browsers (setAppBadge/clearAppBadge).
- [ ] Confirm title-count fallback works when Badge API is unavailable.
- [ ] Validate websocket reconnect behavior after network interruption.

## 7) Performance and UX

- [ ] Verify admin panel lazy loading in production build.
- [ ] Measure first-load JS for key routes and set regression thresholds.
- [ ] Ensure image optimization and caching headers are active.
- [ ] Confirm mobile layout for home, details, chat, and admin pages.

## 8) Monitoring and Operations

- [ ] Enable centralized logging with error correlation IDs.
- [ ] Add uptime monitoring for app, DB, and websocket endpoints.
- [ ] Add alerting thresholds for 5xx rate, latency, and payment failures.
- [ ] Prepare incident runbook and rollback procedure.

## 9) Pre-Launch Smoke Tests

- [ ] User sign-in/sign-up.
- [ ] Add listing and view listing details.
- [ ] Chat send/receive and unread count behavior.
- [ ] Push notification and app icon/title badge behavior.
- [ ] Admin financial report and payment settings visibility.

## 10) Go-Live

- [ ] Deploy tagged release.
- [ ] Warm cache and verify robots/sitemap endpoints.
- [ ] Run post-deploy smoke tests.
- [ ] Announce launch and monitor dashboards for first 24 hours.
