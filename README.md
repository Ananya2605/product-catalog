# Product Catalog (Spring Boot + MongoDB + vanilla JS)
**Prereqs:** JDK 17+, Maven 3.9+, MongoDB on localhost:27017 (`docker run -d -p 27017:27017 mongo:7`).
**Run:** `mvn spring-boot:run` → open http://localhost:8080  (Swagger: /swagger-ui.html)
**Logins:** admin / admin123 (ADMIN); register in the UI for USER.
## API (Bearer JWT; GET = USER/ADMIN, POST/PUT/DELETE = ADMIN)
POST /api/auth/register | /login → {token}
GET /api/products?q=&category=&minPrice=&maxPrice=&lowStock=&page=&size=&sort=price,asc
GET /api/products/{id} | /categories | /stats ; POST /api/products ; PUT|DELETE /api/products/{id}
Postman: POST /api/auth/login, copy `data.token`, set Authorization → Bearer Token, then call the endpoints above.

## Structure
```
src/main/java/com/catalog
  CatalogApplication.java
  config/DataSeeder.java            controller/{Auth,Product}Controller.java
  dto/*                             exception/GlobalExceptionHandler.java
  model/{Product,User}.java         repository/{Product,User}Repository.java
  security/{JwtService,JwtFilter,SecurityConfig}.java    service/ProductService.java
src/main/resources/application.properties, static/{index.html,styles.css,app.js}
```

## Shopping features
Add to cart → cart drawer (qty, shipping: free over ₹999) → checkout (UPI / card / cash on delivery, demo only, no real charge) → order confirmation.
Orders: `POST /api/orders` (any logged-in user), `GET /api/orders/mine`, `GET /api/orders` + `PUT /api/orders/{id}/status?status=SHIPPED` (ADMIN).
Stock is reduced atomically when an order is placed; prices are always read from the database.

## Cart & order management
Catalog cards switch to − / + / Remove once an item is in the cart. My Orders: newest first, collapsible, per-order Delete and "Delete all orders".
`DELETE /api/orders/{id}` (owner or ADMIN) and `DELETE /api/orders/mine`. Deleting an order only removes history; it does not return stock.
