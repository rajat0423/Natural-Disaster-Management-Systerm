package com.disastermgmt.repository;

import com.disastermgmt.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByScenarioIdOrderByCreatedAtDesc(Long scenarioId);
    
    Optional<Alert> findByIdentifier(String identifier);

    @Query("SELECT a FROM Alert a WHERE a.expiresAt > :now ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlerts(@Param("now") LocalDateTime now);

    @Query("SELECT a FROM Alert a WHERE a.scenarioId = :scenarioId AND a.expiresAt > :now ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlertsByScenario(@Param("scenarioId") Long scenarioId, @Param("now") LocalDateTime now);
}
