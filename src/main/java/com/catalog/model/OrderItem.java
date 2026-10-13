package com.catalog.model;
public record OrderItem(String productId, String name, double price, int quantity, String image) {}
