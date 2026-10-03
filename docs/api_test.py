"""
AutoHub Lanka - API smoke test.

Run it against a freshly started backend with an EMPTY database:
    python api_test.py
It creates its own data (and its own customer apitest@autohub.lk),
exercises every Create / Read / Update / Delete, the validation rules and
the delete rules, and deletes everything again at the end.
"""
import json, sys, urllib.request, urllib.error, datetime

BASE = "http://localhost:8080/api"
today = datetime.date.today()
D = lambda n: (today + datetime.timedelta(days=n)).isoformat()
fails = []
passes = 0

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except Exception: return e.code, txt

def upload(path, filename, content, ctype, token, fields=None):
    boundary = "----autohubtest"
    body = b""
    for k, v in (fields or {}).items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    if content is not None:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
                 f"Content-Type: {ctype}\r\n\r\n").encode() + content + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(BASE + path, data=body, method="POST")
    req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except Exception: return e.code, txt

def raw_get(path, token=None):
    req = urllib.request.Request(BASE + path)
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.headers.get("Content-Type"), r.read()
    except urllib.error.HTTPError as e:
        return e.code, None, b""

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c80000000049454e44ae426082")
PDF = b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n"
JPG = bytes.fromhex("ffd8ffe000104a46494600010100000100010000") + b"\x00" * 64 + bytes.fromhex("ffd9")

def check(label, got, expected, body=None):
    global passes
    if got == expected:
        passes += 1
        print(f"  ok  {label} -> {got}")
    else:
        fails.append(label)
        print(f"  FAIL {label}: expected {expected}, got {got} {json.dumps(body)[:300] if body is not None else ''}")

def step(title): print("\n== " + title)

def login(email, pw):
    s, b = call("POST", "/auth/login", {"email": email, "password": pw})
    check("login " + email, s, 200, b)
    return b["token"]

step("0. Login")
ADMIN = login("admin@autohub.lk", "Admin@123")
INV = login("inventory@autohub.lk", "Staff@123")
PROC = login("procurement@autohub.lk", "Staff@123")
SALES = login("sales@autohub.lk", "Staff@123")
MKT = login("marketing@autohub.lk", "Staff@123")
s, b = call("POST", "/auth/register", {"firstName": "Api", "lastName": "Tester", "email": "apitest@autohub.lk", "password": "Test@123"})
check("register with non-Gmail address -> 400", (s, "email" in b.get("fieldErrors", {})), (400, True), b)
for bad in ["apitest@gmail", "api..test@gmail.com", ".apitest@gmail.com", "api test@gmail.com", "apitest@gmail.co"]:
    s, b = call("POST", "/auth/register", {"firstName": "Api", "lastName": "Tester", "email": bad, "password": "Test@123"})
    check("invalid email " + bad + " -> 400", s, 400, b)
s, b = call("POST", "/auth/register", {"firstName": "Api", "lastName": "Tester", "email": "apitest.autohub@gmail.com", "password": "Test@123", "phone": "0770000001", "address": "ignored"})
check("register (Gmail, no phone/address needed)", (s, b.get("user", {}).get("phone")), (201, None), b)
CUST = b["token"]
s, b = call("POST", "/auth/register", {"firstName": "Api", "lastName": "Tester", "email": "APITEST.AUTOHUB@gmail.com", "password": "Test@123"}); check("duplicate email (case) -> 409", s, 409, b)
s, b = call("GET", "/auth/google/config", None, None); check("google config (not configured here)", (s, b.get("enabled")), (200, False), b)
s, b = call("POST", "/auth/google", {"credential": "x.y.z"}, None); check("google login without client id -> 400", s, 400, b)
s, b = call("POST", "/auth/login", {"email": "admin@autohub.lk", "password": "wrong"}); check("wrong password", s, 401, b)

step("1. Categories")
s, b = call("POST", "/categories", {"name": ""}, INV); check("blank name -> 400", s, 400, b)
s, cat = call("POST", "/categories", {"name": "Brakes", "description": "Brake pads, discs"}, INV); check("create", s, 201, cat)
s, b = call("POST", "/categories", {"name": "brakes"}, INV); check("duplicate name -> 409", s, 409, b)
s, cat2 = call("POST", "/categories", {"name": "Filters"}, INV); check("create 2nd", s, 201, cat2)
s, b = call("PUT", f"/categories/{cat['id']}", {"name": "Brake System", "description": "All brake parts"}, INV); check("update", s, 200, b)
s, b = call("GET", "/categories", None, None); check("public list", s, 200, b)
s, b = call("POST", "/categories", {"name": "X1"}, CUST); check("customer cannot create -> 403", s, 403, b)
s, tmp = call("POST", "/categories", {"name": "Temp"}, INV)
s, b = call("DELETE", f"/categories/{tmp['id']}", None, INV); check("delete empty category", s, 204, b)
s, b = call("GET", f"/categories/{tmp['id']}", None, INV); check("deleted -> 404", s, 404, b)

step("2. Spare parts (+ inventory record created)")
part = {"name": "Front Brake Pad Set", "sku": "bp-100", "brand": "Bosch", "price": 4500, "warrantyMonths": 12,
        "categoryId": cat["id"], "initialStock": 20, "reorderLevel": 5, "location": "Rack A1"}
s, b = call("POST", "/spare-parts", {**part, "price": 0}, INV); check("price 0 -> 400", s, 400, b)
s, b = call("POST", "/spare-parts", {**part, "sku": "bad sku!"}, INV); check("invalid sku -> 400", s, 400, b)
s, b = call("POST", "/spare-parts", {**part, "categoryId": 9999}, INV); check("unknown category -> 404", s, 404, b)
s, p1 = call("POST", "/spare-parts", part, INV); check("create", s, 201, p1)
check("sku uppercased + stock 20", (p1["sku"], p1["stockQuantity"]), ("BP-100", 20), p1)
s, b = call("POST", "/spare-parts", {**part, "name": "Other"}, INV); check("duplicate sku -> 409", s, 409, b)
s, p2 = call("POST", "/spare-parts", {"name": "Oil Filter", "sku": "OF-200", "price": 1200, "warrantyMonths": 0,
                                         "categoryId": cat2["id"], "initialStock": 50}, INV); check("create 2nd", s, 201, p2)
s, p3 = call("POST", "/spare-parts", {"name": "Air Filter", "sku": "AF-300", "price": 1800, "warrantyMonths": 6,
                                         "categoryId": cat2["id"]}, INV); check("create 3rd (no stock)", s, 201, p3)
s, b = call("PUT", f"/spare-parts/{p1['id']}", {**part, "price": 4800, "sku": "BP-100"}, INV); check("update price", s, 200, b)
s, b = call("GET", "/spare-parts?search=filter", None, None); check("search", (s, len(b)), (200, 2), b)
s, b = call("GET", f"/spare-parts/{p1['id']}", None, None); check("get by id", s, 200, b)

step("3. Vehicles")
veh = {"make": "Toyota", "model": "Corolla", "year": 2018, "variant": "GLi"}
s, b = call("POST", "/vehicles", {**veh, "year": 3000}, INV); check("year 3000 -> 400", s, 400, b)
s, b = call("POST", "/vehicles", {**veh, "year": today.year + 2}, INV); check("year > next year -> 400", s, 400, b)
s, v1 = call("POST", "/vehicles", veh, INV); check("create", s, 201, v1)
s, b = call("POST", "/vehicles", {**veh, "variant": "gli"}, INV); check("duplicate -> 409", s, 409, b)
s, v2 = call("POST", "/vehicles", {"make": "Honda", "model": "Civic", "year": 2020}, INV); check("create 2nd", s, 201, v2)
s, b = call("PUT", f"/vehicles/{v2['id']}", {"make": "Honda", "model": "Civic", "year": 2021, "engine": "1.5L"}, INV); check("update", s, 200, b)

