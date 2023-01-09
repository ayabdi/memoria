
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

export type CreateTagSchema = z.infer<typeof CreateTagSchema>;
export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;