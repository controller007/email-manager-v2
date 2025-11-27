import { z } from "zod"

export const contactListSchema = z.object({
  name: z.string().min(1, "Contact list name is required").max(100, "Name must be less than 100 characters"),
  emails: z
    .array(z.string().email("Invalid email address"))
    .max(100, "Maximum 100 emails allowed per list")
    .min(1, "At least one email is required"),
})


export const emailComposeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Email body is required"),
  contactListId: z.string().min(1, "Contact list is required"),
  senderId: z.string().min(1, "Sender is required"),
})

export const bulkEmailInputSchema = z.object({
  emails: z.string().min(1, "Please enter email addresses"),
})

export type ContactListFormData = z.infer<typeof contactListSchema>
export type EmailComposeFormData = z.infer<typeof emailComposeSchema>
export type BulkEmailInputData = z.infer<typeof bulkEmailInputSchema>
