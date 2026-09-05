import { z } from "zod";
import { AVATAR_ALLOWED_MIME_TYPES, AVATAR_MAX_BYTES } from "@/lib/avatars/constants";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const profileSchema = z.object({
  display_name: z.string().min(1).max(120),
  weight_kg: z.number().positive().nullable().optional(),
  height_cm: z.number().positive().nullable().optional(),
  stride_length_cm: z.number().positive().nullable().optional(),
  daily_step_goal: z.number().int().positive(),
});

export const stepEntrySchema = z.object({
  steps: z.number().int().min(1, "Enter at least 1 step").max(100000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const challengeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  step_goal: z.number().int().min(0),
}).refine((d) => d.end_date >= d.start_date, { message: "End date must be after start date" });

export const messageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0),
  distance_km: z.number().min(0).optional(),
  calories: z.number().int().min(0).optional(),
  active_minutes: z.number().int().min(0).optional(),
});

export const avatarUploadFileSchema = z
  .instanceof(File, { message: "Invalid file" })
  .refine((file) => file.size <= AVATAR_MAX_BYTES, {
    message: "Image must be 2MB or smaller",
  })
  .refine(
    (file) => (AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type),
    { message: "Unsupported image type" }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
