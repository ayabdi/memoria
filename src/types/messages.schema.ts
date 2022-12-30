import { z } from "zod";

export const CreateMessageSchema = z.object({
    text: z.string()
})

export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;