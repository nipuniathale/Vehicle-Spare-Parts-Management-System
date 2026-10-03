# AutoHub Lanka – Spare Parts Management & E-commerce System

Spring Boot 4 (Java 17) REST API + React 19 (Vite, Tailwind CSS 4) web app, backed by Microsoft SQL Server.

```
autohub/
├── backend/            Spring Boot API (package com.autohublanka)
├── frontend/           React storefront + staff dashboard + supplier portal
└── docs/
    ├── TESTING_GUIDE.md   step-by-step build & test order (start here)
    ├── DESIGN_PATTERNS.md design patterns used and where to find them
    └── api_test.py        automated API test (392 checks)
```

---

## 1. Run it

### Database
Run this in SSMS as `sa` / an admin login:
```sql
CREATE DATABASE AutoHubLankaDB;
GO
USE AutoHubLankaDB;
GO
-- give the application login access to the NEW database
CREATE USER springuser FOR LOGIN springuser;
ALTER ROLE db_owner ADD MEMBER springuser;
GO
```
(If the `springuser` login does not exist yet:
`CREATE LOGIN springuser WITH PASSWORD = 'SpringUser@12345#';` first, in `master`.)

SQL Server must accept TCP/IP connections on port 1433
(SQL Server Configuration Manager → Network Configuration → TCP/IP = Enabled, then restart the service).
Tables, foreign keys and unique constraints are created automatically on the first start
(`spring.jpa.hibernate.ddl-auto=update`). An existing AutoHub database can be kept: new tables
(wishlist, notifications, activity log, settings, profile pictures) and columns are added on start-up, the columns of
removed features (review/feedback approval, feedback replies, invoice due date/notes) are dropped, and the old
CHECK constraint on `payments.method` is replaced so BANK_TRANSFER can be saved – all automatically
by `SchemaCleanup` (SQL Server only, safe to run on every start). Change the login in
`backend/src/main/resources/application.properties` if yours is not `springuser`.

### Backend (port 8080)
```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```
or open `backend` in IntelliJ and run `AutoHubApplication`.

### Frontend
**Easy way (no npm needed):** the built website is already inside the backend
(`backend/src/main/resources/static`). Start the backend and open **http://localhost:8080**.

**Developer way (port 5173, live reload while editing React code):**
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. After changing React code, run `npm run build` and copy
`frontend/dist/*` into `backend/src/main/resources/static` to update the built-in copy.

### Google login
The **Continue with Google** button is on the Login and Register pages. It works as soon as the backend has a
Google OAuth client id; until then it is shown greyed out with a "not set up" label.

1. https://console.cloud.google.com → APIs & Services → **OAuth consent screen**: choose *External*, fill in the
   app name and your e-mail, and add your own Gmail address as a *test user*.
2. APIs & Services → **Credentials** → *Create credentials* → **OAuth client ID** → type **Web application**.
3. *Authorised JavaScript origins*: `http://localhost:5173` and `http://localhost:8080`.
4. Give the client id to the backend, either
   * in `backend/src/main/resources/application.properties`: `app.google.client-id=1234567890-abc.apps.googleusercontent.com`
     (the id on its own - **not** inside `${...}`; this project already contains its client id as the default), or
   * as an environment variable: `GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com`

   and restart the backend. (The frontend asks the backend for the id, so nothing changes in `.env`.)

