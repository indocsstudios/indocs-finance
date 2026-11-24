export interface TeamMember {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  email_verified: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface SessionUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: "admin" | "member";
}

export interface CompanySettings {
  id: number;
  company_name: string;
  company_tagline: string | null;
  company_email: string;
  company_phone: string;
  company_address: string;
  default_upi: string | null;
  logo_data_url: string | null;
  signer_name: string;
  signer_title: string;
  signature_data_url: string | null;
  gst_number: string | null;
  default_terms: string;
}

export interface ProjectEvent {
  id?: string;
  project_id?: string;
  event_name: string;
  event_date: string;
  day_label?: string | null;
  venue?: string | null;
  deliverables?: string | null;
  event_budget?: number | null;
  sort_order?: number;
}

export interface Project {
  id: string;
  receipt_number: string;
  receipt_type: string | null;
  category: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  project_title: string;
  purpose: string | null;
  original_amount: number | null;
  discount_amount: number | null;
  total_amount: number;
  advance_amount: number;
  advance_confirmed: boolean;
  advance_received_date: string | null;
  advance_received_by: string | null;
  final_payment_amount: number | null;
  final_payment_date: string | null;
  final_payment_received_by: string | null;
  booking_confirmed_date: string | null;
  settlement_date: string | null;
  payment_mode: string | null;
  payment_account: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project_events: ProjectEvent[];
}

export interface VendorBooking {
  id: string;
  project_id: string | null;
  vendor_name: string;
  role_service: string;
  phone: string | null;
  agreed_amount: number;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  project_id: string | null;
  vendor_booking_id: string | null;
  tx_type: "expense" | "income" | "transfer";
  category: string;
  title: string;
  amount: number;
  tx_date: string;
  paid_by: string | null;
  transfer_to: string | null;
  payment_mode: string | null;
  notes: string | null;
  proof_image_url: string | null;
  created_by: string | null;
  created_at: string;
}
