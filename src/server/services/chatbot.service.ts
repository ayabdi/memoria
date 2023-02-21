import { gptCompletion, gptEmbedding } from "../lib/openai";
import {  MessageSchema} from "@/types/messages.schema";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";
import { getSimilarMessages } from "./messages.service";

export const executePrompt = async (prompt: number[], user: User, conversationId: string) => {
  const conversation = conversationId ? await fetchConversation(conversationId) : null;
  const recentMessages =
    conversation?.messages
      .slice(-5)
      .map((m) => `${m.from}: ${m.content.replace("@chat ", "")}`)
      .join("\n\n") || "";

  const templateFile = path.join(
    process.cwd(),
    "src",
    "server",
    "templates",
    "prompt_response.txt"
  );
  const template = readFileSync(templateFile, "utf8");

  const fullPrompt = template
    .replace("<<NOTES>>", conversation?.summary || "")
    .replace("<<CONVERSATION>>", recentMessages);

  const response = await createCompletion(fullPrompt, user);

  return response;
};

const fetchConversation = async (conversationId: string) => {
  return await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
};

export const createConversation = async (user: User, messages: MessageSchema[]) => {
  const res = await prisma.conversation.create({
    data: {
      userId: user.id,
      summary: "",
      messages: {
        connect: messages.map((m) => ({ id: m.id })),
      },
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return res;
};

export const updateConversation = async (
  conversationId: string,
  messages: MessageSchema[],
  user: User
) => {
  const conversation = await fetchConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const template = openFile(
    conversation.summary ? "update_conversation_notes.txt" : "create_conversation_notes.txt"
  );
  const prompt = template
    .replace(
      "<<INPUT>>",
      messages.map((m) => `${m.from}: ${m.content.replace("@chat ", "")}`).join("\n\n")
    )
    .replace("<<NOTES>>", conversation.summary)
    .replaceAll("<<USER>>", user.name ?? user.email ?? "USER");

  const summary = await createCompletion(prompt, user);

  const res = await prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      summary,
      messages: {
        connect: messages.map((m) => ({ id: m.id })),
      },
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return res;
};

export const createCompletion = async (prompt: string, user: User) => {
  const stop = [`${user.name ?? user.email}:`, "MEMORIA_BOT:"];
  const result = await gptCompletion(prompt, stop);

  return result;
};

const combined = (content: string, createdAt: Date, tagNames?: string[]) => {
  return `${content} ${
    tagNames?.length ? `\nTags: ${tagNames.join(", ")}` : ""
  } \nDate: ${createdAt}`;
};

const openFile = (fileName: string) => {
  const templateFile = path.join(process.cwd(), "src", "server", "templates", fileName);

  return readFileSync(templateFile, "utf8");
};
