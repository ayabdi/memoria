
import { Message, Tag, TagsOnMessages } from "@prisma/client";
import { z } from "zod";

export interface MessageType extends Message {
    tags: (TagsOnMessages & {
        tag: Tag;
    })[];
}

export const CreateTagSchema = z.object({
    color: z.string(),
    tagName: z.string(),
    tagId: z.string().optional(),
})
export const CreateMessageSchema = z.object({
    content: z.string(),
    type: z.string(),
    tags: z.array(CreateTagSchema).optional(),
})
export const EditMessageSchema = z.object({
    content: z.string(),
    type: z.string(),
    tags: z.array(CreateTagSchema).optional(),
    messageId: z.string(),
})
export const GetMessagesSchema = z.object({
    page: z.number().optional(),
    tagId: z.string().optional(),
}).optional()

export type EditMessageSchema = z.infer<typeof EditMessageSchema>;
export type GetMessagesSchema = z.infer<typeof GetMessagesSchema>;
export type CreateTagSchema = z.infer<typeof CreateTagSchema>;
export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;