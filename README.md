# Payments Ledger API

A production-oriented double-entry payments ledger backend built with **Node.js**, **Express**, and **PostgreSQL**. Designed around financial data integrity, concurrency safety, idempotent retries, and immutable audit trails.

---

## Core Engineering Highlights

* **Double-Entry Accounting & Minor-Unit Math:** Every deposit, transfer, and reversal records paired `DEBIT` (`-amount`) and `CREDIT` (`+amount`) rows in `ledger_entries` that always sum to zero. Monetary values are stored as integer minor units (`BIGINT` paise/cents) to eliminate floating-point precision bugs.
* **Deadlock-Safe Concurrency Control:** Peer-to-peer transfers run inside PostgreSQL ACID transactions using pessimistic row-level locking (`SELECT ... FOR UPDATE`). Account rows are locked in deterministic ascending UUID order (`ORDER BY id ASC`) to prevent circular deadlocks under concurrent traffic.
* **Idempotent Transfers (`Idempotency-Key`):** Prevents duplicate charges during network timeouts and client retries. Keys are scoped per `(user_id, idempotency_key)` with a 24-hour TTL, `SHA-256` request payload fingerprinting (`422` on parameter tampering), in-flight concurrency locks (`409` on simultaneous retries), and `X-Idempotent-Replay` response headers.
* **Immutable Transfer Reversals:** Historical `ledger_entries` are never updated or deleted. Refunds (`POST /api/v1/transfers/:id/reverse`) execute compensating `REVERSAL` transactions with flipped `DEBIT`/`CREDIT` entries, linked via `reversed_transfer_id` and protected against double-reversals by a PostgreSQL partial unique index.
* **Authentication & Object-Level Authorization (BOLA):** Stateless JWT authentication paired with `bcrypt` password hashing (12 salt rounds) and strict ownership checks ensuring users can only view, debit, or reverse their own accounts and transfers.
* **Security Hardening & Structured Observability:** Configured with `helmet` HTTP security headers, `10kb` JSON payload limits, tiered rate limiting (`express-rate-limit`) to mitigate brute-force login attacks, `X-Request-Id` correlation headers, and `pino` structured JSON logging with automatic redaction of passwords and `Authorization` headers.

---

## Tech Stack

* **Runtime & Framework:** Node.js, Express
* **Database:** PostgreSQL (`pg` connection pooling + raw SQL migrations)
* **Validation & Security:** Joi, JWT (`jsonwebtoken`), `bcrypt`, `helmet`, `express-rate-limit`
* **Observability:** `pino` (structured JSON logging with secret redaction & request correlation)

---

## Architecture & Database Schema

```text
Client (Postman / Web / Mobile)
        │
        ▼
Express Middleware Pipeline
  ├── helmet() + express.json({ limit: '10kb' })
  ├── requestLogger (assigns X-Request-Id + pino JSON telemetry)
  ├── Tiered Rate Limiters (10 req/15m on /auth, 100 req/15m on /api/v1)
  ├── requireAuth (JWT verification) + Joi payload validation
        │
        ▼
Service & Repository Layer (ACID Transactions)
  ├── idempotency_keys  ──► Atomic claim + SHA-256 payload check
  ├── accounts          ──► Deterministic FOR UPDATE row locks + balance invariants
  ├── transfers         ──► TRANSFER / DEPOSIT / REVERSAL state + partial unique index
  └── ledger_entries    ──► Append-only DEBIT / CREDIT audit trail (SUM = 0)
```

### Database Tables
1. **`users`**: User credentials (`password_hash`) and profile metadata.
2. **`accounts`**: Multi-currency user accounts (`balance_minor`, `currency`, `status`, `is_system`) with non-negative balance constraints for customer accounts.
3. **`transfers`**: Payment records tracking `from_account_id`, `to_account_id`, `amount_minor`, `transfer_type` (`DEPOSIT`, `TRANSFER`, `REVERSAL`), `status`, and `reversed_transfer_id`.
4. **`ledger_entries`**: Append-only double-entry journal (`DEBIT` and `CREDIT` legs) linked to `transfers`.
5. **`idempotency_keys`**: Stores `(user_id, idempotency_key)`, `request_hash` (`SHA-256`), cached HTTP response, and `expires_at`.

---

## API Endpoints

All endpoints (except `/health` and `/auth/*`) require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description | Key Headers / Notes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service and PostgreSQL health check | Returns uptime & DB status |
| `POST` | `/api/v1/auth/register` | Register a new user | Rate-limited (10 req / 15 min) |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT | Rate-limited (10 req / 15 min) |
| `POST` | `/api/v1/accounts` | Create a new currency account (`INR`, `USD`, `EUR`) | Scoped to authenticated user |
| `GET` | `/api/v1/accounts` | List all accounts owned by current user | BOLA-protected |
| `POST` | `/api/v1/accounts/:id/deposit` | Deposit funds from system reserve | Creates balanced `DEBIT`/`CREDIT` entries |
| `GET` | `/api/v1/accounts/:id/ledger` | Fetch account transaction history & balance audit | Verifies `SUM(entries) === balance_minor` |
| `POST` | `/api/v1/transfers` | Execute atomic P2P transfer | Requires `Idempotency-Key` header |
| `GET` | `/api/v1/transfers/:id` | Fetch transfer details & double-entry legs | Accessible only to sender or receiver |
| `POST` | `/api/v1/transfers/:id/reverse` | Post an immutable compensating reversal | Fails with `422` if already reversed |

---

## Getting Started (Local Setup)

### 1. Prerequisites
* Node.js (v18+)
* PostgreSQL (v14+)

### 2. Clone & Install Dependencies
```bash
git clone [https://github.com/](https://github.com/)<your-username>/payments-ledger.git
cd payments-ledger
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
NODE_ENV=development
PORT=3000
SERVICE_NAME=payments-ledger
LOG_LEVEL=info

DATABASE_URL=postgresql://localhost:5432/payments_ledger

JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=15m
```

### 4. Create Database & Run Migrations
```bash
createdb payments_ledger
npm run migrate
```

### 5. Start the Development Server
```bash
npm run dev
```
The API will be available at `http://localhost:3000/api/v1`.

---

## Testing with Postman

1. Import the Postman collection (if exported to `docs/payments-ledger.postman_collection.json`) or set a collection variable `baseUrl = http://localhost:3000/api/v1`.
2. Call **`POST /auth/login`** to obtain an `accessToken` and set it as your Bearer Token.
3. Create two accounts via **`POST /accounts`**, fund the sender via **`POST /accounts/:id/deposit`**, and send a transfer via **`POST /transfers`** with header `Idempotency-Key: <uuid>`.
4. Re-send the exact same **`POST /transfers`** request with the same `Idempotency-Key` to observe `X-Idempotent-Replay: true` without double-debiting the sender.
5. Call **`POST /transfers/:id/reverse`** and inspect **`GET /accounts/:id/ledger`** to verify the immutable reversal entries and `"isBalanced": true`.
