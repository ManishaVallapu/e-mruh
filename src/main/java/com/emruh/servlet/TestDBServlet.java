package com.emruh.servlet;

import com.emruh.util.DBUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Temporary diagnostic servlet to verify MySQL database connectivity.
 * Returns only generic status messages to the client.
 */
@WebServlet(name = "TestDBServlet", urlPatterns = {"/test-db"})
public class TestDBServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOGGER = Logger.getLogger(TestDBServlet.class.getName());

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        try (PrintWriter out = response.getWriter()) {
            try (Connection conn = DBUtil.getConnection()) {
                if (conn != null && !conn.isClosed()) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    out.print("{\"status\":\"SUCCESS\",\"message\":\"Database connection established successfully.\"}");
                } else {
                    response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    out.print("{\"status\":\"ERROR\",\"message\":\"Database connection was closed or null.\"}");
                }
            } catch (SQLException e) {
                // Log safe diagnostic on server side without revealing credentials or query details
                LOGGER.log(Level.SEVERE, "Database connection smoke test failed.");
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                out.print("{\"status\":\"ERROR\",\"message\":\"Failed to connect to database. Check server logs.\"}");
            }
        }
    }
}
