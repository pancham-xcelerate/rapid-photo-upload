package com.rapidphotoflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Main API application class.
 * Handles HTTP requests, WebSocket connections, and database operations.
 * 
 * Run this application to start the API server.
 * The worker service (WorkerApplication) runs separately.
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.rapidphotoflow", 
               excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, 
                                                      classes = {WorkerApplication.class}))
@EnableJpaRepositories(basePackages = "com.rapidphotoflow.repository")
@EntityScan(basePackages = "com.rapidphotoflow.model")
public class ApiApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}

