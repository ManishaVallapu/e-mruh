package com.emruh.servlet;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * Servlet handling user session termination (logout).
 * Endpoint: /api/auth/logout
 */
@WebServlet(name = "LogoutServlet", urlPatterns = {"/api/auth/logout"})
public class LogoutServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        handleLogout(request, response);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Allow GET or reject; let's allow safe logout on POST, but also handle GET gracefully with warning or reject.
        // The prompt says: "Reject unsupported HTTP methods appropriately."
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
        try (PrintWriter out = response.getWriter()) {
            out.print("{\"status\":\"ERROR\",\"message\":\"GET method is not supported for logout. Please use POST.\"}");
        }
    }

    private void handleLogout(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        response.setStatus(HttpServletResponse.SC_OK);
        try (PrintWriter out = response.getWriter()) {
            out.print("{\"status\":\"SUCCESS\",\"message\":\"Logged out successfully.\"}");
        }
    }
}
