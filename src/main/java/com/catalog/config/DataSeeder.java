package com.catalog.config;
import com.catalog.model.*;
import com.catalog.repository.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Creates a default admin (admin / admin123) and sample products on first run. */
@Configuration
public class DataSeeder {
  @Bean CommandLineRunner seed(UserRepository users, ProductRepository products, PasswordEncoder enc) {
    return args -> {
      if (users.count() == 0) users.save(new User(null, "admin", enc.encode("admin123"), "ADMIN"));
      if (products.count() == 0) {
        Object[][] d = {{"Wireless Headphones","Electronics","Acme Audio",129.99,42,4.5},{"Mechanical Keyboard","Electronics","KeyCraft",89.0,6,4.7},
          {"Ergonomic Office Chair","Furniture","SitWell",349.0,15,4.3},{"Standing Desk","Furniture","SitWell",499.0,3,4.6},
          {"Running Shoes","Sports","Stride",74.5,60,4.2},{"Yoga Mat","Sports","Stride",24.0,0,4.0},
          {"Stainless Water Bottle","Kitchen","HydroPure",19.99,120,4.4},{"Chef Knife 8\"","Kitchen","EdgeWorks",59.0,9,4.8},
          {"Bluetooth Speaker","Electronics","Acme Audio",45.0,33,4.1},{"Desk Lamp","Furniture","LumaHome",32.0,25,3.9}};
        int i = 0;
        for (Object[] p : d) products.save(new Product(null, (String) p[0], "High-quality " + ((String) p[0]).toLowerCase() + " built for everyday use.",
          (String) p[1], Math.round((double) p[3] * 80.0), (int) p[4], "https://picsum.photos/seed/" + (i + 10) + "/600/450", (String) p[2], (double) p[5], Instant.now().minus(i++, ChronoUnit.DAYS)));
      }
    };
  }
}
