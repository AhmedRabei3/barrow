# Rental Reminder Deployment

## Preferred Production Setup

Run the rental reminder worker as its own long-running process:

```bash
npm run worker:rental:reminders
```

Environment variables:

```bash
RENTAL_REMINDER_POLL_MS=1800000
RENTAL_REMINDER_LOOKAHEAD_HOURS=24
RENTAL_REMINDER_DEDUPE_HOURS=24
```

This is the safer deployment model because the web server and the reminder worker can be scaled independently.

## Single-Node Runtime Setup

If the deployment target only supports one start command, use the runtime launcher:

```bash
npm run build:ws
ENABLE_RENTAL_REMINDER_WORKER=1 npm run start:runtime
```

What it does:

- Starts the production web server with `npm run start:ws`
- Starts the rental reminder worker with `npm run worker:rental:reminders`
- Stops all child processes when one of them exits or when the platform sends `SIGINT` or `SIGTERM`

Optional worker flags supported by the runtime launcher:

```bash
ENABLE_RENTAL_REMINDER_WORKER=1
ENABLE_SHAMCASH_INCOMING_WORKER=1
ENABLE_SHAMCASH_PAYOUT_WORKER=1
```

## Validation Mode

To run the rental reminder worker once without keeping it alive:

```bash
RENTAL_REMINDER_RUN_ONCE=1 npm run worker:rental:reminders
```

## Operational Notes

- Run only one rental reminder worker instance unless you add a distributed lock.
- The worker currently writes notifications directly to the database.
- If there are no rentals ending within the configured window, the worker exits its one-shot check with `Scanned=0 Notifications=0`.
