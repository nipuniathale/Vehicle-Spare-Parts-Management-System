# Step-by-step implementation & testing order

Follow the steps in this order. Each step only depends on the steps before it, so after every step
you can open SQL Server Management Studio (SSMS), run the queries shown, and confirm that the
rows, foreign keys and validations are correct before you move on.

Legend: **C** Create · **R** Read · **U** Update · **D** Delete · ✅ expected result · ❌ must be rejected

The six functions are tested in dependency order:

| Order | Function | Steps |
|---|---|---|
| 1 | Inventory Management | 1 – 6 |
| 2 | Procurement (+ Supplier portal) | 7 – 10 |
| 3 | Marketing | 11 – 13 |
| 4 | Sales & Orders (+ wishlist, automatic invoices) | 14 – 17 |
| 5 | Reviews & Feedback | 18 – 19 |
| 6 | Returns & Warranty | 20 |
| – | Users, dashboard, delete clean-up | 21 – 22 |
| – | Admin: activity log, reports, settings | 23 |

Marketing comes before Sales because discounts and coupons are applied at checkout.

---

## Step 0 – Setup and database check

1. `CREATE DATABASE AutoHubLankaDB;`
2. Start the backend. Console shows `Started AutoHubApplication` and
   `Default accounts created`.
3. Start the frontend (`npm install`, `npm run dev`) and open http://localhost:5173.

**Database check**
```sql
USE AutoHubLankaDB;

-- 30 tables (incl. wishlist_items, notifications, activity_logs, system_settings)
SELECT name FROM sys.tables ORDER BY name;

-- every foreign key: child table -> parent table
SELECT fk.name AS fk_name,
       OBJECT_NAME(fk.parent_object_id)     AS child_table,
       COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS child_column,
       OBJECT_NAME(fk.referenced_object_id) AS parent_table
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
ORDER BY child_table;

-- 6 default users
SELECT id, email, role, active FROM users;
```
✅ 6 users (ADMIN, INVENTORY_MANAGER, PROCUREMENT_OFFICER, SALES_STAFF, MARKETING_MANAGER, CUSTOMER).

---

# FUNCTION 1 – INVENTORY MANAGEMENT
Log in as **inventory@autohub.lk / Staff@123** → Dashboard.

## Step 1 – Categories *(a spare part must belong to a category)*
Dashboard → Inventory → **Categories**

| | Action | Expected |
|---|---|---|
| C | Add category **Brake System**, description "Pads, discs and calipers" | ✅ row appears, toast "Category created" |
| C | Add category **Filters** | ✅ |
| ❌ | Add category with empty name | "Category name is required" under the field |
| ❌ | Add category **brake system** (same name, other case) | "A category named … already exists" (409) |
| R | Search box → type "fil" | ✅ only Filters |
| U | Edit Brake System → untick *Active* → Save | ✅ status Inactive (hidden in the shop) — tick it again |
| D | Add category **Temp**, then delete it | ✅ row removed |

```sql
SELECT * FROM categories;
```

## Step 2 – Spare parts *(creates the stock record automatically)*
Inventory → **Spare Parts** → Add spare part

| | Action | Expected |
|---|---|---|
| C | Name **Front Brake Pad Set**, SKU **BP-100**, brand Bosch, category Brake System, price 4500, warranty 12, opening stock **20**, reorder level 5, location Rack A1 | ✅ stock column shows 20 |
| C | **Oil Filter**, SKU **OF-200**, category Filters, price 1200, warranty **0**, opening stock 50 | ✅ |
| C | **Air Filter**, SKU AF-300, Filters, price 1800, warranty 6, opening stock 0 | ✅ stock 0 (red) |
| ❌ | Another part with SKU **bp-100** | "SKU BP-100 is already used…" (SKU is saved in capitals) |
| ❌ | Price 0 / SKU "bad sku!" / warranty 99 | field messages |
| R | Search "filter" | ✅ 2 parts |
| U | Edit Oil Filter price → 1250 | ✅ |
| D | *(tested in Step 22 – deleting a part that is used elsewhere is blocked)* | |

