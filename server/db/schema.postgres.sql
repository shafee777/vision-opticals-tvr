-- Vision Opticals Managed PostgreSQL Schema (Netlify Database / Neon)

-- 1. Users & Admin Accounts
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 3. Brands
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  is_featured SMALLINT DEFAULT 0
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_slug VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  price NUMERIC,
  compare_at_price NUMERIC,
  badge VARCHAR(255),
  description TEXT,
  primary_image TEXT,
  secondary_image TEXT,
  color_family VARCHAR(255),
  product_tags TEXT,
  lens_uv_cut VARCHAR(255),
  lens_blue_cut VARCHAR(255),
  lens_transmission VARCHAR(255),
  gender VARCHAR(50) DEFAULT 'Unisex',
  frame_shape VARCHAR(255),
  frame_type VARCHAR(255),
  frame_material VARCHAR(255),
  lens_width VARCHAR(255),
  bridge VARCHAR(255),
  temple_length VARCHAR(255),
  available_colors TEXT,
  available_sizes TEXT,
  lens_coatings TEXT,
  lens_power_range VARCHAR(255),
  lens_water_content VARCHAR(255),
  lens_material VARCHAR(255),
  lens_duration VARCHAR(255),
  lens_features TEXT,
  wa_message TEXT,
  is_published SMALLINT DEFAULT 1,
  is_featured SMALLINT DEFAULT 0,
  is_bestseller SMALLINT DEFAULT 0,
  is_new_arrival SMALLINT DEFAULT 0,
  is_trending SMALLINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Product Images (Multiple Angles & Views)
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  angle_label VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_primary SMALLINT DEFAULT 0
);

-- 6. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 10,
  low_stock_threshold INTEGER DEFAULT 3,
  sku VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  final_quantity INTEGER NOT NULL,
  reason TEXT,
  user_name VARCHAR(255) DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Offers & Promotions
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  code VARCHAR(255),
  discount_type VARCHAR(50) DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  applicable_category VARCHAR(255) DEFAULT 'all',
  banner_url TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Homepage Sections & Customizer
CREATE TABLE IF NOT EXISTS homepage_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  subtitle TEXT,
  badge VARCHAR(255),
  is_enabled SMALLINT DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  config TEXT
);

-- 10. Store Settings
CREATE TABLE IF NOT EXISTS store_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. In-Store Eye Clinic Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  appointment_number VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  appointment_date VARCHAR(50) NOT NULL,
  time_slot VARCHAR(100) NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Orders & Optical Customization Pipeline
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  shipping_address TEXT NOT NULL,
  city VARCHAR(255),
  state VARCHAR(255),
  pincode VARCHAR(50),
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  order_status VARCHAR(50) DEFAULT 'placed',
  items_json TEXT NOT NULL,
  prescription_file TEXT,
  prescription_data TEXT,
  tracking_number VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Modular Website Components
CREATE TABLE IF NOT EXISTS modular_components (
  id SERIAL PRIMARY KEY,
  component_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  badge VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_enabled SMALLINT DEFAULT 1,
  config_json TEXT,
  is_deleted SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pg_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_pg_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_pg_products_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_pg_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_pg_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_pg_modular_components_order ON modular_components(display_order);
