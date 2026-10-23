package com.emruh.servlet;

import com.emruh.util.DBUtil;
import com.emruh.util.PasswordUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;

/**
 * Servlet handling student and staff registration.
 * Endpoint: /api/auth/register
 */
@WebServlet(name = "RegisterServlet", urlPatterns = {"/api/auth/register"})
public class RegisterServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(RegisterServlet.class.getName());

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        request.setCharacterEncoding("UTF-8");

        String fullName = trim(request.getParameter("fullName"));
        String rollNumber = trim(request.getParameter("rollNumber"));
        String email = trim(request.getParameter("email"));
        String mobileNumber = trim(request.getParameter("mobileNumber"));
        String password = request.getParameter("password");
        String confirmPassword = request.getParameter("confirmPassword");

        try (PrintWriter out = response.getWriter()) {
            // Validation
            if (isEmpty(fullName) || fullName.length() < 2) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter your full name (at least 2 characters).");
                return;
            }

            if (isEmpty(rollNumber)) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter your student ID or roll number.");
                return;
            }

            if (isEmpty(email) || !EMAIL_PATTERN.matcher(email).matches()) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter a valid email address.");
                return;
            }

            String cleanMobile = mobileNumber != null ? mobileNumber.replaceAll("\\s+", "") : "";
            if (isEmpty(cleanMobile) || !PHONE_PATTERN.matcher(cleanMobile).matches()) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter a valid 10-digit Indian mobile number.");
                return;
            }

            if (isEmpty(password) || password.length() < 6) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Password must be at least 6 characters long.");
                return;
            }

            if (confirmPassword != null && !password.equals(confirmPassword)) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Passwords do not match.");
                return;
            }

            // Check duplicate roll number or email
            String checkSql = "SELECT roll_number, email FROM users WHERE roll_number = ? OR email = ? LIMIT 1";
            String insertSql = "INSERT INTO users (full_name, roll_number, email, mobile_number, password_hash) VALUES (?, ?, ?, ?, ?)";

            try (Connection conn = DBUtil.getConnection()) {
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setString(1, rollNumber);
                    checkStmt.setString(2, email.toLowerCase());
                    try (ResultSet rs = checkStmt.executeQuery()) {
                        if (rs.next()) {
                            String foundRoll = rs.getString("roll_number");
                            String foundEmail = rs.getString("email");
                            if (email.equalsIgnoreCase(foundEmail)) {
                                sendError(response, out, HttpServletResponse.SC_CONFLICT, "An account with this email address already exists.");
                            } else {
                                sendError(response, out, HttpServletResponse.SC_CONFLICT, "An account with this roll number already exists.");
                            }
                            return;
                        }
                    }
                }

                // Hash password securely with PBKDF2
                String passwordHash = PasswordUtil.hashPassword(password);

                try (PreparedStatement insertStmt = conn.prepareStatement(insertSql)) {
                    insertStmt.setString(1, fullName);
                    insertStmt.setString(2, rollNumber);
                    insertStmt.setString(3, email.toLowerCase());
                    insertStmt.setString(4, cleanMobile);
                    insertStmt.setString(5, passwordHash);

                    int rows = insertStmt.executeUpdate();
                    if (rows > 0) {
                        response.setStatus(HttpServletResponse.SC_CREATED);
                        out.print("{\"status\":\"SUCCESS\",\"message\":\"Registration successful! You may now sign in.\"}");
                    } else {
                        sendError(response, out, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Registration failed. Please try again.");
                    }
                }

            } catch (SQLException e) {
                LOGGER.log(Level.SEVERE, "Database error during registration.", e);
                if (e.getErrorCode() == 1062) { // MySQL Duplicate Entry error code
                    sendError(response, out, HttpServletResponse.SC_CONFLICT, "An account with this email or roll number already exists.");
                } else {
                    sendError(response, out, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "A server error occurred during registration. Please try again later.");
                }
            }
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        try (PrintWriter out = response.getWriter()) {
            out.print("{\"status\":\"ERROR\",\"message\":\"GET method is not supported for registration. Please use POST.\"}");
        }
    }

    private static String trim(String value) {
        return value != null ? value.trim() : null;
    }

    private static boolean isEmpty(String value) {
        return value == null || value.isEmpty();
    }

    private static void sendError(HttpServletResponse response, PrintWriter out, int statusCode, String message) {
        response.setStatus(statusCode);
        out.print("{\"status\":\"ERROR\",\"message\":\"" + escapeJson(message) + "\"}");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
