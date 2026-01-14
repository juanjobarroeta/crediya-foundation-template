-- ==============================================================================
-- PURIFICADORA CUENCA AZUL - Water Delivery Inventory Schema
-- ==============================================================================
-- This schema extends the existing database to support water delivery business
-- ==============================================================================

-- ==============================================================================
-- WATER TANKS (GARRAFONES) MANAGEMENT
-- ==============================================================================

-- Water Tank Types table
CREATE TABLE water_tank_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- '20L Estándar', '10L Pequeño', etc.
  capacity_liters INTEGER NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL,
  replacement_cost NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0, -- Customer deposit for tank
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Water Tanks (Physical Assets)
CREATE TABLE water_tanks (
  id SERIAL PRIMARY KEY,
  tank_id VARCHAR(50) UNIQUE NOT NULL, -- Unique physical ID (barcode/QR)
  tank_type_id INTEGER REFERENCES water_tank_types(id),
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  supplier_id INTEGER, -- Will reference suppliers table
  condition VARCHAR(20) DEFAULT 'new', -- 'new', 'good', 'fair', 'damaged', 'retired'
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'assigned', 'in_delivery', 'damaged', 'cleaning'
  
  -- Customer Assignment
  assigned_customer_id INTEGER REFERENCES customers(id),
  assigned_date TIMESTAMP,
  
  -- Location Tracking
  current_location VARCHAR(100) DEFAULT 'warehouse', -- 'warehouse', 'customer', 'delivery', 'cleaning'
  last_delivery_date TIMESTAMP,
  
  -- Maintenance
  last_cleaning_date TIMESTAMP,
  cleaning_notes TEXT,
  maintenance_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- WATER VOLUME TRACKING
-- ==============================================================================

-- Water Storage Tanks (Company's water storage)
CREATE TABLE water_storage_tanks (
  id SERIAL PRIMARY KEY,
  tank_name VARCHAR(100) NOT NULL, -- 'Tanque Principal', 'Tanque Reserva'
  capacity_liters INTEGER NOT NULL,
  current_volume_liters INTEGER DEFAULT 0,
  minimum_level_liters INTEGER DEFAULT 0, -- Alert threshold
  location VARCHAR(100),
  last_cleaning_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'maintenance', 'inactive'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Water Inventory Movements (In/Out tracking)
CREATE TABLE water_movements (
  id SERIAL PRIMARY KEY,
  movement_type VARCHAR(20) NOT NULL, -- 'purchase', 'sale', 'waste', 'cleaning', 'transfer'
  volume_liters INTEGER NOT NULL, -- Positive for IN, Negative for OUT
  storage_tank_id INTEGER REFERENCES water_storage_tanks(id),
  
  -- Purchase Information (when movement_type = 'purchase')
  supplier_id INTEGER, -- Will reference suppliers table
  purchase_price_per_liter NUMERIC(10,4), -- Price per liter
  total_cost NUMERIC(10,2),
  supplier_invoice_number VARCHAR(100),
  
  -- Sale Information (when movement_type = 'sale')
  customer_id INTEGER REFERENCES customers(id),
  tank_id INTEGER REFERENCES water_tanks(id), -- Which tank was filled
  sale_price_per_liter NUMERIC(10,4),
  total_sale_amount NUMERIC(10,2),
  
  -- Additional Info
  notes TEXT,
  movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  
  -- Accounting Integration
  journal_entry_id INTEGER, -- References journal_entries(id)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SUPPLIERS MANAGEMENT
-- ==============================================================================

-- Suppliers table
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  supplier_type VARCHAR(50) NOT NULL, -- 'water_supplier', 'tank_supplier', 'equipment_supplier'
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  rfc VARCHAR(13),
  
  -- Payment Terms
  payment_terms VARCHAR(100), -- 'Contado', '15 días', '30 días'
  credit_limit NUMERIC(10,2) DEFAULT 0,
  current_balance NUMERIC(10,2) DEFAULT 0,
  
  -- Water Supplier Specific
  price_per_liter NUMERIC(10,4), -- For water suppliers
  minimum_order_liters INTEGER, -- Minimum order quantity
  delivery_schedule VARCHAR(100), -- 'Lunes y Jueves', 'Diario', etc.
  
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ENHANCED INVENTORY REQUESTS (Updated for Water Business)
-- ==============================================================================

-- Update existing inventory_requests table for water business
ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(50) DEFAULT 'water_tanks'; -- 'water_tanks', 'water_purchase', 'equipment'
ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS tank_type_id INTEGER; -- References water_tank_types(id)
ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS water_volume_liters INTEGER; -- For water purchases
ALTER TABLE inventory_requests ADD COLUMN IF NOT EXISTS supplier_id INTEGER; -- References suppliers(id)

-- ==============================================================================
-- DELIVERY TRACKING
-- ==============================================================================

-- Delivery Routes table
CREATE TABLE delivery_routes (
  id SERIAL PRIMARY KEY,
  route_name VARCHAR(100) NOT NULL,
  driver_name VARCHAR(100),
  vehicle_info VARCHAR(100),
  delivery_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  
  -- Route Statistics
  total_deliveries INTEGER DEFAULT 0,
  total_tanks_delivered INTEGER DEFAULT 0,
  total_tanks_collected INTEGER DEFAULT 0,
  
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Deliveries
CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES delivery_routes(id),
  customer_id INTEGER REFERENCES customers(id),
  
  -- Tank Information
  delivered_tank_id INTEGER REFERENCES water_tanks(id),
  collected_tank_id INTEGER REFERENCES water_tanks(id), -- Tank collected from customer
  
  -- Delivery Details
  delivery_address TEXT,
  delivery_instructions TEXT,
  delivery_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'rescheduled'
  
  -- Customer Interaction
  customer_signature VARCHAR(255), -- Path to signature image
  delivery_notes TEXT,
  customer_feedback TEXT,
  
  -- Financial
  delivery_charge NUMERIC(10,2) DEFAULT 0,
  payment_method VARCHAR(20), -- 'cash', 'transfer', 'credit'
  payment_received BOOLEAN DEFAULT false,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TANK LIFECYCLE TRACKING
-- ==============================================================================

-- Tank History (Track every movement of each tank)
CREATE TABLE tank_history (
  id SERIAL PRIMARY KEY,
  tank_id INTEGER REFERENCES water_tanks(id),
  action VARCHAR(50) NOT NULL, -- 'purchased', 'assigned', 'delivered', 'collected', 'cleaned', 'repaired', 'retired'
  customer_id INTEGER REFERENCES customers(id),
  delivery_id INTEGER REFERENCES deliveries(id),
  
  -- Location tracking
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  
  -- Condition tracking
  condition_before VARCHAR(20),
  condition_after VARCHAR(20),
  
  notes TEXT,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- ==============================================================================
-- WATER QUALITY CONTROL
-- ==============================================================================

-- Water Quality Tests
CREATE TABLE water_quality_tests (
  id SERIAL PRIMARY KEY,
  storage_tank_id INTEGER REFERENCES water_storage_tanks(id),
  test_date DATE DEFAULT CURRENT_DATE,
  test_type VARCHAR(50), -- 'bacteriological', 'chemical', 'physical', 'routine'
  
  -- Test Results
  ph_level NUMERIC(4,2),
  chlorine_level NUMERIC(6,3),
  bacteria_count INTEGER,
  turbidity NUMERIC(6,2),
  test_result VARCHAR(20) DEFAULT 'pending', -- 'passed', 'failed', 'pending'
  
  -- Certification
  tested_by VARCHAR(100),
  certification_number VARCHAR(100),
  certificate_path VARCHAR(255), -- Path to test certificate
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- VIEWS FOR EASY REPORTING
-- ==============================================================================

-- Tank Status Summary View
CREATE OR REPLACE VIEW tank_status_summary AS
SELECT 
  wtt.name as tank_type,
  COUNT(*) as total_tanks,
  COUNT(CASE WHEN wt.status = 'available' THEN 1 END) as available_tanks,
  COUNT(CASE WHEN wt.status = 'assigned' THEN 1 END) as assigned_tanks,
  COUNT(CASE WHEN wt.status = 'in_delivery' THEN 1 END) as in_delivery_tanks,
  COUNT(CASE WHEN wt.status = 'cleaning' THEN 1 END) as cleaning_tanks,
  COUNT(CASE WHEN wt.status = 'damaged' THEN 1 END) as damaged_tanks
FROM water_tanks wt
JOIN water_tank_types wtt ON wt.tank_type_id = wtt.id
GROUP BY wtt.name;

-- Water Inventory Summary View
CREATE OR REPLACE VIEW water_inventory_summary AS
SELECT 
  wst.tank_name,
  wst.capacity_liters,
  wst.current_volume_liters,
  wst.minimum_level_liters,
  ROUND((wst.current_volume_liters::NUMERIC / wst.capacity_liters * 100), 2) as fill_percentage,
  CASE 
    WHEN wst.current_volume_liters <= wst.minimum_level_liters THEN 'critical'
    WHEN wst.current_volume_liters <= (wst.minimum_level_liters * 1.5) THEN 'low'
    WHEN wst.current_volume_liters >= (wst.capacity_liters * 0.9) THEN 'full'
    ELSE 'normal'
  END as level_status
FROM water_storage_tanks wst;

-- ==============================================================================
-- SEED DATA FOR WATER BUSINESS
-- ==============================================================================

-- Insert default water tank types
INSERT INTO water_tank_types (name, capacity_liters, purchase_price, replacement_cost, deposit_amount, description) VALUES
('Garrafón 20L Estándar', 20, 150.00, 180.00, 50.00, 'Garrafón estándar de 20 litros para uso doméstico'),
('Garrafón 10L Pequeño', 10, 120.00, 140.00, 30.00, 'Garrafón pequeño de 10 litros para oficinas'),
('Garrafón 20L Premium', 20, 200.00, 230.00, 60.00, 'Garrafón premium con mejor material y diseño');

-- Insert default water storage tanks
INSERT INTO water_storage_tanks (tank_name, capacity_liters, current_volume_liters, minimum_level_liters, location) VALUES
('Tanque Principal', 10000, 8000, 2000, 'Planta Principal'),
('Tanque Reserva', 5000, 3000, 1000, 'Planta Principal'),
('Tanque Emergencia', 2000, 1500, 500, 'Planta Principal');

-- Insert default suppliers
INSERT INTO suppliers (name, supplier_type, contact_person, phone, address, price_per_liter, minimum_order_liters, delivery_schedule) VALUES
('Agua Pura del Valle', 'water_supplier', 'María González', '222-123-4567', 'Av. Industrial 123, Puebla', 0.50, 5000, 'Lunes, Miércoles, Viernes'),
('Proveedora de Garrafones SA', 'tank_supplier', 'Carlos Martínez', '222-987-6543', 'Zona Industrial Norte, Puebla', NULL, NULL, 'Por pedido'),
('Equipos y Sistemas de Agua', 'equipment_supplier', 'Ana López', '222-555-0123', 'Blvd. Atlixco 456, Puebla', NULL, NULL, 'Por pedido');

-- ==============================================================================
-- INDEXES FOR WATER INVENTORY
-- ==============================================================================

-- Tank tracking indexes
CREATE INDEX idx_water_tanks_tank_id ON water_tanks(tank_id);
CREATE INDEX idx_water_tanks_status ON water_tanks(status);
CREATE INDEX idx_water_tanks_customer ON water_tanks(assigned_customer_id);

-- Water movement indexes
CREATE INDEX idx_water_movements_type ON water_movements(movement_type);
CREATE INDEX idx_water_movements_date ON water_movements(movement_date);
CREATE INDEX idx_water_movements_customer ON water_movements(customer_id);

-- Tank history indexes
CREATE INDEX idx_tank_history_tank ON tank_history(tank_id);
CREATE INDEX idx_tank_history_action ON tank_history(action);
CREATE INDEX idx_tank_history_date ON tank_history(action_date);

-- Delivery indexes
CREATE INDEX idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_date ON deliveries(delivery_time);

-- ==============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================================

-- Update water storage tank levels automatically
CREATE OR REPLACE FUNCTION update_storage_tank_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the storage tank's current volume
  UPDATE water_storage_tanks 
  SET current_volume_liters = current_volume_liters + NEW.volume_liters
  WHERE id = NEW.storage_tank_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storage_tank_level
  AFTER INSERT ON water_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_tank_level();

-- Update tank status when assigned to customer
CREATE OR REPLACE FUNCTION update_tank_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If tank is assigned to customer, update status
  IF NEW.assigned_customer_id IS NOT NULL AND OLD.assigned_customer_id IS NULL THEN
    NEW.status = 'assigned';
    NEW.assigned_date = CURRENT_TIMESTAMP;
    
    -- Log the assignment in tank history
    INSERT INTO tank_history (tank_id, action, customer_id, notes, created_by)
    VALUES (NEW.id, 'assigned', NEW.assigned_customer_id, 'Tank assigned to customer', 1);
  END IF;
  
  -- If tank is unassigned, update status
  IF NEW.assigned_customer_id IS NULL AND OLD.assigned_customer_id IS NOT NULL THEN
    NEW.status = 'available';
    NEW.assigned_date = NULL;
    
    -- Log the return in tank history
    INSERT INTO tank_history (tank_id, action, customer_id, notes, created_by)
    VALUES (NEW.id, 'returned', OLD.assigned_customer_id, 'Tank returned from customer', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tank_status
  BEFORE UPDATE ON water_tanks
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_status();

-- ==============================================================================
-- ACCOUNTING INTEGRATION
-- ==============================================================================

-- Add water-specific accounts to chart of accounts
INSERT INTO chart_of_accounts (code, name, type, category, group_name) VALUES
-- Assets
('1006', 'Inventario - Garrafones', 'asset', 'Activos Circulantes', 'Inventarios'),
('1007', 'Inventario - Agua', 'asset', 'Activos Circulantes', 'Inventarios'),
('1008', 'Depósitos de Garrafones por Cobrar', 'asset', 'Activos Circulantes', 'Cuentas por Cobrar'),

-- Liabilities
('2004', 'Depósitos de Garrafones por Pagar', 'liability', 'Pasivos Circulantes', 'Depósitos de Clientes'),
('2005', 'Proveedores - Agua', 'liability', 'Pasivos Circulantes', 'Cuentas por Pagar'),
('2006', 'Proveedores - Garrafones', 'liability', 'Pasivos Circulantes', 'Cuentas por Pagar'),

-- Revenue
('4004', 'Ingresos por Venta de Agua', 'revenue', 'Ingresos', 'Ventas'),
('4005', 'Ingresos por Servicios de Entrega', 'revenue', 'Ingresos', 'Servicios'),
('4006', 'Ingresos por Depósitos de Garrafones', 'revenue', 'Ingresos', 'Otros Ingresos'),

-- Expenses
('5007', 'Costo de Agua Comprada', 'expense', 'Costo de Ventas', 'Costos Directos'),
('5008', 'Gastos de Entrega', 'expense', 'Gastos', 'Gastos Operativos'),
('5009', 'Mantenimiento de Garrafones', 'expense', 'Gastos', 'Gastos Operativos'),
('5010', 'Pérdidas por Garrafones Dañados', 'expense', 'Gastos', 'Gastos Operativos')
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- SAMPLE DATA FOR TESTING
-- ==============================================================================

-- Sample water tanks (you can add these after implementing the system)
-- INSERT INTO water_tanks (tank_id, tank_type_id, purchase_date, purchase_price, condition, status) VALUES
-- ('GAR001', 1, CURRENT_DATE, 150.00, 'new', 'available'),
-- ('GAR002', 1, CURRENT_DATE, 150.00, 'new', 'available'),
-- ('GAR003', 2, CURRENT_DATE, 120.00, 'new', 'available');

-- ==============================================================================
-- END OF WATER INVENTORY SCHEMA
-- ==============================================================================

