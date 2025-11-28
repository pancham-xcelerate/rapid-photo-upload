package com.rapidphotoflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time status updates.
 * Uses STOMP protocol for messaging.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    /**
     * Configure message broker.
     * Clients can subscribe to these topics to receive updates.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for topics
        // Clients subscribe to: /topic/photo-status/all or /topic/photo-status/{id}
        config.enableSimpleBroker("/topic");
        
        // Prefix for messages from client to server
        config.setApplicationDestinationPrefixes("/app");
    }
    
    /**
     * Register STOMP endpoints.
     * Clients connect to this endpoint to establish WebSocket connection.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint
        registry.addEndpoint("/ws/photo-status")
                .setAllowedOriginPatterns("*") // Allow all origins in development
                .withSockJS(); // Fallback for browsers that don't support WebSocket
    }
}

