package com.catalog.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record OrderRequest(
  @NotEmpty(message = "Cart is empty") @Valid List<Line> items,
  @NotBlank(message = "Name is required") String name,
  @NotBlank @Pattern(regexp = "^[0-9+\\- ]{10,15}$", message = "Enter a valid phone number") String phone,
  @NotBlank(message = "Address is required") String address,
  @NotBlank @Pattern(regexp = "UPI|CARD|COD", message = "Payment method must be UPI, CARD or COD") String paymentMethod) {
  public record Line(@NotBlank String productId, @Min(1) @Max(20) int quantity) {}
}
