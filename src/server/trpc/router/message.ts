import { createChatEmbedding, createMessageEmbedding, executePrompt } from "@/server/services/chatbot.service";
import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema, EditMessageSchema, GetMessagesSchema } from "@/types/messages.schema";
import { z } from "zod";
import { createMessage, deleteMessage, editMessage, getAllMesages, getMessages } from "@/server/services/messages.service";
import { getTags } from "@/server/services/tags.services";

export const messageRouter = router({
  createMessage: publicProcedure
    .input(CreateMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id || null;
      if (!userId) throw new Error('User not logged in');

      const vector = input.type !== 'prompt' ? await createMessageEmbedding(input) : [];

      return await createMessage({ ...input, vector }, userId);
    }),
  executePrompt: publicProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prompt } = input;
      const user = ctx.session?.user || null;
      if (!user) throw new Error('User not logged in');

      // get all all user messages
      const messages = await getAllMesages(user.id);

      // create embedding vector for prompt
      const promptVector = await createChatEmbedding(prompt, user.email ?? user.id, user.id);

      // execute prompt
      const response = await executePrompt(promptVector, messages, user);

      // create vector for response, no need to store in messages table
      await createChatEmbedding(response, 'MEMORIA_BOT', user.id);

      const message = {
        content: response,
        type: 'regular',
        from: 'Memoria Bot',
        tags: [{ tagName: 'Bot', color: 'rgba(54, 162, 235, 1)' }]
      }

      return await createMessage(message, user.id);
    }),

  allMessages: publicProcedure
    .input(GetMessagesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id || null;
      if (!userId) throw new Error('User not logged in');

      return await getMessages(input, userId);
    }),

  allTags: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error('User not logged in');

    return await getTags(userId)
  }),

  deleteMessage: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error('User not logged in');

    return await deleteMessage(input, userId);
  }),

  editMessage: publicProcedure.input(EditMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error('User not logged in');

    return await editMessage(input, userId)
  }),
});
