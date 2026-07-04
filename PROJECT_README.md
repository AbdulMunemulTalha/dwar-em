# Dwar - Rental & Building Management App

## 🎯 Project Overview

A mobile application for Bangladesh serving property owners/landlords and tenants with:
- **Digital ledger system** for rent management
- **Payment tracking** (manual/screenshot uploads)
- **Shared expense transparency** for multi-owner buildings
- **Property & unit management**
- **Tenant issue reporting**

**Design Philosophy**: Paper ledger (khata) replacement with digital trust

---

## 📱 Tech Stack

### Frontend
- **Framework**: Expo SDK 54 + React Native
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: Expo Router (file-based routing)
- **UI Components**: React Native Elements
- **Styling**: StyleSheet with design system (theme.ts)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (for screenshots/photos)
- **Row-Level Security**: Enabled on all tables

### Push Notifications
- **Service**: Firebase Cloud Messaging (FCM)
- **Status**: Configured, implementation pending

---

## 🏗️ Architecture

### File Structure
```
/app/frontend/
├── app/                          # Expo Router screens
│   ├── (owner)/                  # Owner role screens (tab navigation)
│   │   ├── _layout.tsx          # Tab navigator
│   │   ├── dashboard.tsx        # Main dashboard
│   │   ├── properties.tsx       # Properties list
│   │   ├── expenses.tsx         # Shared expenses
│   │   └── profile.tsx          # Profile & settings
│   ├── auth/
│   │   ├── login.tsx            # Login screen
│   │   └── signup.tsx           # Signup screen
│   ├── _layout.tsx              # Root layout with AuthProvider
│   └── index.tsx                # Entry point (auth routing)
├── src/
│   ├── components/
│   │   └── common/              # Reusable components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── StatusBar.tsx    # Ledger-style status indicators
│   ├── config/
│   │   ├── supabase.ts         # Supabase client
│   │   └── theme.ts            # Design system (colors, typography, spacing)
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication provider
│   ├── store/
│   │   └── authStore.ts        # Zustand auth state
│   ├── types/
│   │   └── database.types.ts   # TypeScript types for DB
│   └── utils/
│       └── storage/            # Secure storage abstraction
├── google-services.json        # Firebase Android config
├── GoogleService-Info.plist    # Firebase iOS config
├── app.json                    # Expo configuration
└── .env                        # Environment variables
```

### Database Schema (Supabase)

**14 Tables**:
1. `users` - User profiles (linked to auth.users)
2. `properties` - Building/property details
3. `property_owners` - Many-to-many ownership
4. `units` - Individual rental units
5. `listings` - Public rental listings
6. `tenancies` - Active tenant-unit relationships
7. `dues` - Monthly rent/service charges
8. `payments` - Payment records
9. `expenses` - Shared building expenses
10. `bookings` - Rental booking requests
11. `lease_agreements` - Digital lease contracts
12. `inquiries` - Messages between renters and owners
13. `issues` - Tenant-reported maintenance issues
14. `audit_log` - Admin action tracking

**Row-Level Security (RLS)**: All tables protected with policies ensuring:
- Owners only see their properties/units/payments
- Tenants only see their own tenancies/dues/issues
- Public can only see approved listings
- Admin access requires audit logging

---

## 🎨 Design System

### Color Palette
```
Paper: #F7F8F4     → App background (clean paper white)
Ink: #1B211F       → Primary text (soft black)
Ledger Teal: #0E5C4C → Brand accent (buttons, links)

Status Colors (left-edge bars):
Paid Green: #2E9C6B
Due Amber: #D98A2B
Overdue Red: #BE4438
```

### Typography
- **Font**: Inter (system fallback for now)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)
- **Tabular numerals** for financial amounts

### Layout Principles
- 8pt grid spacing (8, 16, 24, 32, 48px)
- 10px card radius, 8px button radius
- Minimum touch targets: 48px
- Status bars: 4px left-edge colored indicators
- Soft shadows on active cards only

### Signature Interaction
**Payment Approval Stamp**: When an owner approves a payment, a stamp animation appears on the ledger row (to be implemented - currently just updates status)

---

## 🚀 Current Implementation Status

### ✅ Completed (Phase 1)

1. **Foundation**
   - Expo project setup with TypeScript
   - Supabase integration with secure token storage
   - Firebase FCM configuration (Android + iOS)
   - Design system (theme.ts)
   - Environment variables (.env)

2. **Authentication**
   - Email/password signup & login
   - Role-based user creation (owner/tenant)
   - Persistent sessions with SecureStore
   - Auth context with Zustand
   - Protected routing

3. **Owner Dashboard**
   - Statistics cards (total units, occupied, due, overdue)
   - Properties list
   - Empty states
   - Pull-to-refresh
   - Tab navigation (Dashboard, Properties, Expenses, Profile)

4. **UI Components**
   - Button (primary, secondary, outline variants)
   - Input (with left/right icons, error states)
   - StatusBar (colored indicators for due status)

5. **Database Schema**
   - Complete SQL schema with 14 tables
   - RLS policies for all tables
   - Indexes for performance
   - Helper functions (auto-generate dues, update overdue)

6. **Profile Screen**
   - User avatar
   - Email display
   - Menu items (Settings, Help, About)
   - Sign out functionality

### 🔄 In Progress / Next Steps

**Phase 2: Owner Core Features**
- [ ] Add property screen (create new property)
- [ ] Property detail screen (view units, stats)
- [ ] Add unit screen
- [ ] Unit detail screen (view dues, payments)
- [ ] Manual payment approval flow
- [ ] Screenshot upload for payments
- [ ] Shared expense log (add/view)
- [ ] CSV/PDF export of ledger
- [ ] Stamp animation on payment approval

