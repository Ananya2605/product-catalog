package com.catalog.security;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

  @Bean SecurityFilterChain chain(HttpSecurity http, JwtFilter filter) throws Exception {
    return http.csrf(c -> c.disable()).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a
        .requestMatchers("/api/auth/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
        .requestMatchers(HttpMethod.DELETE, "/api/orders/**").authenticated()  // users delete their own orders
        .requestMatchers(HttpMethod.POST, "/api/orders").authenticated()      // any user can buy
        .requestMatchers(HttpMethod.GET, "/api/orders").hasRole("ADMIN")       // all orders: admin
        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()   // USER + ADMIN can browse
        .requestMatchers("/api/**").hasRole("ADMIN")                  // only ADMIN can write
        .anyRequest().permitAll())                                    // static frontend files
      .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        .accessDeniedHandler((rq, rs, ex) -> rs.sendError(403)))
      .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
  }
}
