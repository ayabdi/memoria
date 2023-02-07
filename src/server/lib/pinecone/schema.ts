import { z } from "zod";

export const PineconeMetadataSchema = z.object({
  content: z.string(),
  type: z.string(),
  from: z.string(),
  userId: z.string().optional(),
  createdAt: z.string(),
  tags: z.array(z.string()).optional(),
});

export const PineconeVectorSchema = z.object({
  id: z.string(),
  values: z.array(z.number()),
  namespace: z.enum(["conversation_notes", "memories"]),
  metadata: PineconeMetadataSchema,
});
export const PineConeSearchFilterSchema = z.object({
  content: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.date().optional(),
});

export const PineconeVectorSearchSchema = z.object({
  vector: z.array(z.number()),
  filter: PineConeSearchFilterSchema.optional(),
  topK: z.number(),
  namespace: z.enum(["conversation_notes", "memories"]),
  includeMetadata: z.boolean().optional(),
  includeVectors: z.boolean().optional(),
});

export const PineconeSaveVectorSchema = z.object({
  vectors: z.array(PineconeVectorSchema),
  namespace: z.string(),
});

export const PineconeVectorSearchResponseSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      metadata: PineconeMetadataSchema,
    })
  ),
  namespace: z.string(),
});

export type PineconeVector = z.infer<typeof PineconeVectorSchema>;
export type PineconeVectorSearch = z.infer<typeof PineconeVectorSearchSchema>;
export type PineconeVectorSearchResponse = z.infer<typeof PineconeVectorSearchResponseSchema>;
export type PineconeSaveVector = z.infer<typeof PineconeSaveVectorSchema>;
export type PineconeMetadata = z.infer<typeof PineconeMetadataSchema>;
export type PineconeVectorSearchFilter = z.infer<typeof PineConeSearchFilterSchema>;