step("4. Fitments")
s, f1 = call("POST", "/fitments", {"vehicleId": v1["id"], "sparePartId": p1["id"]}, INV); check("create", s, 201, f1)
s, b = call("POST", "/fitments", {"vehicleId": v1["id"], "sparePartId": p1["id"]}, INV); check("duplicate -> 409", s, 409, b)
s, f2 = call("POST", "/fitments", {"vehicleId": v2["id"], "sparePartId": p1["id"]}, INV); check("create 2nd", s, 201, f2)
s, b = call("PUT", f"/fitments/{f1['id']}", {"vehicleId": v1["id"], "sparePartId": p2["id"], "notes": "1.3L only"}, INV); check("update", s, 200, b)
s, b = call("GET", f"/spare-parts?vehicleId={v2['id']}", None, None); check("parts for vehicle", (s, len(b)), (200, 1), b)
s, b = call("GET", f"/spare-parts?make={v1['make'].upper()}", None, None); check("parts for a whole make (any model, any case)", [p["id"] for p in b], [p2["id"]], b)
s, b = call("GET", "/spare-parts?make=Lamborghini", None, None); check("make with no fitments -> empty", (s, len(b)), (200, 0), b)
s, b = call("DELETE", f"/fitments/{f1['id']}", None, INV); check("delete", s, 204, b)
s, b = call("DELETE", f"/vehicles/{v2['id']}", None, INV); check("delete vehicle cascades fitments", s, 204, b)
s, b = call("GET", f"/fitments/{f2['id']}", None, INV); check("fitment gone -> 404", s, 404, b)

step("5. Inventory records")
s, invs = call("GET", "/inventory", None, INV); check("list", (s, len(invs)), (200, 3), invs)
inv1 = next(i for i in invs if i["sparePartId"] == p1["id"])
inv3 = next(i for i in invs if i["sparePartId"] == p3["id"])
s, b = call("POST", "/inventory", {"sparePartId": p1["id"], "reorderLevel": 5}, INV); check("second record for part -> 409", s, 409, b)
s, b = call("PUT", f"/inventory/{inv1['id']}", {"reorderLevel": 8, "location": "Rack B2"}, INV); check("update reorder/location", s, 200, b)
s, b = call("PUT", f"/inventory/{inv1['id']}", {"quantity": 999, "reorderLevel": 8}, INV); check("direct qty edit -> 400", s, 400, b)
s, b = call("DELETE", f"/inventory/{inv3['id']}", None, INV); check("delete record", s, 204, b)
s, b = call("POST", "/inventory", {"sparePartId": p3["id"], "quantity": 10, "reorderLevel": 3}, INV); check("re-create record with opening 10", (s, b.get("quantity")), (201, 10), b)
inv3=b

