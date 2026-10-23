package com.emruh.servlet;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * Servlet providing current authenticated session status.
 * Endpoint: /api/auth/me
 */
@WebServlet(name = "AuthStatusServlet", urlPatterns = {"/api/auth/me"})
public class AuthStatusServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        HttpSession session = request.getSession(false);
        try (PrintWriter out = response.getWriter()) {
            if (session != null && session.getAttribute("userId") != null) {
                Object userId = session.getAttribute("userId");
                Object userName = session.getAttribute("userName");
                Object userEmail = session.getAttribute("userEmail");

                response.setStatus(HttpServletResponse.SC_OK);
                out.print("{\"status\":\"SUCCESS\",\"authenticated\":true,\"user\":{"
                        + "\"user_id\":" + userId + ","
                        + "\"full_name\":\"" + escapeJson(userName != null ? userName.toString() : "") + "\","
                        + "\"email\":\"" + escapeJson(userEmail != null ? userEmail.toString() : "") + "\""
                        + "}}");
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                out.print("{\"status\":\"UNAUTHORIZED\",\"authenticated\":false,\"message\":\"No active session found.\"}");
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
