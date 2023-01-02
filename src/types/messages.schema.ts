import { z } from "zod";

export const NewTagSchema = z.object({
    color: z.string(),
    tagName: z.string(),
    type: z.literal("new")
})
export const ExistingTagSchema = z.object({
    tagId: z.string(),
    type: z.literal("existing")
})

export const CreateMessageSchema = z.object({
    text: z.string(),
    tags: z.array(NewTagSchema.or(ExistingTagSchema)).optional(),
})

export type NewTag = z.infer<typeof NewTagSchema>;
export type ExistingTag = z.infer<typeof ExistingTagSchema>;
export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;