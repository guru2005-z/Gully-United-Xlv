import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(120),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, "Add a subject.").max(120),
  message: z.string().trim().min(10, "Tell us a little more.").max(1500),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;

const contactMessages: Array<ContactMessageInput & { status: "new"; createdAt: string }> = [];

export async function submitContactMessage(input: ContactMessageInput) {
  const parsed = contactMessageSchema.parse(input);
  contactMessages.push({ ...parsed, status: "new", createdAt: new Date().toISOString() });
}