step("6. Stock movements")
s, m1 = call("POST", "/stock-movements", {"inventoryId": inv1["id"], "type": "ADJUSTMENT_IN", "quantity": 5, "note": "count"}, INV); check("create +5", s, 201, m1)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock now 25", b["quantity"], 25, b)
s, b = call("POST", "/stock-movements", {"inventoryId": inv1["id"], "type": "DAMAGE", "quantity": 500}, INV); check("remove 500 -> 400", s, 400, b)
s, b = call("PUT", f"/stock-movements/{m1['id']}", {"inventoryId": inv1["id"], "type": "ADJUSTMENT_IN", "quantity": 2}, INV); check("update +5 -> +2", s, 200, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock now 22", b["quantity"], 22, b)
s, b = call("DELETE", f"/stock-movements/{m1['id']}", None, INV); check("delete reverts", s, 204, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock back to 20", b["quantity"], 20, b)
s, b = call("POST", "/stock-movements", {"inventoryId": inv1["id"], "type": "SALE", "quantity": 0}, INV); check("qty 0 -> 400", s, 400, b)
s, m2 = call("POST", "/stock-movements", {"inventoryId": inv3["id"], "type": "DAMAGE", "quantity": 8, "note": "water damage"}, INV); check("10 -> 2 (below reorder level 3)", s, 201, m2)
s, b = call("GET", "/notifications", None, INV); check("observer: inventory mgr gets 'Low stock'", any(n["title"] == "Low stock" for n in b), True, b)
s, b = call("GET", "/notifications", None, PROC); check("observer: procurement gets 'Reorder suggested'", any(n["title"] == "Reorder suggested" for n in b), True, b)
s, b = call("DELETE", f"/stock-movements/{m2['id']}", None, INV); check("undo damage", s, 204, b)
s, b = call("DELETE", f"/categories/{cat['id']}", None, INV); check("category with parts -> 409", s, 409, b)

step("7. Suppliers (+ portal login)")
sup = {"name": "Lanka Auto Traders", "email": "orders@lankaauto.lk", "phone": "0112345678", "contactPerson": "Ruwan Perera",
       "address": "Kandy Road, Kadawatha", "portalPassword": "Supplier@123"}
s, b = call("POST", "/suppliers", {**sup, "phone": "12"}, PROC); check("bad phone -> 400", s, 400, b)
s, s1 = call("POST", "/suppliers", sup, PROC); check("create with portal", (s, s1.get("portalAccess")), (201, True), s1)
s, b = call("POST", "/suppliers", {**sup, "name": "Other"}, PROC); check("duplicate email -> 409", s, 409, b)
s, s2 = call("POST", "/suppliers", {"name": "Colombo Filters", "email": "sales@cfilters.lk", "phone": "0771112223"}, PROC); check("create 2nd", s, 201, s2)
s, b = call("PUT", f"/suppliers/{s2['id']}", {"name": "Colombo Filters (Pvt) Ltd", "email": "sales@cfilters.lk", "phone": "0771112223"}, PROC); check("update", s, 200, b)
SUP = login("orders@lankaauto.lk", "Supplier@123")
s, b = call("DELETE", f"/suppliers/{s2['id']}", None, PROC); check("delete unused supplier", s, 204, b)

step("8. Purchase requests")
s, b = call("POST", "/purchase-requests", {"sparePartId": p1["id"], "supplierId": s1["id"], "quantity": 30}, INV); check("inventory mgr cannot raise (procurement does) -> 403", s, 403, b)
s, r1 = call("POST", "/purchase-requests", {"sparePartId": p1["id"], "supplierId": s1["id"], "quantity": 30, "reason": "Low stock"}, PROC); check("procurement raises request", s, 201, r1)
s, b = call("POST", "/purchase-requests", {"sparePartId": p1["id"], "supplierId": s1["id"], "quantity": 0}, PROC); check("qty 0 -> 400", s, 400, b)
s, b = call("PUT", f"/purchase-requests/{r1['id']}", {"sparePartId": p1["id"], "supplierId": s1["id"], "quantity": 40}, PROC); check("update pending", s, 200, b)
s, b = call("GET", "/notifications", None, INV); check("inventory mgr notified of new request", any("needs approval" in n["title"] for n in b), True, b)
s, r2 = call("POST", "/purchase-requests", {"sparePartId": p2["id"], "supplierId": s1["id"], "quantity": 10}, PROC)
s, b = call("PATCH", f"/purchase-requests/{r2['id']}/reject", {"note": "Enough stock"}, PROC); check("procurement cannot reject -> 403", s, 403, b)
s, b = call("PATCH", f"/purchase-requests/{r2['id']}/reject", {"note": "Enough stock"}, ADMIN); check("admin can no longer reject -> 403", s, 403, b)
s, b = call("PATCH", f"/purchase-requests/{r2['id']}/reject", {"note": ""}, INV); check("reject without note -> 400", s, 400, b)
s, b = call("PATCH", f"/purchase-requests/{r2['id']}/reject", {"note": "Enough stock"}, INV); check("inventory mgr rejects", s, 200, b)
s, b = call("PUT", f"/purchase-requests/{r2['id']}", {"sparePartId": p2["id"], "supplierId": s1["id"], "quantity": 5}, PROC); check("edit rejected -> 409", s, 409, b)
s, b = call("DELETE", f"/purchase-requests/{r2['id']}", None, PROC); check("delete", s, 204, b)
s, b = call("PATCH", f"/purchase-requests/{r1['id']}/approve", {"note": "Approved"}, PROC); check("procurement cannot approve -> 403", s, 403, b)
s, b = call("PATCH", f"/purchase-requests/{r1['id']}/approve", {"note": "Approved"}, ADMIN); check("admin cannot approve -> 403", s, 403, b)
s, b = call("GET", "/purchase-requests", None, ADMIN); check("admin can still view requests", s, 200, b)
s, b = call("PATCH", f"/purchase-requests/{r1['id']}/approve", {"note": "Approved"}, INV); check("inventory mgr approves", (s, b.get("status")), (200, "APPROVED"), b)
s, b = call("GET", "/notifications", None, PROC); check("procurement notified of approval", any("approved" in n["title"] for n in b), True, b)

step("9. Purchase orders + supplier portal")
po = {"supplierId": s1["id"], "purchaseRequestId": r1["id"], "expectedDeliveryDate": D(7), "deliveryAddress": "AutoHub warehouse, Colombo",
      "items": [{"sparePartId": p1["id"], "quantity": 40, "unitCost": 3000}]}
s, b = call("POST", "/purchase-orders", {**po, "items": []}, PROC); check("no items -> 400", s, 400, b)
s, b = call("POST", "/purchase-orders", {**po, "expectedDeliveryDate": D(-2)}, PROC); check("past date -> 400", s, 400, b)
s, b = call("POST", "/purchase-orders", {**po, "items": [{"sparePartId": p2["id"], "quantity": 5, "unitCost": 900}]}, PROC); check("PR part missing -> 400", s, 400, b)
s, b = call("POST", "/purchase-orders", {k: v for k, v in po.items() if k != "purchaseRequestId"}, PROC); check("PO without approved request -> 400", s, 400, b)
s, b = call("POST", "/purchase-orders", {**po, "purchaseRequestId": r2["id"]}, PROC); check("PO from rejected/deleted request -> 404/400", s in (400, 404), True, b)
s, b = call("POST", "/purchase-orders", {**po, "items": [{"sparePartId": p1["id"], "quantity": 41, "unitCost": 3000}]}, PROC); check("more than approved qty -> 400", s, 400, b)
s, b = call("POST", "/purchase-orders", {**po, "items": po["items"] + [{"sparePartId": p2["id"], "quantity": 10, "unitCost": 800}]}, PROC); check("extra part not approved -> 400", s, 400, b)
s, o1 = call("POST", "/purchase-orders", po, PROC); check("create from PR", (s, o1.get("totalAmount")), (201, 120000.0), o1)
s, b = call("GET", f"/purchase-requests/{r1['id']}", None, PROC); check("PR -> ORDERED", b["status"], "ORDERED", b)
s, b = call("PUT", f"/purchase-orders/{o1['id']}", {**po, "items": [{"sparePartId": p1["id"], "quantity": 40, "unitCost": 2900},
                                                                  {"sparePartId": p2["id"], "quantity": 10, "unitCost": 800}]}, PROC); check("update: extra part -> 400", s, 400, b)
s, b = call("PUT", f"/purchase-orders/{o1['id']}", {**po, "items": [{"sparePartId": p1["id"], "quantity": 40, "unitCost": 2900}]}, PROC); check("update pending (new unit cost)", (s, b.get("totalAmount")), (200, 116000.0), b)
o1 = b
s, b = call("POST", "/goods-receipts/receive", {"purchaseOrderId": o1["id"], "lines": [{"purchaseOrderItemId": o1["items"][0]["id"], "receivedQuantity": 5}]}, PROC); check("receive before confirm -> 409", s, 409, b)
s, b = call("GET", "/goods-receipts/receivable-orders", None, INV); check("nothing to receive yet", (s, len(b)), (200, 0), b)
s, b = call("POST", "/goods-receipts", {"purchaseOrderItemId": o1["items"][0]["id"], "receivedQuantity": 5}, PROC); check("old single-line shortcut removed -> 405", s, 405, b)
s, mine = call("GET", "/purchase-orders/supplier/mine", None, SUP); check("supplier sees own POs", (s, len(mine)), (200, 1), mine)
s, b = call("GET", "/purchase-orders", None, SUP); check("supplier cannot list all -> 403", s, 403, b)
s, b = call("PATCH", f"/purchase-orders/{o1['id']}/supplier-status", {"status": "SHIPPED"}, SUP); check("ship before confirm -> 409", s, 409, b)
s, b = call("PATCH", f"/purchase-orders/{o1['id']}/supplier-status", {"status": "CONFIRMED", "note": "Will deliver Monday"}, SUP); check("supplier confirms", s, 200, b)
s, b = call("PUT", f"/purchase-orders/{o1['id']}", po, PROC); check("edit confirmed -> 409", s, 409, b)
s, b = call("PATCH", f"/purchase-orders/{o1['id']}/supplier-status", {"status": "SHIPPED"}, SUP); check("supplier ships", s, 200, b)
s, b = call("GET", "/notifications", None, INV); check("inventory mgr told stock is expected (observer)", any("Stock expected" in n["title"] for n in b), True, b)
s, b = call("GET", "/notifications", None, INV); check("inventory mgr told goods are on the way", any("shipped" in n["title"] for n in b), True, b)

step("9b. Supplier declines -> purchase request re-opened (Observer)")
s, r3 = call("POST", "/purchase-requests", {"sparePartId": p2["id"], "supplierId": s1["id"], "quantity": 8, "reason": "Top up"}, PROC)
s, b = call("PATCH", f"/purchase-requests/{r3['id']}/approve", {"note": "OK"}, INV)
po3 = {"supplierId": s1["id"], "purchaseRequestId": r3["id"], "expectedDeliveryDate": D(5), "deliveryAddress": "AutoHub warehouse, Colombo",
       "items": [{"sparePartId": p2["id"], "quantity": 8, "unitCost": 700}]}
s, o3 = call("POST", "/purchase-orders", po3, PROC); check("PO from 2nd request", s, 201, o3)
s, b = call("GET", f"/purchase-requests/{r3['id']}", None, PROC); check("request ORDERED", b["status"], "ORDERED", b)
s, b = call("PATCH", f"/purchase-orders/{o3['id']}/supplier-status", {"status": "DECLINED", "note": "Out of stock"}, SUP); check("supplier declines", s, 200, b)
s, b = call("GET", f"/purchase-requests/{r3['id']}", None, PROC); check("request back to APPROVED", b["status"], "APPROVED", b)
s, b = call("GET", "/notifications", None, PROC); check("procurement told about decline", any(n["title"] == f"Purchase order #{o3['id']} declined" for n in b), True, b)
s, o4 = call("POST", "/purchase-orders", po3, PROC); check("order again from re-opened request", s, 201, o4)
s, b = call("PATCH", f"/purchase-orders/{o3['id']}/status", {"status": "PENDING"}, PROC); check("re-open old declined PO after re-order -> 409", s, 409, b)
s, b = call("DELETE", f"/purchase-orders/{o3['id']}", None, PROC); check("delete declined PO", s, 204, b)
s, b = call("GET", f"/purchase-requests/{r3['id']}", None, PROC); check("request still ORDERED (by the new PO)", b["status"], "ORDERED", b)
s, b = call("DELETE", f"/purchase-orders/{o4['id']}", None, PROC); check("delete new PO", s, 204, b)
s, b = call("GET", f"/purchase-requests/{r3['id']}", None, PROC); check("request APPROVED again", b["status"], "APPROVED", b)
s, b = call("DELETE", f"/purchase-requests/{r3['id']}", None, PROC); check("delete the re-opened request", s, 204, b)

step("10. Goods receipts (stock in)")
line1 = o1["items"][0]["id"]
rcv = lambda q, note=None, tok=PROC: call("POST", "/goods-receipts/receive", {"purchaseOrderId": o1["id"], "note": note, "lines": [{"purchaseOrderItemId": line1, "receivedQuantity": q}]}, tok)
s, b = call("GET", "/goods-receipts/receivable-orders", None, INV); check("PO waiting for goods", (s, [o["id"] for o in b]), (200, [o1["id"]]), b)
s, b = rcv(41); check("more than ordered -> 400", s, 400, b)
s, b = rcv(0); check("nothing entered -> 400", s, 400, b)
s, b = call("POST", "/goods-receipts/receive", {"purchaseOrderId": o1["id"], "lines": [{"purchaseOrderItemId": 99999, "receivedQuantity": 1}]}, PROC); check("line of another PO -> 400", s, 400, b)
s, b = rcv(30, "Box 1", INV); check("inventory mgr receives 30", (s, b.get("status")), (201, "PARTIALLY_RECEIVED"), b)
g1 = b["receipts"][0]
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock 20+30=50", b["quantity"], 50, b)
s, b = call("GET", f"/purchase-orders/{o1['id']}", None, PROC); check("PO PARTIALLY_RECEIVED", b["status"], "PARTIALLY_RECEIVED", b)
s, b = call("PUT", f"/goods-receipts/{g1['id']}", {"purchaseOrderItemId": line1, "receivedQuantity": 35}, PROC); check("update to 35", s, 200, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock 55", b["quantity"], 55, b)
s, b = rcv(5, "Box 2"); check("receive the last 5", s, 201, b); g2 = b["receipts"][0]
s, b = call("GET", f"/purchase-orders/{o1['id']}", None, PROC); check("PO RECEIVED", b["status"], "RECEIVED", b)
s, mv = call("GET", f"/stock-movements?inventoryId={inv1['id']}", None, INV)
sysmv = next(m for m in mv if not m["manual"])
s, b = call("DELETE", f"/stock-movements/{sysmv['id']}", None, INV); check("delete system movement -> 409", s, 409, b)
s, b = call("DELETE", f"/inventory/{inv1['id']}", None, INV); check("delete inventory with GRNs -> 409", s, 409, b)
s, b = call("DELETE", f"/purchase-orders/{o1['id']}", None, PROC); check("delete PO with GRNs -> 409", s, 409, b)
s, b = call("DELETE", f"/goods-receipts/{g2['id']}", None, PROC); check("delete GRN (reverts stock)", s, 204, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock back to 55", b["quantity"], 55, b)
s, b = call("GET", f"/purchase-orders/{o1['id']}", None, PROC); check("PO back to PARTIALLY_RECEIVED", b["status"], "PARTIALLY_RECEIVED", b)
s, b = rcv(5); check("receive again -> stock 60", s, 201, b)
s, b = call("DELETE", f"/suppliers/{s1['id']}", None, PROC); check("delete supplier with POs -> 409", s, 409, b)

step("11. Marketing")
s, b = call("POST", "/promotions", {"title": "Brake Week", "startDate": D(5), "endDate": D(1)}, MKT); check("end before start -> 400", s, 400, b)
s, pr = call("POST", "/promotions", {"title": "Brake Week", "description": "Save on brakes", "startDate": D(0), "endDate": D(10), "sparePartIds": [p1["id"]]}, MKT); check("create promotion", s, 201, pr)
s, b = call("PUT", f"/promotions/{pr['id']}", {"title": "Brake Week 2026", "startDate": D(0), "endDate": D(14), "sparePartIds": [p1["id"], p2["id"]]}, MKT); check("update promotion", (s, len(b.get("spareParts", []))), (200, 2), b)
s, b = call("GET", "/promotions/active", None, None); check("public active promotions", (s, len(b)), (200, 1), b)
s, b = call("POST", "/discounts", {"sparePartId": p1["id"], "name": "Too much", "type": "PERCENTAGE", "value": 95, "startDate": D(0), "endDate": D(5)}, MKT); check("95% -> 400", s, 400, b)
s, b = call("POST", "/discounts", {"sparePartId": p2["id"], "name": "Too much", "type": "FIXED_AMOUNT", "value": 5000, "startDate": D(0), "endDate": D(5)}, MKT); check("fixed >= price -> 400", s, 400, b)
s, dc = call("POST", "/discounts", {"sparePartId": p1["id"], "name": "10% off pads", "type": "PERCENTAGE", "value": 10, "startDate": D(0), "endDate": D(5)}, MKT); check("create discount", (s, dc.get("discountedPrice")), (201, 4320.0), dc)
s, b = call("POST", "/discounts", {"sparePartId": p1["id"], "name": "Overlap", "type": "PERCENTAGE", "value": 5, "startDate": D(2), "endDate": D(8)}, MKT); check("overlapping -> 409", s, 409, b)
s, b = call("PUT", f"/discounts/{dc['id']}", {"sparePartId": p1["id"], "name": "10% off pads", "type": "PERCENTAGE", "value": 10, "startDate": D(0), "endDate": D(7)}, MKT); check("update discount", s, 200, b)
s, b = call("GET", f"/spare-parts/{p1['id']}", None, None); check("storefront final price", b["finalPrice"], 4320.0, b)
s, cp = call("POST", "/coupons", {"code": "save500", "type": "FIXED_AMOUNT", "value": 500, "minOrderAmount": 3000, "usageLimit": 100, "startDate": D(0), "endDate": D(30)}, MKT); check("create coupon", (s, cp.get("code")), (201, "SAVE500"), cp)
s, b = call("POST", "/coupons", {"code": "SAVE500", "type": "FIXED_AMOUNT", "value": 100, "minOrderAmount": 0, "usageLimit": 0, "startDate": D(0), "endDate": D(3)}, MKT); check("duplicate code -> 409", s, 409, b)
s, b = call("POST", "/coupons", {"code": "BAD CODE", "type": "PERCENTAGE", "value": 10, "minOrderAmount": 0, "usageLimit": 0, "startDate": D(0), "endDate": D(3)}, MKT); check("code with space -> 400", s, 400, b)
s, tmpc = call("POST", "/coupons", {"code": "TEMP10", "type": "PERCENTAGE", "value": 10, "minOrderAmount": 0, "usageLimit": 0, "startDate": D(0), "endDate": D(3)}, MKT)
s, b = call("PUT", f"/coupons/{tmpc['id']}", {"code": "TEMP15", "type": "PERCENTAGE", "value": 15, "minOrderAmount": 0, "maxDiscountAmount": 1000, "usageLimit": 5, "startDate": D(0), "endDate": D(3)}, MKT); check("update coupon", s, 200, b)
s, b = call("DELETE", f"/coupons/{tmpc['id']}", None, MKT); check("delete coupon", s, 204, b)

step("12. Cart + checkout (customer)")
s, b = call("POST", "/cart/items", {"sparePartId": p1["id"], "quantity": 999}, CUST); check("more than 100 -> 400", s, 400, b)

step("12a. Wishlist")
s, b = call("POST", "/wishlist", {"sparePartId": p1["id"]}, CUST); check("add to wishlist", (s, len(b)), (200, 1), b)
s, b = call("POST", "/wishlist", {"sparePartId": p1["id"]}, CUST); check("adding twice keeps one", len(b), 1, b)
s, b = call("POST", "/wishlist", {"sparePartId": p2["id"]}, CUST); check("add 2nd", len(b), 2, b)
s, b = call("POST", "/wishlist", {"sparePartId": 99999}, CUST); check("unknown part -> 404", s, 404, b)
s, b = call("GET", "/wishlist", None, CUST); check("view wishlist (with price + stock)", (s, b[0]["part"]["finalPrice"] is not None), (200, True), b)
s, b = call("GET", "/wishlist", None, SALES); check("staff have no wishlist -> 403", s, 403, b)
s, b = call("POST", f"/wishlist/{p2['id']}/move-to-cart", None, CUST); check("move to cart", (s, b["itemCount"]), (200, 1), b)
s, b = call("GET", "/wishlist", None, CUST); check("moved item left the wishlist", [w["part"]["id"] for w in b], [p1["id"]], b)
s, b = call("DELETE", f"/wishlist/{p1['id']}", None, CUST); check("remove", (s, len(b)), (200, 0), b)
s, b = call("DELETE", f"/wishlist/{p1['id']}", None, CUST); check("remove again -> 404", s, 404, b)
s, b = call("DELETE", "/cart", None, CUST)
s, b = call("POST", "/cart/items", {"sparePartId": p3["id"], "quantity": 11}, CUST); check("more than stock -> 400", s, 400, b)
s, cart = call("POST", "/cart/items", {"sparePartId": p1["id"], "quantity": 2}, CUST); check("add to cart", s, 200, cart)
s, cart = call("POST", "/cart/items", {"sparePartId": p2["id"], "quantity": 3}, CUST); check("add 2nd", (s, cart["itemCount"]), (200, 5), cart)
line = next(l for l in cart["items"] if l["sparePartId"] == p2["id"])
s, cart = call("PUT", f"/cart/items/{line['id']}", {"sparePartId": p2["id"], "quantity": 1}, CUST); check("update qty", (s, cart["itemCount"]), (200, 3), cart)
s, b = call("GET", f"/coupons/check?code=SAVE500&amount=1000", None, CUST); check("coupon min order -> 400", s, 400, b)
s, b = call("GET", f"/coupons/check?code=SAVE500&amount=9840", None, CUST); check("coupon check ok", (s, b.get("discountAmount")), (200, 500.0), b)
co = {"deliveryAddress": "No 12, Temple Road, Nugegoda", "contactPhone": "0771234567", "paymentMethod": "CARD"}
s, b = call("POST", "/orders/checkout", {**co, "contactPhone": "abc"}, CUST); check("bad phone -> 400", s, 400, b)
s, b = call("POST", "/orders/checkout", {**co, "couponCode": "NOPE"}, CUST); check("unknown coupon -> 400", s, 400, b)
s, ord1 = call("POST", "/orders/checkout", {**co, "couponCode": "save500"}, CUST); check("cart checkout", s, 201, ord1)
s, b = call("GET", "/users/me", None, CUST); check("phone + address saved from checkout", (b["phone"], b["address"]), ("0771234567", "No 12, Temple Road, Nugegoda"), b)
s, b = call("GET", f"/invoices/order/{ord1['id']}", None, CUST); check("no invoice before payment -> 404", s, 404, b)
check("totals 2x4320+1200-500", (ord1["subtotal"], ord1["discountAmount"], ord1["totalAmount"]), (9840.0, 500.0, 9340.0), ord1)
s, b = call("GET", "/cart", None, CUST); check("cart emptied", b["itemCount"], 0, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock 60-2=58", b["quantity"], 58, b)
s, b = call("POST", "/orders/checkout", co, CUST); check("empty cart checkout -> 400", s, 400, b)
card = {"cardHolder": "Amal Customer", "cardNumber": "4111111111111111", "expiry": "12/30", "cvv": "123"}
s, b = call("POST", f"/payments/order/{ord1['id']}/card", {**card, "expiry": "01/20"}, CUST); check("expired card -> 400", s, 400, b)
s, pay1 = call("POST", f"/payments/order/{ord1['id']}/card", card, CUST); check("pay by card", (s, pay1.get("status")), (200, "PAID"), pay1)
s, b = call("GET", f"/invoices/order/{ord1['id']}", None, CUST); check("invoice generated automatically", (s, b.get("amount"), b.get("paymentMethod")), (200, 9340.0, "CARD"), b)
s, b = call("GET", f"/orders/{ord1['id']}", None, CUST); check("order shows invoice number", (b["invoiceNumber"] or "").startswith("INV-"), True, b)
s, b = call("GET", "/notifications", None, CUST); check("customer notified of payment", any(n["title"] == "Payment received" for n in b), True, b)
s, b = call("POST", f"/payments/order/{ord1['id']}/card", card, CUST); check("pay twice -> 409", s, 409, b)
s, ord2 = call("POST", "/orders/checkout", {**co, "sparePartId": p3["id"], "quantity": 2, "paymentMethod": "CASH_ON_DELIVERY"}, CUST); check("buy now (COD)", s, 201, ord2)
s, ord3 = call("POST", "/orders/checkout", {**co, "sparePartId": p2["id"], "quantity": 1}, CUST); check("buy now #2", s, 201, ord3)
s, b = call("PUT", f"/orders/{ord3['id']}", {"deliveryAddress": "No 99, New Address, Maharagama", "contactPhone": "0719998887"}, CUST); check("customer edits address", s, 200, b)
s, b = call("PATCH", f"/orders/{ord3['id']}/cancel", None, CUST); check("customer cancels", (s, b.get("status")), (200, "CANCELLED"), b)
s, b = call("GET", f"/spare-parts/{p2['id']}", None, None); check("stock returned after cancel", b["stockQuantity"], 49, b)
s, b = call("GET", "/orders/mine", None, CUST); check("my orders", (s, len(b)), (200, 3), b)
s, b = call("GET", "/orders", None, CUST); check("customer cannot list all -> 403", s, 403, b)

step("12b. Sales staff create an order for a customer")
so = {"customerId": ord1["customerId"], "items": [{"sparePartId": p2["id"], "quantity": 2}], "deliveryAddress": "Phone order - No 5, Lake Road, Kandy",
      "contactPhone": "0812223334", "paymentMethod": "CASH_ON_DELIVERY", "note": "Customer called the shop"}
s, b = call("POST", "/orders", so, CUST); check("customer cannot use staff endpoint -> 403", s, 403, b)
s, b = call("POST", "/orders", so, ADMIN); check("admin (read-only) cannot create -> 403", s, 403, b)
s, b = call("POST", "/orders", {**so, "items": []}, SALES); check("no items -> 400", s, 400, b)
s, b = call("POST", "/orders", {**so, "customerId": 99999}, SALES); check("unknown customer -> 404", s, 404, b)
s, b = call("POST", "/orders", {**so, "items": so["items"] * 2}, SALES); check("same part twice -> 400", s, 400, b)
s, b = call("POST", "/orders", {**so, "items": [{"sparePartId": p3["id"], "quantity": 99}]}, SALES); check("more than stock -> 400", s, 400, b)
s, b = call("GET", "/users/customers", None, SALES); check("sales staff can pick customers", (s, any(c["id"] == ord1["customerId"] for c in b)), (200, True), b)
s, b = call("GET", "/users/customers", None, CUST); check("customer cannot list customers -> 403", s, 403, b)
s, ord5 = call("POST", "/orders", so, SALES); check("sales staff creates order", (s, ord5.get("placedBy"), ord5.get("totalAmount")), (201, "Dilani Fernando", 2400.0), ord5)
s, b = call("GET", "/orders/mine", None, CUST); check("order appears in the customer's orders", any(o["id"] == ord5["id"] for o in b), True, b)
s, b = call("GET", "/notifications", None, CUST); check("customer told about the staff order", any("placed for you" in n["title"] for n in b), True, b)

step("13. Order processing, payments, invoices (sales staff)")
s, b = call("PATCH", f"/orders/{ord1['id']}/status", {"status": "DELIVERED"}, SALES); check("PLACED->DELIVERED -> 409", s, 409, b)
for st in ["PROCESSING", "SHIPPED", "DELIVERED"]:
    s, b = call("PATCH", f"/orders/{ord1['id']}/status", {"status": st}, SALES); check("-> " + st, s, 200, b)
for st in ["PROCESSING", "SHIPPED", "DELIVERED"]:
    s, b = call("PATCH", f"/orders/{ord2['id']}/status", {"status": st}, SALES)
check("COD auto-paid on delivery", b["paymentStatus"], "PAID", b)
s, b = call("GET", f"/invoices/order/{ord2['id']}", None, SALES); check("COD invoice generated on delivery", s, 200, b)
s, b = call("PUT", f"/orders/{ord1['id']}", {"deliveryAddress": "Late change address 123", "contactPhone": "0771234567"}, SALES); check("edit delivered -> 409", s, 409, b)
s, b = call("POST", "/invoices", {"orderId": ord1["id"]}, SALES); check("manual invoice create removed", s in (404, 405), True, b)
s, b = call("GET", "/invoices", None, SALES); check("separate invoice list removed", s in (404, 405), True, b)
s, b = call("DELETE", "/invoices/1", None, SALES); check("manual invoice delete removed", s in (404, 405), True, b)
s, b = call("GET", f"/invoices/order/{ord3['id']}", None, SALES); check("cancelled unpaid order has no invoice", s, 404, b)
s, pays = call("GET", "/payments", None, SALES); check("list payments", s, 200, pays)
pay3 = next(p for p in pays if p["orderId"] == ord3["id"])
s, b = call("DELETE", f"/payments/{pay1['id']}", None, SALES); check("delete PAID payment -> 409", s, 409, b)
s, b = call("PUT", f"/payments/{pay3['id']}", {"orderId": ord3["id"], "method": "CARD", "status": "PAID"}, SALES); check("mark cancelled order paid -> 400", s, 400, b)
s, b = call("DELETE", f"/payments/{pay3['id']}", None, SALES); check("delete failed payment", s, 204, b)
s, b = call("POST", "/payments", {"orderId": ord3["id"], "method": "CARD", "status": "FAILED", "note": "test"}, SALES); check("staff creates payment record", s, 201, b)
s, b = call("PUT", f"/payments/{b['id']}", {"orderId": ord3["id"], "method": "CARD", "status": "FAILED", "note": "declined"}, SALES); check("update payment", s, 200, b)

step("13b. Bank transfer (Strategy)")
s, ordB = call("POST", "/orders/checkout", {**co, "sparePartId": p2["id"], "quantity": 1, "paymentMethod": "BANK_TRANSFER"}, CUST); check("checkout with bank transfer", (s, ordB.get("paymentMethod"), ordB.get("paymentStatus")), (201, "BANK_TRANSFER", "PENDING"), ordB)
s, b = call("GET", f"/payments/order/{ordB['id']}", None, CUST); payB = b[0]; check("pending payment waiting for transfer", (payB["status"], payB["bankReference"]), ("PENDING", None), b)
s, b = call("GET", "/settings/public", None, None); check("bank details are public", (b["bankTransferEnabled"], b["bankName"], bool(b["bankAccountNumber"])), (True, "Bank of Ceylon", True), b)
s, b = call("PATCH", f"/orders/{ordB['id']}/status", {"status": "PROCESSING"}, SALES); check("can be processed", s, 200, b)
s, b = call("PATCH", f"/orders/{ordB['id']}/status", {"status": "SHIPPED"}, SALES); check("cannot ship before transfer confirmed -> 409", s, 409, b)
s, b = call("PATCH", f"/payments/{payB['id']}/confirm-transfer", None, SALES); check("confirm before the slip is uploaded -> 400", s, 400, b)
slip = f"/payments/order/{ordB['id']}/bank-slip"
s, b = upload(slip, None, None, None, CUST); check("no slip file -> 400", s, 400, b)
s, b = upload(slip, "slip.png", b"just some text, not a slip", "image/png", CUST); check("not an image / PDF -> 400", s, 400, b)
s, b = upload(slip, "big.pdf", PDF + b"0" * (5 * 1024 * 1024), "application/pdf", CUST); check("slip > 5 MB -> 400", s, 400, b)
s, b = upload(slip, "slip.png", PNG, "image/png", CUST, {"reference": "#!"}); check("bad reference -> 400", s, 400, b)
s, b = upload(f"/payments/order/{ord1['id']}/bank-slip", "slip.png", PNG, "image/png", CUST); check("order already paid by card -> 409", s, 409, b)
s, b = upload(slip, "slip.png", PNG, "image/png", SALES); check("staff cannot upload for the customer -> 403", s, 403, b)
s, b = upload(slip, "deposit slip.png", PNG, "image/png", CUST); check("customer uploads the bank slip (reference optional)", (s, b.get("status"), b.get("bankReference"), (b.get("slipUrl") or "").startswith(f"/api/payments/{payB['id']}/slip")), (200, "PENDING", None, True), b)
s, ctype, data = raw_get(f"/payments/{payB['id']}/slip", SALES); check("staff can open the slip", (s, ctype, data == PNG), (200, "image/png", True))
s, ctype, data = raw_get(f"/payments/{payB['id']}/slip", CUST); check("customer can open own slip", s, 200)
s, ctype, data = raw_get(f"/payments/{payB['id']}/slip"); check("slip is private (no login) -> 401/403", s in (401, 403), True)
s, b = call("GET", "/notifications", None, SALES); check("sales staff asked to confirm", any(n["title"] == f"Bank transfer to confirm - order #{ordB['id']}" for n in b), True, b)
s, b = call("PATCH", f"/payments/{payB['id']}/reject-transfer", {"reason": ""}, SALES); check("not found without reason -> 400", s, 400, b)
s, b = call("PATCH", f"/payments/{payB['id']}/reject-transfer", {"reason": "The amount on the slip does not match"}, SALES); check("staff: transfer not found (slip removed)", (s, b.get("slipUrl")), (200, None), b)
s, ctype, data = raw_get(f"/payments/{payB['id']}/slip", SALES); check("rejected slip deleted -> 404", s, 404)
s, b = call("GET", "/notifications", None, CUST); check("customer told transfer not found", any(n["title"].startswith("Bank transfer not found") for n in b), True, b)
s, b = upload(slip, "slip.pdf", PDF, "application/pdf", CUST, {"reference": "FT2410019999"}); check("customer uploads a PDF slip with reference", (s, b.get("bankReference")), (200, "FT2410019999"), b)
s, ctype, data = raw_get(f"/payments/{payB['id']}/slip", SALES); check("PDF slip served", (s, ctype), (200, "application/pdf"))
s, b = call("PATCH", f"/payments/{payB['id']}/confirm-transfer", None, CUST); check("customer cannot confirm -> 403", s, 403, b)
s, b = call("PATCH", f"/payments/{payB['id']}/confirm-transfer", None, ADMIN); check("admin (read-only) cannot confirm -> 403", s, 403, b)
s, b = call("PATCH", f"/payments/{payB['id']}/confirm-transfer", None, SALES); check("staff confirms -> PAID", (s, b.get("status"), b.get("transactionId")), (200, "PAID", "BT-FT2410019999"), b)
s, b = call("GET", f"/invoices/order/{ordB['id']}", None, CUST); check("invoice generated automatically", (s, b.get("paymentMethod")), (200, "BANK_TRANSFER"), b)
s, b = call("PATCH", f"/payments/{payB['id']}/confirm-transfer", None, SALES); check("confirm twice -> 409", s, 409, b)
s, b = call("PATCH", f"/payments/{pay1['id']}/confirm-transfer", None, SALES); check("confirm a card payment -> 400", s, 400, b)
for st in ["SHIPPED", "DELIVERED"]:
    s, b = call("PATCH", f"/orders/{ordB['id']}/status", {"status": st}, SALES); check("paid transfer -> " + st, s, 200, b)

step("14. Reviews")
item1 = ord1["items"][0]
s, rv = call("POST", "/reviews", {"orderItemId": item1["id"], "rating": 6}, CUST); check("rating 6 -> 400", s, 400, rv)
s, b = call("POST", "/reviews", {"orderItemId": item1["id"], "rating": 1, "comment": "These pads are crap, STUPID shop"}, CUST); check("bad words rejected (ContentFilter singleton)", (s, "crap" in b.get("message",""), "stupid" in b.get("message","")), (400, True, True), b)
s, rv = call("POST", "/reviews", {"orderItemId": item1["id"], "rating": 5, "comment": "Great pads"}, CUST); check("create", s, 201, rv)
s, b = call("POST", "/reviews", {"orderItemId": item1["id"], "rating": 4}, CUST); check("second review same item -> 409", s, 409, b)
s, b = call("POST", "/reviews", {"orderItemId": ord3["items"][0]["id"], "rating": 4}, CUST); check("review undelivered -> 400", s, 400, b)
s, b = call("PUT", f"/reviews/{rv['id']}", {"orderItemId": item1["id"], "rating": 4, "comment": "Good pads"}, CUST); check("update", s, 200, b)
s, b = call("PUT", f"/reviews/{rv['id']}", {"orderItemId": item1["id"], "rating": 4, "comment": "idiot seller"}, CUST); check("bad word on review update -> 400", s, 400, b)
s, b = call("PATCH", f"/reviews/{rv['id']}/moderate", {"status": "APPROVED", "staffReply": "Thanks!"}, SALES); check("approval step still removed", s in (404, 405), True, b)
s, b = call("GET", f"/reviews/spare-part/{p1['id']}", None, None); check("review public straight away (no reply yet)", (s, len(b), "status" in b[0], b[0]["staffReply"]), (200, 1, False, None), b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "Thanks!"}, CUST); check("customer cannot reply -> 403", s, 403, b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "Thanks!"}, ADMIN); check("admin (read-only) cannot reply -> 403", s, 403, b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "  "}, SALES); check("empty reply -> 400", s, 400, b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "x" * 1001}, SALES); check("reply > 1000 chars -> 400", s, 400, b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "Thank you! Glad the pads fit well."}, SALES); check("sales staff replies", (s, b.get("staffReply"), b.get("repliedBy")), (200, "Thank you! Glad the pads fit well.", "Dilani Fernando"), b)
s, b = call("GET", f"/reviews/spare-part/{p1['id']}", None, None); check("reply shown publicly under the review", b[0]["staffReply"], "Thank you! Glad the pads fit well.", b)
s, b = call("GET", "/notifications", None, CUST); check("customer told about the reply", any(n["title"] == "We replied to your review" for n in b), True, b)
s, b = call("PUT", f"/reviews/{rv['id']}", {"orderItemId": item1["id"], "rating": 4, "comment": "Good pads, fit perfectly"}, CUST); check("customer edit keeps the reply", (s, b.get("staffReply") is not None), (200, True), b)
s, b = call("PATCH", f"/reviews/{rv['id']}/reply", {"reply": "Thanks again!"}, SALES); check("edit reply", b.get("staffReply"), "Thanks again!", b)
s, b = call("GET", f"/spare-parts/{p1['id']}", None, None); check("average rating", b["averageRating"], 4.0, b)

