package com.catalog.repository;
import com.catalog.model.Order;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface OrderRepository extends MongoRepository<Order, String> {
  List<Order> findByUsernameOrderByCreatedAtDesc(String username);
  List<Order> findAllByOrderByCreatedAtDesc();
  void deleteByUsername(String username);
}
