
package com.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class CatalogApplication {

    public static void main(String[] args) {
        SpringApplication.run(CatalogApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void showProjectUrl() {
        System.out.println("\n======================================");
        System.out.println("   CATALOG PROJECT STARTED SUCCESSFULLY");
        System.out.println("   Open in Chrome: http://localhost:8083");
        System.out.println("======================================\n");
    }
}
