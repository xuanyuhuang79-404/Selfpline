package com.selfpline;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class SchemaInit {
    private static final String URL = "jdbc:mysql://localhost:3306?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai";
    private static final String USER = "root";
    private static final String PASSWORD = "djy123456";

    public static void main(String[] args) throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/schema.sql"));
        // Split on semicolons at end of lines (simple but works for this DDL)
        String[] statements = sql.split(";\\s*\\n");
        int ok = 0, skip = 0;

        try (Connection c = DriverManager.getConnection(URL, USER, PASSWORD);
             Statement s = c.createStatement()) {
            for (String stmt : statements) {
                String t = stmt.trim();
                if (t.isEmpty() || t.startsWith("--")) continue;
                try {
                    s.execute(t + ";");
                    ok++;
                    System.out.println("  OK: " + t.substring(0, Math.min(60, t.length())).replace('\n', ' ') + "...");
                } catch (Exception e) {
                    String msg = e.getMessage();
                    if (msg != null && (msg.contains("Duplicate") || msg.contains("already exists"))) {
                        System.out.println("  SKIP (exists): " + t.substring(0, Math.min(50, t.length())).replace('\n', ' ') + "...");
                        skip++;
                    } else {
                        System.err.println("  FAIL: " + msg.substring(0, Math.min(100, msg.length())));
                    }
                }
            }
        }
        System.out.println("\nDone — executed: " + ok + ", skipped: " + skip);
    }
}
