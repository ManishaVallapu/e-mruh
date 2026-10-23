package com.emruh.servlet;

import com.emruh.util.DBUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Servlet API to retrieve products from MySQL emruh_db.products table
 * and return them formatted as JSON.
 */
@WebServlet(name = "ProductServlet", urlPatterns = {"/api/products"})
public class ProductServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(ProductServlet.class.getName());

    private static final String SELECT_PRODUCTS_SQL =
            "SELECT product_id, name, category, description, price, stock_quantity, image_path FROM products ORDER BY product_id ASC";

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        try (PrintWriter out = response.getWriter()) {
            StringBuilder json = new StringBuilder();
            json.append("{\"status\":\"SUCCESS\",\"products\":[");

            try (Connection conn = DBUtil.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(SELECT_PRODUCTS_SQL);
                 ResultSet rs = stmt.executeQuery()) {

                boolean first = true;
                while (rs.next()) {
                    if (!first) {
                        json.append(",");
                    }
                    first = false;

                    int productId = rs.getInt("product_id");
                    String name = rs.getString("name");
                    String category = rs.getString("category");
                    String description = rs.getString("description");
                    BigDecimal price = rs.getBigDecimal("price");
                    int stockQuantity = rs.getInt("stock_quantity");
                    String imagePath = rs.getString("image_path");

                    json.append("{")
                        .append("\"product_id\":").append(productId).append(",")
                        .append("\"name\":").append(escapeJson(name)).append(",")
                        .append("\"category\":").append(escapeJson(category)).append(",")
                        .append("\"description\":").append(escapeJson(description)).append(",")
                        .append("\"price\":").append(price != null ? price.toString() : "0.00").append(",")
                        .append("\"stock_quantity\":").append(stockQuantity).append(",")
                        .append("\"image_path\":").append(escapeJson(imagePath))
                        .append("}");
                }

                json.append("]}");
                response.setStatus(HttpServletResponse.SC_OK);
                out.print(json.toString());

            } catch (SQLException e) {
                LOGGER.log(Level.SEVERE, "Database query error while retrieving products.", e);
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"status\":\"ERROR\",\"message\":\"Failed to retrieve products. Please check server logs.\"}");
            }
        }
    }

    /**
     * Escapes standard JSON special characters for safely outputting JSON strings.
     * Handles null values by returning "null".
     */
    private static String escapeJson(String input) {
        if (input == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < input.length(); i++) {
            char ch = input.charAt(i);
            switch (ch) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (ch < 32) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                    break;
            }
        }
        sb.append("\"");
        return sb.toString();
    }
}
