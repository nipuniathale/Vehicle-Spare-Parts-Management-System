package com.autohublanka.procurement;

import com.autohublanka.common.Text;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.notification.NotificationRepository;
import com.autohublanka.procurement.dto.SupplierRequest;
import com.autohublanka.procurement.dto.SupplierResponse;
import com.autohublanka.user.ProfilePictureRepository;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final ProfilePictureRepository profilePictureRepository;

    public SupplierService(SupplierRepository supplierRepository,
                           PurchaseOrderRepository purchaseOrderRepository,
                           PurchaseRequestRepository purchaseRequestRepository,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           NotificationRepository notificationRepository,
                           ProfilePictureRepository profilePictureRepository) {
        this.notificationRepository = notificationRepository;
        this.profilePictureRepository = profilePictureRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<SupplierResponse> findAll() {
        return supplierRepository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SupplierResponse findById(Long id) {
        return toResponse(getSupplier(id));
    }

    public SupplierResponse create(SupplierRequest request) {
        String name = request.name().trim();
        String email = request.email().trim().toLowerCase();
        if (supplierRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A supplier named '" + name + "' already exists");
        }
        if (supplierRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Another supplier already uses " + email);
        }

        Supplier supplier = new Supplier();
        apply(supplier, request, email);
        supplierRepository.save(supplier);
        syncPortalUser(supplier, request.portalPassword());
        return toResponse(supplier);
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = getSupplier(id);
        String name = request.name().trim();
        String email = request.email().trim().toLowerCase();
        if (supplierRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("A supplier named '" + name + "' already exists");
        }
        if (supplierRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("Another supplier already uses " + email);
        }

        apply(supplier, request, email);
        syncPortalUser(supplier, request.portalPassword());
        return toResponse(supplierRepository.save(supplier));
    }

    /** Physical delete. Blocked while purchase requests / orders refer to the supplier. The portal login is deleted too. */
    public void delete(Long id) {
        Supplier supplier = getSupplier(id);

        long orders = purchaseOrderRepository.countBySupplierId(id);
        long requests = purchaseRequestRepository.countBySupplierId(id);
        if (orders > 0 || requests > 0) {
            throw new ConflictException("Supplier '" + supplier.getName() + "' has " + orders
                    + " purchase order(s) and " + requests + " purchase request(s). "
                    + "Delete those first, or mark the supplier inactive.");
        }

        User portalUser = supplier.getPortalUser();
        supplierRepository.delete(supplier);
        if (portalUser != null) {
            supplierRepository.flush();
            notificationRepository.deleteByRecipient(portalUser.getId());
            profilePictureRepository.deleteByUserId(portalUser.getId());
            userRepository.delete(portalUser);
        }
    }

    private void apply(Supplier supplier, SupplierRequest request, String email) {
        supplier.setName(request.name().trim());
        supplier.setEmail(email);
        supplier.setPhone(request.phone().trim());
        supplier.setContactPerson(Text.clean(request.contactPerson()));
        supplier.setAddress(Text.clean(request.address()));
        supplier.setActive(request.active() == null || request.active());
    }

    /** Keeps the supplier login in step with the supplier record. */
    private void syncPortalUser(Supplier supplier, String portalPassword) {
        User user = supplier.getPortalUser();
        String password = Text.clean(portalPassword);

        if (user == null && password == null) {
            return;
        }

        if (user == null) {
            if (userRepository.existsByEmailIgnoreCase(supplier.getEmail())) {
                throw new ConflictException("A user account with email " + supplier.getEmail()
                        + " already exists, so a portal login cannot be created with it");
            }
            user = new User();
            user.setRole(Role.SUPPLIER);
        } else if (userRepository.existsByEmailIgnoreCaseAndIdNot(supplier.getEmail(), user.getId())) {
            throw new ConflictException("A user account with email " + supplier.getEmail() + " already exists");
        }

        String contact = supplier.getContactPerson() == null ? supplier.getName() : supplier.getContactPerson();
        int space = contact.indexOf(' ');
        user.setFirstName(space > 0 ? contact.substring(0, space) : contact);
        user.setLastName(space > 0 ? contact.substring(space + 1) : "(Supplier)");
        user.setEmail(supplier.getEmail());
        user.setPhone(supplier.getPhone());
        user.setActive(supplier.isActive());
        if (password != null) {
            user.setPassword(passwordEncoder.encode(password));
        }
        supplier.setPortalUser(userRepository.save(user));
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return SupplierResponse.from(supplier, purchaseOrderRepository.countBySupplierId(supplier.getId()));
    }

    Supplier getSupplier(Long id) {
        return supplierRepository.findById(id).orElseThrow(() -> NotFoundException.of("Supplier", id));
    }
}
