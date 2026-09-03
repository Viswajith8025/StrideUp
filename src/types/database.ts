export type UserRole = "user" | "admin";

export type ActivitySource = "manual" | "motion" | "import" | "reconciled";

export type ThemeMode = "system" | "dark" | "light";

export type AccentColor = "red" | "yellow" | "green" | "cyan" | "purple" | "pink";

export type DistanceUnit = "km" | "mi";
export type WeightUnit = "kg" | "lb";

export type ChallengeStatus = "upcoming" | "active" | "completed" | "cancelled";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  stride_length_cm: number | null;
  daily_step_goal: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  distance_km: number;
  calories: number;
  active_minutes: number;
  source: ActivitySource;
  created_at: string;
  updated_at: string;
}

export interface StepEvent {
  id: string;
  user_id: string;
  timestamp: string;
  steps: number;
  source: ActivitySource;
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  step_goal: number;
  created_by: string;
  status: ChallengeStatus;
  invite_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeMember {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChallengeDailySteps {
  id: string;
  challenge_id: string;
  user_id: string;
  date: string;
  steps: number;
}

export interface ChatRoom {
  id: string;
  challenge_id: string;
  name: string;
  created_at: string;
}

export interface ChatMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: Pick<Profile, "display_name" | "avatar_url">;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  theme: ThemeMode;
  accent_color: AccentColor;
  widget_theme: ThemeMode;
  distance_unit: DistanceUnit;
  weight_unit: WeightUnit;
  week_starts_on: number;
  notifications_enabled: boolean;
  daily_goal_notifications: boolean;
  challenge_notifications: boolean;
  chat_notifications: boolean;
  streak_notifications: boolean;
  step_counter_setup_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  challenge_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_steps: number;
  rank: number;
}

export interface PeriodStats {
  totalSteps: number;
  averageSteps: number;
  bestDay: { date: string; steps: number } | null;
  goalCompletionRate: number;
  dailyData: { date: string; steps: number; label: string }[];
}