The browser receives a signed ID token from Google; the backend checks its signature (Google's public keys),
audience, issuer, expiry and that the e-mail is verified, then an existing account with that e-mail logs in with
**its own role**, and an unknown e-mail becomes a new **customer**. The Google profile photo becomes the profile
picture (until the user uploads their own). Google accounts can set a password later under My profile.

### Profile pictures
Every user can add, change or remove a profile picture under **My profile** (JPG, PNG, WEBP or GIF, max 2 MB).
Pictures are stored in the database (`profile_pictures` table), so no file server or Cloudinary account is
needed, and are served at `GET /api/users/{id}/avatar`. They appear in the header, next to reviews and next to
feedback on the home page and the staff pages.

### Bank transfer (with bank slip)
Admin → **Settings → Payments**: switch bank transfer on and enter the bank, branch, account name and number.
The customer chooses *Bank transfer* at checkout, sees the account details, transfers the money and then
**uploads the bank slip** – a photo (JPG, PNG, WEBP, GIF) or PDF up to 5 MB; the transfer reference is optional.
Slips are stored in the database (`bank_slips` table) and only the customer and staff can open them.
Sales staff see the slip under **Payments → Bank transfers** (*View slip*): *Confirm payment* marks the order PAID
and generates the invoice; *Not found* deletes the slip and asks the customer to check and upload it again.
A bank-transfer order cannot be shipped until the payment is confirmed.

### Default accounts (created on the first start)

| Role | Email | Password |
|---|---|---|
| Admin | admin@autohub.lk | Admin@123 |
| Inventory Manager | inventory@autohub.lk | Staff@123 |
| Procurement Officer | procurement@autohub.lk | Staff@123 |
| Sales Staff | sales@autohub.lk | Staff@123 |
| Marketing Manager | marketing@autohub.lk | Staff@123 |
| Customer | customer@autohub.lk | Customer@123 |
| Supplier | created from **Suppliers → portal password** | (you choose) |

Log in with any of these accounts; each role is sent to its own page automatically.
Customers who register themselves must use a **Gmail address** (`name@gmail.com`); staff and supplier
accounts are created by the admin / procurement and only need a valid e-mail format.

---

## 2. The six functions

| # | Function | Sub-functions (all Create / Read / Update / Delete) | Main role |
|---|---|---|---|
| 1 | **Inventory Management** | Categories, Spare Parts, Vehicles, Fitments, Stock Levels, Stock Movements | Inventory Manager |
| 2 | **Procurement** | Suppliers (+ supplier portal login), Purchase Requests (approved / rejected by the **Inventory Manager**), Purchase Orders (only from an approved request), Goods Receipts (own workflow) | Procurement Officer, Inventory Manager, Supplier |
| 3 | **Sales & Orders** | Wishlist, Cart, Checkout (Buy now / Cart), Orders (also created by Sales Staff), Payments – **card, cash on delivery or bank transfer**, **automatic invoices** | Customer, Sales Staff |
| 4 | **Marketing** | Promotions, Discounts, Coupons | Marketing Manager |
| 5 | **Reviews & Feedback** | Product reviews (published straight away; Sales Staff can **reply**), Customer feedback (published straight away, no reply) – both shown with the customer's profile picture | Customer, Sales Staff |
| 6 | **Returns & Warranty** | Return and warranty claims (RMA) with approve / reject / refund / replace | Customer, Sales Staff |
| + | User Management & Profile | Users (admin), register (Gmail) / **Google login**, profile + **profile picture** (add / change / remove), change password, delete account | Admin, everyone |
| + | Administration | Activity Log, Reports, Settings | Admin |

### Who sees what

| Role | Menu | What they do |
|---|---|---|
| **Admin** | Dashboard · Inventory · Procurement · Sales & Orders · Marketing · Customer Care · Reports · Activity Log · Users · Settings | Oversees the business. **Dashboard** has the charts; each business function opens a **read-only summary**. **Reports** (sales, orders, payments, inventory, purchasing, suppliers – any period, charts, CSV export), **Activity Log** (who did what and when) and **Settings** (store details, payment methods, order limit, return period, inventory defaults). Manages users. No create/edit/delete screens for the six functions and no purchase request approvals. |
| Inventory Manager | Dashboard · Categories · Spare Parts · Vehicles · Fitments · Stock Levels · Stock Movements · Purchase Requests · Goods Receipts | Full CRUD for inventory; **approves / rejects purchase requests**; receives goods |
| Procurement Officer | Dashboard · Stock Levels · Suppliers · Purchase Requests · Purchase Orders · Goods Receipts | Full CRUD for procurement; raises purchase requests ("Reorder" on low-stock rows) and creates purchase orders from approved ones |
| Sales Staff | Dashboard · Orders · Payments · Reviews · Feedback · Returns & Warranty | Processes orders, **creates orders for customers** (phone / walk-in), payments, customer care |
| Marketing Manager | Dashboard · Promotions · Discounts · Coupons | Full CRUD for marketing |
| Supplier | Dashboard · Purchase Orders | Sees only the purchase orders sent to their company; confirms / declines / ships them |

Every role's **Dashboard** shows KPI cards, charts for its own area and lists of items that need attention.
The bell in the top bar shows those items (e.g. requests waiting for approval, goods to receive, new orders)
plus **notifications** sent by the system (request approved, PO shipped, payment received, order shipped, low stock …);
customers have the same bell in the storefront. The counts also appear as red badges in the sidebar. Opening a work screen of another role by URL
sends the user back to their dashboard.

Dashboard data comes from `GET /api/dashboard/overview | inventory | procurement | sales | marketing | customer-care`
(one endpoint per function, each limited to the admin and the role that owns that function).

---

## 3. How deletes work (physical deletes)

All deletes remove rows from the database (`DELETE`), there is no soft delete.
Foreign keys are handled in the service layer, so a delete never fails with an SQL error:

* **Owned data is deleted with its parent** (e.g. deleting a spare part also deletes its stock record,
  stock movements, fitments, discounts, promotion links and cart lines).
* **History blocks the delete** with a clear `409 Conflict` message that says what is still using the record
  (e.g. *"'Brake Pad' cannot be deleted because it is used in 2 customer order line(s)…"*).
  Delete those records first and the delete works.

| Delete | Also deletes | Blocked while … |
|---|---|---|
| Category | – | it still has spare parts |
| Spare part | stock record, stock movements, fitments, discounts, promotion links, cart and wishlist lines | used in order lines, purchase order lines, purchase requests |
| Vehicle | its fitments | – |
| Stock record | its stock movements | goods receipts point to its movements |
| Stock movement (manual) | – (stock is reversed) | system movements (orders / GRN / RMA) can't be deleted here |
| Supplier | its portal login | it has purchase requests or purchase orders |
| Purchase request | – | a purchase order was created from it |
| Purchase order | its order lines (request goes back to APPROVED) | it has goods receipts |
| Goods receipt | its PURCHASE movement (stock is reversed) | stock would go below zero |
| Order | items, payments, invoice, reviews, return/warranty claims (feedback is kept, unlinked) | order is not CANCELLED or DELIVERED |
| Payment | – | status is PAID (mark REFUNDED first), or an invoice was issued for it |
| Invoice | – (no manual delete – removed together with its order) | – |
| Promotion, Discount, Coupon, Review, Feedback, Claim | – | – |
| User | cart, wishlist, notifications, feedback, reviews; "done by" links set to empty (the activity log keeps the history) | has orders or purchase requests; last admin; yourself |

---

## 4. Validation

* **Request validation** – every request body is a Java `record` with Bean Validation
  (`@NotBlank`, `@Size`, `@ValidEmail`, `@GmailAddress`, `@Pattern`, `@DecimalMin`, `@FutureOrPresent`…).
  E-mails use one strict rule (`@ValidEmail`, e.g. rejects `a@b`, `a..b@x.com`); customer sign-up only
  accepts Gmail (`@GmailAddress`). The React forms use the same rules (`src/utils/validation.js`).
  Errors come back as `400` with a `fieldErrors` map; the forms show them under each field.
* **Business validation** – in the services, e.g. unique SKU / email / coupon code, stock can never go
  negative, order status can only move PLACED → PROCESSING → SHIPPED → DELIVERED, discount ≤ 90 %,
  no overlapping discounts, coupon dates / limits / minimum order, returns only within the return period in Settings,
  warranty only within the part's warranty period, received quantity ≤ ordered quantity, reviews only for
  delivered items, customers can only see / change their own records.

Error response format:
```json
{ "status": 409, "error": "Conflict", "message": "SKU BP-100 is already used by another spare part", "path": "/api/spare-parts" }
```

---

## 5. Backend structure

Package by feature – each folder holds its entities, repository, service, controller and DTOs:

```
com.autohublanka
├── auth          login (password / Google), register, Google token check
├── user          users, profile
├── catalog       categories, spare parts, vehicles, fitments
├── inventory     stock records, stock movements, StockService (the only place stock changes) + observer/
├── procurement   suppliers, purchase requests, purchase orders, goods receipts, supplier portal + observer/
├── sales         cart, checkout, orders, payments (payment/ = strategies), automatic invoices
├── wishlist      customers' saved parts
├── marketing     promotions, discounts, coupons, pricing (price/ = decorators)
├── support       reviews, feedback (ContentFilter singleton), return & warranty claims (resolution/ = factory)
├── notification  in-app notifications
├── activity      activity log (written after every change + log-ins)
├── report        admin reports
├── settings      system settings
├── dashboard     summary numbers
├── security      JWT, Spring Security config, CurrentUser helper
└── common        BaseEntity, validation (@ValidEmail, @GmailAddress), exceptions, DataSeeder, SchemaCleanup
```

## 6. Frontend structure

```
src/
├── api/            axios client (JWT header, error messages) + one object per resource
├── context/        AuthContext, CartContext, WishlistContext
├── hooks/          useApi, useForm (backend field errors), useConfirm
├── hooks/          + useAttention (bell & menu badges), useNotifications, usePublicSettings, useClickOutside
├── components/ui/  Button, Field, Modal, ConfirmDialog, DataTable, Badge, StatCard, Panel, MiniTable, HeroBanner…
├── components/charts/  LineChart, DonutChart, BarList, ColumnChart (plain SVG, no chart library)
├── components/layout/  store header/footer, dashboard sidebar + top bar (menu per role), route guard
└── pages/
    ├── auth/       login, register
    ├── store/      home, shop, product, wishlist, cart, checkout, payment, my orders (+ invoices), profile
    ├── dashboard/
    │   ├── home/   the "Dashboard" page of each role (charts)
    │   ├── admin/  admin's read-only summaries + Reports, Activity Log, Settings
    │   └── inventory/ procurement/ sales/ marketing/ support/   one CRUD page per sub-function
    └── supplier/   supplier dashboard + purchase orders
```
Images can be pasted as URLs or uploaded to Cloudinary (settings in `frontend/.env`).

---

## 7. Automated API test (optional)

With the backend running on an **empty** database:
```bash
python docs/api_test.py
```
It runs 392 checks (every CRUD operation, validation rule, delete rule, the approval / goods receipt / invoice
workflows, wishlist, activity log, reports, settings and the design patterns) and removes its data again.

## 8. Design patterns

One pattern per function, taken from the lecture slides (Singleton, Observer, Strategy, Factory, Decorator).
Details and class diagrams are in **docs/DESIGN_PATTERNS.md**.

| Function | Pattern | Where |
|---|---|---|
| Inventory Management | Observer | `inventory/observer/` – stock change → low-stock alert, reorder suggestion, stock log |
| Sales & Order Management | Strategy | `sales/payment/` – card, cash on delivery, bank transfer |
| Supplier Record Management | Observer | `procurement/observer/` – PO status change → request status, procurement / supplier notices, expected stock |
| Feedback & Review Management | Singleton | `support/ContentFilter` – one shared bad-word filter |
| Warranty & Return Management | Factory | `support/resolution/` – refund vs replacement |
| Marketing & Promotion Management | Decorator | `marketing/price/` – base price → discount → coupon |
