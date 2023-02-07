import {
  createMessageEmbedding,
  executePrompt,
  createChatLog,
} from "@/server/services/chatbot.service";
import { router, publicProcedure } from "../trpc";
import {
  CreateMessageSchema,
  DeleteMessageSchema,
  EditMessageSchema,
  GetMessagesSchema,
  MessageSchema,
} from "@/types/messages.schema";
import {
  createMessage,
  deleteMessage,
  editMessage,
  formatMessage,
  getMessages,
} from "@/server/services/messages.service";
import { getTags } from "@/server/services/tags.services";
import { deleteVector } from "@/server/lib/pinecone";
import { gptEmbedding } from "@/server/lib/openai";

export const messageRouter = router({
  createMessage: publicProcedure.input(CreateMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    const response = await createMessage({ ...input }, userId);
    if (input.type !== "prompt") await createMessageEmbedding(formatMessage(response), "memories");

    return formatMessage(response);
  }),
  executePrompt: publicProcedure.input(MessageSchema).mutation(async ({ ctx, input }) => {
    const user = ctx.session?.user || null;
    if (!user?.id) throw new Error("User not logged in");

    const prompt = input.content.replace("@chat", "");
    const promptVector = await gptEmbedding(prompt);
    await createChatLog(prompt, user.id, user?.name ?? user?.email ?? "User");

    const response = await executePrompt(promptVector, user);

    const message = {
      content: response,
      type: "regular",
      from: "Memoria Bot",
      tags: [{ tagName: "Bot", color: "rgba(54, 162, 235, 1)" }],
    };

    const result = await createMessage(message, user.id);
    await createChatLog(response, user.id, "Memoria Bot");

    return result;
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

  deleteMessage: publicProcedure.input(DeleteMessageSchema).mutation(async ({ ctx, input }) => {
    const user = ctx.session?.user || null;
    if (!user?.id) throw new Error("User not logged in");

    await deleteVector(input.id, "memories");

    return await deleteMessage(input.id);
  }),

  editMessage: publicProcedure.input(EditMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error("User not logged in");

    return await editMessage(input, userId);
  }),
});
