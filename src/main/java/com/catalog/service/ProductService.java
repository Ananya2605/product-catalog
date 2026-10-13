package com.catalog.service;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;
import static org.springframework.data.mongodb.core.query.Criteria.where;
import com.catalog.dto.*;
import com.catalog.model.Product;
import com.catalog.repository.ProductRepository;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {
  private static final Set<String> SORTABLE = Set.of("name", "price", "stock", "rating", "createdAt");
  private final ProductRepository repo;
  private final MongoTemplate mongo;
  private final int lowStock;

  public ProductService(ProductRepository repo, MongoTemplate mongo, @Value("${app.low-stock-threshold}") int lowStock) {
    this.repo = repo; this.mongo = mongo; this.lowStock = lowStock;
  }

  /** Search + filter + sort + paginate. */
  public PageResult<Product> search(String q, String category, Double min, Double max, boolean low, int page, int size, String sort) {
    List<Criteria> cs = new ArrayList<>();
    if (q != null && !q.isBlank()) {
      Pattern p = Pattern.compile(Pattern.quote(q.trim()), Pattern.CASE_INSENSITIVE);
      cs.add(new Criteria().orOperator(where("name").regex(p), where("category").regex(p)));
    }
    if (category != null && !category.isBlank()) cs.add(where("category").is(category));
    if (min != null) cs.add(where("price").gte(min));
    if (max != null) cs.add(where("price").lte(max));
    if (low) cs.add(where("stock").lte(lowStock));
    Query query = cs.isEmpty() ? new Query() : new Query(new Criteria().andOperator(cs));
    long total = mongo.count(query, Product.class);

    String[] s = (sort == null ? "createdAt,desc" : sort).split(",");
    String field = SORTABLE.contains(s[0]) ? s[0] : "createdAt";
    Sort.Direction dir = s.length > 1 && s[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
    size = Math.min(Math.max(size, 1), 50);
    query.with(PageRequest.of(Math.max(page, 0), size, Sort.by(dir, field)));
    return new PageResult<>(mongo.find(query, Product.class), page, size, total, (int) Math.ceil(total / (double) size));
  }

  public Product get(String id) {
    return repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + id));
  }
  public Product create(ProductRequest r) { return repo.save(map(null, r, Instant.now())); }
  public Product update(String id, ProductRequest r) { return repo.save(map(id, r, get(id).createdAt())); }
  public void delete(String id) { get(id); repo.deleteById(id); }

  public List<String> categories() { return mongo.findDistinct(new Query(), "category", Product.class, String.class).stream().sorted().toList(); }

  /** MongoDB aggregation pipelines for dashboard analytics. */
  public Map<String, Object> stats() {
    Map<String, Object> out = new LinkedHashMap<>();
    var overall = mongo.aggregate(newAggregation(group().count().as("totalProducts").avg("price").as("avgPrice")
        .sum("stock").as("totalUnits")), "products", Map.class).getMappedResults();
    out.put("overview", overall.isEmpty() ? Map.of() : overall.get(0));
    out.put("lowStockCount", mongo.count(new Query(where("stock").lte(lowStock).gt(0)), Product.class));
    out.put("outOfStockCount", mongo.count(new Query(where("stock").is(0)), Product.class));
    out.put("byCategory", mongo.aggregate(newAggregation(group("category").count().as("count").avg("price").as("avgPrice")
        .sum("stock").as("totalStock"), sort(Sort.Direction.ASC, "_id")), "products", Map.class).getMappedResults());
    out.put("priceRanges", mongo.aggregate(newAggregation(Aggregation.bucket("price").withBoundaries(0, 500, 2000, 10000, 50000, 10_000_000)
        .andOutputCount().as("count")), "products", Map.class).getMappedResults());
    return out;
  }

  private Product map(String id, ProductRequest r, Instant created) {
    return new Product(id, r.name().trim(), r.description(), r.category().trim(), r.price(), r.stock(), r.image(),
        r.brand(), r.rating() == null ? 0 : r.rating(), created);
  }
}
