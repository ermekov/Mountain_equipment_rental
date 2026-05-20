export type Locale = "ru" | "kk" | "en";
export type ActivitySlug = "skiing" | "snowboard" | "hiking" | "camping" | "climbing" | "trekking";
export type SizeType = "ski_length" | "boot_size" | "clothing" | "none";
export type Gender = "male" | "female" | "unisex";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentMethod = "kaspi_qr" | "card";

export interface Category {
  id: number; slug: string; icon: string;
  name_ru: string; name_kk: string; name_en: string;
}

export interface EquipmentSize {
  value: string; label: string; description_ru?: string;
}

export interface Equipment {
  id: number; slug: string; category_id: number;
  name_ru: string; name_kk: string; name_en: string;
  description_ru: string; description_kk: string; description_en: string;
  price_per_day: number; deposit: number; stock: number;
  image_url: string; images: string[]; tags: string[];
  sizes: EquipmentSize[]; size_type: SizeType;
  gender: Gender;
  is_featured: boolean; avg_rating: number | null; review_count: number;
  category?: Category;
}

export interface User {
  id: number; phone: string; name: string;
  email: string | null; role: string; created_at: string;
}

export interface BookingItemData {
  id: number; equipment_id: number;
  equipment_name: string; equipment_image: string;
  quantity: number; size: string | null;
  price_per_day: number; subtotal: number;
}

export interface Booking {
  id: number; booking_number: string; user_id: number;
  user?: { id: number; name: string; phone: string };
  items: BookingItemData[];
  start_date: string; end_date: string; days: number;
  total_price: number; status: BookingStatus;
  payment_method: string | null; kaspi_order_id: string | null;
  confirmed_at: string | null; created_at: string;
}

export interface CartItem {
  equipment_id: number; equipment: Equipment;
  quantity: number; size: string | null;
  days: number; subtotal: number;
}

export interface CartStateData {
  items: CartItem[];
  start_date: string;
  end_date: string;
}

export interface Review {
  id: number; rating: number; comment: string; created_at: string;
  user: { id: number; name: string };
  equipment_id: number; booking_id: number | null;
}

export interface RecommendationItem {
  id: number; slug: string;
  name_ru: string; name_kk: string; name_en: string;
  image_url: string; price_per_day: number; stock: number;
  recommendation_reason: string; score: number;
  tags: string[]; category?: Category;
}

export interface RecommendationResponse {
  activity: string | null; temperature: number | null;
  weather: string | null; city: string | null;
  items: RecommendationItem[];
}
