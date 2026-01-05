import { z } from "zod"


export const contactListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "List name is too long"),
  emails: z
    .array(z.string().email("Invalid email format"))
    .min(1, "At least one email is required")
    .max(1000, "Maximum 1000 emails per list"),
  domainId: z.string().min(1, "Domain selection is required"),
});

export const emailComposeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  body: z.string().min(1, "Email body is required"),
  contactListId: z.string().min(1, "Contact list selection is required"),
  senderId: z.string().min(1, "Sender selection is required"),
  sendMethod: z.enum(["transactional", "campaign"]).optional().default("transactional"),
});

export type ContactListFormData = z.infer<typeof contactListSchema>;
export type EmailComposeFormData = z.infer<typeof emailComposeSchema>;


export const bulkEmailInputSchema = z.object({
  emails: z.string().min(1, "Please enter email addresses"),
})


export type BulkEmailInputData = z.infer<typeof bulkEmailInputSchema>
