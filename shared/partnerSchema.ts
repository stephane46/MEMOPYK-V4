import { z } from "zod";

export const PartnerIntakeSchema = z.object({
  partner_name: z.string().min(2).max(120),
  email: z.string().email(),
  email_public: z.boolean().optional().default(false),
  phone: z.string().optional().default(""),
  website: z.string().optional().default(""),
  address: z.object({
    street: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    postal_code: z.string().optional().default(""),
    country: z.string().min(2).max(2), // ISO-2
  }),
  services: z.array(z.enum(["Photo", "Film"])).min(1),
  photo_formats: z.array(z.string()).optional().default([]),
  video_formats: z.array(z.string()).optional().default([]),
  film_formats: z.array(z.string()).optional().default([]),
  audio_formats: z.array(z.string()).optional().default([]),
  video_cassettes: z.array(z.string()).optional().default([]),
  other_photo_formats: z.string().max(120).optional().default(""),
  other_film_formats: z.string().max(120).optional().default(""),
  other_video_formats: z.string().max(120).optional().default(""),
  delivery: z.array(z.string()).optional().default([]),
  output: z.array(z.string()).optional().default([]),
  turnaround: z.string().optional().default(""),
  rush: z.boolean().optional().default(false),
  languages: z.array(z.string()).optional().default([]),
  consent_listed: z.boolean(),
  public_description: z.string().optional().default(""),
  locale: z.enum(["fr", "en"]).default("fr"),
  csrfToken: z.string().min(8),
}).refine((data) => {
  const hasFormats = 
    (data.photo_formats && data.photo_formats.length > 0) ||
    (data.film_formats && data.film_formats.length > 0) ||
    (data.video_cassettes && data.video_cassettes.length > 0);
  return hasFormats;
}, {
  message: "Au moins un format doit être sélectionné (photo, film, ou cassette vidéo)",
  path: ["photo_formats"],
});

export type PartnerIntake = z.infer<typeof PartnerIntakeSchema>;