step("15. Profile picture + feedback (no reply)")
s, b = upload("/users/me/avatar", "me.png", PNG, "image/png", CUST); check("upload profile picture", (s, (b.get("profileImageUrl") or "").startswith(f"/api/users/{ord1['customerId']}/avatar")), (200, True), b)
avatar_url = b["profileImageUrl"]
s, ctype, data = raw_get(avatar_url[4:]); check("picture is public (no login)", (s, ctype, data == PNG), (200, "image/png", True))
s, b = upload("/users/me/avatar", "notes.png", b"this is not an image at all", "image/png", CUST); check("non-image renamed .png -> 400", s, 400, b)
s, b = upload("/users/me/avatar", "big.jpg", JPG[:20] + b"\x00" * (2 * 1024 * 1024 + 10), "image/jpeg", CUST); check("picture > 2 MB -> 400", s, 400, b)
s, b = upload("/users/me/avatar", "me.jpg", JPG, "image/jpeg", CUST); check("change picture", (s, b.get("profileImageUrl") != avatar_url), (200, True), b)
avatar_url = b["profileImageUrl"]
s, ctype, data = raw_get(avatar_url[4:]); check("new picture served", (s, ctype), (200, "image/jpeg"))
s, b = call("GET", f"/reviews/spare-part/{p1['id']}", None, None); check("review shows the customer's picture", b[0]["customerImageUrl"], avatar_url, b)
s, b = call("DELETE", "/users/me/avatar", None, None); check("remove picture needs login -> 401/403", s in (401, 403), True, b)
s, fb = call("POST", "/feedback", {"orderId": ord1["id"], "subject": "Fast", "message": "Delivered in 2 days", "rating": 5}, CUST); check("create", s, 201, fb)
s, b = call("POST", "/feedback", {"subject": "x", "message": "y", "rating": 5}, CUST); check("too short -> 400", s, 400, b)
s, b = call("POST", "/feedback", {"subject": "Delivery", "message": "The courier was a moron", "rating": 1}, CUST); check("bad word in feedback -> 400", (s, "moron" in b.get("message","")), (400, True), b)
s, b = call("PUT", f"/feedback/{fb['id']}", {"subject": "Damn slow", "message": "Delivered in 2 days", "rating": 5}, CUST); check("bad word on feedback update -> 400", s, 400, b)
s, b = call("PUT", f"/feedback/{fb['id']}", {"orderId": ord1["id"], "subject": "Very fast", "message": "Delivered in 2 days. Great!", "rating": 5}, CUST); check("update", s, 200, b)
s, b = call("PATCH", f"/feedback/{fb['id']}/moderate", {"status": "APPROVED", "staffReply": "Thank you"}, SALES); check("approve/reply removed", s in (404, 405), True, b)
s, b = call("GET", "/feedback/public", None, None); check("public list (no approval needed)", (s, len(b)), (200, 1), b)
check("public feedback shows the customer's picture", b[0]["customerImageUrl"], avatar_url, b)
check("feedback has no staff reply", "staffReply" in b[0], False, b)
s, b = call("DELETE", "/users/me/avatar", None, CUST); check("remove picture", (s, b.get("profileImageUrl")), (200, None), b)
s, ctype, data = raw_get(avatar_url[4:]); check("removed picture -> 404", s, 404)
s, b = call("DELETE", "/users/me/avatar", None, CUST); check("remove again -> 400", s, 400, b)
s, b = call("GET", "/feedback/public", None, None); check("feedback falls back to initials (no picture)", b[0]["customerImageUrl"], None, b)
s, b = upload("/users/me/avatar", "me.png", PNG, "image/png", CUST); check("add picture again", s, 200, b)
avatar_url = b["profileImageUrl"]
s, fb2 = call("POST", "/feedback", {"subject": "Website", "message": "Nice website", "rating": 4}, CUST)
s, b = call("DELETE", f"/feedback/{fb2['id']}", None, CUST); check("delete own", s, 204, b)

