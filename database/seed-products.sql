-- ==============================================================================
-- e-mruh Campus Store - Sample Products Seed Script
-- Target Database: MySQL 8.0+
-- Database Name: emruh_db
-- Table: products (product_id, name, category, description, price, stock_quantity, image_path, created_at)
-- ==============================================================================

USE emruh_db;

-- Insert 14 realistic college products matching the e-mruh catalog.
-- Uses `WHERE NOT EXISTS` check on `name` to ensure safe, idempotent reruns
-- without creating duplicate records or requiring a schema-level unique constraint.

INSERT INTO products (name, category, description, price, stock_quantity, image_path)
SELECT * FROM (
    -- 1. Uniforms
    SELECT 
        'Official Campus Formal Shirt (Sky Blue)' AS name,
        'Uniforms' AS category,
        'Cotton blend, wrinkle-free, embroidered monogram on left pocket.' AS description,
        650.00 AS price,
        45 AS stock_quantity,
        'images/products/formal-shirt.jpg' AS image_path
    UNION ALL
    -- 2. Uniforms
    SELECT 
        'Tailored Navy Blue College Trousers',
        'Uniforms',
        'Breathable poly-viscose blend, reinforced seams, all standard waist sizes.',
        750.00,
        35,
        'images/products/navy-trousers.jpg'
    UNION ALL
    -- 3. Lab Coats
    SELECT 
        'Pure Cotton White Laboratory Coat',
        'Lab Coats',
        'Unisex cut, deep 3-pocket design with button closure, knee-length protection.',
        499.00,
        60,
        'images/products/white-lab-coat.jpg'
    UNION ALL
    -- 4. Uniforms
    SELECT 
        'University Navy Blazer with Brass Crest',
        'Uniforms',
        'Premium suiting material with golden crest buttons and padded shoulders.',
        2199.00,
        20,
        'images/products/navy-blazer.jpg'
    UNION ALL
    -- 5. Uniforms
    SELECT 
        'Official College Monogram Necktie',
        'Uniforms',
        'Navy blue silk-finish tie with woven university crest and clip.',
        199.00,
        80,
        'images/products/college-necktie.jpg'
    UNION ALL
    -- 6. Lab Coats
    SELECT 
        'Heavy-Duty Workshop Safety Apron',
        'Lab Coats',
        'Thick canvas drill fabric with adjustable neck strap for mechanical & civil labs.',
        380.00,
        40,
        'images/products/workshop-apron.jpg'
    UNION ALL
    -- 7. Textbooks
    SELECT 
        'Higher Engineering Mathematics & Physics',
        'Textbooks',
        'Standard 2026 Semester 1-4 curriculum, includes solved university papers.',
        580.00,
        50,
        'images/products/maths-physics-book.jpg'
    UNION ALL
    -- 8. Textbooks
    SELECT 
        'Data Structures & Object Oriented Programming',
        'Textbooks',
        'Recommended CS/IT syllabus edition with lab practical code samples.',
        620.00,
        40,
        'images/products/dsa-java-book.jpg'
    UNION ALL
    -- 9. Textbooks
    SELECT 
        'Basic Electrical & Electronics Engineering',
        'Textbooks',
        'Comprehensive circuit theory, AC/DC machines, and semiconductor devices guide.',
        520.00,
        30,
        'images/products/electrical-engg-book.jpg'
    UNION ALL
    -- 10. Textbooks
    SELECT 
        'Engineering Mechanics & Strength of Materials',
        'Textbooks',
        'Statics, dynamics, and beam analysis textbook with step-by-step solutions.',
        590.00,
        35,
        'images/products/engg-mechanics-book.jpg'
    UNION ALL
    -- 11. Stationery
    SELECT 
        'Hardbound Practical Lab Record (Pack of 3)',
        'Stationery',
        'Alternate plain & ruled 100 GSM ledger pages with pre-printed index format.',
        240.00,
        90,
        'images/products/lab-record-notebook.jpg'
    UNION ALL
    -- 12. Stationery
    SELECT 
        'Professional Engineering Mini-Drafter Kit',
        'Stationery',
        'Stainless steel clamp, unbreakable scale, protective canvas pouch included.',
        420.00,
        25,
        'images/products/mini-drafter-kit.jpg'
    UNION ALL
    -- 13. Stationery
    SELECT 
        'Engineering Drawing Instrument Box',
        'Stationery',
        'High-precision brass compass, dividers, lengthening bar, and lead refills.',
        340.00,
        30,
        'images/products/drawing-instrument-box.jpg'
    UNION ALL
    -- 14. Stationery
    SELECT 
        'Scientific Graph Sheets & Observation Pad',
        'Stationery',
        'Pack of 100 mm-calibrated millimeter graph sheets with college observation pad.',
        150.00,
        100,
        'images/products/graph-observation-pad.jpg'
) AS seed_data
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.name = seed_data.name
);
