package com.disastermgmt.repository;

import com.disastermgmt.entity.AlertDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AlertDeliveryRepository extends JpaRepository<AlertDelivery, UUID> {
    List<AlertDelivery> findByAlertId(UUID alertId);
}
