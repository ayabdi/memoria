import { gptCompletion, gptEmbedding } from "../lib/openai";
import { ServerMessageType } from "@/types/messages.schema";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";
import { saveVector, searchVectors } from "../lib/pinecone";
import { PineconeMetadata } from "../lib/pinecone/schema";

export const executePrompt = async (prompt: number[], user: User) => {
  const messagesVectors = await searchVectors(prompt, "message", 10);
  const messageMemories = messagesVectors.matches
    .map((m) => combined(formatConversation(m.metadata), m.metadata.createdAt, m.metadata.tags))
    .join("\n\n");

  const conversationsVectors = await searchVectors(prompt, "conversation", 10);
  const conversationMemories = conversationsVectors.matches
    .map((m) => combined(formatConversation(m.metadata), m.metadata.createdAt))
    .join("\n\n");

  const templateFile = path.join(
    process.cwd(),
    "src",
    "server",
    "lib",
    "openai",
    "templates",
    "prompt_template.txt"
  );
  const template = readFileSync(templateFile, "utf8");

  const fullPrompt = template
    .replace("<<MEMORIES>>", messageMemories)
    .replace("<<CONVERSATION>>", conversationMemories);

  const response = await createCompletion(fullPrompt, user);

  return response;
};

export const createEmbedding = async (
  message: ServerMessageType,
  namespace: "conversation" | "message"
) => {
  const { content, tags } = message;

  const input = combined(
    content,
    new Date(),
    tags?.map((t) => t.tag.tagName)
  );
  const vector = await gptEmbedding(input);
  await saveVector(message, vector, namespace);

  return vector;
};

export const createChatEmbedding = async (message: string, from: string, userId: string) => {
  const vector = await gptEmbedding(`${from}: ${message}`);
  await prisma.chatLogs.create({
    data: {
      content: message,
      from,
      vector,
      userId,
    },
  });

  return vector;
};

export const createCompletion = async (prompt: string, user: User) => {
  const stop = [`${user.email}:`, "MEMORIA_BOT:"];
  const result = await gptCompletion(prompt, stop);

  return result;
};

const formatConversation = (m: PineconeMetadata) => {
  return `${m.from}: ${m.content}`;
};

const combined = (content: string, createdAt: Date, tagNames?: string[]) => {
  return `${content} ${
    tagNames?.length ? `\nTags: ${tagNames.join(", ")}` : ""
  } \nDate: ${createdAt}`;
};
