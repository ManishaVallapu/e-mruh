package com.emruh.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Utility class for establishing and managing database connections.
 * Reads connection configuration from environment variables.
 * Safe defaults are provided only for non-secret connection parameters.
 */
public final class DBUtil {

    private static final Logger LOGGER = Logger.getLogger(DBUtil.class.getName());

    // Non-secret defaults
    private static final String DEFAULT_URL = "jdbc:mysql://localhost:3306/emruh_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String DEFAULT_USER = "root";

    // Load JDBC Driver once during class initialization
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            LOGGER.log(Level.SEVERE, "MySQL JDBC Driver class not found in classpath.");
        }
    }

    // Private constructor to prevent instantiation
    private DBUtil() {}

    /**
     * Resolves the database URL from environment variable or uses safe local default.
     */
    private static String getDbUrl() {
        String envUrl = System.getenv("EMRUH_DB_URL");
        if (envUrl != null && !envUrl.trim().isEmpty()) {
            return envUrl.trim();
        }
        return DEFAULT_URL;
    }

    /**
     * Resolves the database username from environment variable or uses default user.
     */
    private static String getDbUser() {
        String envUser = System.getenv("EMRUH_DB_USER");
        if (envUser != null && !envUser.trim().isEmpty()) {
            return envUser.trim();
        }
        return DEFAULT_USER;
    }

    /**
     * Resolves the database password from environment variable.
     * No default is assumed for secrets.
     */
    private static String getDbPassword() {
        String envPassword = System.getenv("EMRUH_DB_PASSWORD");
        return envPassword != null ? envPassword : "";
    }

    /**
     * Opens and returns a live connection to the database.
     *
     * @return Connection instance to emruh_db
     * @throws SQLException if a database access error occurs
     */
    public static Connection getConnection() throws SQLException {
        String url = getDbUrl();
        String user = getDbUser();
        String password = getDbPassword();

        try {
            return DriverManager.getConnection(url, user, password);
        } catch (SQLException e) {
            // Log generic diagnostic without printing credentials, passwords, or raw connection strings
            LOGGER.log(Level.SEVERE, "Database connection attempt failed. Verify database server status and credentials.");
            throw e;
        }
    }
}
