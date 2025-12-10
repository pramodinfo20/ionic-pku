-- Recipes app schema for MySQL (phpMyAdmin/CLI import)
-- Creates database pku_recipes with recipes, tags, and recipe_tags tables
-- Stores image URL/path (no BLOBs) to keep DB lean

CREATE DATABASE IF NOT EXISTS pku_recipes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pku_recipes;

-- Main recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  category VARCHAR(40) DEFAULT 'dinner',
  duration VARCHAR(50),
  difficulty ENUM('Easy','Medium','Hard') DEFAULT 'Easy',
  diet ENUM('vegetarian','non-vegetarian') DEFAULT 'vegetarian',
  cuisine VARCHAR(60),
  image_url TEXT,
  steps TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Categories lookup
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- Join table: recipes <-> categories (many-to-many)
CREATE TABLE IF NOT EXISTS recipe_categories (
  recipe_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (recipe_id, category_id),
  CONSTRAINT fk_recipe_categories_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Tags lookup (deduped tags)
CREATE TABLE IF NOT EXISTS tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- Join table: recipes <-> tags (many-to-many)
CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id INT UNSIGNED NOT NULL,
  tag_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (recipe_id, tag_id),
  CONSTRAINT fk_recipe_tags_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Sample data
INSERT INTO recipes (title, description, category, duration, difficulty, diet, cuisine, image_url, steps) VALUES
('Creamy Garlic Pasta', 'Silky parmesan garlic sauce tossed with al dente linguine and fresh herbs.', 'dinner', '25 mins', 'Easy', 'vegetarian', 'italian', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
 'Cook linguine until al dente.\nSaute garlic in butter and olive oil.\nAdd cream and parmesan, then toss pasta.\nFinish with herbs and pepper.'),
('Berry Yogurt Bowl', 'Greek yogurt topped with fresh berries, toasted oats, and honey.', 'breakfast', '10 mins', 'Easy', 'vegetarian', 'indian', 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80',
 'Spoon yogurt into a bowl.\nAdd berries and toasted oats.\nDrizzle honey and serve.');

INSERT INTO categories (name) VALUES
('breakfast'), ('lunch'), ('dinner'), ('dessert'), ('drinks'), ('snack')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO recipe_categories (recipe_id, category_id)
SELECT r.id, c.id FROM recipes r JOIN categories c ON (r.title = 'Creamy Garlic Pasta' AND c.name = 'dinner')
UNION
SELECT r.id, c.id FROM recipes r JOIN categories c ON (r.title = 'Berry Yogurt Bowl' AND c.name = 'breakfast');

INSERT INTO tags (name) VALUES
('Comfort'),
('One-pot'),
('Healthy'),
('No-cook'),
('Vegetarian'),
('Non-vegetarian'),
('Chicken'),
('Fish'),
('Vegan'),
('Gluten-free'),
('Dairy-free'),
('Spicy'),
('Quick'),
('Family'),
('Weeknight')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO recipe_tags (recipe_id, tag_id)
SELECT r.id, t.id
FROM recipes r
JOIN tags t ON (r.title = 'Creamy Garlic Pasta' AND t.name IN ('Comfort','One-pot'))
   OR (r.title = 'Berry Yogurt Bowl' AND t.name IN ('Healthy','No-cook'));
