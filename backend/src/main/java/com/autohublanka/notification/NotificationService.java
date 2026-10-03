package com.autohublanka.notification;

import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.procurement.PurchaseRequest;
import com.autohublanka.procurement.PurchaseRequestStatus;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.Payment;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.support.Rma;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               CurrentUser currentUser) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    // ---------------------------------------------------------------- sending (used by the listeners)

    public void notifyUser(User recipient, String title, String message, String link) {
        if (recipient == null || !recipient.isActive()) {
            return;
        }
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setTitle(cut(title, 120));
        notification.setMessage(cut(message, 500));
        notification.setLink(link);
        notificationRepository.save(notification);
    }

    /** Sends the same message to every active user with the role. */
    public void notifyRole(Role role, String title, String message, String link) {
        userRepository.findByRoleOrderByFirstNameAsc(role)
                .forEach(user -> notifyUser(user, title, message, link));
    }

    // ---------------------------------------------------------------- ready-made messages (called by the services)

    private static final String CUSTOMER_ORDERS = "/my-orders";

    public void orderPlaced(Order order, User placedBy) {
        notifyRole(Role.SALES_STAFF, "New order #" + order.getId(),
                order.getCustomer().getFullName() + " - " + money(order.getTotalAmount()) + " (" + order.getItems().size() + " item(s))",
                "/dashboard/orders");
        if (placedBy != null && !placedBy.getId().equals(order.getCustomer().getId())) {
            notifyUser(order.getCustomer(), "An order was placed for you",
                    "Order #" + order.getId() + " (" + money(order.getTotalAmount()) + ") was created by our sales team.",
                    CUSTOMER_ORDERS);
        }
    }

    public void orderStatusChanged(Order order) {
        String text = switch (order.getStatus()) {
            case PROCESSING -> "is being prepared";
            case SHIPPED -> "has been shipped";
            case DELIVERED -> "was delivered. We hope you like it - you can now review the items";
            case CANCELLED -> "was cancelled";
            default -> "is " + order.getStatus();
        };
        notifyUser(order.getCustomer(), "Order #" + order.getId() + " " + order.getStatus().name().toLowerCase(),
                "Your order #" + order.getId() + " " + text + ".", CUSTOMER_ORDERS);
    }

    public void paymentReceived(Payment payment) {
        Order order = payment.getOrder();
        notifyUser(order.getCustomer(), "Payment received",
                "We received " + money(payment.getAmount()) + " for order #" + order.getId()
                        + ". Your invoice is ready in My Orders.", CUSTOMER_ORDERS);
    }

    public void bankTransferSubmitted(Payment payment) {
        Order order = payment.getOrder();
        notifyRole(Role.SALES_STAFF, "Bank transfer to confirm - order #" + order.getId(),
                order.getCustomer().getFullName() + " uploaded a bank slip for " + money(payment.getAmount())
                        + ". Check it against the bank account and confirm it.",
                "/dashboard/payments");
    }

    public void bankTransferRejected(Payment payment, String reason) {
        Order order = payment.getOrder();
        notifyUser(order.getCustomer(), "Bank transfer not found - order #" + order.getId(),
                reason + " Please check the transfer and upload the bank slip again.", CUSTOMER_ORDERS);
    }

    public void purchaseRequestRaised(PurchaseRequest request) {
        notifyRole(Role.INVENTORY_MANAGER, "Purchase request #" + request.getId() + " needs approval",
                request.getQuantity() + " × " + request.getSparePart().getName() + " from " + request.getSupplier().getName(),
                "/dashboard/purchase-requests");
    }

    public void purchaseRequestDecided(PurchaseRequest request) {
        boolean approved = request.getStatus() == PurchaseRequestStatus.APPROVED;
        String title = "Purchase request #" + request.getId() + (approved ? " approved" : " rejected");
        String message = approved
                ? "You can now create the purchase order for " + request.getQuantity() + " × " + request.getSparePart().getName() + "."
                : "Reason: " + request.getReviewNote();
        if (request.getRequestedBy() != null) {
            notifyUser(request.getRequestedBy(), title, message, "/dashboard/purchase-requests");
        } else {
            notifyRole(Role.PROCUREMENT_OFFICER, title, message, "/dashboard/purchase-requests");
        }
    }

    public void claimChanged(Rma claim) {
        String what = claim.getType().name().equals("RETURN") ? "Return" : "Warranty claim";
        String text = switch (claim.getStatus()) {
            case APPROVED -> "was approved. We will contact you about the next step.";
            case REJECTED -> "was rejected." + (claim.getStaffNote() == null ? "" : " Note: " + claim.getStaffNote());
            case REFUNDED -> "is complete - a refund of " + money(claim.getRefundAmount()) + " was issued.";
            case REPLACED -> "is complete - a replacement part is on its way.";
            default -> "is " + claim.getStatus();
        };
        notifyUser(claim.getCustomer(), what + " #" + claim.getId() + " " + claim.getStatus().name().toLowerCase(),
                "Your " + what.toLowerCase() + " #" + claim.getId() + " " + text, CUSTOMER_ORDERS);
    }

    private static String money(BigDecimal amount) {
        return "Rs. " + NumberFormat.getNumberInstance(Locale.US).format(amount == null ? 0 : amount.doubleValue());
    }

    // ---------------------------------------------------------------- the logged-in user's inbox

    @Transactional(readOnly = true)
    public List<NotificationResponse> mine() {
        return notificationRepository.findTop30ByRecipientIdOrderByCreatedAtDescIdDesc(currentUser.get().getId())
                .stream().map(NotificationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByRecipientIdAndSeenFalse(currentUser.get().getId());
    }

    public NotificationResponse markRead(Long id) {
        Notification notification = own(id);
        notification.setSeen(true);
        return NotificationResponse.from(notification);
    }

    public void markAllRead() {
        notificationRepository.markAllSeen(currentUser.get().getId());
    }

    public void delete(Long id) {
        notificationRepository.delete(own(id));
    }

    private Notification own(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Notification", id));
        if (!notification.getRecipient().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Notification", id);
        }
        return notification;
    }

    private static String cut(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
