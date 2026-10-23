package com.emruh.servlet;

import com.emruh.util.DBUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servlet handling order creation and inventory management using JDBC transactions.
 * Endpoint: /api/orders
 */
@WebServlet(name = "OrderServlet", urlPatterns = {"/api/orders"})
public class OrderServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(OrderServlet.class.getName());

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");

    private static class OrderItemInput {
        int productId;
        int quantity;
    }

    private static class VerifiedItem {
        int productId;
        int quantity;
        BigDecimal unitPrice;
        String name;
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        request.setCharacterEncoding("UTF-8");

        String customerName = null;
        String customerEmail = null;
        String customerPhone = null;
        String deliveryAddress = null;
        String rollNumber = null;
        List<OrderItemInput> requestedItems = new ArrayList<>();

        String contentType = request.getContentType();
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = request.getReader()) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }
            String jsonBody = sb.toString();
            customerName = extractJsonString(jsonBody, "customerName");
            customerEmail = extractJsonString(jsonBody, "customerEmail");
            customerPhone = extractJsonString(jsonBody, "customerPhone");
            deliveryAddress = extractJsonString(jsonBody, "deliveryAddress");
            rollNumber = extractJsonString(jsonBody, "rollNumber");
            requestedItems = parseJsonItems(jsonBody);
        } else {
            customerName = trim(request.getParameter("customerName"));
            customerEmail = trim(request.getParameter("customerEmail"));
            customerPhone = trim(request.getParameter("customerPhone"));
            deliveryAddress = trim(request.getParameter("deliveryAddress"));
            rollNumber = trim(request.getParameter("rollNumber"));

            String[] prodIds = request.getParameterValues("productId");
            String[] quantities = request.getParameterValues("quantity");
            if (prodIds != null && quantities != null && prodIds.length == quantities.length) {
                for (int i = 0; i < prodIds.length; i++) {
                    try {
                        OrderItemInput item = new OrderItemInput();
                        item.productId = Integer.parseInt(prodIds[i].trim());
                        item.quantity = Integer.parseInt(quantities[i].trim());
                        requestedItems.add(item);
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        try (PrintWriter out = response.getWriter()) {
            // Validation
            if (isEmpty(customerName) || customerName.length() < 2) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter a valid customer name (at least 2 characters).");
                return;
            }

            if (isEmpty(customerPhone) || !PHONE_PATTERN.matcher(customerPhone.replaceAll("\\s+", "")).matches()) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter a valid 10-digit mobile number.");
                return;
            }

            if (isEmpty(customerEmail) || !EMAIL_PATTERN.matcher(customerEmail).matches()) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter a valid email address.");
                return;
            }

            if (isEmpty(deliveryAddress) || deliveryAddress.length() < 6) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please provide your campus delivery address or hostel & room number (minimum 6 characters).");
                return;
            }

            if (requestedItems.isEmpty()) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Your shopping cart is empty or contains invalid items.");
                return;
            }

            // Consolidate duplicate products in cart
            Map<Integer, Integer> consolidatedItems = new LinkedHashMap<>();
            for (OrderItemInput item : requestedItems) {
                if (item.productId <= 0) {
                    sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Cart contains invalid product ID: " + item.productId);
                    return;
                }
                if (item.quantity <= 0) {
                    sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Quantity must be a positive integer.");
                    return;
                }
                consolidatedItems.put(item.productId, consolidatedItems.getOrDefault(item.productId, 0) + item.quantity);
            }

            // Associate with authenticated session if present
            Integer authUserId = null;
            HttpSession session = request.getSession(false);
            if (session != null && session.getAttribute("userId") != null) {
                try {
                    authUserId = (Integer) session.getAttribute("userId");
                } catch (Exception ignored) {}
            }

            // Execute Order Creation within a single atomic database transaction
            Connection conn = null;
            try {
                conn = DBUtil.getConnection();
                conn.setAutoCommit(false); // Begin JDBC transaction

                List<VerifiedItem> verifiedItems = new ArrayList<>();
                BigDecimal totalAmount = BigDecimal.ZERO;

                // Step 1: Lock and verify stock for all items using SELECT ... FOR UPDATE
                String checkStockSql = "SELECT product_id, name, price, stock_quantity FROM products WHERE product_id = ? FOR UPDATE";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkStockSql)) {
                    for (Map.Entry<Integer, Integer> entry : consolidatedItems.entrySet()) {
                        int productId = entry.getKey();
                        int orderQty = entry.getValue();

                        checkStmt.setInt(1, productId);
                        try (ResultSet rs = checkStmt.executeQuery()) {
                            if (!rs.next()) {
                                conn.rollback();
                                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Product with ID #" + productId + " does not exist.");
                                return;
                            }

                            String pName = rs.getString("name");
                            BigDecimal currentPrice = rs.getBigDecimal("price");
                            int availableStock = rs.getInt("stock_quantity");

                            if (availableStock < orderQty) {
                                conn.rollback();
                                String msg = "Insufficient stock for \"" + pName + "\". Requested: " + orderQty + ", Available: " + availableStock;
                                sendError(response, out, HttpServletResponse.SC_CONFLICT, msg);
                                return;
                            }

                            VerifiedItem vi = new VerifiedItem();
                            vi.productId = productId;
                            vi.quantity = orderQty;
                            vi.unitPrice = currentPrice.setScale(2, RoundingMode.HALF_UP);
                            vi.name = pName;
                            verifiedItems.add(vi);

                            BigDecimal lineTotal = vi.unitPrice.multiply(BigDecimal.valueOf(orderQty));
                            totalAmount = totalAmount.add(lineTotal);
                        }
                    }
                }

                totalAmount = totalAmount.setScale(2, RoundingMode.HALF_UP);

                // Step 2: Insert into orders table
                int generatedOrderId = -1;
                String insertOrderSql = "INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, delivery_address, roll_number, total_amount, order_status) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')";

                try (PreparedStatement orderStmt = conn.prepareStatement(insertOrderSql, Statement.RETURN_GENERATED_KEYS)) {
                    if (authUserId != null) {
                        orderStmt.setInt(1, authUserId);
                    } else {
                        orderStmt.setNull(1, java.sql.Types.INTEGER);
                    }
                    orderStmt.setString(2, customerName);
                    orderStmt.setString(3, customerEmail.toLowerCase());
                    orderStmt.setString(4, customerPhone.replaceAll("\\s+", ""));
                    orderStmt.setString(5, deliveryAddress);
                    orderStmt.setString(6, isEmpty(rollNumber) ? null : rollNumber);
                    orderStmt.setBigDecimal(7, totalAmount);

                    orderStmt.executeUpdate();

                    try (ResultSet gk = orderStmt.getGeneratedKeys()) {
                        if (gk.next()) {
                            generatedOrderId = gk.getInt(1);
                        } else {
                            throw new SQLException("Failed to obtain generated order_id.");
                        }
                    }
                }

                // Step 3: Insert line items into order_items
                String insertItemSql = "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)";
                try (PreparedStatement itemStmt = conn.prepareStatement(insertItemSql)) {
                    for (VerifiedItem vi : verifiedItems) {
                        itemStmt.setInt(1, generatedOrderId);
                        itemStmt.setInt(2, vi.productId);
                        itemStmt.setInt(3, vi.quantity);
                        itemStmt.setBigDecimal(4, vi.unitPrice);
                        itemStmt.addBatch();
                    }
                    itemStmt.executeBatch();
                }

                // Step 4: Decrement inventory stock in products
                String updateStockSql = "UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?";
                try (PreparedStatement updateStmt = conn.prepareStatement(updateStockSql)) {
                    for (VerifiedItem vi : verifiedItems) {
                        updateStmt.setInt(1, vi.quantity);
                        updateStmt.setInt(2, vi.productId);
                        updateStmt.addBatch();
                    }
                    updateStmt.executeBatch();
                }

                // Step 5: Commit transaction
                conn.commit();

                response.setStatus(HttpServletResponse.SC_CREATED);
                out.print("{\"status\":\"SUCCESS\","
                        + "\"message\":\"Order placed successfully!\","
                        + "\"order_id\":" + generatedOrderId + ","
                        + "\"total_amount\":" + totalAmount + ","
                        + "\"item_count\":" + verifiedItems.size() + "}");

            } catch (SQLException e) {
                if (conn != null) {
                    try {
                        conn.rollback();
                    } catch (SQLException rollbackEx) {
                        LOGGER.log(Level.SEVERE, "Transaction rollback failed", rollbackEx);
                    }
                }
                LOGGER.log(Level.SEVERE, "Database error during order checkout transaction.", e);
                sendError(response, out, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "A server error occurred while processing your order. Please try again.");
            } finally {
                if (conn != null) {
                    try {
                        conn.setAutoCommit(true);
                        conn.close();
                    } catch (SQLException ignored) {}
                }
            }
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        try (PrintWriter out = response.getWriter()) {
            out.print("{\"status\":\"ERROR\",\"message\":\"GET method is not supported for order placement. Please use POST.\"}");
        }
    }

    private static String trim(String value) {
        return value != null ? value.trim() : null;
    }

    private static boolean isEmpty(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static void sendError(HttpServletResponse response, PrintWriter out, int statusCode, String message) {
        response.setStatus(statusCode);
        out.print("{\"status\":\"ERROR\",\"message\":\"" + escapeJson(message) + "\"}");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static String extractJsonString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private static List<OrderItemInput> parseJsonItems(String json) {
        List<OrderItemInput> list = new ArrayList<>();
        Pattern itemsPattern = Pattern.compile("\"items\"\\s*:\\s*\\[([^\\]]*)\\]");
        Matcher itemsMatcher = itemsPattern.matcher(json);
        if (itemsMatcher.find()) {
            String itemsContent = itemsMatcher.group(1);
            Pattern objPattern = Pattern.compile("\\{([^\\}]+)\\}");
            Matcher objMatcher = objPattern.matcher(itemsContent);
            while (objMatcher.find()) {
                String objContent = objMatcher.group(1);
                Integer pId = extractJsonInt(objContent, "productId");
                if (pId == null) pId = extractJsonInt(objContent, "product_id");
                if (pId == null) pId = extractJsonInt(objContent, "id");

                Integer qty = extractJsonInt(objContent, "quantity");
                if (qty == null) qty = extractJsonInt(objContent, "qty");

                if (pId != null && qty != null) {
                    OrderItemInput item = new OrderItemInput();
                    item.productId = pId;
                    item.quantity = qty;
                    list.add(item);
                }
            }
        }
        return list;
    }

    private static Integer extractJsonInt(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*([0-9]+)");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        // Also check if numeric value was quoted e.g. "productId": "1"
        Pattern quotedPattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([0-9]+)\"");
        Matcher quotedMatcher = quotedPattern.matcher(json);
        if (quotedMatcher.find()) {
            try {
                return Integer.parseInt(quotedMatcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
