package com.catalog.security;
import com.catalog.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {
  private final SecretKey key; private final long ttl;
  public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.expiry-hours}") long hours) {
    key = Keys.hmacShaKeyFor(secret.getBytes()); ttl = hours * 3600_000;
  }
  public String generate(User u) {
    return Jwts.builder().subject(u.username()).claim("role", u.role()).issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + ttl)).signWith(key).compact();
  }
  public Claims parse(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
}