```sql
SELECT p.id, p.name, p.sku, p.price, p.warranty_months, c.name AS category
FROM spare_parts p JOIN categories c ON c.id = p.category_id;

-- one inventory row per part + an "OPENING" movement for opening stock
SELECT i.id, p.sku, i.quantity, i.reorder_level, i.location FROM inventory i JOIN spare_parts p ON p.id = i.spare_part_id;
SELECT id, inventory_id, type, quantity, reference, manual FROM stock_movements;
```
✅ BP-100 → quantity 20 with an `ADJUSTMENT_IN 20 OPENING` movement.

**FK check:** try deleting the category **Filters** → ❌ "Category 'Filters' still has 2 spare part(s)…".

## Step 3 – Vehicles
Inventory → **Vehicles**

| | Action | Expected |
|---|---|---|
| C | Toyota / Corolla / 2018 / GLi | ✅ |
| C | Honda / Civic / 2020 | ✅ |
| ❌ | Toyota / Corolla / 2018 / gli again | "This vehicle … already exists" |
| ❌ | Year 3000 | "Year is not valid" |
| U | Civic → year 2021, engine 1.5L | ✅ |

```sql
SELECT * FROM vehicles;
```

## Step 4 – Fitments *(which part fits which vehicle)*
Inventory → **Fitments**

| | Action | Expected |
|---|---|---|
| C | Front Brake Pad Set ↔ Toyota Corolla 2018 GLi | ✅ |
| C | Front Brake Pad Set ↔ Honda Civic | ✅ |
| ❌ | Same pair again | "already linked" |
| U | Edit a fitment → notes "Front axle only" | ✅ |
| D | Delete one fitment | ✅ |
| D (cascade) | Delete vehicle **Honda Civic** → confirm | ✅ vehicle **and its fitments** deleted |

```sql
SELECT f.id, v.make, v.model, p.sku FROM fitments f
JOIN vehicles v ON v.id = f.vehicle_id JOIN spare_parts p ON p.id = f.spare_part_id;
```
Storefront check: Home → "Find parts for your vehicle" → Toyota Corolla → only the brake pads.

## Step 5 – Stock levels (inventory records)
Inventory → **Stock Levels**

| | Action | Expected |
|---|---|---|
| R | List + tick "Low stock only" | ✅ Air Filter (0) listed |
| U | Edit Front Brake Pad Set → reorder level 8, location Rack B2 | ✅ |
| ❌ | The quantity box is read-only on edit | quantity only changes through movements |
| D | Delete the Air Filter stock record | ✅ row gone; its movements deleted too |
| C | Add stock record → Air Filter, opening quantity 10 | ✅ (only parts without a record are offered) |

```sql
SELECT * FROM inventory;
```

## Step 6 – Stock movements
Inventory → **Stock Movements**

| | Action | Expected |
|---|---|---|
| C | Brake pads, ADJUSTMENT_IN, 5, note "Stock count" | ✅ stock 20 → 25 |
| ❌ | Brake pads, DAMAGE, 500 | "Not enough stock … Available: 25" |
| U | Edit the +5 movement → 2 | ✅ stock 25 → 22 |
| D | Delete that movement | ✅ stock back to 20 |
| R | System movements (created later by orders `ORDER-x`, goods receipts `GRN-x` and claims `RMA-x`) show a **System** lock | ❌ cannot be edited/deleted here (the OPENING movement is manual and can be corrected) |

```sql
SELECT m.id, p.sku, m.type, m.quantity, m.reference, m.manual, i.quantity AS stock_now
FROM stock_movements m JOIN inventory i ON i.id = m.inventory_id JOIN spare_parts p ON p.id = i.spare_part_id
ORDER BY m.id;
```

---

# FUNCTION 2 – PROCUREMENT (+ SUPPLIER PORTAL)

## Step 7 – Suppliers
Log in as **procurement@autohub.lk / Staff@123** → Procurement → **Suppliers**

| | Action | Expected |
|---|---|---|
| C | **Lanka Auto Traders**, orders@lankaauto.lk, 0112345678, contact Ruwan Perera, **portal password Supplier@123** | ✅ Portal: Enabled |
| C | **Colombo Filters**, sales@cfilters.lk, 0771112223 (no portal password) | ✅ Portal: No login |
| ❌ | Another supplier with orders@lankaauto.lk | "Another supplier already uses…" |
| ❌ | Phone "12" | "Phone must contain 9-15 digits" |
| U | Rename Colombo Filters → "Colombo Filters (Pvt) Ltd" | ✅ |
| D | Delete Colombo Filters | ✅ (not used anywhere yet) |

