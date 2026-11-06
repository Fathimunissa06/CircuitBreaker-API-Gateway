package com.example.api_gateway;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class BreakerStatusController {

    private final ObjectProvider<CircuitBreakerRegistry> registry;

    public BreakerStatusController(ObjectProvider<CircuitBreakerRegistry> registry) {
        this.registry = registry;
    }

    @GetMapping("/gateway/breaker")
    public Map<String, Object> status() {
        Map<String, Object> out = new HashMap<>();
        CircuitBreakerRegistry reg = registry.getIfAvailable();

        // The breaker is created on the first call, so it may not exist yet
        CircuitBreaker cb = (reg == null) ? null
                : reg.getAllCircuitBreakers().stream()
                .filter(c -> c.getName().contains("recommendationCB"))
                .findFirst().orElse(null);

        if (cb == null) {
            out.put("state", reg == null ? "UNKNOWN" : "CLOSED");
            return out;
        }
        out.put("state", cb.getState().name());               // CLOSED, OPEN, HALF_OPEN
        out.put("failureRate", cb.getMetrics().getFailureRate());
        out.put("failedCalls", cb.getMetrics().getNumberOfFailedCalls());
        out.put("successfulCalls", cb.getMetrics().getNumberOfSuccessfulCalls());
        out.put("notPermittedCalls", cb.getMetrics().getNumberOfNotPermittedCalls());
        return out;
    }
}