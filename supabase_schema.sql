-- Rental & Building Management App - Complete Database Schema
-- This file should be executed in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'tenant')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  language_pref TEXT DEFAULT 'en' CHECK (language_pref IN ('en', 'bn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_owner', 'multi_owner')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Owners (many-to-many relationship)
CREATE TABLE IF NOT EXISTS property_owners (
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, user_id)
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  rent_amount DECIMAL(10, 2) NOT NULL,
  service_charge_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'available_for_rent')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, unit_number)
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  photos TEXT[] DEFAULT '{}',
  price DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenancies table
CREATE TABLE IF NOT EXISTS tenancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dues table
CREATE TABLE IF NOT EXISTS dues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL, -- Format: YYYY-MM
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'due' CHECK (status IN ('due', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  due_id UUID NOT NULL REFERENCES dues(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('gateway', 'manual_screenshot')),
  screenshot_url TEXT,
  gateway_txn_id TEXT,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'failed')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table (shared building expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  prospective_tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_move_in_date DATE NOT NULL,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'declined', 'cancelled')),
  deposit_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lease Agreements table
CREATE TABLE IF NOT EXISTS lease_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  terms_snapshot JSONB NOT NULL,
  tenant_agreed_at TIMESTAMP WITH TIME ZONE,
  owner_agreed_at TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues table (tenant-reported issues)
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow user creation" ON users FOR INSERT WITH CHECK (true);

-- Properties policies
CREATE POLICY "Owners can view their properties" ON properties FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = properties.id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create properties" ON properties FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their properties" ON properties FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = properties.id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Property Owners policies
CREATE POLICY "Owners can view property ownership" ON property_owners FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Owners can add co-owners" ON property_owners FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = property_owners.property_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Units policies
CREATE POLICY "Owners can view their units" ON units FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = units.property_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their unit" ON units FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.unit_id = units.id 
      AND tenancies.tenant_user_id = auth.uid()
      AND tenancies.status = 'active'
    )
  );

CREATE POLICY "Owners can manage units" ON units FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = units.property_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Listings policies (public read for approved listings)
CREATE POLICY "Anyone can view approved listings" ON listings FOR SELECT 
  USING (is_published = TRUE AND moderation_status = 'approved');

CREATE POLICY "Owners can manage their listings" ON listings FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM units 
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE units.id = listings.unit_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Tenancies policies
CREATE POLICY "Owners can view tenancies" ON tenancies FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM units 
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE units.id = tenancies.unit_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view own tenancy" ON tenancies FOR SELECT 
  USING (tenant_user_id = auth.uid());

CREATE POLICY "Owners can manage tenancies" ON tenancies FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM units 
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE units.id = tenancies.unit_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Dues policies
CREATE POLICY "Owners can view dues" ON dues FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM units 
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE units.id = dues.unit_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view own dues" ON dues FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = dues.tenancy_id 
      AND tenancies.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage dues" ON dues FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM units 
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE units.id = dues.unit_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Owners can view payments" ON payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM dues 
      JOIN units ON units.id = dues.unit_id
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE dues.id = payments.due_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view own payments" ON payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM dues 
      JOIN tenancies ON tenancies.id = dues.tenancy_id
      WHERE dues.id = payments.due_id 
      AND tenancies.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can submit payments" ON payments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dues 
      JOIN tenancies ON tenancies.id = dues.tenancy_id
      WHERE dues.id = payments.due_id 
      AND tenancies.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage payments" ON payments FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM dues 
      JOIN units ON units.id = dues.unit_id
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE dues.id = payments.due_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "Owners can view expenses" ON expenses FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = expenses.property_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can add expenses" ON expenses FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_owners 
      WHERE property_owners.property_id = expenses.property_id 
      AND property_owners.user_id = auth.uid()
    )
  );

-- Issues policies
CREATE POLICY "Owners can view issues" ON issues FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      JOIN units ON units.id = tenancies.unit_id
      JOIN property_owners ON property_owners.property_id = units.property_id
      WHERE tenancies.id = issues.tenancy_id 
      AND property_owners.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view own issues" ON issues FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = issues.tenancy_id 
      AND tenancies.tenant_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create issues" ON issues FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenancies 
      WHERE tenancies.id = issues.tenancy_id 
      AND tenancies.tenant_user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_property_owners_user_id ON property_owners(user_id);
CREATE INDEX idx_property_owners_property_id ON property_owners(property_id);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_listings_unit_id ON listings(unit_id);
CREATE INDEX idx_listings_moderation_status ON listings(moderation_status);
CREATE INDEX idx_tenancies_unit_id ON tenancies(unit_id);
CREATE INDEX idx_tenancies_tenant_user_id ON tenancies(tenant_user_id);
CREATE INDEX idx_tenancies_status ON tenancies(status);
CREATE INDEX idx_dues_unit_id ON dues(unit_id);
CREATE INDEX idx_dues_tenancy_id ON dues(tenancy_id);
CREATE INDEX idx_dues_status ON dues(status);
CREATE INDEX idx_dues_period_month ON dues(period_month);
CREATE INDEX idx_payments_due_id ON payments(due_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_issues_tenancy_id ON issues(tenancy_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-generate monthly dues for active tenancies
CREATE OR REPLACE FUNCTION generate_monthly_dues()
RETURNS void AS $$
DECLARE
  tenancy_record RECORD;
  current_month TEXT;
  next_due_date DATE;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  next_due_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
  
  FOR tenancy_record IN 
    SELECT t.id, t.unit_id, t.rent_amount, u.service_charge_amount
    FROM tenancies t
    JOIN units u ON u.id = t.unit_id
    WHERE t.status = 'active'
  LOOP
    -- Check if due already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM dues 
      WHERE tenancy_id = tenancy_record.id 
      AND period_month = current_month
    ) THEN
      INSERT INTO dues (unit_id, tenancy_id, period_month, amount, due_date, status)
      VALUES (
        tenancy_record.unit_id,
        tenancy_record.id,
        current_month,
        tenancy_record.rent_amount + COALESCE(tenancy_record.service_charge_amount, 0),
        next_due_date,
        'due'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update overdue status
CREATE OR REPLACE FUNCTION update_overdue_dues()
RETURNS void AS $$
BEGIN
  UPDATE dues 
  SET status = 'overdue'
  WHERE status = 'due' 
  AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
