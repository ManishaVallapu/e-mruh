package com.emruh.servlet;

import com.emruh.util.DBUtil;
import com.emruh.util.PasswordUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Servlet handling user login and session creation.
 * Endpoint: /api/auth/login
 */
@WebServlet(name = "LoginServlet", urlPatterns = {"/api/auth/login"})
public class LoginServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(LoginServlet.class.getName());

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        request.setCharacterEncoding("UTF-8");

        String email = trim(request.getParameter("email"));
        String password = request.getParameter("password");

        try (PrintWriter out = response.getWriter()) {
            if (isEmpty(email) || isEmpty(password)) {
                sendError(response, out, HttpServletResponse.SC_BAD_REQUEST, "Please enter both email and password.");
                return;
            }

            String querySql = "SELECT user_id, full_name, email, password_hash FROM users WHERE email = ? LIMIT 1";

            try (Connection conn = DBUtil.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(querySql)) {

                stmt.setString(1, email.toLowerCase());

                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        int userId = rs.getInt("user_id");
                        String fullName = rs.getString("full_name");
                        String userEmail = rs.getString("email");
                        String storedHash = rs.getString("password_hash");

                        // Verify candidate password
                        boolean passwordMatches = PasswordUtil.verifyPassword(password, storedHash);

                        if (passwordMatches) {
                            // Invalidate old session to prevent session fixation attacks
                            HttpSession oldSession = request.getSession(false);
                            if (oldSession != null) {
                                oldSession.invalidate();
                            }

                            // Create fresh session
                            HttpSession session = request.getSession(true);
                            session.setAttribute("userId", userId);
                            session.setAttribute("userName", fullName);
                            session.setAttribute("userEmail", userEmail);

                            response.setStatus(HttpServletResponse.SC_OK);
                            out.print("{\"status\":\"SUCCESS\",\"message\":\"Login successful!\",\"user\":{\"user_id\":"
                                    + userId + ",\"full_name\":\"" + escapeJson(fullName)
                                    + "\",\"email\":\"" + escapeJson(userEmail) + "\"}}");
                            return;
                        }
                    }

                    // Generic error on failure (never reveal whether the email exists)
                    sendError(response, out, HttpServletResponse.SC_UNAUTHORIZED, "Invalid email address or password.");
                }

            } catch (SQLException e) {
                LOGGER.log(Level.SEVERE, "Database error during login.", e);
                sendError(response, out, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "A server error occurred during login. Please try again later.");
            }
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        try (PrintWriter out = response.getWriter()) {
            out.print("{\"status\":\"ERROR\",\"message\":\"GET method is not supported for login. Please use POST.\"}");
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
