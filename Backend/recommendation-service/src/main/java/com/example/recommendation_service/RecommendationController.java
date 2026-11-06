package com.example.recommendation_service;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@RestController
public class RecommendationController {

    // How long we pretend to be slow (0 = normal)
    private final AtomicLong delayMs = new AtomicLong(0);

    @GetMapping("/api/recommendations")

    public Map<String, Object> recommend() throws InterruptedException {
        Thread.sleep(delayMs.get());   // fake slowness
        return Map.of("fallback", false,
                "items", List.of("Personalized: Gaming Mouse", "Personalized: Keyboard", "Personalized: Monitor"));
    }

    // Used by the "Trigger Latency" button. Example: POST /chaos/delay?ms=5000
    @PostMapping("/chaos/delay")
    public Map<String, Object> setDelay(@RequestParam long ms) {
        delayMs.set(ms);
        return Map.of("delayMs", ms);
    }
}
