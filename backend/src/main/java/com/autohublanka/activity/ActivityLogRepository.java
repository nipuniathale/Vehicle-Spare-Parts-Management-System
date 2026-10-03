package com.autohublanka.activity;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("""
            select a from ActivityLog a
            where (:module is null or a.module = :module)
              and (:action is null or a.action = :action)
              and (:text is null
                   or lower(a.userName) like :text or lower(a.userEmail) like :text or lower(a.description) like :text)
              and a.createdAt >= :from and a.createdAt < :to
            order by a.createdAt desc, a.id desc
            """)
    List<ActivityLog> search(@Param("module") String module,
                             @Param("action") String action,
                             @Param("text") String text,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to,
                             Pageable page);

    @Query("select distinct a.module from ActivityLog a order by a.module")
    List<String> modules();

    @Query("select distinct a.action from ActivityLog a order by a.action")
    List<String> actions();
}
