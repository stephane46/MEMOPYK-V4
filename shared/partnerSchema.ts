import { z } from "zod";

export const PartnerIntakeSchema = z.object({
  partner_name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  website: z.string().optional().default(""),
  address: z.object({
    street: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    postal_code: z.string().optional().default(""),
    country: z.string().min(2).max(2), // ISO-2
  }),
  services: z.array(z.enum(["Photo", "Video", "Film", "Audio"])).min(1),
  photo_formats: z.array(z.string()).optional().default([]),
  video_formats: z.array(z.string()).optional().default([]),
  film_formats: z.array(z.string()).optional().default([]),
  audio_formats: z.array(z.string()).optional().default([]),
  output: z.array(z.string()).optional().default([]),
  turnaround: z.string().optional().default(""),
  rush: z.boolean().optional().default(false),
  languages: z.array(z.string()).optional().default([]),
  consent_listed: z.boolean(),
  notes: z.string().optional().default(""),
  locale: z.enum(["fr", "en"]).default("fr"),
  csrfToken: z.string().min(8),
});

export type PartnerIntake = z.infer<typeof PartnerIntakeSchema>;