```sql
SELECT s.id, s.name, s.email, s.user_id, u.email AS portal_login, u.role
FROM suppliers s LEFT JOIN users u ON u.id = s.user_id;
```
✅ Lanka Auto Traders has a `user_id` pointing to a **SUPPLIER** user.

## Step 8 – Purchase requests (raised by Procurement, approved by the Inventory Manager)
Log in as **procurement@autohub.lk** → **Purchase Requests**.
Only the procurement officer raises requests. Only the **Inventory Manager** approves or rejects them
(the admin can only view them, and nobody can decide on a request they raised).

| | Action | Expected |
|---|---|---|
| C | Front Brake Pad Set, Lanka Auto Traders, quantity 30, reason "Low stock" | ✅ PENDING, "Awaiting inventory manager approval" (no Approve button) |
| C | Oil Filter, Lanka Auto Traders, 10 | ✅ |
| U | Edit the oil filter request → quantity 5 | ✅ (only while PENDING) |

Log in as **inventory@autohub.lk** → the bell shows *"Purchase request #1 needs approval"*, the
Dashboard shows **Purchase requests waiting for your approval**, and the menu badge on **Purchase Requests** shows 2.
The inventory manager has no **New request** button.

| | Action | Expected |
|---|---|---|
| ❌ | Reject the oil filter request without a reason | "Please give a reason…" |
| ✅ | Reject the oil filter request with reason "Enough stock" | REJECTED (Rejected tab) |
| ✅ | **Approve** the brake pad request | "No requests are waiting for approval." |
| ❌ | (API) admin calls `PATCH /api/purchase-requests/1/approve` | 403 |

Log back in as **procurement@autohub.lk** → the bell shows *"Purchase request #1 approved"* → Purchase Requests:

| | Action | Expected |
|---|---|---|
| R | Brake pad request | APPROVED + note; **Create PO** button appears |
| R | Oil filter request | REJECTED + reason; Edit button gone |
| D | Delete the rejected request | ✅ |

```sql
SELECT r.id, p.sku, r.quantity, r.status, rb.email AS requested_by, vb.email AS reviewed_by
FROM purchase_requests r JOIN spare_parts p ON p.id = r.spare_part_id
LEFT JOIN users rb ON rb.id = r.requested_by LEFT JOIN users vb ON vb.id = r.reviewed_by;
```
✅ `reviewed_by` = inventory@autohub.lk

## Step 9 – Purchase orders + supplier portal
A purchase order can **only** be created from a purchase request the **inventory manager approved** (checked by the backend too).
Before any request is approved, **New purchase order** is disabled ("A purchase order can only be created after the inventory manager approves a purchase request").
Click **Create PO** on the approved request (or Purchase Orders → **New purchase order** → pick the approved request).

| | Action | Expected |
|---|---|---|
| R | Form shows supplier, spare part and **approved quantity** (30) from the request – they cannot be changed | ✅ |
| ❌ | Quantity 31 | "The inventory manager approved 30 × 'Front Brake Pad Set' – the order cannot be for more (31)" |
| ❌ | Expected delivery date in the past | field message |
| C | Quantity 30, unit cost 3000, expected date next week | ✅ PO-1 PENDING, total Rs. 90,000 |
| ✅ | Purchase request status | ORDERED (it disappears from the "New purchase order" list) |
| U | Edit PO-1 → unit cost 2900 (or a lower quantity) | ✅ (only while PENDING) |
| ❌ | (API) order without `purchaseRequestId`, or with a part that was not approved | 400 – "only be created from a purchase request approved by the inventory manager" / "approved for … only" |
| R | The PO row has **no Receive button** – goods are received on the Goods Receipts page | ✅ |
| R | 👁 View → lines, totals, notes | ✅ |

**Supplier portal** – log out, log in as **orders@lankaauto.lk / Supplier@123**:

