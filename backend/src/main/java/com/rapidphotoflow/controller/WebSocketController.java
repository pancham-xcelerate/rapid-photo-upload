package com.rapidphotoflow.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * WebSocket controller for handling client connections.
 * Clients can subscribe to photo status updates via STOMP.
 */
@Controller
@Slf4j
public class WebSocketController {
    
    /**
     * Handle client subscription requests.
     * Clients can send messages to /app/subscribe to subscribe to updates.
     */
    @MessageMapping("/subscribe")
    @SendTo("/topic/photo-status/all")
    public Map<String, String> handleSubscribe(Map<String, Object> message) {
        log.debug("Client subscription request: {}", message);
        
        // Return confirmation
        return Map.of(
                "status", "subscribed",
                "message", "Successfully subscribed to photo status updates"
        );
    }
}

