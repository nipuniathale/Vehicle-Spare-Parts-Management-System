# Design patterns in AutoHub Lanka

Each of the six functions uses one pattern from the lecture slides. There are five patterns (Singleton and Observer from
Part I; Strategy, Factory and Decorator from Part II) and six functions, so Observer is used twice: for Inventory and
for Supplier Records. Each spot used to be a long if/else, or one method doing several jobs.

| Function | Owner | Pattern | Type | Package |
|---|---|---|---|---|
| Inventory Management | Senarathna P. K. | **Observer** | Behavioural | `inventory/observer` |
| Sales & Order Management | Randy T H S | **Strategy** | Behavioural | `sales/payment` |
| Supplier Record Management | Athale D.N.K. | **Observer** | Behavioural | `procurement/observer` |
| Feedback & Review Management | Ahamed M. A. | **Singleton** | Creational | `support/ContentFilter` |
| Warranty & Return Management | Wimalarathna M.A.Y. | **Factory** | Creational | `support/resolution` |
| Marketing & Promotion Management | Vithanawasam O.D. | **Decorator** | Structural | `marketing/price` |

All paths are under `backend/src/main/java/com/autohublanka/`.

---

## 1. Inventory Management: Observer

**Problem.** Stock changes in many places: a sale, a goods receipt, a return, a damage write-off or an adjustment.
Each time, other parts of the system have to react. The inventory manager needs a low-stock alert, procurement
should be told to reorder, and the change should be logged. Putting all of that inside `StockService` would tie it
to notifications and procurement.

**Solution.** `StockService` is the subject and keeps a list of observers. After every stock movement it calls
`notifyObservers(inventory, previousQuantity)`. Each observer decides for itself whether it cares.

```
StockSubject            «interface»  addObserver(o), removeObserver(o), notifyObservers(inventory, previousQuantity)
 └── StockService       concrete subject – applyChange() → notifyObservers(...)
StockObserver           «interface»  update(inventory, previousQuantity)
 ├── LowStockAlertObserver       quantity fell to / below the reorder level → "Low stock" to the inventory manager
 │                               (can be switched off in admin Settings)
 ├── ReorderSuggestionObserver   same moment → "Reorder suggested" to procurement, with a link to raise a purchase request
 └── StockLogObserver            writes every change to the application log
StockObserverRegistration        at start-up, adds every StockObserver to StockService
StockChanges.justBecameLow(...)  shared rule: the alert fires once, when stock crosses the level, not on every later sale
```

**Lecture match.** This is the tsunami warning example: one change, many listeners. A new reaction (for example an
e-mail) is one new `StockObserver` class, and `StockService` does not change.

## 2. Sales & Order Management: Strategy

**Problem.** An order is paid by card (charged online at once), by cash on delivery (collected by the courier when
the order is delivered) or by bank transfer (confirmed by sales staff when the money reaches the account).
Before, `PaymentService` and `OrderService` both branched on the payment method.

**Solution.** Each payment method is its own strategy class. The context holds one strategy and calls `pay()`.

```
PaymentStrategy                 «interface»  pay(order, payment, details)
 ├── CardPaymentStrategy        checks the card number and expiry, keeps only the last 4 digits, TXN-… id, marks PAID
 ├── CashOnDeliveryStrategy     COD-… id, "Cash collected on delivery", marks PAID
 └── BankTransferStrategy       needs the uploaded bank slip, BT-… id, "confirmed from the bank slip by <staff>", marks PAID
PaymentContext                  «context»    setPaymentStrategy(s), pay(order, payment, details)
PaymentProcessor                client – chooses the strategy for the order's method and gives it to the context
```

* At checkout, `PaymentProcessor.open(...)` creates a PENDING payment. Methods that the admin switched off in Settings are refused.
* Card: `PaymentService.payByCard` calls `complete(...)` with the card details, which uses `CardPaymentStrategy`.
* Cash on delivery: when sales staff set the order to DELIVERED, `OrderService` calls `complete(...)`, which uses `CashOnDeliveryStrategy`.
* Bank transfer: the customer uploads the bank slip (`PaymentService.uploadBankSlip`); when sales staff press *Confirm payment*,
  `PaymentService.confirmBankTransfer` calls `complete(...)`, which uses `BankTransferStrategy`.
* After any successful payment the invoice is generated automatically (`InvoiceGenerator`), and the customer gets a "Payment received" notification.

**Lecture match.** This is the e-commerce payment example. Bank transfer was added later exactly as the pattern
promises: one new class (`BankTransferStrategy`) plus one line where the client picks the strategy – the card and
cash strategies did not change (Open/Closed Principle).

## 3. Supplier Record Management: Observer

**Problem.** A purchase order changes status when procurement creates, cancels or re-opens it, and when the supplier
confirms, declines or ships it. Several parties care about each change:
* the purchase request it came from must follow the order;
* procurement must see what the supplier did;
* the supplier must see new or cancelled orders;
* the inventory manager must know stock is on its way.

**Solution.** `PurchaseOrderService` is the subject. `create`, `changeStatus` and `supplierUpdate` call
`notifyObservers(order, previousStatus)`.