| | Action | Expected |
|---|---|---|
| R | Supplier sees **only its own** POs and the counters | ✅ PO-1 "Waiting for you" |
| U | **Confirm** (message optional) | ✅ CONFIRMED |
| U | **Mark shipped** "Dispatched via courier" | ✅ SHIPPED; inventory manager and procurement get a "shipped" notification |
| ❌ | (API) supplier opening `/api/purchase-orders` | 403 – suppliers only see their own orders |

Back as procurement: PO-1 can no longer be edited (❌ "Only PENDING purchase orders can be edited").

```sql
SELECT o.id, s.name, o.status, o.total_amount, o.purchase_request_id, o.supplier_note FROM purchase_orders o JOIN suppliers s ON s.id = o.supplier_id;
SELECT i.id, i.purchase_order_id, p.sku, i.quantity, i.unit_cost, i.received_quantity FROM purchase_order_items i JOIN spare_parts p ON p.id = i.spare_part_id;
```

## Step 10 – Goods receipts (stock in)
Log in as **inventory@autohub.lk** (procurement can do it too) → **Goods Receipts**.
The page lists **Waiting for delivery** (POs confirmed / shipped / partly received). **Receive goods** works in two steps:
choose the purchase order → enter the quantity that arrived for each line.

| | Action | Expected |
|---|---|---|
| ❌ | Quantity 31 | "Only 30 still expected" (and from the API: "Only 30 unit(s) … are still expected") |
| ❌ | All lines 0 | "Enter the quantity received for at least one line" |
| C | 20 | ✅ GRN-1; PO → PARTIALLY_RECEIVED; card shows 20 / 30; stock 20 → 40 |
| U | edit GRN-1 → 25 | ✅ stock 45 |
| C | **Receive** on the card → last 5 | ✅ GRN-2; PO → RECEIVED; card disappears; stock 50 |
| D | Delete GRN-2 | ✅ stock 45 again; PO → PARTIALLY_RECEIVED |
| ❌ | Delete PO-1 now | "has 1 goods receipt(s). Delete them first" |
| ❌ | Delete supplier Lanka Auto Traders | "has 1 purchase order(s)…" |
| ❌ | Stock Movements → delete the `GRN-1` movement | "created automatically … cannot be deleted here" |

Receive the last 5 again so the PO is RECEIVED (stock 50).

```sql
SELECT g.id, g.purchase_order_item_id, g.received_quantity, g.stock_movement_id, m.type, m.quantity, m.reference
FROM goods_receipts g LEFT JOIN stock_movements m ON m.id = g.stock_movement_id;
SELECT p.sku, i.quantity FROM inventory i JOIN spare_parts p ON p.id = i.spare_part_id;
```
✅ every GRN has its own PURCHASE movement (`GRN-n`) and the stock matches.

---

# FUNCTION 3 – MARKETING
Log in as **marketing@autohub.lk / Staff@123**

## Step 11 – Promotions
| | Action | Expected |
|---|---|---|
| ❌ | End date before start date | "End date must be on or after the start date" |
| C | "Brake Week – 10% off pads", today → +14 days, feature Front Brake Pad Set, banner image (optional) | ✅ ACTIVE |
| U | Add Oil Filter to featured parts | ✅ Featured parts 2 |
| R | Storefront home shows the promotion as the hero banner | ✅ |

```sql
SELECT * FROM promotions;
SELECT * FROM promotion_spare_parts;   -- join table
```

## Step 12 – Discounts
| | Action | Expected |
|---|---|---|
| ❌ | Brake pads, PERCENTAGE 95 | "at most 90%" |
| ❌ | Oil Filter, FIXED_AMOUNT 5000 | "must be less than the part price" |
| C | "10% off pads" on Front Brake Pad Set, 10 %, today → +7 days | ✅ price 4,500 → 4,050 |
| ❌ | Second active discount on the same part overlapping those dates | "already has an active discount in this period" (409) |
| U | Change end date to +10 days | ✅ |
| R | Storefront shows 4,050 with 4,500 crossed out | ✅ |

```sql
SELECT d.id, p.sku, d.name, d.type, d.discount_value, d.start_date, d.end_date, d.active FROM discounts d JOIN spare_parts p ON p.id = d.spare_part_id;
```

