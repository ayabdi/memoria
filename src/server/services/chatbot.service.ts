import { gptCompletion, gptEmbedding } from "../lib/openai";
import { MessageSchema, ServerMessageType } from "@/types/messages.schema";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";
import { saveVector, searchVectors } from "../lib/pinecone";
import { PineconeMetadata } from "../lib/pinecone/schema";

export const executePrompt = async (prompt: number[], user: User) => {
  const messagesVectors = await searchVectors(prompt, "memories", 10);

  const memories = messagesVectors.matches
    .filter((m) => m.score > 0.70)
    .map((m, i) => {
      const count = i + 1;
      return `${count}. ${combined(m.metadata.content, m.metadata.createdAt, m.metadata.tags)}`;
    })
    .join("\n\n");

  const conversations = await getChatLogs(user.id, 10);

  const templateFile = path.join(
    process.cwd(),
    "src",
    "server",
    "templates",
    "prompt_template.txt"
  );
  const template = readFileSync(templateFile, "utf8");

  const fullPrompt = template
    .replace("<<MEMORIES>>", memories)
    .replace("<<CONVERSATION>>", conversations);

  const response = await createCompletion(fullPrompt, user);

  return response;
};

export const createMessageEmbedding = async (message: MessageSchema, namespace: "memories") => {
  const { content, tags } = message;

  const vector = await gptEmbedding(`${content} \n Tags: ${tags?.map((t) => t.tagName).join(" ")}`);

  const metadata: PineconeMetadata = {
    from: message.from,
    type: message.type,
    userId: message.userId,
    content,
    createdAt: new Date().toISOString(),
    tags: tags?.map((t) => t.tagName),
  };

  await saveVector(message.id, metadata, vector, namespace);

  return vector;
};

export const createCompletion = async (prompt: string, user: User) => {
  const stop = [`${user.name ?? user.email}:`, "Memoria Bot:"];
  const result = await gptCompletion(prompt, stop);

  return result;
};

export const createChatLog = async (message: string, userId: string, from: string) => {
  return await prisma.chatLogs.create({
    data: {
      content: message,
      from: from,
      userId,
    },
  });
};

export const getChatLogs = async (userId: string, limit: number) => {
  const response = await prisma.chatLogs.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return response
    .map((r) => `${r.from}: ${r.content}`)
    .reverse()
    .join("\n\n");
};

const combined = (content: string, createdAt: string, tagNames?: string[]) => {
  return `${content} ${
    tagNames?.length ? `\nTags: ${tagNames.join(", ")}` : ""
  } \nDate: ${createdAt}`;
};
