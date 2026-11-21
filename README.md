# FixMate (Server)

The REST API behind FixMate, a repair-service booking platform with Customer, Technician and Admin roles. It is built with Express, MongoDB and Stripe, and it is written in TypeScript.

The Next.js client lives in the [FixMate Client](https://github.com/bappycode/FixMate-Client) repository.

- **API:** https://fixmate-server-neon.vercel.app
- **Client:** https://fixmate-client-peach.vercel.app
- **Health check:** `GET /api/health`

## Demo accounts

These accounts work on the live site, which signs in through the client.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@gmail.com | Admin000 |
| Technician | alex@gmail.com | Alex000 |
| Customer | david@gmail.com | David000 |

## How it works

- **Authentication.** Sign-in is handled by Better Auth in the client app. The client sends its JWT as `Authorization: Bearer <token>`. This server checks the signature against the client's public keys (`<AUTH_BASE_URL>/api/auth/jwks`) and then reads the user's **current role from MongoDB on every request**, so a role change takes effect at once.
- **Roles.** `verifyCustomer`, `verifyTechnician` and `verifyAdmin` guard the routes. `401` means there is no valid token, `403` means the wrong role. Every customer or technician query also matches the signed-in email, so users can only see and change their own records. Another user's record answers `404`.
- **Validation.** Hand-written validators check every body and query string, and reject anything unexpected.
- **Job pipeline.** One table (`BOOKING_TRANSITIONS`) says which status can follow which, and who may make the change. Anything else is refused, and each update re-checks the current status inside the database query, so two people cannot race each other. Every change is also saved in the booking's `statusHistory`, which drives the timeline in the client.
- **Payments.** Stripe hosted Checkout. The server creates the session from the amount **stored in the database** (never from the browser), then confirms the payment in two independent ways: when the customer lands on the success page (`/verify`) and through a signed webhook. Both use one function, and unique indexes make sure a payment is saved only once.

## Tech stack

Node.js 22, Express 5, MongoDB (official driver), Stripe, `jose` (JWT verification), Helmet, CORS, `express-rate-limit`, TypeScript.

### npm packages used

| Package | Used for |
| --- | --- |
| `express` | The web server and routing |
| `mongodb` | Database driver |
| `stripe` | Stripe Checkout sessions, payment verification and webhook signatures |
| `jose` | Verifying the JWT against the client's public keys |
| `cors` | Allowing only the client's address to call the API |
| `helmet` | Secure HTTP headers |
| `express-rate-limit` | Limiting how many requests one address can make |
| `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors` | TypeScript and running it in development |

## API overview

All routes start with `/api`. "Public" routes need no token.

**Services**

| Method and path | Who | What it does |
| --- | --- | --- |
| `GET /services` | Public | Approved, available services. Query: `search`, `category`, `mode`, `sort` (`newest`, `price-asc`, `price-desc`), `page`, `limit`. Returns `{ services, total, page, pageSize }` |
| `GET /services/:id` | Public | One service with its technician's public summary |
| `POST /services` | Technician | Add a service (starts as `pending`) |
| `GET /services/mine` | Technician | Own services |
| `GET /services/mine/:id` | Technician | One own service |
| `PATCH /services/:id` | Technician | Edit (sends it back to `pending`) |
| `PATCH /services/:id/availability` | Technician | Switch on or off |
| `DELETE /services/:id` | Technician | Delete |

**Bookings**

| Method and path | Who | What it does |
| --- | --- | --- |
| `POST /bookings` | Customer | Request a repair |
| `GET /bookings/my` | Customer | Own bookings |
| `PATCH /bookings/:id/cancel` | Customer | Cancel while still `requested` |
| `GET /bookings/technician` | Technician | Requests for own services (`?status=`) |
| `PATCH /bookings/:id/status` | Technician | Move the job forward. Completing needs `finalAmount` |

**Payments**

| Method and path | Who | What it does |
| --- | --- | --- |
| `POST /payments/create-checkout-session` | Customer | Create a Stripe Checkout session for a completed, unpaid booking. Returns `{ url }` |
| `GET /payments/verify?session_id=` | Customer | Confirm a payment after Stripe redirects back |
| `GET /payments/my` | Customer | Payment history |
| `POST /payments/webhook` | Stripe | Signed webhook (raw body) |

**Users and admin**

| Method and path | Who | What it does |
| --- | --- | --- |
| `PATCH /users/profile` | Any signed-in user | Update name, photo, area and bio |
| `GET /admin/stats` | Admin | Totals and chart data (bookings by status, users by role, revenue by month) |
| `GET /admin/users` | Admin | All users |
| `PATCH /admin/users/:id/role` | Admin | Change a role (not your own) |
| `GET /admin/services` | Admin | All services (`?status=`) |
| `PATCH /admin/services/:id/approval` | Admin | Approve or reject |
| `GET /admin/bookings` | Admin | All bookings (`?status=`) |
| `GET /admin/payments` | Admin | All payments and total revenue |

## Project structure

```
src/
  app.ts           Express app (exported for Vercel)
  config/          environment variables
  constants/       roles, statuses, categories, the status pipeline
  lib/             database, collections and indexes, Stripe, payment settling
  middlewares/     token and role checks, error handling
  routes/          admin, bookings, payments, services, users
  validators/      request validation
  utils/           small helpers (object ids, filters, status rules)
  types/           shared TypeScript types
```

## Deployment

Deploy to [Vercel](https://vercel.com). `AUTH_BASE_URL` and `CLIENT_ORIGINS` must be the deployed client URL. In the Stripe Dashboard, point a webhook endpoint at `<server URL>/api/payments/webhook` and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
