package com.disastermgmt.repository;

import com.disastermgmt.entity.ResponseUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResponseUnitRepository extends JpaRepository<ResponseUnit, UUID> {
    List<ResponseUnit> findByScenarioId(Long scenarioId);

    Optional<ResponseUnit> findByCallsign(String callsign);

    List<ResponseUnit> findByScenarioIdAndStatus(Long scenarioId, String status);

    List<ResponseUnit> findByScenarioIdAndUnitType(Long scenarioId, String unitType);

    @Query("SELECT u FROM ResponseUnit u WHERE u.scenarioId = :scenarioId AND u.status = 'AVAILABLE' ORDER BY u.lastPing DESC")
    List<ResponseUnit> findAvailableUnitsByScenario(@Param("scenarioId") Long scenarioId);
}