step("16. Warranty & returns (RMA)")
s, b = call("POST", "/rmas", {"orderItemId": item1["id"], "type": "WARRANTY", "reason": "CHANGED_MIND", "quantity": 1, "description": "Do not want it now"}, CUST); check("warranty for changed mind -> 400", s, 400, b)
s, b = call("POST", "/rmas", {"orderItemId": item1["id"], "type": "WARRANTY", "reason": "DEFECTIVE", "quantity": 5, "description": "Squeaking badly"}, CUST); check("qty > purchased -> 400", s, 400, b)
oil_item = next(i for i in ord1["items"] if i["sparePartId"] == p2["id"])
s, b = call("POST", "/rmas", {"orderItemId": oil_item["id"], "type": "WARRANTY", "reason": "DEFECTIVE", "quantity": 1, "description": "Leaking from seal"}, CUST); check("part without warranty -> 400", s, 400, b)
s, rm = call("POST", "/rmas", {"orderItemId": item1["id"], "type": "WARRANTY", "reason": "DEFECTIVE", "quantity": 1, "description": "Squeaking badly", "imageUrls": ["https://example.com/a.jpg"]}, CUST); check("create warranty claim", s, 201, rm)
s, b = call("PUT", f"/rmas/{rm['id']}", {"orderItemId": item1["id"], "type": "WARRANTY", "reason": "DEFECTIVE", "quantity": 1, "description": "Squeaking and vibrating"}, CUST); check("update", s, 200, b)
s, b = call("PATCH", f"/rmas/{rm['id']}/complete", {"resolution": "REPLACED"}, SALES); check("complete before approve -> 409", s, 409, b)
s, b = call("PATCH", f"/rmas/{rm['id']}/decision", {"approve": True, "note": "Send us the old pads"}, SALES); check("approve", s, 200, b)
s, b = call("PUT", f"/rmas/{rm['id']}", {"orderItemId": item1["id"], "type": "WARRANTY", "reason": "DEFECTIVE", "quantity": 1, "description": "changing after approve"}, CUST); check("edit approved -> 409", s, 409, b)
s, b = call("PATCH", f"/rmas/{rm['id']}/complete", {"resolution": "REPLACED"}, SALES); check("replace (stock out)", s, 200, b)
s, b = call("GET", f"/inventory/{inv1['id']}", None, INV); check("stock 58-1=57", b["quantity"], 57, b)
s, rm2 = call("POST", "/rmas", {"orderItemId": oil_item["id"], "type": "RETURN", "reason": "WRONG_ITEM", "quantity": 1, "description": "Wrong size filter"}, CUST); check("create return", s, 201, rm2)
s, b = call("PATCH", f"/rmas/{rm2['id']}/decision", {"approve": True}, SALES)
s, b = call("PATCH", f"/rmas/{rm2['id']}/complete", {"resolution": "REFUNDED", "refundAmount": 5000}, SALES); check("refund > paid -> 400", s, 400, b)
s, b = call("PATCH", f"/rmas/{rm2['id']}/complete", {"resolution": "REFUNDED", "refundAmount": 1200}, SALES); check("refund (stock back)", s, 200, b)
s, b = call("DELETE", f"/rmas/{rm2['id']}", None, CUST); check("customer delete refunded -> 409", s, 409, b)
s, rm3 = call("POST", "/rmas", {"orderItemId": ord2["items"][0]["id"], "type": "RETURN", "reason": "CHANGED_MIND", "quantity": 1, "description": "Bought by mistake"}, CUST)
s, b = call("DELETE", f"/rmas/{rm3['id']}", None, CUST); check("customer deletes requested claim", s, 204, b)

