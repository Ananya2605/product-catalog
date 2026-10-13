package com.catalog.dto;
import jakarta.validation.constraints.*;
public record ProductRequest(
  @NotBlank(message = "Name is required") @Size(max = 120) String name,
  @Size(max = 2000) String description,
  @NotBlank(message = "Category is required") String category,
  @NotNull(message = "Price is required") @DecimalMin(value = "0.0", message = "Price must be >= 0") Double price,
  @NotNull(message = "Stock is required") @Min(value = 0, message = "Stock must be >= 0") Integer stock,
  String image, String brand,
  @DecimalMin("0") @DecimalMax(value = "5", message = "Rating must be 0-5") Double rating) {}
