import type { Message, Tag, TagsOnMessages } from "@prisma/client";
import { z } from "zod";

export interface ServerMessageType extends Message {
  tags: (TagsOnMessages & {
    tag: Tag;
  })[];
}
// convert ServerMessageType to zod
export const ServerMessageSchema = z.object({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  content: z.string(),
  from: z.string(),
  type: z.string(),
  userId: z.string().optional(),
  tags: z
    .array(
      z.object({
        tag: z.object({
          id: z.string(),
          createdAt: z.date().optional(),
          updatedAt: z.date().optional(),
          tagName: z.string(),
          color: z.string(),
          userId: z.string().optional(),
        }),
        messageId: z.string(),
        tagId: z.string(),
      })
    )
    .optional(),
});

export const TagSchema = z.object({
  tagName: z.string(),
  color: z.string(),
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  userId: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  content: z.string(),
  from: z.string(),
  type: z.string(),
  userId: z.string().optional(),
  conversationId: z.string().optional().nullable(),
  tags: z.array(TagSchema).optional(),
});
export const GetMessagesSchema = z.object({
  page: z.number().optional(),
  searchTerm: z.string().optional(),
});

export const SimilarMessagesResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  similarity: z.number(),
  createdAt: z.date(),
});

export const CreateMessageSchema = MessageSchema.omit({ id: true });
export const EditMessageSchema = MessageSchema;

export const DeleteMessageSchema = MessageSchema;

export type TagSchema = z.infer<typeof TagSchema>;
export type MessageSchema = z.infer<typeof MessageSchema>;
export type EditMessageSchema = z.infer<typeof EditMessageSchema>;
export type GetMessagesSchema = z.infer<typeof GetMessagesSchema>;
export type CreateMessageSchema = z.infer<typeof CreateMessageSchema>;
export type DeleteMessageSchema = z.infer<typeof DeleteMessageSchema>;
export type SimilarMessagesResponseSchema = z.infer<typeof SimilarMessagesResponseSchema>;