## Step 13 – Coupons
| | Action | Expected |
|---|---|---|
| C | **save500**, FIXED_AMOUNT 500, minimum order 3000, usage limit 100 | ✅ stored as SAVE500 |
| ❌ | Code SAVE500 again / code with a space | 409 / field message |
| C + U + D | Create TEMP10 (10 %), edit to 15 % with max 1000, then delete | ✅ |

```sql
SELECT code, type, discount_value, min_order_amount, usage_limit, used_count FROM coupons;
```

---

# FUNCTION 4 – SALES & ORDERS

## Step 14 – Customer account, wishlist & cart
**Register** a new customer (header → Register). Only first name, last name, **Gmail address** and password are asked –
the phone number and delivery address are asked at checkout.

| | Action | Expected |
|---|---|---|
| ❌ | Email `nimal@yahoo.com` | "Please use a valid Gmail address (e.g. name@gmail.com)" (frontend and backend) |
| ❌ | Email `nimal..perera@gmail.com`, `nimal@gmail`, `nimal perera@gmail.com` | same message |
| C | `nimal.perera@gmail.com`, password Nimal@123 | ✅ logged in; `users.phone` and `users.address` are NULL |
| ❌ | Register the same address again (any capitals) | "An account with email … already exists" (409) |
| R | Login page: button says **Login**; an invalid email shows "Enter a valid email address" | ✅ |
| R | **Continue with Google** button | shown only when `app.google.client-id` is set (see README) |

**Wishlist** (heart icon on product cards and the product page):

| | Action | Expected |
|---|---|---|
| C | ♡ on Oil Filter and on Front Brake Pad Set | ✅ "saved to your wishlist", header heart shows 2 |
| C | ♡ the same part again | removes it (toggle) – a part is never saved twice |
| R | Header ♡ → **My wishlist** | ✅ each part with today's price, discount and stock |
| D | 🗑 Remove Oil Filter | ✅ 1 left |
| U | **Move to cart** on the brake pads | ✅ added to the cart (stock checked) and removed from the wishlist |
| ❌ | (API) staff `GET /api/wishlist` | 403 – customers only |

**Cart**

| | Action | Expected |
|---|---|---|
| R | Click the cart icon in the header | ✅ drop-down lists every item, quantity, line total and total, with View cart / Checkout |
| C | Shop → Oil Filter → cart icon | ✅ |
| ❌ | Add more than the stock / more than the maximum in Settings (100) | "Only n unit(s) … are in stock" / "You can order at most …" |
| U | Cart → + / − | ✅ |
| D | Remove a line from the cart page or the header drop-down | ✅ |

```sql
SELECT w.id, u.email, p.sku, w.created_at FROM wishlist_items w JOIN users u ON u.id = w.customer_id JOIN spare_parts p ON p.id = w.spare_part_id;
SELECT c.id, u.email, p.sku, ci.quantity FROM carts c
JOIN users u ON u.id = c.customer_id JOIN cart_items ci ON ci.cart_id = c.id JOIN spare_parts p ON p.id = ci.spare_part_id;
```

## Step 15 – Checkout (cart and Buy now) + customer payment + automatic invoice
| | Action | Expected |
|---|---|---|
| R | Cart → Checkout (first order) | "We need your phone number and delivery address…" – fields are empty |
| ❌ | Place order with phone "abc" / an address shorter than 10 characters | field messages |
| C | Address + phone, keep **Save … to my profile** ticked, coupon **save500** → Apply → Card → **Place order & pay** | ✅ order #1, discount −500; Profile now shows the phone and address |
| R | My Orders → order #1 | "Invoice after payment" – no invoice yet |
| ❌ | Card 4111 1111 1111 1111, expiry **01/20**, CVV 123 | "This card has expired" |
| C | Same card with expiry 12/30 → Pay | ✅ "Thank you", payment PAID |
| ✅ | My Orders → order #1 → **Invoice** | INV-2026-00001 generated **automatically** (store details, items, payment method, transaction id) – Print |
| ✅ | Bell icon | "Payment received – your invoice is ready in My Orders" |
| ✅ | Cart is empty after checkout | cart_items rows deleted |
| C | Product → Oil Filter → **Buy now** → Cash on delivery → Place order | ✅ order #2 (cart not touched); no invoice until the cash is collected |
| C | Buy now another Oil Filter → order #3 | ✅ |
| U | My Orders → order #3 → **Edit delivery** | ✅ (only while PLACED) |
| U | My Orders → order #3 → **Cancel** | ✅ CANCELLED, stock returned |

