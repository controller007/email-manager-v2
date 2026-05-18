// app/_lib/validations/email.ts
import { z } from "zod";

export const contactListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100),
  description: z.string().max(500).optional(),
  emails: z.array(z.string().email()).min(1, "At least one email is required"),
  domainId: z.string().min(1, "Domain is required"),
  contacts: z
    .array(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .optional(),
});

export const emailComposeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Email body is required"),
  contactListId: z.string().min(1, "Contact list is required"),
  senderId: z.string().min(1, "Sender is required"),
  preheader: z.string().max(150).optional(),
});

export const bulkEmailInputSchema = z.object({
  emails: z.string().min(1, "Please enter email addresses"),
});

export type ContactListFormData = z.infer<typeof contactListSchema>;
export type EmailComposeFormData = z.infer<typeof emailComposeSchema>;
export type BulkEmailInputData = z.infer<typeof bulkEmailInputSchema>;
