package com.disastermgmt.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CAP Alert Multi-Channel Broadcast Delivery Metric
 */
@Entity
@Table(name = "alert_deliveries")
public class AlertDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "alert_id", nullable = false)
    private UUID alertId;

    @Column(nullable = false, length = 30)
    private String channel; // WEBSOCKET, WEB_PUSH, SMS, EMAIL, CAP_RSS, SIREN, CELL_BROADCAST

    @Column(name = "recipient_count")
    private Integer recipientCount = 0;

    @Column(name = "success_count")
    private Integer successCount = 0;

    @Column(name = "fail_count")
    private Integer failCount = 0;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "latency_ms")
    private Integer latencyMs = 0;

    public AlertDelivery() {}

    @PrePersist
    protected void onCreate() {
        if (this.dispatchedAt == null) this.dispatchedAt = LocalDateTime.now();
        if (this.recipientCount == null) this.recipientCount = 0;
        if (this.successCount == null) this.successCount = 0;
        if (this.failCount == null) this.failCount = 0;
        if (this.latencyMs == null) this.latencyMs = 0;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAlertId() { return alertId; }
    public void setAlertId(UUID alertId) { this.alertId = alertId; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public Integer getRecipientCount() { return recipientCount; }
    public void setRecipientCount(Integer recipientCount) { this.recipientCount = recipientCount; }

    public Integer getSuccessCount() { return successCount; }
    public void setSuccessCount(Integer successCount) { this.successCount = successCount; }

    public Integer getFailCount() { return failCount; }
    public void setFailCount(Integer failCount) { this.failCount = failCount; }

    public LocalDateTime getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }

    public Integer getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Integer latencyMs) { this.latencyMs = latencyMs; }
}
