# Dwar - Rental & Building Management App - PRD

## 🎯 Vision
A mobile app for Bangladesh replacing paper ledgers (khata) with digital trust for property owners and tenants.

## 🛠️ Tech Stack
- **Frontend**: Expo SDK 54 + React Native + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **State**: Zustand
- **Animations**: React Native Reanimated (for stamp animation)
- **Navigation**: Expo Router (file-based)
- **Push**: Firebase Cloud Messaging (configured)

## ✅ Phase 1 - Foundation (COMPLETED)

### Authentication
- Email/password signup with role selection (Owner/Tenant)
- Login with persistent session
- Auth context + Zustand state
- Role-based routing

### Design System
- Paper-ledger theme (paper #F7F8F4, ink #1B211F, ledger-teal #0E5C4C)
- Status colors: paid-green, due-amber, overdue-red
- 8pt grid spacing
- Reusable components

### Database
- 14-table Supabase schema
- Row-Level Security policies
- Helper functions for dues generation

## ✅ Phase 2 - Owner Core Features (COMPLETED)

### Property Management
- ✅ Properties list screen with unit count
- ✅ Add Property flow (single_owner / multi_owner)
- ✅ Property detail screen with stats
- ✅ Property info card showing address, type, unit counts

### Unit Management
- ✅ Add Unit modal (unit number, bedrooms, rent, service charge)
- ✅ Unit list within property detail
- ✅ Unit status indicators (occupied/vacant/available)
- ✅ Left-edge status bars (ledger design)

### Ledger & Payment Tracking
- ✅ Unit detail screen with ledger view
- ✅ Dues list with status colors
- ✅ Generate Due button for manual due creation
- ✅ Summary cards (Paid/Due/Overdue totals)
- ✅ Monthly period formatting

### Payment Flows
- ✅ **Log Manual Payment**: Owner records payment received
- ✅ **Approve Screenshot Payment**: Approve tenant-submitted payments
- ✅ **Stamp Animation**: Signature interaction - animated "PAID" stamp with haptic feedback when approving payments
- ✅ Payment approval modal with amount and method

### Shared Expenses
- ✅ Expenses list with total & monthly summaries
- ✅ Add expense modal with property selector
- ✅ Property-linked expense tracking
- ✅ Date & description display

## 🚧 Phase 3 - Tenant Features (NEXT)
- [ ] Tenant dashboard showing rent due
- [ ] Pay rent (screenshot upload)
- [ ] Payment history
- [ ] Issue reporting (text + photo)

## 🚧 Phase 4 - Rental Discovery
- [ ] Public listings browse
- [ ] Search and filter
- [ ] Favorites & inquiries

## 🚧 Phase 5 - Booking & Lease
- [ ] Request to book flow
- [ ] Digital lease agreements
- [ ] Deposit handling

## 🚧 Phase 6 - Admin & Notifications
- [ ] Admin dashboard
- [ ] Moderation queue
- [ ] FCM push notifications

## 📱 App Routes

```
/                           → Auth check, redirects to login or dashboard
/auth/login                 → Login screen
/auth/signup                → Signup with role selection

/(owner)/dashboard          → Owner main dashboard with stats
/(owner)/properties         → Properties list
/(owner)/properties/add     → Add new property
/(owner)/properties/[id]    → Property detail + units + add unit modal
/(owner)/units/[id]         → Unit ledger with dues, payments, stamp animation
/(owner)/expenses           → Shared expenses list + add expense
/(owner)/profile            → Profile & sign out
```

## 🎨 Signature Features

### Payment Stamp Animation
When approving a payment, a large circular "PAID" stamp thumps down with:
- Scale animation (0 → 1.3 → 1.0)
- Rotation shake (-5° → 5° → 0°)
- Haptic feedback on native devices
- Green paid color, amount display
- 1.5 second display, then auto-dismiss
- Reduced-motion friendly (uses opacity fade fallback)

### Ledger Rows with Status Bars
Each due/payment row has a 4px colored left-edge bar:
- Green (paid) → Amber (due) → Red (overdue)
- Matches paper receipt/khata design language

## 🔑 Setup Required

### CRITICAL: Execute Supabase Schema
Before signup can work, execute `/app/supabase_schema.sql` in Supabase Dashboard:

1. Go to https://ixifovzqctqummuzxtnm.supabase.co
2. SQL Editor → New Query
3. Paste contents of `/app/supabase_schema.sql`
4. Run
5. Also disable email confirmation: Auth > Providers > Email > Uncheck "Confirm email"

### Test Credentials (Create via signup after schema deploy)
- Email: owner@test.com
- Password: test123
- Role: Owner/Landlord

## 🌐 Live Preview
https://flat-manage-2.preview.emergentagent.com

## 📄 Files Created This Session
- `/app/frontend/app/(owner)/dashboard.tsx` - Main dashboard
- `/app/frontend/app/(owner)/properties/_layout.tsx` - Properties stack
- `/app/frontend/app/(owner)/properties/index.tsx` - Properties list
- `/app/frontend/app/(owner)/properties/add.tsx` - Add property
- `/app/frontend/app/(owner)/properties/[id].tsx` - Property detail + add unit
- `/app/frontend/app/(owner)/units/_layout.tsx` - Units stack
- `/app/frontend/app/(owner)/units/[id].tsx` - Unit ledger + payment approval
- `/app/frontend/app/(owner)/expenses.tsx` - Shared expenses
- `/app/frontend/app/(owner)/profile.tsx` - Profile
- `/app/frontend/src/components/common/StampAnimation.tsx` - PAID stamp animation
- `/app/supabase_schema.sql` - Complete DB schema
