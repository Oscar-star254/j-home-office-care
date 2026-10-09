export type Role = 'admin' | 'customer' | 'employee';
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus =
  | 'awaiting_deposit' | 'requested' | 'accepted' | 'declined'
  | 'in_progress' | 'completed' | 'cancelled' | 'refund_due';

export interface Profile {
  id: string; role: Role; status: AccountStatus; full_name: string; email: string | null;
  phone: string | null; national_id_number: string | null; id_photo_path: string | null;
  id_submitted: boolean; avatar_url: string | null; bio: string | null; location: string | null;
  skills: string[]; rating_avg: number; rating_count: number; rejection_reason: string | null;
  created_at: string;
}
export interface Provider {
  id: string; full_name: string; avatar_url: string | null; bio: string | null;
  location: string | null; skills: string[]; rating_avg: number; rating_count: number;
}
export interface Service {
  id: string; slug: string; name: string; category: string; description: string;
  base_price: number; price_unit: string; price_note: string; featured: boolean;
  icon: string; sort_order: number; active: boolean;
}
export interface Booking {
  id: string; reference: string; customer_id: string; employee_id: string; service_id: string;
  status: BookingStatus; quantity: number; details: Record<string, any>; address: string;
  scheduled_date: string | null; scheduled_time: string | null; notes: string | null;
  estimated_price: number; deposit_amount: number; deposit_paid: boolean; created_at: string;
  services?: Service; customer?: Profile; employee?: Provider;
}
export interface Message { id: string; booking_id: string; sender_id: string; body: string; created_at: string; }
export interface PortfolioItem { id: string; title: string; description: string | null; category: string; image_path: string; created_at: string; }
export interface Notice { id: string; user_id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string; }