step("17. Delete rules (foreign keys)")
s, b = call("DELETE", f"/spare-parts/{p1['id']}", None, INV); check("delete part used in orders -> 409", s, 409, b)
print("     msg:", b.get("message"))
s, ord4 = call("POST", "/orders/checkout", {**co, "sparePartId": p1["id"], "quantity": 1}, CUST)
s, b = call("DELETE", f"/orders/{ord4['id']}", None, SALES); check("delete active order -> 409", s, 409, b)
s, b = call("DELETE", f"/users/{ord1['customerId']}", None, ADMIN); check("delete customer with orders -> 409", s, 409, b)
s, b = call("PATCH", f"/orders/{ord4['id']}/status", {"status": "CANCELLED"}, SALES); check("staff cancels", s, 200, b)
s, b = call("PATCH", f"/orders/{ord5['id']}/status", {"status": "CANCELLED"}, SALES); check("staff cancels staff order", s, 200, b)
for o in [ord1, ord2, ord3, ord4, ord5, ordB]:
    s, b = call("DELETE", f"/orders/{o['id']}", None, SALES); check(f"delete order {o['id']} (+items/payments/invoice/reviews/claims)", s, 204, b)
s, b = call("GET", "/feedback/public", None, None); check("feedback kept after order delete", len(b), 1, b)
s, b = call("DELETE", f"/spare-parts/{p1['id']}", None, INV); check("part still on PO/PR -> 409", s, 409, b)
s, grs = call("GET", "/goods-receipts", None, PROC)
for g in grs:
    s, b = call("DELETE", f"/goods-receipts/{g['id']}", None, PROC); check("delete GRN", s, 204, b)
