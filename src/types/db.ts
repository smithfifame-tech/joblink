// Types des lignes de la base. Peuvent être régénérés avec : npm run db:types
export type AppRole = "client" | "worker" | "admin";
export type JobStatus =
  | "draft" | "published" | "reviewing" | "assigned" | "in_progress" | "completed" | "cancelled" | "disputed";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type ContractStatus = "pending_acceptance" | "in_progress" | "submitted" | "completed" | "cancelled" | "disputed";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded";
export type PayType = "fixed" | "hourly" | "daily";
export type WorkMode = "on_site" | "remote";
export type Availability = "available" | "busy" | "unavailable";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country_code: string;
  city: string | null;
  neighborhood: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: "fr" | "en";
  notify_email: boolean;
  notify_new_jobs: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  first_name: string;
  last_initial: string;
  avatar_url: string | null;
  city: string | null;
  neighborhood: string | null;
  account_type: AppRole | null;
  headline: string | null;
  is_verified: boolean | null;
  rating_avg: number | null;
  rating_count: number | null;
  completed_jobs_count: number | null;
  availability: Availability | null;
  rate_min: number | null;
  rate_max: number | null;
  rate_unit: PayType | null;
  created_at: string;
}

export interface WorkerProfile {
  user_id: string;
  headline: string | null;
  experience_years: number | null;
  experiences: string | null;
  rate_min: number | null;
  rate_max: number | null;
  rate_unit: PayType;
  travel_radius_km: number;
  availability: Availability;
  availability_notes: string | null;
  portfolio_urls: string[];
  is_verified: boolean;
  show_on_map: boolean;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Job {
  id: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string;
  skills_required: string[];
  budget_amount: number;
  currency: string;
  pay_type: PayType;
  allow_price_proposal: boolean;
  start_date: string;
  deadline: string;
  country_code: string;
  city: string;
  neighborhood: string;
  address: string | null;
  location: unknown;
  work_mode: WorkMode;
  workers_needed: number;
  status: JobStatus;
  published_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  is_hidden: boolean;
  moderation_note: string | null;
  applications_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicJob {
  id: string;
  client_id: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  category_icon: string;
  title: string;
  description: string;
  skills_required: string[];
  budget_amount: number;
  currency: string;
  pay_type: PayType;
  allow_price_proposal: boolean;
  start_date: string;
  deadline: string;
  country_code: string;
  city: string;
  neighborhood: string;
  work_mode: WorkMode;
  workers_needed: number;
  status: JobStatus;
  published_at: string | null;
  applications_count: number;
  created_at: string;
  approx_lat: number | null;
  approx_lng: number | null;
  cover_image: string | null;
}

export interface JobSearchRow {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  category_name: string;
  category_icon: string;
  budget_amount: number;
  currency: string;
  pay_type: PayType;
  city: string;
  neighborhood: string;
  work_mode: WorkMode;
  status: JobStatus;
  deadline: string;
  start_date: string;
  workers_needed: number;
  applications_count: number;
  created_at: string;
  approx_lat: number | null;
  approx_lng: number | null;
  distance_km: number | null;
  cover_image: string | null;
  total_count: number;
}

export interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  cover_letter: string;
  proposed_amount: number | null;
  status: ApplicationStatus;
  decision_note: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  job_id: string;
  application_id: string;
  client_id: string;
  worker_id: string;
  agreed_amount: number;
  currency: string;
  status: ContractStatus;
  accepted_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  completion_note: string | null;
  proof_paths: string[];
  completed_at: string | null;
  created_at: string;
}

export interface ContractEvent {
  id: string;
  job_id: string;
  contract_id: string | null;
  actor_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  job_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  kind: "text" | "system";
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  contract_id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  provider_fee_amount: number;
  net_amount: number;
  currency: string;
  provider: string;
  provider_reference: string | null;
  checkout_url: string | null;
  idempotency_key: string;
  status: PaymentStatus;
  failure_reason: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  payout_status: "not_started" | "pending" | "completed" | "failed";
  payout_reference: string | null;
  payout_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  contract_id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  contract_id: string;
  job_id: string;
  opened_by: string;
  against_id: string;
  reason: string;
  details: string | null;
  status: "open" | "under_review" | "resolved_client" | "resolved_worker" | "closed";
  resolution_note: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "user" | "job" | "message" | "review";
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  resolution_note: string | null;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  document_type: string;
  document_path: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
