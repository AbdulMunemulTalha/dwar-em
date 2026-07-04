# Supabase Database Setup Instructions

## Step 1: Execute the Schema

1. Go to your Supabase project: https://ixifovzqctqummuzxtnm.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `/app/supabase_schema.sql`
5. Click **Run** to execute the schema

## Step 2: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see the following tables:
   - users
   - properties
   - property_owners
   - units
   - listings
   - tenancies
   - dues
   - payments
   - expenses
   - bookings
   - lease_agreements
   - inquiries
   - issues
   - audit_log

## Step 3: Test the Application

### Create a Test Owner Account

1. Open the app
2. Click "Sign up"
3. Fill in the form:
   - Role: Select "Owner/Landlord"
   - Name: Test Owner
   - Email: owner@test.com
   - Phone: 01712345678
   - Password: test123

4. After signup, login with the same credentials

### Expected Flow

1. **Dashboard** - You should see:
   - Stats cards showing 0 units, 0 occupied, 0 due, 0 overdue
   - Empty state with "No properties yet" message
   - "Add Property" button

2. **Navigation** - Bottom tabs should show:
   - Dashboard (home icon)
   - Properties (apartment icon)
   - Expenses (receipt icon)
   - Profile (person icon)

3. **Profile** - Should display:
   - User avatar
   - Email address
   - Settings menu items
   - Sign out button

## Step 4: Add Seed Data (Optional)

To test with sample data, run this in Supabase SQL Editor:

```sql
-- Insert a test owner user (make sure to use actual auth.users id)
-- This assumes you've created an owner account via signup

-- Get your user ID first
SELECT id, email FROM auth.users;

-- Then insert a property (replace YOUR_USER_ID with actual ID)
INSERT INTO properties (name, address, type, created_by)
VALUES ('Green Valley Apartments', 'House 23, Road 5, Dhanmondi, Dhaka', 'single_owner', 'YOUR_USER_ID');

-- Link property to owner
INSERT INTO property_owners (property_id, user_id)
SELECT id, 'YOUR_USER_ID' FROM properties WHERE name = 'Green Valley Apartments';

-- Add some units
INSERT INTO units (property_id, unit_number, bedrooms, rent_amount, service_charge_amount, status)
SELECT id, 'A-101', 2, 25000, 2000, 'occupied' FROM properties WHERE name = 'Green Valley Apartments';

INSERT INTO units (property_id, unit_number, bedrooms, rent_amount, service_charge_amount, status)
SELECT id, 'A-102', 3, 35000, 2500, 'vacant' FROM properties WHERE name = 'Green Valley Apartments';
```

## Troubleshooting

### "No properties showing"
- Check RLS policies are enabled
- Verify property_owners junction table has correct user_id
- Check browser console for errors

### "Can't create property"
- Ensure users table has your auth.users.id
- Check property_owners policies

### "Authentication errors"
- Verify .env file has correct Supabase URL and anon key
- Check Supabase Auth settings allow email/password signup
- Confirm email verification is disabled for testing (Supabase > Auth > Email Auth > Disable email confirmations)

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Owners can only see their own properties and units
- Tenants can only see their own tenancies and dues
- Public can only see approved, published listings
- Admin access requires audit logging (to be implemented)
