# e-mruh Database Setup Guide

This guide explains how to initialize the database for **e-mruh** using MySQL Workbench and how to verify the schema.

---

## 1. Prerequisites

- **MySQL Server 8.0+** running locally.
- **MySQL Workbench** installed.
- Target database: `emruh_db` (the script creates it automatically if it does not exist).

---

## 2. Running `schema.sql` in MySQL Workbench

Follow these simple steps:

1. **Launch MySQL Workbench**:
   - Open MySQL Workbench and connect to your local MySQL instance (e.g., `Local instance MySQL80` on port `3306`).
   - Enter your MySQL root password when prompted.

2. **Open the SQL Script**:
   - In the top menu bar, click **File** -> **Open SQL Script...** (or press `Ctrl + Shift + O`).
   - Navigate to your project folder:
     ```
     C:\Users\MANISHA\eclipse-workspace\e-mruh\database\schema.sql
     ```
   - Click **Open**. A new query tab will open showing the script contents.

3. **Execute the Script**:
   - Click the **Execute (lightning bolt icon)** on the query toolbar, or press `Ctrl + Shift + Enter`.
   - Look at the **Action Output** window at the bottom of the screen. You should see green checkmarks for all table creation statements.

---

## 3. How to Verify Table Creation

Once executed, verify that all four tables were created properly:

1. In the **Navigator** panel on the left side of MySQL Workbench:
   - Click on the **Schemas** tab.
   - Right-click anywhere in the list and select **Refresh All**.
   - Expand `emruh_db` -> **Tables**.
   - You should see:
     - `products`
     - `users`
     - `orders`
     - `order_items`

2. Run verification queries in a query tab:
   ```sql
   USE emruh_db;
   SHOW TABLES;
   ```
   To inspect table columns and structure:
   ```sql
   DESCRIBE products;
   DESCRIBE users;
   DESCRIBE orders;
   DESCRIBE order_items;
   ```

---

## 4. Secure Credential Configuration (For Future JDBC Integration)

When we connect Java Servlets to MySQL in subsequent development phases, keep these security best practices in mind:

- **Never hardcode database passwords in Java files or commit them to Git**:
  - Avoid writing credentials directly in `.java`, `.jsp`, or frontend files.
- **Dedicated Application User (Recommended)**:
  - Instead of connecting using MySQL `root`, consider creating an application-specific MySQL user with restricted privileges for `emruh_db`:
    ```sql
    CREATE USER 'emruh_user'@'localhost' IDENTIFIED BY 'your_secure_password';
    GRANT ALL PRIVILEGES ON emruh_db.* TO 'emruh_user'@'localhost';
    FLUSH PRIVILEGES;
    ```
- **Configuration Storage**:
  - Store DB connection settings (host, port, DB name, username, and password) in an untracked external file (such as `db.properties` or environment variables) loaded at runtime by a DB connection utility class.
- **Password Hashing**:
  - The `users` table contains `password_hash VARCHAR(255)`. Passwords must be hashed using a strong algorithm (e.g., BCrypt or PBKDF2) before being inserted into the database. Never store plaintext passwords.
