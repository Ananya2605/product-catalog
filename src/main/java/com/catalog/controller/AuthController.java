package com.catalog.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.catalog.dto.ApiResponse;
import com.catalog.dto.AuthRequest;
import com.catalog.dto.AuthResponse;
import com.catalog.exception.UsernameAlreadyExistsException;
import com.catalog.model.User;
import com.catalog.repository.UserRepository;
import com.catalog.security.JwtService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log =
            LoggerFactory.getLogger(AuthController.class);

    private final UserRepository users;
    private final PasswordEncoder enc;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder enc, JwtService jwt) {
        this.users = users;
        this.enc = enc;
        this.jwt = jwt;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody AuthRequest r) {
        String username = r.username().trim();

        if (users.findByUsername(username).isPresent()) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }

        User user;
        try {
            user = users.save(new User(null, username, enc.encode(r.password()), "USER"));
        } catch (DuplicateKeyException e) {
            // two requests raced past the check above (needs a unique index on username)
            throw new UsernameAlreadyExistsException("Username already taken");
        } catch (RuntimeException e) {
            log.error("Registration failed for username: {}", username, e);
            throw e;
        }

        return ApiResponse.ok("Registered",
                new AuthResponse(jwt.generate(user), user.username(), user.role()));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest r) {
        String username = r.username().trim();

        User user = users.findByUsername(username)
                .filter(u -> enc.matches(r.password(), u.password()))
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        return ApiResponse.ok("Logged in",
                new AuthResponse(jwt.generate(user), user.username(), user.role()));
    }
}