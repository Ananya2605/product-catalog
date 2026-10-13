package com.catalog.service;
import static org.springframework.data.mongodb.core.query.Criteria.where;
import com.catalog.dto.OrderRequest;
import com.catalog.model.*;
import com.catalog.repository.OrderRepository;
import java.time.Instant;
import java.util.*;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
  private static final Set<String> STATUSES = Set.of("PLACED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED");
  private static final double FREE_SHIPPING_OVER = 999, SHIPPING_FEE = 49;
  private final OrderRepository orders; private final MongoTemplate mongo;
  public OrderService(OrderRepository orders, MongoTemplate mongo) { this.orders = orders; this.mongo = mongo; }

  /** Prices and stock are always taken from the database, never from the client. */
  public Order place(String username, OrderRequest r) {
    List<OrderItem> items = new ArrayList<>(); double sub = 0;
    for (var line : r.items()) {
      // atomic: decrement stock only if enough is left
      Product p = mongo.findAndModify(new Query(where("id").is(line.productId()).and("stock").gte(line.quantity())),
          new Update().inc("stock", -line.quantity()), FindAndModifyOptions.options().returnNew(true), Product.class);
      if (p == null) {
        items.forEach(i -> mongo.updateFirst(new Query(where("id").is(i.productId())), new Update().inc("stock", i.quantity()), Product.class));
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for one or more items. Please review your cart.");
      }
      String img = p.image() != null && p.image().startsWith("data:") ? null : p.image();
      items.add(new OrderItem(p.id(), p.name(), p.price(), line.quantity(), img));
      sub += p.price() * line.quantity();
    }
    sub = Math.round(sub * 100) / 100.0;
    double ship = sub >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
    String status = r.paymentMethod().equals("COD") ? "PLACED" : "PAID";   // online payments are simulated
    return orders.save(new Order(null, username, items, sub, ship, Math.round((sub + ship) * 100) / 100.0, r.name().trim(),
        r.phone().trim(), r.address().trim(), r.paymentMethod(), status, Instant.now()));
  }
  public List<Order> mine(String username) { return orders.findByUsernameOrderByCreatedAtDesc(username); }
  public List<Order> all() { return orders.findAllByOrderByCreatedAtDesc(); }

  public Order updateStatus(String id, String status) {
    if (!STATUSES.contains(status)) throw new IllegalArgumentException("Status must be one of " + STATUSES);
    Order o = orders.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    return orders.save(new Order(o.id(), o.username(), o.items(), o.subtotal(), o.shipping(), o.total(), o.customerName(), o.phone(),
        o.address(), o.paymentMethod(), status, o.createdAt()));
  }

  /** Owner (or admin) can delete an order. */
  public void delete(String id, String username, boolean admin) {
    Order o = orders.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    if (!admin && !o.username().equals(username)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own orders");
    orders.deleteById(id);
  }
  public void deleteMine(String username) { orders.deleteByUsername(username); }
}
