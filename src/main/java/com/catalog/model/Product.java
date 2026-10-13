package com.catalog.model;
import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
/** MongoDB entity (immutable record). */
@Document("products")
public record Product(@Id String id, String name, String description, String category, double price,
                      int stock, String image, String brand, double rating, Instant createdAt) {}