```sql
SELECT id, status, payment_status, subtotal, discount_amount, total_amount, coupon_code, placed_by FROM orders;
SELECT order_id, spare_part_id, quantity, list_price, unit_price FROM order_items;
SELECT id, order_id, method, status, transaction_id FROM payments;
SELECT invoice_number, order_id, payment_id, amount, issue_date FROM invoices;   -- one row per PAID order
SELECT used_count FROM coupons WHERE code = 'SAVE500';                       -- 1
SELECT type, quantity, reference FROM stock_movements WHERE reference LIKE 'ORDER-%';  -- SALE + RETURN for #3
```

## Step 16 – Order processing and orders created by sales staff
Log in as **sales@autohub.lk / Staff@123** → Sales → **Orders** (there is no Invoices menu any more).

| | Action | Expected |
|---|---|---|
| C | **New order** → customer Amal Customer (phone/address filled from the profile) → Oil Filter × 2 → Cash on delivery → **Create order** | ✅ order shown with "by sales"; the customer sees it in My Orders and gets a notification |
| ❌ | New order with no customer / no item / the same part twice / more than the stock | field messages |
| ❌ | (API) customer or admin calls `POST /api/orders` | 403 – sales staff only (customers use checkout) |
| R | 👁 view order #1 → **Invoice** | ✅ the automatically generated invoice |
| U | Order #1: Processing → Shipped → Delivered | ✅ `delivered_at` filled; the customer gets a notification for each step |
| U | Order #2 (COD): Processing → Shipped → Delivered | ✅ payment automatically PAID **and invoice generated** |
| ❌ | (API) PLACED → DELIVERED directly | "cannot be changed to DELIVERED" (409) |
| U | Edit delivery details of a DELIVERED order | ❌ not allowed |
| ❌ | (API) `POST /api/invoices`, `PUT /api/invoices/1`, `DELETE /api/invoices/1` | 404 / 405 – invoices cannot be created, edited or deleted by hand |

## Step 17 – Payments
Sales → **Payments**

| | Action | Expected |
|---|---|---|
| R | List payments | ✅ |
| ❌ | Delete a PAID payment | "Mark it REFUNDED first" |
| ❌ | Mark the cancelled order #3 as PAID | "A cancelled order cannot be marked as paid" |
| D | Delete the FAILED payment of order #3 | ✅ |
| C | Record payment for #3: CARD, FAILED, note "test" | ✅ |
| U | Edit it → note "declined by bank" | ✅ |
| ✅ | Recording a payment as **PAID** for an unpaid, active order | invoice generated automatically |

---

# FUNCTION 5 – REVIEWS & FEEDBACK
Reviews and feedback are **published straight away** – there is no approve / reject step and staff cannot reply.
Sales staff can only delete abusive or spam entries.

## Step 18 – Product reviews
Customer → My Orders → delivered order #1

| | Action | Expected |
|---|---|---|
| C | **Review** the brake pads, 5 stars, "Great fit" | ✅ "It is now on the product page" – visible immediately with the average rating |
| ❌ | Review an item of a non-delivered order (the button only appears on delivered orders; via API) | "after the order has been delivered" |
| ❌ | Second review for the same item | "already reviewed" (409) |
| U | Reviews tab → Edit → 4 stars | ✅ product page updated straight away |
| R | Staff: Customer Care → **Reviews** | list with rating and comment – no Status column, no moderate / reply button |
| D | Delete a review (customer own / staff any) | ✅ |

```sql
SELECT r.id, r.order_item_id, r.rating, r.comment FROM reviews r;
```

## Step 19 – Customer feedback
| | Action | Expected |
|---|---|---|
| C | Customer: My Orders → order #1 → **Feedback** "Fast delivery", 5 stars | ✅ shown on the Home page immediately |
| C | Feedback tab → Write feedback (general, no order) | ✅ |
| ❌ | Subject "x" | "Subject must be 3-150 characters" |
| U | Edit own feedback | ✅ |
| D | Delete (customer own / staff any) | ✅ |

