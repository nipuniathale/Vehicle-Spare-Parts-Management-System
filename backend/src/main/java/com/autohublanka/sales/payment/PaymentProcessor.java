package com.autohublanka.sales.payment;

import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.notification.NotificationService;
import com.autohublanka.sales.InvoiceGenerator;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.sales.Payment;
import com.autohublanka.sales.PaymentMethod;
import com.autohublanka.sales.PaymentRepository;
import com.autohublanka.sales.PaymentStatus;
import com.autohublanka.settings.AppSettings;
import com.autohublanka.settings.SettingsService;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * The client of the payment STRATEGY: picks the strategy for the order's payment method,
 * gives it to the PaymentContext and lets the context pay. Afterwards the invoice is generated
 * automatically and the customer is notified.
 * Used by checkout (open the PENDING payment), the card payment page, "Delivered" (cash on delivery) and
 * staff confirming a bank transfer.
 */
@Component
public class PaymentProcessor {

    private final PaymentRepository paymentRepository;
    private final SettingsService settings;
    private final InvoiceGenerator invoiceGenerator;
    private final NotificationService notifications;

    public PaymentProcessor(PaymentRepository paymentRepository,
                            SettingsService settings,
                            InvoiceGenerator invoiceGenerator,
                            NotificationService notifications) {
        this.paymentRepository = paymentRepository;
        this.settings = settings;
        this.invoiceGenerator = invoiceGenerator;
        this.notifications = notifications;
    }

    /** At checkout: a PENDING payment for the chosen method (if the admin has the method switched on). */
    public Payment open(Order order, PaymentMethod method) {
        AppSettings current = settings.current();
        boolean enabled = switch (method) {
            case CARD -> current.cardPaymentEnabled();
            case CASH_ON_DELIVERY -> current.cashOnDeliveryEnabled();
            case BANK_TRANSFER -> current.bankTransferEnabled();
        };
        if (!enabled) {
            throw new BusinessException(label(method) + " is currently not available. Please choose another payment method.");
        }
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(order.getTotalAmount());
        payment.setMethod(method);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setNote(switch (method) {
            case CARD -> "Waiting for online card payment";
            case CASH_ON_DELIVERY -> "Cash to be collected on delivery";
            case BANK_TRANSFER -> "Waiting for the customer's bank transfer";
        });
        return paymentRepository.save(payment);
    }

    /** Take the money with the strategy of the payment's method. */
    public Payment complete(Payment payment, PaymentDetails details) {
        Order order = payment.getOrder();
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ConflictException("This order was cancelled");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ConflictException("This order is already paid");
        }
        PaymentContext context = new PaymentContext(strategyFor(payment.getMethod()));
        context.pay(order, payment, details);
        return paid(payment);
    }

    /** Staff recorded the payment as PAID by hand (e.g. bank transfer) - same follow-up as an online payment. */
    public Payment markPaid(Payment payment) {
        payment.setStatus(PaymentStatus.PAID);
        if (payment.getPaidAt() == null) {
            payment.setPaidAt(LocalDateTime.now());
        }
        payment.getOrder().setPaymentStatus(PaymentStatus.PAID);
        return paid(payment);
    }

    private Payment paid(Payment payment) {
        Payment saved = paymentRepository.save(payment);
        invoiceGenerator.generateFor(saved);      // invoice is created automatically
        notifications.paymentReceived(saved);     // "Payment received - your invoice is ready"
        return saved;
    }

    /** The client chooses the concrete strategy (lecture: new CreditCardPayment() / new PayPalPayment()). */
    private static PaymentStrategy strategyFor(PaymentMethod method) {
        return switch (method) {
            case CARD -> new CardPaymentStrategy();
            case CASH_ON_DELIVERY -> new CashOnDeliveryStrategy();
            case BANK_TRANSFER -> new BankTransferStrategy();
        };
    }

    private static String label(PaymentMethod method) {
        return switch (method) {
            case CARD -> "Card payment";
            case CASH_ON_DELIVERY -> "Cash on delivery";
            case BANK_TRANSFER -> "Bank transfer";
        };
    }
}
