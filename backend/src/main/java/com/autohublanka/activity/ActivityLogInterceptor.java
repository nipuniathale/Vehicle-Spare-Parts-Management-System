package com.autohublanka.activity;

import com.autohublanka.security.CurrentUser;
import com.autohublanka.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.Set;

/**
 * Writes an activity-log entry for every successful change made through the API
 * (POST / PUT / PATCH / DELETE that returned 2xx) by a logged-in user.
 * The module, action and description are worked out from the URL, e.g.
 * PATCH /api/purchase-requests/5/approve -> "Procurement", "APPROVE", "Approved purchase request #5".
 * Log-ins and registrations are written by AuthService (the user is not logged in yet at that point).
 */
@Component
public class ActivityLogInterceptor implements HandlerInterceptor {

    static final String ENTITY_ID = ActivityLogInterceptor.class.getName() + ".id";
    static final String ENTITY_STATUS = ActivityLogInterceptor.class.getName() + ".status";

    /** URL resource -> module + readable name. Resources not listed (cart, wishlist, notifications) are not logged. */
    private static final Map<String, String[]> RESOURCES = Map.ofEntries(
            Map.entry("categories", new String[]{"Inventory", "category"}),
            Map.entry("spare-parts", new String[]{"Inventory", "spare part"}),
            Map.entry("vehicles", new String[]{"Inventory", "vehicle"}),
            Map.entry("fitments", new String[]{"Inventory", "vehicle fitment"}),
            Map.entry("inventory", new String[]{"Inventory", "stock record"}),
            Map.entry("stock-movements", new String[]{"Inventory", "stock movement"}),
            Map.entry("suppliers", new String[]{"Procurement", "supplier"}),
            Map.entry("purchase-requests", new String[]{"Procurement", "purchase request"}),
            Map.entry("purchase-orders", new String[]{"Procurement", "purchase order"}),
            Map.entry("goods-receipts", new String[]{"Procurement", "goods receipt"}),
            Map.entry("orders", new String[]{"Sales", "order"}),
            Map.entry("payments", new String[]{"Sales", "payment"}),
            Map.entry("promotions", new String[]{"Marketing", "promotion"}),
            Map.entry("discounts", new String[]{"Marketing", "discount"}),
            Map.entry("coupons", new String[]{"Marketing", "coupon"}),
            Map.entry("reviews", new String[]{"Customer Care", "review"}),
            Map.entry("feedback", new String[]{"Customer Care", "feedback"}),
            Map.entry("rmas", new String[]{"Customer Care", "return / warranty claim"}),
            Map.entry("users", new String[]{"Users", "user account"}),
            Map.entry("settings", new String[]{"Settings", "system settings"}));

    private static final Set<String> CHANGES = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final ActivityLogService activityLogService;
    private final CurrentUser currentUser;

    public ActivityLogInterceptor(ActivityLogService activityLogService, CurrentUser currentUser) {
        this.activityLogService = activityLogService;
        this.currentUser = currentUser;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (ex != null || !CHANGES.contains(request.getMethod())
                || response.getStatus() < 200 || response.getStatus() >= 300) {
            return;
        }
        String[] parts = request.getRequestURI().replaceFirst("^/api/", "").split("/");
        String[] resource = RESOURCES.get(parts[0]);
        if (resource == null) {
            return;
        }
        User user;
        try {
            user = currentUser.get();
        } catch (RuntimeException notLoggedIn) {
            return; // e.g. the account was just deleted by its owner
        }

        Long pathId = parts.length > 1 && parts[1].matches("\\d+") ? Long.valueOf(parts[1]) : null;
        Long id = pathId != null ? pathId : (Long) request.getAttribute(ENTITY_ID);
        String status = (String) request.getAttribute(ENTITY_STATUS);
        String last = parts[parts.length - 1];
        String[] action = describe(request.getMethod(), parts, last, resource[1], id, status);

        activityLogService.record(user, action[0], resource[0], id, action[1], clientIp(request));
    }

    /** Returns {ACTION, description}. */
    private static String[] describe(String method, String[] parts, String last, String noun, Long id, String status) {
        String ref = noun + (id == null ? "" : " #" + id);
        if (parts[0].equals("users") && parts.length > 1 && parts[1].equals("me")) {
            return switch (method + " " + last) {
                case "PUT password" -> new String[]{"PASSWORD_CHANGE", "Changed own password"};
                case "DELETE me" -> new String[]{"DELETE", "Closed own account"};
                default -> new String[]{"UPDATE", "Updated own profile"};
            };
        }
        return switch (last) {
            case "approve" -> new String[]{"APPROVE", "Approved " + ref};
            case "reject" -> new String[]{"REJECT", "Rejected " + ref};
            case "cancel" -> new String[]{"CANCEL", "Cancelled " + ref};
            case "checkout" -> new String[]{"CREATE", "Placed " + ref};
            case "card" -> new String[]{"PAYMENT", "Paid by card for order #" + parts[parts.length - 2]};
            case "receive" -> new String[]{"RECEIVE", "Received goods for purchase order" + (id == null ? "" : " #" + id)};
            case "decision" -> new String[]{"DECISION", (status == null ? "Decided on " : status.charAt(0) + status.substring(1).toLowerCase() + " ") + ref};
            case "complete" -> new String[]{"COMPLETE", "Completed " + ref + (status == null ? "" : " (" + status + ")")};
            case "status", "supplier-status" ->
                    new String[]{"STATUS_CHANGE", "Changed " + ref + " status" + (status == null ? "" : " to " + status)};
            default -> switch (method) {
                case "POST" -> new String[]{"CREATE", "Created " + ref};
                case "DELETE" -> new String[]{"DELETE", "Deleted " + ref};
                default -> new String[]{"UPDATE", "Updated " + ref};
            };
        };
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
