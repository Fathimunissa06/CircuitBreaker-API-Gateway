
package com.example.product_service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    public record Product(int id, String name, double price) {}

    @GetMapping
    public List<Product> all() {
        log.info("Returning product list");   // <-- this line shows the trace ID
        return List.of(
                new Product(1, "Laptop", 55000),
                new Product(2, "Phone", 20000),
                new Product(3, "Headphones", 2500));
    }
}
