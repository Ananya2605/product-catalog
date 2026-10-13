package com.catalog.dto;
import jakarta.validation.constraints.*;
public record AuthRequest(@NotBlank(message = "Username is required") String username,
                          @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String password) {}
