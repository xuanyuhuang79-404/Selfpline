package com.selfpline;

import io.github.cdimascio.dotenv.Dotenv;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.selfpline.dao")
public class SelfplineApplication {

    public static void main(String[] args) {
        // Load .env file from the project root
        try {
            // Use absolute path to ensure reliability on Windows
            String userDir = System.getProperty("user.dir");
            java.nio.file.Path rootPath = java.nio.file.Paths.get(userDir);
            
            // Search up to 2 levels up to find .env (handles running from backend/ or root/)
            Dotenv dotenv = null;
            for (int i = 0; i < 3; i++) {
                if (java.nio.file.Files.exists(rootPath.resolve(".env"))) {
                    dotenv = Dotenv.configure()
                            .directory(rootPath.toString())
                            .ignoreIfMissing()
                            .load();
                    break;
                }
                rootPath = rootPath.getParent();
                if (rootPath == null) break;
            }
            
            if (dotenv != null) {
                dotenv.entries().forEach(entry -> {
                    if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not load .env file manually: " + e.getMessage());
        }

        SpringApplication.run(SelfplineApplication.class, args);
    }
}
