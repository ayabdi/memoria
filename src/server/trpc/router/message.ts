import { createConversation, executePrompt, updateConversation } from "@/server/services/chatbot.service";
import { router, publicProcedure } from "../trpc";
import {
  CreateMessageSchema,
  EditMessageSchema,
  GetMessagesSchema,
  MessageSchema,
} from "@/types/messages.schema";
import { z } from "zod";
import {
  saveVector,
  createMessage,
  deleteMessage,
  editMessage,
  getAllMesages,
  getMessages,
  getSimilarMessages,
} from "@/server/services/messages.service";
import { getTags } from "@/server/services/tags.services";
import { gptEmbedding } from "@/server/lib/openai";
import { formatMessage } from "@/utils/common";

export const messageRouter = router({
  createMessage: publicProcedure.input(CreateMessageSchema).mutation(async ({ ctx, input }) => {
    const user = ctx.session?.user || null;
    if (!user) throw new Error("User not logged in");

    const res = await createMessage(input, user.id);

    // if message is a chat and not part of an existing conversation, create a new one
    if (!input.conversationId && input.type === "chat") {
      const conversation = await createConversation(user, [formatMessage(res)]);
      return { ...res, conversationId: conversation.id };
    }

    return res;
  }),
  executePrompt: publicProcedure.input(MessageSchema).mutation(async ({ ctx, input }) => {
    const { content, conversationId } = input;
    const user = ctx.session?.user || null;
    if (!user) throw new Error("User not logged in");
    if (!conversationId) throw new Error("Conversation ID not provided");

    // create embedding vector for prompt
    const promptVector = await gptEmbedding(content.replace("@chat", ""));

    // execute prompt
    const response = await executePrompt(promptVector, user, conversationId);

    // create vector for response, no need to store in messages table
    const responseVector = await gptEmbedding(response);

    const message = {
      content: response,
      type: "chat",
      from: "Memoria Bot",
      vector: responseVector,
      conversationId,
      tags: [{ tagName: "Bot", color: "rgba(54, 162, 235, 1)" }],
    };

    const res = await createMessage(message, user.id);
    await updateConversation(conversationId, [input, formatMessage(res)], user);

    return res;
  }),

  allMessages: publicProcedure.input(GetMessagesSchema).query(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    return await getMessages(input, userId);
  }),

  allTags: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    return await getTags(userId);
  }),

  deleteMessage: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    return await deleteMessage(input);
  }),

  editMessage: publicProcedure.input(EditMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    return await editMessage(input, userId);
  }),
});