```sql
SELECT id, customer_id, order_id, subject, rating FROM feedback;
```

---

# FUNCTION 6 – RETURNS & WARRANTY

## Step 20 – Return and warranty claims
Customer → My Orders → delivered order → **Return / warranty**

| | Action | Expected |
|---|---|---|
| ❌ | Warranty claim on the **Oil Filter** (warranty 0) | "has no warranty" |
| ❌ | Warranty claim with reason "Changed mind" | option not offered / "Warranty covers defects only" |
| ❌ | Quantity more than purchased | "You can claim at most n more unit(s)" |
| C | Brake pads, **Warranty**, Defective, qty 1, "Squeaks after one week", photo URL | ✅ REQUESTED |
| U | Returns & warranty tab → Edit description | ✅ (only while REQUESTED) |
| C | Oil Filter, **Return**, Wrong item, qty 1 | ✅ (within the return period in Settings – 14 days by default) |

Staff (sales) → Customer Care → **Returns & Warranty**:

| | Action | Expected |
|---|---|---|
| ❌ | Complete a claim before approving | "Only APPROVED claims can be completed" |
| ❌ | Reject without a note | "Please give the customer a reason" |
| U | Review → **Approve** the warranty claim → Complete → **Replace** | ✅ REPLACED; stock −1 (movement `RMA-1`); the customer gets a notification |
| U | Approve the return → Complete → **Refund** 5000 | ❌ "Refund cannot be more than Rs. 1250.00…" (price paid) |
| U | Refund 1250 | ✅ REFUNDED; stock +1 (RETURN movement `RMA-2`) |
| D | Customer can delete a REQUESTED/REJECTED claim; staff can delete any | ✅ |

```sql
SELECT id, order_item_id, type, reason, quantity, status, refund_amount FROM rmas;
SELECT * FROM rma_images;
SELECT type, quantity, reference FROM stock_movements WHERE reference LIKE 'RMA-%';
```

---

# USERS, DASHBOARD & DELETE CLEAN-UP

## Step 21 – Users (admin)
Log in as **admin@autohub.lk / Admin@123** → Administration → **Users**

| | Action | Expected |
|---|---|---|
| C | New Sales Staff user test@autohub.lk / abc123 | ✅ can log in |
| ❌ | Same email again / invalid email (e.g. `t@autohub`) / 1-character password | field messages |
| U | Deactivate test@autohub.lk | ✅ login → "This account has been deactivated" |
| D | Delete test@autohub.lk | ✅ |
| ❌ | Delete yourself / delete customer@autohub.lk (has orders) | blocked with a message |
| R | **Dashboard**: KPI cards, Sales overview, Orders status, Top selling categories, Recent orders, Low stock, Recent reviews, Stock movement summary | ✅ numbers match the data you created |
| R | No **Approvals** menu – purchase requests are approved by the inventory manager; Procurement summary is read-only | ✅ |
| R | Business functions → **Inventory / Procurement / Sales & Orders / Marketing / Customer Care** | ✅ read-only summaries, no Add / Edit / Delete buttons |
| R | Type `/dashboard/categories` in the address bar as admin | ✅ sent back to the Dashboard (work screens belong to the staff roles) |
| R | Log in as each staff role and as the supplier → **Dashboard** | ✅ each shows its own cards, charts and "needs attention" lists; the bell shows the same counts |

## Step 22 – Foreign-key delete test (reverse order)
This proves that every delete works physically once the dependent history is removed.

1. **Spare part in use** – Inventory → Spare Parts → delete Front Brake Pad Set
   ❌ *"cannot be deleted because it is used in n customer order line(s), 1 purchase order line(s), 1 purchase request(s)"*
2. **Orders** – Sales → Orders: the delete button only appears on CANCELLED / DELIVERED orders (an active order must be cancelled first so its stock is returned). Delete every order ✅
   ```sql
   -- all gone together with the order
   SELECT COUNT(*) FROM order_items; SELECT COUNT(*) FROM payments; SELECT COUNT(*) FROM invoices;
   SELECT COUNT(*) FROM reviews;     SELECT COUNT(*) FROM rmas;     SELECT COUNT(*) FROM rma_images;
   SELECT id, order_id FROM feedback;   -- feedback kept, order_id now NULL
   ```
