package com.emruh.servlet;

import com.emruh.util.DBUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Servlet handling order history retrieval for the logged-in user.
 * Endpoint: /api/orders/my-orders
 */
@WebServlet(name = "MyOrdersServlet", urlPatterns = {"/api/orders/my-orders"})
public class MyOrdersServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(MyOrdersServlet.class.getName());

    private static class OrderItemDTO {
        int orderItemId;
        int productId;
        String productName;
        int quantity;
        BigDecimal unitPrice;
    }

    private static class OrderDTO {
        int orderId;
        String customerName;
        String customerEmail;
        String customerPhone;
        String deliveryAddress;
        String rollNumber;
        BigDecimal totalAmount;
        String orderStatus;
        String createdAt;
        List<OrderItemDTO> items = new ArrayList<>();
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        HttpSession session = request.getSession(false);
        try (PrintWriter out = response.getWriter()) {
            if (session == null || session.getAttribute("userId") == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print("{\"status\":\"UNAUTHORIZED\",\"authenticated\":false,\"message\":\"Please sign in to view your order history.\"}");
                return;
            }

            Integer loggedInUserId = (Integer) session.getAttribute("userId");

            // Query only orders belonging to loggedInUserId
            String sql = "SELECT o.order_id, o.customer_name, o.customer_email, o.customer_phone, "
                    + "o.delivery_address, o.roll_number, o.total_amount, o.order_status, o.created_at, "
                    + "oi.order_item_id, oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price "
                    + "FROM orders o "
                    + "LEFT JOIN order_items oi ON o.order_id = oi.order_id "
                    + "LEFT JOIN products p ON oi.product_id = p.product_id "
                    + "WHERE o.user_id = ? "
                    + "ORDER BY o.order_id DESC, oi.order_item_id ASC";

            Map<Integer, OrderDTO> orderMap = new LinkedHashMap<>();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

            try (Connection conn = DBUtil.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setInt(1, loggedInUserId);

                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        int orderId = rs.getInt("order_id");
                        OrderDTO order = orderMap.get(orderId);

                        if (order == null) {
                            order = new OrderDTO();
                            order.orderId = orderId;
                            order.customerName = rs.getString("customer_name");
                            order.customerEmail = rs.getString("customer_email");
                            order.customerPhone = rs.getString("customer_phone");
                            order.deliveryAddress = rs.getString("delivery_address");
                            order.rollNumber = rs.getString("roll_number");
                            order.totalAmount = rs.getBigDecimal("total_amount");
                            order.orderStatus = rs.getString("order_status");

                            Timestamp ts = rs.getTimestamp("created_at");
                            order.createdAt = ts != null ? sdf.format(ts) : "";

                            orderMap.put(orderId, order);
                        }

                        int orderItemId = rs.getInt("order_item_id");
                        if (!rs.wasNull()) {
                            OrderItemDTO item = new OrderItemDTO();
                            item.orderItemId = orderItemId;
                            item.productId = rs.getInt("product_id");
                            item.productName = rs.getString("product_name");
                            item.quantity = rs.getInt("quantity");
                            item.unitPrice = rs.getBigDecimal("unit_price");
                            order.items.add(item);
                        }
                    }
                }

                // Render JSON output
                StringBuilder json = new StringBuilder();
                json.append("{\"status\":\"SUCCESS\",\"orders\":[");

                boolean firstOrder = true;
                for (OrderDTO order : orderMap.values()) {
                    if (!firstOrder) json.append(",");
                    firstOrder = false;

                    json.append("{")
                        .append("\"order_id\":").append(order.orderId).append(",")
                        .append("\"customer_name\":\"").append(escapeJson(order.customerName)).append("\",")
                        .append("\"customer_email\":\"").append(escapeJson(order.customerEmail)).append("\",")
                        .append("\"customer_phone\":\"").append(escapeJson(order.customerPhone)).append("\",")
                        .append("\"delivery_address\":\"").append(escapeJson(order.deliveryAddress)).append("\",")
                        .append("\"roll_number\":\"").append(escapeJson(order.rollNumber)).append("\",")
                        .append("\"total_amount\":").append(order.totalAmount != null ? order.totalAmount.toString() : "0.00").append(",")
                        .append("\"order_status\":\"").append(escapeJson(order.orderStatus)).append("\",")
                        .append("\"created_at\":\"").append(escapeJson(order.createdAt)).append("\",")
                        .append("\"items\":[");

                    boolean firstItem = true;
                    for (OrderItemDTO item : order.items) {
                        if (!firstItem) json.append(",");
                        firstItem = false;

                        json.append("{")
                            .append("\"order_item_id\":").append(item.orderItemId).append(",")
                            .append("\"product_id\":").append(item.productId).append(",")
                            .append("\"product_name\":\"").append(escapeJson(item.productName)).append("\",")
                            .append("\"quantity\":").append(item.quantity).append(",")
                            .append("\"unit_price\":").append(item.unitPrice != null ? item.unitPrice.toString() : "0.00")
                            .append("}");
                    }
                    json.append("]}");
                }

                json.append("]}");
                response.setStatus(HttpServletResponse.SC_OK);
                out.print(json.toString());

            } catch (SQLException e) {
                LOGGER.log(Level.SEVERE, "Database error retrieving user orders.", e);
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"status\":\"ERROR\",\"message\":\"A database error occurred while fetching your orders.\"}");
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
