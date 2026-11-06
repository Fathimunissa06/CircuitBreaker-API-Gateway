package com.example.inventory_service;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    public record Stock(int productId, int quantity) {}

    @GetMapping
    public List<Stock> all() {
        return List.of(new Stock(1, 10), new Stock(2, 25), new Stock(3, 100));
    }
}
