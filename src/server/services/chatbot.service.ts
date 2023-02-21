import { gptCompletion, gptEmbedding } from "../lib/openai";
import { MessageSchema } from "@/types/messages.schema";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";
import { z } from "zod";

export const SimilarConversationsResponseSchema = z.object({
  id: z.string(),
  summary: z.string(),
  createdAt: z.date().optional(),
  similarity: z.number(),
});
export type SimilarConversationsResponse = z.infer<typeof SimilarConversationsResponseSchema>;

export const executePrompt = async (prompt: number[], user: User, conversationId: string) => {
  const conversation = conversationId ? await fetchConversation(conversationId) : null;
  const recentMessages =
    conversation?.messages
      .slice(-5)
      .map((m) => `${m.from}: ${m.content.replace("@chat ", "")}`)
      .join("\n\n") || "";

  const similarConversations = await fetchSimilarConversations(prompt, 5, 0.5, user.id);
  console.log(similarConversations);
  const template = openFile("prompt_response.txt");

  const fullPrompt = template
    .replace("<<NOTES>>", conversation?.summary || "")
    .replace("<<CONVERSATION>>", recentMessages)
    .replace(
      "<<MEMORIES>>",
      similarConversations
        .map((c, idx) => `${idx + 1}. ${c.summary} \n Date: ${c.createdAt}`)
        .join("\n")
    );

  console.log(fullPrompt);
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

const fetchSimilarConversations = async (
  queryVector: number[],
  limit: number,
  threshold: number,
  userId: string
) => {
  // semantic search using vector dot product similarity
  // done with the help of the pgvector extension ->
  const result = (await prisma.$queryRawUnsafe(
    `SELECT id, "createdAt", summary, (vector <#> '[${queryVector.toString()}]') as similarity
    FROM "Conversation"
    WHERE "userId" = '${userId}' AND vector IS NOT NULL AND (vector <#> '[${queryVector.toString()}]') < ${threshold * -1}
    ORDER by vector <#> '[${queryVector.toString()}]'
    LIMIT ${limit}`
  )) as any[];

  return result.map((r: any) => SimilarConversationsResponseSchema.parse(r));
};

const saveVector = async (conversationId: string, vector: number[]) => {
  // use raw query to update vector
  return await prisma.$queryRawUnsafe(
    `UPDATE "Conversation" SET vector = '[${vector.toString()}]' WHERE id = '${conversationId}'`
  );
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
  
  console.log(prompt)
  const summary = await createCompletion(prompt, user);
      console.log(summary)
  const summaryVector = await gptEmbedding(summary);
  saveVector(conversationId, summaryVector);

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
