package com.rapidphotoflow;

import com.rapidphotoflow.worker.StreamConsumer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main Worker application class.
 * Consumes photo processing jobs from Redis Stream and processes them.
 * 
 * This application runs separately from the API application.
 * 
 * To run:
 * 1. Set profile: --spring.profiles.active=worker
 * 2. Or disable web: --spring.main.web-application-type=none
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.rapidphotoflow", 
               excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, 
                                                      classes = {ApiApplication.class}))
@EnableJpaRepositories(basePackages = "com.rapidphotoflow.repository")
@EntityScan(basePackages = "com.rapidphotoflow.model")
@EnableScheduling // Enable scheduled tasks (StreamConsumer)
@Slf4j
public class WorkerApplication {
    
    /**
     * Conditional CommandLineRunner - only runs when app.mode=worker
     */
    @org.springframework.context.annotation.Bean
    @ConditionalOnProperty(name = "app.mode", havingValue = "worker", matchIfMissing = false)
    public CommandLineRunner workerRunner(StreamConsumer streamConsumer) {
        return args -> {
            log.info("Starting ImageStream Worker Application...");
            log.info("Initializing Redis Stream consumer group...");
            
            // Initialize consumer group
            streamConsumer.initializeConsumerGroup();
            
            log.info("Worker application started successfully!");
            log.info("Listening for photo processing jobs from Redis Stream: photo_stream");
            log.info("Consumer Group: workers, Consumer: worker-1");
        };
    }
    
    public static void main(String[] args) {
        // Disable web server for worker application
        SpringApplication app = new SpringApplication(WorkerApplication.class);
        app.setWebApplicationType(org.springframework.boot.WebApplicationType.NONE);
        // Set app mode to worker (enables StreamConsumer and workerRunner)
        app.setDefaultProperties(java.util.Map.of("app.mode", "worker"));
        app.run(args);
    }
}

