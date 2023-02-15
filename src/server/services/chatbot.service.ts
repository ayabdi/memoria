import { gptCompletion, gptEmbedding } from "../lib/openai";
import { CreateMessageSchema, ServerMessageType } from "@/types/messages.schema";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";
import { getSimilarMessages } from "./messages.service";

export const executePrompt = async (prompt: number[], user: User) => {
  const [memories, conversations] = await Promise.all([
    getSimilarMessages(prompt, 10, 0.75, user.id),
    fetchConversations(user.id, 10),
  ]);

  const templateFile = path.join(
    process.cwd(),
    "src",
    "server",
    "templates",
    "prompt_response.txt"
  );
  const template = readFileSync(templateFile, "utf8");

  const fullPrompt = template
    .replace("<<MEMORIES>>", memories.map((m) => combined(m.content, m.createdAt)).join("\n\n"))
    .replace("<<CONVERSATION>>", conversations);

  console.log(fullPrompt);
  const response = await createCompletion(fullPrompt, user);

  return response;
};

const fetchConversations = async (userId: string, limit: number) => {
  const response = await prisma.chatLogs.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  const conversations = response
    .reverse()
    .map((c) => `${c.from}: ${c.content.replace("@chat", "")}`)
    .join("\n\n");
  return conversations;
};

export const createMessageEmbedding = async (message: CreateMessageSchema) => {
  const { content, tags } = message;

  const input = combined(
    content,
    new Date(),
    tags?.map((t) => t.tagName)
  );
  const vector = await gptEmbedding(input);

  return vector;
};

export const createChatEmbedding = async (message: string, from: string, userId: string) => {
  const vector = await gptEmbedding(`${from}: ${message}`);
  await prisma.chatLogs.create({
    data: {
      content: message,
      from,
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

export const loadChatLogs = async (prisma: PrismaClient, userId: string) => {
  return prisma.chatLogs.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const combined = (content: string, createdAt: Date, tagNames?: string[]) => {
  return `${content} ${
    tagNames?.length ? `\nTags: ${tagNames.join(", ")}` : ""
  } \nDate: ${createdAt}`;
};
