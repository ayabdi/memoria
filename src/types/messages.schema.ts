
import { z } from "zod";

export const CreateTagSchema = z.object({
    color: z.string(),
    tagName: z.string(),
    tagId: z.string().optional(),
})
export const CreateMessageSchema = z.object({
    text: z.string(),
    tags: z.array(CreateTagSchema).optional(),
})

export type CreateTagSchema = z.infer<typeof CreateTagSchema>;
export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;