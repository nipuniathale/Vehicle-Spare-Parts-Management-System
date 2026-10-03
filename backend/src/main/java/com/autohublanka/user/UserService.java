package com.autohublanka.user;

import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.notification.NotificationRepository;
import com.autohublanka.procurement.GoodsReceiptRepository;
import com.autohublanka.procurement.PurchaseOrderRepository;
import com.autohublanka.procurement.PurchaseRequestRepository;
import com.autohublanka.procurement.SupplierRepository;
import com.autohublanka.sales.CartRepository;
import com.autohublanka.sales.OrderRepository;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.support.FeedbackRepository;
import com.autohublanka.support.ReviewRepository;
import com.autohublanka.user.dto.ChangePasswordRequest;
import com.autohublanka.user.dto.ProfileRequest;
import com.autohublanka.user.dto.UserRequest;
import com.autohublanka.user.dto.UserResponse;
import com.autohublanka.wishlist.WishlistItemRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUser currentUser;
    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final SupplierRepository supplierRepository;
    private final ReviewRepository reviewRepository;
    private final FeedbackRepository feedbackRepository;
    private final NotificationRepository notificationRepository;
    private final WishlistItemRepository wishlistRepository;
    private final ProfilePictureRepository profilePictureRepository;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       CurrentUser currentUser,
                       OrderRepository orderRepository,
                       CartRepository cartRepository,
                       PurchaseRequestRepository purchaseRequestRepository,
                       PurchaseOrderRepository purchaseOrderRepository,
                       GoodsReceiptRepository goodsReceiptRepository,
                       SupplierRepository supplierRepository,
                       ReviewRepository reviewRepository,
                       FeedbackRepository feedbackRepository,
                       NotificationRepository notificationRepository,
                       WishlistItemRepository wishlistRepository,
                       ProfilePictureRepository profilePictureRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUser = currentUser;
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.goodsReceiptRepository = goodsReceiptRepository;
        this.supplierRepository = supplierRepository;
        this.reviewRepository = reviewRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.wishlistRepository = wishlistRepository;
        this.profilePictureRepository = profilePictureRepository;
    }

    // ---------------------------------------------------------------- admin

    @Transactional(readOnly = true)
    public List<UserResponse> findAll(Role role) {
        var users = role == null
                ? userRepository.findAllByOrderByCreatedAtDesc()
                : userRepository.findByRoleOrderByFirstNameAsc(role);
        return users.stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return UserResponse.from(getUser(id));
    }

    public UserResponse create(UserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with email " + email + " already exists");
        }
        if (Text.clean(request.password()) == null) {
            throw new BusinessException("Password is required for a new account");
        }
        if (request.role() == Role.SUPPLIER) {
            throw new BusinessException("Supplier logins are created from the Suppliers page (portal password)");
        }

        User user = new User();
        apply(user, request, email);
        user.setPassword(passwordEncoder.encode(request.password()));
        return UserResponse.from(userRepository.save(user));
    }

    public UserResponse update(Long id, UserRequest request) {
        User user = getUser(id);
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("An account with email " + email + " already exists");
        }

        boolean self = user.getId().equals(currentUser.get().getId());
        boolean willBeActive = request.active() == null || request.active();
        if (self && (!willBeActive || request.role() != user.getRole())) {
            throw new BusinessException("You cannot deactivate yourself or change your own role");
        }
        if (user.getRole() == Role.ADMIN && (request.role() != Role.ADMIN || !willBeActive)
                && userRepository.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new ConflictException("This is the last active administrator");
        }
        if ((user.getRole() == Role.SUPPLIER) != (request.role() == Role.SUPPLIER)) {
            throw new BusinessException("Supplier accounts are managed from the Suppliers page");
        }

        apply(user, request, email);
        if (Text.clean(request.password()) != null) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        return UserResponse.from(user);
    }

    /**
     * Physical delete.
     * Blocked when the user owns business history (customer orders, purchase requests raised).
     * Their cart and feedback are deleted; "done by" links on other records are cleared.
     */
    public void delete(Long id) {
        User user = getUser(id);
        if (user.getId().equals(currentUser.get().getId())) {
            throw new BusinessException("You cannot delete your own account from here");
        }
        deleteUser(user);
    }

    // ---------------------------------------------------------------- own profile

    @Transactional(readOnly = true)
    public UserResponse me() {
        return UserResponse.from(currentUser.get());
    }

    public UserResponse updateProfile(ProfileRequest request) {
        User user = currentUser.get();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPhone(Text.clean(request.phone()));
        user.setAddress(Text.clean(request.address()));
        return UserResponse.from(user);
    }

    /**
     * Change the password. Accounts created with Google have no password yet, so the first time
     * they only choose a new one (after that they can log in with Google or with the password).
     */
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser.get();
        if (user.isPasswordSet()) {
            if (Text.clean(request.currentPassword()) == null) {
                throw new BusinessException("Current password is required");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new BusinessException("Current password is incorrect");
            }
            if (request.currentPassword().equals(request.newPassword())) {
                throw new BusinessException("New password must be different from the current one");
            }
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordSet(true);
    }

    /** Customer list for sales staff placing an order on a customer's behalf. */
    @Transactional(readOnly = true)
    public List<UserResponse> activeCustomers() {
        return userRepository.findByRoleOrderByFirstNameAsc(Role.CUSTOMER).stream()
                .filter(User::isActive).map(UserResponse::from).toList();
    }

    /** Customers can close their own account (same rules as an admin delete). */
    public void deleteMyAccount() {
        User user = currentUser.get();
        if (user.getRole() != Role.CUSTOMER) {
            throw new BusinessException("Staff accounts can only be removed by an administrator");
        }
        deleteUser(user);
    }

    // ---------------------------------------------------------------- helpers

    private void deleteUser(User user) {
        Long id = user.getId();

        if (user.getRole() == Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new ConflictException("The last administrator cannot be deleted");
        }
        long orders = orderRepository.countByCustomerId(id);
        if (orders > 0) {
            throw new ConflictException(user.getFullName() + " has " + orders
                    + " order(s). Delete those orders first, or deactivate the account instead.");
        }
        long requests = purchaseRequestRepository.countByRequestedById(id);
        if (requests > 0) {
            throw new ConflictException(user.getFullName() + " raised " + requests
                    + " purchase request(s). Delete them first, or deactivate the account instead.");
        }

        supplierRepository.findByPortalUserId(id).ifPresent(supplier -> supplier.setPortalUser(null));
        purchaseRequestRepository.clearReviewer(id);
        purchaseOrderRepository.clearCreator(id);
        goodsReceiptRepository.clearReceiver(id);
        orderRepository.clearPlacedBy(id);
        notificationRepository.deleteByRecipient(id);
        profilePictureRepository.deleteByUserId(id);
        wishlistRepository.deleteByCustomer(id);

        reviewRepository.deleteByCustomer(id);
        feedbackRepository.deleteByCustomer(id);
        cartRepository.findByCustomerId(id).ifPresent(cartRepository::delete);

        userRepository.flush();
        userRepository.delete(user);
    }

    private void apply(User user, UserRequest request, String email) {
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhone(Text.clean(request.phone()));
        user.setAddress(Text.clean(request.address()));
        user.setRole(request.role());
        user.setActive(request.active() == null || request.active());
    }

    private User getUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> NotFoundException.of("User", id));
    }
}
