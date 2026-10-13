package com.catalog.exception;
import com.catalog.dto.ApiResponse;
import java.util.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiResponse<Map<String, String>>> validation(MethodArgumentNotValidException e) {
    Map<String, String> errs = new LinkedHashMap<>();
    e.getBindingResult().getFieldErrors().forEach(f -> errs.put(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest().body(ApiResponse.error("Validation failed", errs));
  }
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<ApiResponse<Void>> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason(), null)); }
  @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
  ResponseEntity<ApiResponse<Void>> badRequest(Exception e) { return ResponseEntity.badRequest().body(ApiResponse.error(e instanceof IllegalArgumentException ? e.getMessage() : "Malformed request body", null)); }
  @ExceptionHandler(UsernameAlreadyExistsException.class)
  ResponseEntity<ApiResponse<Void>> duplicate(UsernameAlreadyExistsException e) { return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage(), null)); }
  @ExceptionHandler(BadCredentialsException.class)
  ResponseEntity<ApiResponse<Void>> auth(BadCredentialsException e) { return ResponseEntity.status(401).body(ApiResponse.error(e.getMessage(), null)); }
  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiResponse<Void>> other(Exception e) { return ResponseEntity.internalServerError().body(ApiResponse.error("Unexpected server error", null)); }
}