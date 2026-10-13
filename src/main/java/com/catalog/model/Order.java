package com.catalog.model;
import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
@Document("orders")
public record Order(@Id String id, String username, List<OrderItem> items, double subtotal, double shipping, double total,
                    String customerName, String phone, String address, String paymentMethod, String status, Instant createdAt) {}