3. **Goods receipts** – delete both GRNs ✅ (stock reversed)
4. **Purchase order** – delete PO-1 ✅ → purchase request goes back to APPROVED
5. **Purchase request** – delete it ✅
6. **Spare part** – delete Front Brake Pad Set ✅
   ```sql
   -- all owned rows removed with the part
   SELECT * FROM inventory       WHERE spare_part_id = <id>;
   SELECT * FROM fitments        WHERE spare_part_id = <id>;
   SELECT * FROM discounts       WHERE spare_part_id = <id>;
   SELECT * FROM promotion_spare_parts WHERE spare_part_id = <id>;
   SELECT * FROM cart_items      WHERE spare_part_id = <id>;
   SELECT * FROM wishlist_items  WHERE spare_part_id = <id>;
   ```
7. **Supplier** – delete Lanka Auto Traders ✅ → its portal login is deleted too
   (`SELECT * FROM users WHERE role = 'SUPPLIER'` → 0 rows)
8. **Customer** – Admin → Users → delete customer@autohub.lk ✅ (no orders now; cart, wishlist, notifications and feedback deleted; the activity log keeps the history)
9. Delete the remaining promotions, coupons, vehicles, parts and categories ✅

Every step returns a clear message instead of an SQL foreign-key error, and after step 9 the business
tables are empty again.

---

# ADMINISTRATION

## Step 23 – Activity log, reports and settings (admin only)
Log in as **admin@autohub.lk**. The **Administration** menu has Reports, Activity Log, Users and Settings.

**Activity Log**

| | Action | Expected |
|---|---|---|
| R | Default view (last 7 days) | every log-in, failed log-in, registration, create / update / delete, approval, status change, payment and goods receipt – date & time, user, role, action, module, details, IP |
| R | Module **Procurement**, action **Approve** → Search | "Approved purchase request #1" by the inventory manager |
| R | Type `inventory@autohub.lk` in *User or text* | only that user's actions |
| R | **Export CSV** | file with the rows shown |
| ❌ | (API) staff `GET /api/activity-logs` | 403 |

**Reports** – choose a period (From / To or Last 7 / 30 / 90 days / 12 months):

| Tab | Shows |
|---|---|
| Sales, orders & payments | orders, gross sales, paid revenue, average order, coupon discounts, cancelled orders, new / ordering customers, staff-created orders; sales over time, orders by status, payments by method & status, sales by category, best-selling parts, top customers |
| Inventory | parts, units, stock value, low / out of stock; stock by category, stock movements in the period, low-stock list |
| Purchasing & suppliers | purchase orders, spend, open / received orders, spend over time, POs and requests by status, per-supplier orders / spend / units / declined / cancelled |

✅ every table has a **CSV** button; **Print** prints the page. ❌ "From" after "To" → "'From' date must be before the 'To' date".

**Settings** (saved in `system_settings`, used straight away):

| | Action | Expected |
|---|---|---|
| U | Store name / email / phone / address | shown in the storefront footer and on every invoice |
| ❌ | Store email `bad@x`, or both payment methods switched off | field messages |
| U | Untick **Cash on delivery** → Save | checkout and the sales staff "New order" form only offer Card; the backend rejects COD |
| U | Maximum quantity 5 | cart / checkout / staff orders refuse 6 of one item |
| U | Return period 7 days | returns older than 7 days are refused; storefront texts say "7 days" |
| U | Default reorder level 10 | a new part added without a reorder level gets 10 |
| U | Low-stock notifications off | no "Low stock" notifications to the inventory manager / procurement |
| ❌ | (API) staff `PUT /api/settings` | 403 |

```sql
SELECT TOP 20 created_at, user_email, action, module, description FROM activity_logs ORDER BY id DESC;
SELECT * FROM system_settings;
SELECT TOP 20 r.email, n.title, n.seen FROM notifications n JOIN users r ON r.id = n.recipient_id ORDER BY n.id DESC;
```

---

### Automated check (optional)
`python docs/api_test.py` runs all of the above through the API (308 checks) on an empty database.
