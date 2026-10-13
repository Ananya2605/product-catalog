package com.catalog.controller;
import com.catalog.dto.*;
import com.catalog.model.Product;
import com.catalog.service.ProductService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/products")
public class ProductController {
  private final ProductService svc;
  public ProductController(ProductService svc) { this.svc = svc; }

  @GetMapping
  public ApiResponse<PageResult<Product>> list(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
      @RequestParam(required = false) Double minPrice, @RequestParam(required = false) Double maxPrice,
      @RequestParam(defaultValue = "false") boolean lowStock, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "8") int size, @RequestParam(defaultValue = "createdAt,desc") String sort) {
    return ApiResponse.ok("OK", svc.search(q, category, minPrice, maxPrice, lowStock, page, size, sort));
  }
  @GetMapping("/{id}") public ApiResponse<Product> get(@PathVariable String id) { return ApiResponse.ok("OK", svc.get(id)); }
  @GetMapping("/categories") public ApiResponse<List<String>> categories() { return ApiResponse.ok("OK", svc.categories()); }
  @GetMapping("/stats") public ApiResponse<Map<String, Object>> stats() { return ApiResponse.ok("OK", svc.stats()); }

  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<Product> create(@Valid @RequestBody ProductRequest r) { return ApiResponse.ok("Product created", svc.create(r)); }
  @PutMapping("/{id}")
  public ApiResponse<Product> update(@PathVariable String id, @Valid @RequestBody ProductRequest r) { return ApiResponse.ok("Product updated", svc.update(id, r)); }
  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(@PathVariable String id) { svc.delete(id); return ApiResponse.ok("Product deleted", null); }
}
