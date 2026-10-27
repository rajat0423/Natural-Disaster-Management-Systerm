package com.disastermgmt.repository;

import com.disastermgmt.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    List<Incident> findByScenarioIdOrderByCreatedAtDesc(Long scenarioId);

    Optional<Incident> findByCode(String code);

    List<Incident> findByScenarioIdAndStatus(Long scenarioId, String status);

    @Query("SELECT i FROM Incident i WHERE i.scenarioId = :scenarioId AND i.status <> 'CLOSED' ORDER BY CASE WHEN i.priority = 'P1_CRITICAL' THEN 1 WHEN i.priority = 'P2_HIGH' THEN 2 WHEN i.priority = 'P3_MEDIUM' THEN 3 ELSE 4 END, i.createdAt DESC")
    List<Incident> findActiveIncidentsByScenario(@Param("scenarioId") Long scenarioId);

    @Query("SELECT i FROM Incident i WHERE i.status <> 'CLOSED' ORDER BY CASE WHEN i.priority = 'P1_CRITICAL' THEN 1 WHEN i.priority = 'P2_HIGH' THEN 2 WHEN i.priority = 'P3_MEDIUM' THEN 3 ELSE 4 END, i.createdAt DESC")
    List<Incident> findAllActiveIncidents();
}
