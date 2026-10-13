package com.catalog.controller;
import com.catalog.dto.*;
import com.catalog.model.Order;
import com.catalog.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/orders")
public class OrderController {
  private final OrderService svc;
  public OrderController(OrderService svc) { this.svc = svc; }

  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<Order> place(Authentication auth, @Valid @RequestBody OrderRequest r) { return ApiResponse.ok("Order placed", svc.place(auth.getName(), r)); }
  @GetMapping("/mine")
  public ApiResponse<List<Order>> mine(Authentication auth) { return ApiResponse.ok("OK", svc.mine(auth.getName())); }
  @GetMapping   // ADMIN only (see SecurityConfig)
  public ApiResponse<List<Order>> all() { return ApiResponse.ok("OK", svc.all()); }
  @PutMapping("/{id}/status")
  public ApiResponse<Order> status(@PathVariable String id, @RequestParam String status) { return ApiResponse.ok("Status updated", svc.updateStatus(id, status)); }

  @DeleteMapping("/mine")
  public ApiResponse<Void> deleteMine(Authentication auth) { svc.deleteMine(auth.getName()); return ApiResponse.ok("All your orders were deleted", null); }
  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(Authentication auth, @PathVariable String id) {
    boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    svc.delete(id, auth.getName(), admin); return ApiResponse.ok("Order deleted", null);
  }
}
