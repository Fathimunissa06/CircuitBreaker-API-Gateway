package com.example.api_gateway;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
public class FallbackController {

    @GetMapping("/fallback/recommendations")
    public Map<String, Object> recommendationsFallback() {
        return Map.of("fallback", true,
                "items", List.of("Top Seller: Phone", "Top Seller: Laptop", "Top Seller: Headphones"));
    }
}