```
PurchaseOrderSubject                 «interface»  addObserver, removeObserver, notifyObservers(order, previousStatus)
 └── PurchaseOrderService            concrete subject
PurchaseOrderObserver                «interface»  update(order, previousStatus)   (previousStatus = null for a new order)
 ├── PurchaseRequestStatusObserver   new / re-opened order → request ORDERED
 │                                   supplier DECLINED or procurement CANCELLED → request back to APPROVED, so it can be ordered again
 ├── ProcurementNotificationObserver supplier: new / re-opened / cancelled order; procurement: confirmed / declined / shipped
 └── ExpectedStockObserver           inventory manager: "Stock expected – PO #n" on CONFIRMED, "Goods shipped – PO #n" on SHIPPED
PurchaseOrderObserverRegistration    at start-up, adds every PurchaseOrderObserver to PurchaseOrderService
```

Because a declined order re-opens its request, a request can now have more than one purchase order. An old
declined order cannot be re-opened once the request has been ordered again with a new one.

**Lecture match.** This is the social-media followers example. The purchase order does not need to know who is following it.

## 4. Feedback & Review Management: Singleton

**Problem.** Reviews and feedback both have to be checked for abusive words before they are saved. The word list
should be loaded once and shared by the whole application, not read again for every review.

**Solution.** `ContentFilter` follows the three steps from the slides:

```java
public final class ContentFilter {
    private static ContentFilter instance;                        // 2. the only object

    private ContentFilter() {                                     // 1. private constructor
        this.bannedWords = load();                                //    reads resources/banned-words.txt once
    }

    public static synchronized ContentFilter getInstance() {      // 3. global access point (thread safe)
        if (instance == null) instance = new ContentFilter();
        return instance;
    }

    public List<String> check(String text) { ... }                // banned words found in the text
    public void requireClean(String... texts) { ... }             // 400 "Please remove inappropriate words: …"
}
```

* Used by `ReviewService.create/update` (the comment) and `FeedbackService.create/update` (subject and message).
* Reviews and feedback are published straight away (there is no approval step; staff can only reply to reviews), so text with a banned word is
  **rejected** with a message that lists the words. It is not saved to wait for staff.
* The list is in `backend/src/main/resources/banned-words.txt`, one word per line. Edit it there.

**Viva note.** Spring `@Service` beans are already singletons managed by the container. `ContentFilter` is written as
a plain Java class with `getInstance()` on purpose, so the pattern is visible exactly as in the slides.

## 5. Warranty & Return Management: Factory

**Problem.** When staff complete an approved claim, `RmaService.complete()` had an if/else for REFUNDED vs REPLACED.
Each branch had its own amount and stock rules.

**Solution.**

```
ClaimResolution              «interface / product»  resolve(rma, request)
 ├── RefundResolution        refund amount required and ≤ price paid (unit price × quantity);
 │                           a RETURN claim puts the part back into stock (RETURN movement, reference RMA-n)
 └── ReplacementResolution   the new part leaves stock (SALE movement, "Replacement sent to customer")
ClaimResolutionFactory       «factory»  getResolution(RmaStatus) → RefundResolution | ReplacementResolution
                             any other value → 400 "Resolution must be REFUNDED or REPLACED"
RmaService                   client – resolutionFactory.getResolution(request.resolution()).resolve(rma, request)
```

`RmaService` never uses `new RefundResolution(...)` itself. After resolving, it sets the status and completion time,
and the customer is notified.

**Lecture match.** This is the vehicle factory example (Car / Bike / Truck). A later "Repair" option would be one new
`ClaimResolution` class plus one line in the factory.

## 6. Marketing & Promotion Management: Decorator

**Problem.** A part's final price can be the base price, then a running product discount, then a coupon at checkout.
Before, `Discount.apply()` and `Coupon.calculateDiscount()` each had their own percentage / fixed-amount code.
Writing a class for every combination would explode, like `MilkSugarCoffee` in the slides.

**Solution.**

```
Price                    «component»          getAmount(), getDescription()
 ├── BasePrice           concrete component   the part's selling price (or an order subtotal)
 └── PriceDecorator      «abstract decorator» holds the Price it wraps
      ├── DiscountDecorator(price, discount)  percentage or fixed reduction, never below 0
      └── CouponDecorator(price, coupon)      checks the minimum order amount and the maximum discount cap
```

```java
Price price = new CouponDecorator(new DiscountDecorator(new BasePrice(part), discount), coupon);
price.getAmount();       // final price
price.getDescription();  // "Front Brake Pad Set - 10% off pads - coupon SAVE500"
```

Where it is used:
* `Price.forPart(part, discount)` gives the shop price shown in the catalogue (`SparePartResponse`), the cart (`CartService`) and order lines (`OrderService`).
* `PricingService` compares prices with and without the discount.
* `CouponService.check` and checkout in `OrderService` work out the coupon saving with `CouponDecorator`.

**Lecture match.** This is the coffee add-on example. A new kind of reduction (for example a loyalty discount) is one
new decorator, and it can be stacked with the others in any order.

---

## How the patterns are tested

`docs/api_test.py` (392 checks) covers each pattern through the API:

| Pattern | Checks |
|---|---|
| Observer (inventory) | stock drops below the reorder level → "Low stock" (inventory manager) and "Reorder suggested" (procurement) |
| Strategy | card, cash on delivery and bank transfer each complete the payment and create the invoice; a bank transfer needs an uploaded bank slip and staff confirmation; disabled methods are refused |
| Observer (supplier) | PO created → request ORDERED; supplier confirms → "Stock expected"; ships → "Goods shipped"; declines → request APPROVED again and procurement notified; old declined PO cannot be re-opened after a re-order |
| Singleton | review / feedback with banned words → 400 listing the words (create and update) |
| Factory | refund above the price paid → 400; refund puts a returned part back into stock; replacement takes one out |
| Decorator | discounted shop price, cart total and coupon saving (minimum order, maximum cap) |
