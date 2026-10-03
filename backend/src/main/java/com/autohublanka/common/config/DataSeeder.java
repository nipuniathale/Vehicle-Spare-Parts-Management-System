package com.autohublanka.common.config;

import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Makes sure one login per role exists. A default account is created on start-up
 * only if no user with that email exists yet (existing accounts are never changed).
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        create("System", "Admin", "admin@autohub.lk", "Admin@123", Role.ADMIN);
        create("Ishara", "Perera", "inventory@autohub.lk", "Staff@123", Role.INVENTORY_MANAGER);
        create("Nuwan", "Silva", "procurement@autohub.lk", "Staff@123", Role.PROCUREMENT_OFFICER);
        create("Dilani", "Fernando", "sales@autohub.lk", "Staff@123", Role.SALES_STAFF);
        create("Kavindu", "Jayasinghe", "marketing@autohub.lk", "Staff@123", Role.MARKETING_MANAGER);
        create("Amal", "Customer", "customer@autohub.lk", "Customer@123", Role.CUSTOMER);
    }

    private void create(String first, String last, String email, String password, Role role) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        User user = new User();
        user.setFirstName(first);
        user.setLastName(last);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        user.setPhone("0771234567");
        user.setAddress("No. 25, Galle Road, Colombo 03");
        userRepository.save(user);
        log.info("Default account created: {} ({})", email, role);
    }
}