**Phase 3: Tenant Features**
- [ ] Tenant dashboard
- [ ] Pay rent (screenshot upload)
- [ ] Payment history
- [ ] Issue reporting (text + photo)

**Phase 4: Rental Discovery (Deferred)**
- [ ] Public listing search/browse
- [ ] Listing detail page
- [ ] Favorites
- [ ] Inquiry messaging
- [ ] Request-to-book flow

**Phase 5: Booking System (Deferred)**
- [ ] Accept/decline bookings
- [ ] Digital lease agreement
- [ ] Deposit handling

**Phase 6: Admin Dashboard (Deferred)**
- [ ] Account provisioning
- [ ] Aggregate statistics
- [ ] Listings moderation
- [ ] Audit log viewer

**Phase 7: Notifications**
- [ ] FCM push notification setup
- [ ] Due date reminders
- [ ] Payment approval notifications
- [ ] Booking status updates

---

## 🔧 Setup Instructions

### Prerequisites
1. Node.js 20+
2. Yarn package manager
3. Expo CLI
4. Supabase account
5. Firebase account

### Installation

1. **Clone and Install Dependencies**
   ```bash
   cd /app/frontend
   yarn install
   ```

2. **Configure Supabase**
   - Create project at https://supabase.com
   - Copy project URL and anon key to `.env`
   - Execute `/app/supabase_schema.sql` in Supabase SQL Editor
   - Disable email confirmation: Auth > Email Auth > Disable confirmations

3. **Configure Firebase**
   - Create project at https://firebase.google.com
   - Add Android app (package: com.dwar.dwar)
   - Add iOS app (bundle: com.dwar.dawar)
   - Download config files (already in project)
   - Enable Cloud Messaging

4. **Start Development Server**
   ```bash
   sudo supervisorctl restart expo
   ```

5. **Test the App**
   - Scan QR code with Expo Go app
   - Or open web preview at https://flat-manage-2.preview.emergentagent.com

### First-Time Setup

1. Create an owner account via signup
2. Go to Supabase SQL Editor
3. Run seed data (see SUPABASE_SETUP.md)
4. Login and explore dashboard

---

## 🧪 Testing

### Test Accounts
See `/app/memory/test_credentials.md` for test credentials.

**Owner Account**:
- Email: owner@test.com
- Password: test123

### Manual Testing Checklist

#### Authentication
- [ ] Signup with owner role
- [ ] Signup with tenant role
- [ ] Login with valid credentials
- [ ] Login error handling
- [ ] Logout
- [ ] Session persistence (close/reopen app)

#### Owner Dashboard
- [ ] Stats cards display correct data
- [ ] Empty state shows when no properties
- [ ] Pull-to-refresh updates data
- [ ] Properties list shows owned properties
- [ ] Navigation tabs work correctly

#### UI/UX
- [ ] All touch targets ≥ 48px
- [ ] Keyboard handling on forms
- [ ] Loading states visible
- [ ] Error messages clear
- [ ] Status colors match design system

---

## 🐛 Known Issues

1. **Supabase Node Version Warning**: Supabase SDK prefers Node 22+, we're using compatible older version (2.45.4)
2. **Stamp Animation**: Not yet implemented - just status updates
3. **Bangla Language**: English only in v1, Bangla deferred to v2
4. **SMS OTP**: Not implemented - email/password only

---

## 🔐 Security Considerations

1. **Row-Level Security**: All Supabase tables have RLS enabled
2. **Secure Storage**: Auth tokens stored in Expo SecureStore
3. **Environment Variables**: Sensitive keys in .env (not committed)
4. **Input Validation**: Client-side validation on all forms
5. **Protected Routes**: Auth required for owner/tenant screens

---

## 📚 Key Dependencies

```json
{
  "@supabase/supabase-js": "2.45.4",
  "zustand": "5.0.14",
  "expo-notifications": "0.32.17",
  "expo-device": "8.0.10",
  "expo-image-picker": "17.0.11",
  "expo-file-system": "19.0.23",
  "react-native-elements": "3.4.3",
  "expo-router": "6.0.24",
  "expo-secure-store": "15.0.8"
}
```

---

## 🎯 MVP Success Criteria

- [x] User signup and login working
- [x] Owner dashboard showing stats
- [x] Properties list (empty state)
- [x] Basic navigation (tabs)
- [ ] Add property functionality
- [ ] Add units to property
- [ ] Manual payment approval flow
- [ ] Ledger view with status indicators

---

## 📝 Notes for Future Development

### Payment Gateway Integration
- SSLCommerz or ShurjoPay requires merchant account
- Implement via Supabase Edge Functions (keep keys server-side)
- Handle webhooks for auto-approval
- Transaction fee handling (2-3%)

### Image Uploads
- Use Supabase Storage buckets
- Convert to base64 for preview
- Implement compression for mobile
- Handle upload progress

### Performance Optimization
- Use FlashList for long lists
- Implement pagination for dues/payments
- Cache dashboard stats
- Optimize Supabase queries with proper indexes

### Accessibility
- Add screen reader support
- Ensure contrast ratios
- Test with larger text sizes
- Implement reduced motion settings

---

## 🙋 Support

For issues or questions:
1. Check SUPABASE_SETUP.md for database setup
2. Review test_credentials.md for test accounts
3. Check supervisor logs: `sudo supervisorctl tail expo stdout`
4. Verify RLS policies in Supabase dashboard
