import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema, EditMessageSchema, GetMessagesSchema, ServerMessageType } from "@/types/messages.schema";
import { Tag } from "@prisma/client";
import { z } from "zod";
export const messageRouter = router({
  createMessage: publicProcedure
    .input(CreateMessageSchema)
    .mutation(({ ctx, input }) => {
      const userId = ctx.session?.user?.id!;

      const tagsToAdd = input.tags?.map((tag) => {
        if (tag.id) return { tag: { connect: { id: tag.id } } };
        return {
          tag: { create: { tagName: tag.tagName, color: tag.color, userId } },
        };
      });

      return ctx.prisma.message.create({
        data: {
          content: input.content,
          type: input.type,
          userId,
          from: input.from,
          ...(tagsToAdd?.length && { tags: { create: tagsToAdd } }),
        },
      });
    }),

  allMessages: publicProcedure
    .input(GetMessagesSchema)
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const take = 40;
      const skip = (page - 1) * take;

      const result = await ctx.prisma.message.findMany({
        take,
        skip,
        where: {
          userId: ctx.session?.user?.id!,
          ...(input?.tagId && {
            tags: {
              some: {
                tagId: input?.tagId,
              },
            },
          }),
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
      return formatResult(result).reverse();
    }),
  messagesByTag: publicProcedure
    .input(GetMessagesSchema)
    .query(async ({ ctx, input }) => {
      if (!input?.tagId) return [];
      const page = input.page || 1;
      const take = 40;
      const skip = (page - 1) * take;

      const result = await ctx.prisma.message.findMany({
        take,
        skip,
        where: {
          userId: ctx.session?.user?.id!,
          tags: {
            some: {
              tagId: input.tagId,
            },
          },
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
      return formatResult(result).reverse();
    }),

  allTags: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.tag.findMany({
      where: {
        userId: ctx.session?.user?.id,
      },
    });
  }),

  deleteMessage: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.message.delete({
      where: {
        id: input,
      },
    });
  }),

  editMessage: publicProcedure.input(EditMessageSchema).mutation(async ({ ctx, input }) => {
    const tagsToAdd = input.tags?.map((tag) => {
      if (tag.id) return { tag: { connect: { id: tag.id } } };
      return {
        tag: { create: { tagName: tag.tagName, color: tag.color, userId: ctx.session?.user?.id! } },
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