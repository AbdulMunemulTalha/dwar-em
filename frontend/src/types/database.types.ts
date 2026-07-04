// Database Types for Supabase

export type UserRole = 'admin' | 'owner' | 'tenant';

export type PropertyType = 'single_owner' | 'multi_owner';

export type UnitStatus = 'occupied' | 'vacant' | 'available_for_rent';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type PaymentMethod = 'gateway' | 'manual_screenshot';

export type PaymentStatus = 'pending_approval' | 'approved' | 'failed';

export type DueStatus = 'due' | 'paid' | 'overdue';

export type TenancyStatus = 'active' | 'ended';

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'cancelled';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  language_pref: 'en' | 'bn';
  created_at: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  created_by: string;
  created_at: string;
}

export interface PropertyOwner {
  property_id: string;
  user_id: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  rent_amount: number;
  service_charge_amount: number;
  status: UnitStatus;
  description: string | null;
}

export interface Listing {
  id: string;
  unit_id: string;
  photos: string[];
  price: number;
  description: string;
  is_published: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
}

export interface Tenancy {
  id: string;
  unit_id: string;
  tenant_user_id: string;
  start_date: string;
  rent_amount: number;
  deposit_amount: number;
  status: TenancyStatus;
}

export interface Due {
  id: string;
  unit_id: string;
  tenancy_id: string;
  period_month: string;
  amount: number;
  due_date: string;
  status: DueStatus;
}

export interface Payment {
  id: string;
  due_id: string;
  amount: number;
  method: PaymentMethod;
  screenshot_url: string | null;
  gateway_txn_id: string | null;
  status: PaymentStatus;
  approved_by: string | null;
  approved_at: string | null;
}

export interface Expense {
  id: string;
  property_id: string;
  description: string;
  amount: number;
  added_by: string;
  date: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  prospective_tenant_id: string;
  proposed_move_in_date: string;
  status: BookingStatus;
  deposit_payment_id: string | null;
}

export interface LeaseAgreement {
  id: string;
  booking_id: string;
  terms_snapshot: Record<string, any>;
  tenant_agreed_at: string | null;
  owner_agreed_at: string | null;
  pdf_url: string | null;
}

export interface Inquiry {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export interface Issue {
  id: string;
  tenancy_id: string;
  description: string;
  photo_url: string | null;
  status: IssueStatus;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_property_id: string | null;
  timestamp: string;
}