s, b = call("DELETE", f"/purchase-orders/{o1['id']}", None, PROC); check("delete PO", s, 204, b)
s, b = call("GET", f"/purchase-requests/{r1['id']}", None, PROC); check("PR back to APPROVED", b["status"], "APPROVED", b)
s, b = call("DELETE", f"/purchase-requests/{r1['id']}", None, PROC); check("delete PR", s, 204, b)
s, b = call("DELETE", f"/spare-parts/{p1['id']}", None, INV); check("delete part (inventory, movements, discount, promo link, fitments go too)", s, 204, b)
s, b = call("GET", f"/discounts/{dc['id']}", None, MKT); check("discount deleted with part", s, 404, b)
s, b = call("GET", f"/promotions/{pr['id']}", None, MKT); check("promotion kept, part unlinked", len(b["spareParts"]), 1, b)
s, b = call("DELETE", f"/suppliers/{s1['id']}", None, PROC); check("delete supplier (+ portal login)", s, 204, b)
s, b = call("POST", "/auth/login", {"email": "orders@lankaauto.lk", "password": "Supplier@123"}); check("supplier login gone", s, 401, b)
s, b = call("DELETE", f"/promotions/{pr['id']}", None, MKT); check("delete promotion", s, 204, b)
s, b = call("DELETE", f"/coupons/{cp['id']}", None, MKT); check("delete used coupon", s, 204, b)
s, b = call("DELETE", f"/vehicles/{v1['id']}", None, INV); check("delete vehicle", s, 204, b)
for p in [p2, p3]:
    s, b = call("DELETE", f"/spare-parts/{p['id']}", None, INV); check("delete part", s, 204, b)
