package com.autohublanka.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;

/**
 * One-time clean-up of columns that belonged to removed features, for databases created by an older version.
 * (spring.jpa.hibernate.ddl-auto=update adds new columns but never removes old ones - and the old NOT NULL
 * "status" column of reviews/feedback would make every new review fail.)
 * <ul>
 *   <li>reviews: status, replied_by (approval removed; the staff reply now keeps the replier's name in replied_by_name)</li>
 *   <li>feedback: status, staff_reply, replied_by, replied_at (approval and staff replies removed)</li>
 *   <li>invoices: due_date, notes (invoices are now generated automatically)</li>
 * </ul>
 * It also removes the old CHECK constraint on payments.method that only allowed CARD / CASH_ON_DELIVERY.
 * Runs only on SQL Server and only drops a column that still exists, so it is safe on every start.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SchemaCleanup implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaCleanup.class);

    private static final Map<String, List<String>> OBSOLETE = Map.of(
            "reviews", List.of("status", "replied_by"),
            "feedback", List.of("status", "staff_reply", "replied_by", "replied_at"),
            "invoices", List.of("due_date", "notes"));

    private static final Map<String, String> ENUM_CHECKS = Map.of("payments", "method");

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public SchemaCleanup(DataSource dataSource) {
        this.dataSource = dataSource;
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection connection = dataSource.getConnection()) {
            if (!connection.getMetaData().getDatabaseProductName().toLowerCase().contains("sql server")) {
                return;
            }
        } catch (Exception ex) {
            log.warn("Schema clean-up skipped: {}", ex.getMessage());
            return;
        }
        OBSOLETE.forEach((table, columns) -> columns.forEach(column -> {
            try {
                dropColumn(table, column);
            } catch (RuntimeException ex) {
                log.warn("Could not drop obsolete column {}.{}: {}", table, column, ex.getMessage());
            }
        }));
        // Hibernate wrote the allowed enum values into a CHECK constraint when the table was created,
        // so the new BANK_TRANSFER method would be refused. ddl-auto=update never changes it - remove it.
        ENUM_CHECKS.forEach((table, column) -> {
            try {
                dropOutdatedCheck(table, column, "BANK_TRANSFER");
            } catch (RuntimeException ex) {
                log.warn("Could not update the check constraint on {}.{}: {}", table, column, ex.getMessage());
            }
        });
    }

    private void dropOutdatedCheck(String table, String column, String requiredValue) {
        List<Map<String, Object>> checks = jdbc.queryForList("""
                SELECT cc.name, cc.definition FROM sys.check_constraints cc
                JOIN sys.columns c ON c.object_id = cc.parent_object_id AND c.column_id = cc.parent_column_id
                WHERE cc.parent_object_id = OBJECT_ID(?) AND c.name = ?
                """, table, column);
        for (Map<String, Object> check : checks) {
            if (!String.valueOf(check.get("definition")).contains(requiredValue)) {
                String name = String.valueOf(check.get("name"));
                jdbc.execute("ALTER TABLE [" + table + "] DROP CONSTRAINT [" + name.replace("]", "]]") + "]");
                log.info("Removed outdated check constraint {} on {}.{}", name, table, column);
            }
        }
    }

    private void dropColumn(String table, String column) {
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(?) AND name = ?", Integer.class, table, column);
        if (exists == null || exists == 0) {
            return;
        }
        String quotedTable = "[" + table + "]";

        // constraints and indexes that use the column must go first
        for (String name : names("""
                SELECT dc.name FROM sys.default_constraints dc
                JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
                WHERE dc.parent_object_id = OBJECT_ID(?) AND c.name = ?
                UNION
                SELECT cc.name FROM sys.check_constraints cc
                JOIN sys.columns c ON c.object_id = cc.parent_object_id AND c.column_id = cc.parent_column_id
                WHERE cc.parent_object_id = OBJECT_ID(?) AND c.name = ?
                UNION
                SELECT fk.name FROM sys.foreign_keys fk
                JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
                JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
                WHERE fkc.parent_object_id = OBJECT_ID(?) AND c.name = ?
                UNION
                SELECT i.name FROM sys.indexes i
                JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE i.object_id = OBJECT_ID(?) AND c.name = ? AND i.is_unique_constraint = 1
                """, table, column, table, column, table, column, table, column)) {
            jdbc.execute("ALTER TABLE " + quotedTable + " DROP CONSTRAINT [" + name.replace("]", "]]") + "]");
        }
        for (String name : names("""
                SELECT i.name FROM sys.indexes i
                JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                WHERE i.object_id = OBJECT_ID(?) AND c.name = ?
                  AND i.is_primary_key = 0 AND i.is_unique_constraint = 0 AND i.name IS NOT NULL
                """, table, column)) {
            jdbc.execute("DROP INDEX [" + name.replace("]", "]]") + "] ON " + quotedTable);
        }
        jdbc.execute("ALTER TABLE " + quotedTable + " DROP COLUMN [" + column + "]");
        log.info("Removed obsolete column {}.{}", table, column);
    }

    private List<String> names(String sql, Object... params) {
        return jdbc.queryForList(sql, String.class, params);
    }
}
