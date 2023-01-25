import { createMessageEmbedding, executePrompt } from "@/server/services/chatbot";
import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema, EditMessageSchema, GetMessagesSchema, type ServerMessageType } from "@/types/messages.schema";
import { extractAfterDate, extractBeforeDate, extractDuringDate, extractSearchTermFromSearchString as extractSearchTerm, extractTagsFromSearchTerm as extractTags } from "@/utils/common";
import { z } from "zod";

export const messageRouter = router({
  createMessage: publicProcedure
    .input(CreateMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { content, type, from } = input;

      const userId = ctx.session?.user?.id || null;
      if (!userId) throw new Error('User not logged in');

      const tagsToAdd = input.tags?.map((tag) => {
        if (tag.id) return { tag: { connect: { id: tag.id } } };
        return {
          tag: { create: { tagName: tag.tagName, color: tag.color, userId } },
        };
      });

      const result = await ctx.prisma.message.create({
        data: {
          content,
          type,
          userId,
          from,
          ...(tagsToAdd?.length && { tags: { create: tagsToAdd } }),
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        }
      });
      
      if (type !=='prompt') await createMessageEmbedding(result);
      return result;
    }),
  executePrompt: publicProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prompt } = input;
      const user = ctx.session?.user || null;
      if (!user) throw new Error('User not logged in');

      const response = await executePrompt(prompt, user);

      return await ctx.prisma.message.create({
        data: {
          content: response,
          type: 'regular',
          userId: user.id,
          from: 'bot',
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        }
      });
    }),

  allMessages: publicProcedure
    .input(GetMessagesSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id || null;
      if (!userId) throw new Error('User not logged in');

      const page = input?.page || 1;
      const take = 40;
      const skip = (page - 1) * take;

      const tagNames = extractTags(input?.searchTerm) || [];
      const searchTerm = extractSearchTerm(input?.searchTerm) || "";

      const during = extractDuringDate(input?.searchTerm);
      const after = extractAfterDate(input?.searchTerm);
      const before = extractBeforeDate(input?.searchTerm);


      let result = await ctx.prisma.message.findMany({
        take,
        skip,
        where: {
          userId,
          content: {
            contains: searchTerm,
            mode: 'insensitive',
          },
          ...tagNames?.length && {
            tags: {
              some: {
                tag: {
                  tagName: {
                    in: tagNames,
                  },
                },
              },
            },
          },
          createdAt: {
            ...(during && {
              gte: new Date(during)
            }),
            ...(after && {
              gte: new Date(after),
            }),
            ...(before && {
              lte: new Date(before),
            })
          }

        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // return only resuts that match all tags. The query above will return results that match any tag
      result = result.filter((message) => {
        const messageTags = message.tags.map((tag) => tag.tag.tagName);
        return tagNames.every((tag) => messageTags.includes(tag));
      });

      return formatResult(result).reverse();
    }),

  allTags: publicProcedure.query(({ ctx }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error('User not logged in');

    return ctx.prisma.tag.findMany({
      where: {
        userId
      },
    });
  }),

  deleteMessage: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    // delete all tag links
    await ctx.prisma.tagsOnMessages.deleteMany({
      where: {
        messageId: input,
      },
    });
    return await ctx.prisma.message.delete({
      where: {
        id: input,
      },
    });
  }),

  editMessage: publicProcedure.input(EditMessageSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session?.user?.id || null;
    if (!userId) throw new Error('User not logged in');

    const tagsToAdd = input.tags?.map((tag) => {
      if (tag.id) return { tag: { connect: { id: tag.id } } };
      return {
        tag: { create: { tagName: tag.tagName, color: tag.color, userId } },
      };
    });
    // reset tags
    await ctx.prisma.tagsOnMessages.deleteMany({
      where: {
        messageId: input.id,
      },
    });

    const result = await ctx.prisma.message.update({
      where: {
        id: input.id,
      },
      data: {
        content: input.content,
        type: input.type,
        ...(tagsToAdd?.length && { tags: { create: tagsToAdd } }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
    return formatResult([result])[0];
  }),
});


const formatResult = (result: ServerMessageType[]) => {
  return result.map((message) => {
    return {
      ...message,
      tags: message.tags.map((tag) => tag.tag),
    };
  });
}