s, b = call("DELETE", f"/categories/{cat['id']}", None, INV); check("delete category", s, 204, b)
s, b = call("DELETE", f"/categories/{cat2['id']}", None, INV); check("delete 2nd category", s, 204, b)

step("18. Users")
s, u = call("POST", "/users", {"firstName": "Test", "lastName": "Staff", "email": "t@autohub.lk", "password": "abc123", "role": "SALES_STAFF"}, ADMIN); check("create", s, 201, u)
s, b = call("POST", "/users", {"firstName": "Test", "lastName": "Staff", "email": "t@autohub.lk", "password": "abc123", "role": "SALES_STAFF"}, ADMIN); check("duplicate email -> 409", s, 409, b)
s, b = call("POST", "/users", {"firstName": "", "lastName": "S", "email": "bad", "password": "1", "role": "SALES_STAFF"}, ADMIN); check("invalid -> 400 with fields", (s, len(b.get("fieldErrors", {}))), (400, 3), b)
s, b = call("PUT", f"/users/{u['id']}", {"firstName": "Test", "lastName": "Sales", "email": "t@autohub.lk", "role": "SALES_STAFF", "active": False}, ADMIN); check("update/deactivate", s, 200, b)
s, b = call("POST", "/auth/login", {"email": "t@autohub.lk", "password": "abc123"}); check("inactive cannot login", s, 401, b)
s, b = call("DELETE", f"/users/{u['id']}", None, ADMIN); check("delete", s, 204, b)
s, me = call("GET", "/users/me", None, ADMIN)
s, b = call("DELETE", f"/users/{me['id']}", None, ADMIN); check("delete self -> 400", s, 400, b)
s, b = call("POST", "/users", {"firstName": "Test", "lastName": "Staff", "email": "t@autohub", "password": "abc123", "role": "SALES_STAFF"}, ADMIN); check("staff email without domain dot -> 400", s, 400, b)
s, b = call("PUT", "/users/me", {"firstName": "Amal", "lastName": "Perera", "phone": "0770000000"}, CUST); check("update profile", s, 200, b)
s, b = call("PUT", "/users/me/password", {"currentPassword": "wrong", "newPassword": "newpass1"}, CUST); check("wrong current password -> 400", s, 400, b)
s, reg = call("POST", "/auth/register", {"firstName": "New", "lastName": "Buyer", "email": "new.buyer@gmail.com", "password": "buyer123"}); check("register", s, 201, reg)
s, b = call("DELETE", "/users/me", None, reg["token"]); check("customer deletes own account", s, 204, b)
s, b = call("DELETE", f"/users/{ord1['customerId']}", None, ADMIN); check("delete customer (no orders now)", s, 204, b)
s, ctype, data = raw_get(avatar_url[4:]); check("picture deleted with the account", s, 404)
s, b = call("GET", "/dashboard/summary", None, ADMIN); check("dashboard summary", s, 200, b)
for path in ["/dashboard/overview", "/dashboard/inventory", "/dashboard/procurement", "/dashboard/sales", "/dashboard/marketing", "/dashboard/customer-care"]:
    s, b = call("GET", path, None, ADMIN); check("admin " + path, s, 200, b)

step("19. Admin: activity log, reports, settings")
s, log = call("GET", "/activity-logs", None, ADMIN); check("activity log", (s, len(log) > 50), (200, True), log)
acts = {a["action"] for a in log}
check("log has logins, creates, approvals, payments", {"LOGIN", "LOGIN_FAILED", "REGISTER", "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "PAYMENT", "RECEIVE", "STATUS_CHANGE"} <= acts, True, sorted(acts))
s, b = call("GET", "/activity-logs?module=Procurement&action=APPROVE", None, ADMIN); check("filter by module + action", (s, len(b), sorted(x["description"] for x in b)), (200, 2, [f"Approved purchase request #{r1['id']}", f"Approved purchase request #{r3['id']}"]), b)
s, b = call("GET", "/activity-logs?q=inventory@autohub.lk", None, ADMIN); check("search by user", all(a["userEmail"] == "inventory@autohub.lk" for a in b) and len(b) > 0, True, b)
s, b = call("GET", "/activity-logs/filters", None, ADMIN); check("filter lists", "Sales" in b.get("modules", []), True, b)
s, b = call("GET", "/activity-logs", None, SALES); check("staff cannot read the log -> 403", s, 403, b)
for r in ["sales", "inventory", "purchases"]:
    s, b = call("GET", f"/reports/{r}?from={D(-30)}&to={D(0)}", None, ADMIN); check("report " + r, s, 200, b)
s, b = call("GET", "/reports/sales", None, ADMIN); check("sales report numbers", (b["orders"] >= 0, len(b["salesOverTime"])), (True, 30), b)
s, b = call("GET", f"/reports/sales?from={D(1)}&to={D(0)}", None, ADMIN); check("from after to -> 400", s, 400, b)
s, b = call("GET", "/reports/sales", None, SALES); check("staff cannot open reports -> 403", s, 403, b)
s, st = call("GET", "/settings", None, ADMIN); check("get settings", (s, st["settings"]["returnWindowDays"]), (200, 14), st)
new = {**st["settings"], "storeName": "AutoHub Lanka (Pvt) Ltd", "cashOnDeliveryEnabled": False, "maxQuantityPerItem": 5}
s, b = call("PUT", "/settings", {**new, "cardPaymentEnabled": False, "bankTransferEnabled": False}, ADMIN); check("all payments off -> 400", s, 400, b)
s, b = call("PUT", "/settings", {**new, "bankName": " "}, ADMIN); check("bank transfer without bank name -> 400", s, 400, b)
s, b = call("PUT", "/settings", {**new, "bankAccountNumber": "12ab"}, ADMIN); check("bad account number -> 400", s, 400, b)
s, b = call("PUT", "/settings", {**new, "bankTransferEnabled": False, "bankName": ""}, ADMIN); check("bank transfer off (details optional)", s, 200, b)
s, b = call("GET", "/settings/public", None, None); check("bank details hidden when off", (b["bankTransferEnabled"], b["bankName"]), (False, None), b)
s, b = call("PUT", "/settings", {**new, "storeEmail": "bad@x"}, ADMIN); check("bad store email -> 400", s, 400, b)
s, b = call("PUT", "/settings", new, ADMIN); check("save settings", (s, b["settings"]["storeName"]), (200, "AutoHub Lanka (Pvt) Ltd"), b)
s, b = call("PUT", "/settings", new, SALES); check("staff cannot change settings -> 403", s, 403, b)
s, b = call("GET", "/settings/public", None, None); check("public settings", (s, b["cashOnDeliveryEnabled"], "lowStockNotifications" in b), (200, False, False), b)
s, b = call("POST", "/settings", new, ADMIN); check("(no POST)", s, 405, b)
s, b = call("PUT", "/settings", st["settings"], ADMIN); check("restore settings", s, 200, b)

print(f"\n{passes} passed, {len(fails)} failed")
for f in fails: print("  -", f)
sys.exit(1 if fails else 0)
