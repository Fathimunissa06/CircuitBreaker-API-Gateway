package com.example.api_gateway;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.Semaphore;

@Component
public class RecommendationBulkheadFilter implements GlobalFilter, Ordered {

    // 3 slots = at most 3 recommendation calls in progress at once
    private final Semaphore slots = new Semaphore(3);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // Only guard the recommendation route; other routes pass straight through
        if (!path.startsWith("/api/recommendations")) {
            return chain.filter(exchange);
        }

        // No free slot? Reject immediately (do not wait!)
        if (!slots.tryAcquire()) {
            exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
            return exchange.getResponse().setComplete();
        }

        // Give the slot back when the request ends (success, error or cancel)
        return chain.filter(exchange).doFinally(signal -> slots.release());
    }

    @Override
    public int getOrder() {
        return -1; // run before the other filters
    }
}