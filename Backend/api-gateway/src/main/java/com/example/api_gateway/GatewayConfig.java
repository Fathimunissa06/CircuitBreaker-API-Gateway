package com.example.api_gateway;

import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.springframework.cloud.circuitbreaker.resilience4j.ReactiveResilience4JCircuitBreakerFactory;
import org.springframework.cloud.circuitbreaker.resilience4j.Resilience4JConfigBuilder;
import org.springframework.cloud.client.circuitbreaker.Customizer;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Configuration
public class GatewayConfig {

    // Rate limiter: 5 requests per second, bursts up to 10
    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(5, 10);
    }

    // "Who is calling?" Here we count per client IP address
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            var address = exchange.getRequest().getRemoteAddress();
            return Mono.just(address == null ? "unknown" : address.getAddress().getHostAddress());
        };
    }

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder,
                               RedisRateLimiter limiter,
                               KeyResolver keyResolver) {
        return builder.routes()
                .route("product", r -> r.path("/api/products/**")
                        .uri("lb://product-service"))
                .route("inventory", r -> r.path("/api/inventory/**")
                        .uri("lb://inventory-service"))

                // Recommendation: rate limiter + circuit breaker + fallback
                .route("recommendation", r -> r.path("/api/recommendations/**")
                        .filters(f -> f
                                .requestRateLimiter(c -> c.setRateLimiter(limiter).setKeyResolver(keyResolver))
                                .circuitBreaker(c -> c
                                        .setName("recommendationCB")
                                        .setFallbackUri("forward:/fallback/recommendations")))
                        .uri("lb://recommendation-service"))

                .route("chaos", r -> r.path("/chaos/**")
                        .uri("lb://recommendation-service"))
                .build();
    }

    @Bean
    public Customizer<ReactiveResilience4JCircuitBreakerFactory> circuitBreakerSettings() {
        return factory -> factory.configureDefault(id -> new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(CircuitBreakerConfig.custom()
                        .slidingWindowSize(5)
                        .minimumNumberOfCalls(3)
                        .failureRateThreshold(50)
                        .waitDurationInOpenState(Duration.ofSeconds(10))
                        .permittedNumberOfCallsInHalfOpenState(2)
                        .automaticTransitionFromOpenToHalfOpenEnabled(true) // shows HALF_OPEN on the UI by itself
                        .build())
                .timeLimiterConfig(TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(2))
                        .build())
                .build());
    }
}