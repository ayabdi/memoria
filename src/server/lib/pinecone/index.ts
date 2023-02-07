import { env } from "@/env/server.mjs";
import { ServerMessageType } from "@/types/messages.schema";
import got, { HTTPError } from "got";
import {
  PineconeMetadata,
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
  id: string,
  metadata: PineconeMetadata,
  values: number[],
  namespace: "memories"
) => {
  const body: PineconeSaveVector = {
    namespace,
    vectors: [
      {
        id,
        values: values,
        namespace,
        metadata,
      },
    ],
  };
  const response = await pinecone.post("vectors/upsert", { json: body }).json().catch(catchError);
  return response;
};

export const searchVectors = async (
  values: number[],
  namespace: "memories",
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
