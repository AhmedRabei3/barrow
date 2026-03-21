# ShamCash API Integration (Session-Based)

This project now uses a direct server-to-server ShamCash API flow for withdrawals.
The old browser worker automation flow was removed.

For subscription activation, the app now supports ShamCash QR transfers with
automatic activation via webhook (no Playwright/browser session dependency).

## Why This Is Better

- No browser automation in production.
- No DOM selectors or Playwright profiles.
- Stable session/token handling from backend only.
- Centralized validation and balance updates in one API route.

## Runtime Flow

1. User submits `walletCode` and `amount` from profile page.
2. `POST /api/pay/shamcash/withdraw` validates auth, subscription, and balance.
3. Server creates/reuses ShamCash session token via login endpoint.
4. Server sends withdrawal request to ShamCash API.
5. On success, app decrements user balance and stores charging log.

## QR Subscription Activation Flow

1. User opens payment page and chooses ShamCash.
2. App shows a configurable QR code and wallet code.
3. User transfers the monthly subscription amount and writes account email in the transfer note.
4. `POST /api/webhooks/shamcash` receives transfer notification.
5. Backend parses email from payload/note, finds user, verifies amount, and activates subscription for 30 days.
6. Processing is idempotent by external transfer ID.

## Required Environment Variables

- `SHAMCASH_API_BASE_URL`
- `SHAMCASH_API_LOGIN_PATH`
- `SHAMCASH_API_WITHDRAW_PATH`
- `SHAMCASH_API_USERNAME`
- `SHAMCASH_API_PASSWORD`

Optional:

- `SHAMCASH_API_KEY`
- `SHAMCASH_API_KEY_HEADER`
- `SHAMCASH_API_AUTH_HEADER`
- `SHAMCASH_API_AUTH_SCHEME`
- `SHAMCASH_API_TIMEOUT_MS`
- `SHAMCASH_API_SESSION_TTL_MS`
- `SHAMCASH_API_LOGIN_USERNAME_FIELD`
- `SHAMCASH_API_LOGIN_PASSWORD_FIELD`
- `SHAMCASH_API_WITHDRAW_WALLET_FIELD`
- `SHAMCASH_API_WITHDRAW_AMOUNT_FIELD`
- `SHAMCASH_API_WITHDRAW_NOTE_FIELD`
- `SHAMCASH_API_WITHDRAW_REFERENCE_FIELD`
- `SHAMCASH_API_WITHDRAW_CURRENCY_FIELD`
- `SHAMCASH_WEBHOOK_SECRET` (recommended for webhook signature verification)
- `SHAMCASH_WEBHOOK_TOKEN` (fallback token auth)

## API Requirement Discovery Note

Attempted public discovery from common docs endpoints on `api.shamcash.com` (`/docs`, `/swagger`, `/openapi.json`) returned 404.
You need official endpoint specs and credential format from ShamCash support/business team.

## Files Added

- `src/lib/shamcashApi/client.ts`
- `src/app/api/pay/shamcash/withdraw/route.ts`
