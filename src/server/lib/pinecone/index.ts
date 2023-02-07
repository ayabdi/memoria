import { env } from "@/env/server.mjs";
import { ServerMessageType } from "@/types/messages.schema";
import got, { HTTPError } from "got";
import {
  PineconeSaveVector,
  PineconeVectorSearch,
  PineconeVectorSearchFilter,
  PineconeVectorSearchResponse,
  PineconeVectorSearchResponseSchema,
} from "./schema";

const apiKey = env.PINECONE_API_KEY;

const pinecone = got.extend({
  prefixUrl: "https://memoria-784c8ba.svc.us-east1-gcp.pinecone.io/",
  headers: {
    "Content-Type": "application/json",
    "API-Key": apiKey,
  },
});
const catchError = (e: any) => {
  if (e instanceof HTTPError) {
    throw new Error(e.message);
  }
  throw e;
};

export const saveVector = async (
  message: ServerMessageType,
  values: number[],
  namespace: "conversation" | "regular"
) => {
  const body: PineconeSaveVector = {
    namespace,
    vectors: [
      {
        id: message.id,
        values: values,
        namespace,
        metadata: {
          content: message.content,
          type: message.type,
          from: message.from,
          userId: message.userId,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          tags: message.tags.map((t) => t.tag.tagName),
        },
      },
    ],
  };
  const response = await pinecone.post("vectors/upsert", { json: body }).json().catch(catchError);
  return response;
};

export const searchVectors = async (
  values: number[],
  namespace: "conversation" | "regular",
  limit: number,
  filter?: PineconeVectorSearchFilter
) => {
  const body: PineconeVectorSearch = {
    vector: values,
    filter,
    topK: limit,
    namespace,
    includeMetadata: true,
  };

  const response = await pinecone
    .post("query", { json: body })
    .json<PineconeVectorSearchResponse>()
    .catch(catchError);
  return PineconeVectorSearchResponseSchema.parse(response);
};

export const deleteVector = async (ids: string, namespace: string) => {
  const response = await pinecone
    .delete(`vectors/delete?namespace=${namespace}&ids=${ids}`)
    .json()
    .catch(catchError);
  return response;
};

// do edit vector
