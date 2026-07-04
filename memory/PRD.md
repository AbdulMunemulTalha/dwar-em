# Dwar - Rental & Building Management App - Product Requirements Document

## 🎯 Vision
A mobile app for Bangladesh serving property owners/landlords and tenants with digital ledger, payment tracking, and rental management. Designed to replace the traditional paper ledger (khata) with digital trust.

## 👥 Target Users
1. **Owners/Landlords** - Individual property owners and multi-owner building committees
2. **Tenants** - Active renters with a lease
3. **Prospective Renters** - Browsing without account
4. **Admins** - Platform operators

## 🛠️ Tech Stack
- **Frontend**: Expo SDK 54 + React Native + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **State**: Zustand
- **Navigation**: Expo Router (file-based)
- **Push**: Firebase Cloud Messaging (configured)
- **Payment**: Manual/screenshot for v1 (SSLCommerz/ShurjoPay for v2)

## ✅ Phase 1 - Foundation (COMPLETED)

### Authentication
- Email/password signup with role selection (Owner/Tenant)
- Login with persistent session
- Auth context with Zustand state management
- Protected routing based on user role
- Sign out functionality

### Owner Dashboard
- Statistics cards: Total Units, Occupied, Total Due, Overdue
- Properties list with empty states
- Pull-to-refresh
- Tab navigation: Dashboard, Properties, Expenses, Profile

### Design System
- Complete paper-ledger inspired theme
- Colors: paper (#F7F8F4), ink (#1B211F), ledger-teal (#0E5C4C)
- Status colors: paid-green, due-amber, overdue-red
- Consistent spacing scale (8pt grid)
- Reusable Button, Input, StatusBar components

### Database Schema (Supabase)
- 14 tables with complete Row-Level Security (RLS)
- Helper functions for auto-generating monthly dues
- Overdue status update function
- Proper indexes for performance

### Firebase FCM Configuration
- Android google-services.json
- iOS GoogleService-Info.plist
- App.json plugin setup
- Ready for push notification implementation

## 🚧 Phase 2 - Core Owner Features (NEXT)

- [ ] Add Property flow (single/multi-owner)
- [ ] Add Units to Property
- [ ] Property detail screen with unit list
- [ ] Unit detail with ledger view (status bars)
- [ ] Manual payment approval flow
- [ ] Screenshot upload for payments
- [ ] Stamp animation on approval
- [ ] Shared expense log
- [ ] CSV/PDF export

## 🚧 Phase 3 - Tenant Features
- [ ] Tenant dashboard
- [ ] Pay rent (screenshot upload)
- [ ] Payment history
- [ ] Issue reporting

## 🚧 Phase 4 - Rental Discovery
- [ ] Public listings browse
- [ ] Search and filter
- [ ] Listing detail
- [ ] Favorites
- [ ] In-app messaging

## 🚧 Phase 5 - Booking & Lease
- [ ] Request to book flow
- [ ] Digital lease agreements
- [ ] Deposit handling

## 🚧 Phase 6 - Admin Dashboard
- [ ] Account provisioning
- [ ] Moderation queue
- [ ] Audit logging
- [ ] Aggregate stats

## 🚧 Phase 7 - Push Notifications
- [ ] Due date reminders
- [ ] Payment approval notifications
- [ ] Booking updates

## 📱 Test Credentials

See `/app/memory/test_credentials.md` for detailed credentials.

**Note**: Users must be created via signup flow. Supabase schema must be executed first (see `/app/SUPABASE_SETUP.md`).

## 🔑 Setup Required

### CRITICAL: Before First Test

1. **Execute Supabase Schema**:
   - Go to https://ixifovzqctqummuzxtnm.supabase.co
   - Navigate to SQL Editor
   - Copy contents of `/app/supabase_schema.sql`
   - Execute the query
   - Verify all 14 tables were created

2. **Disable Email Confirmation** (for testing):
   - Go to Authentication > Providers > Email
   - Disable "Confirm email"

## 🎨 Design Highlights

- **Ledger Row Pattern**: Left-edge colored status bars (4px)
- **Tabular Numerals**: For financial columns alignment
- **Trust Design**: Clean paper white, soft ink black, teal accent
- **Empty States**: Invitations, not apologies
- **Card-based Layout**: 10px radius, soft shadows on active only

## 🌐 Live Preview
https://flat-manage-2.preview.emergentagent.com
