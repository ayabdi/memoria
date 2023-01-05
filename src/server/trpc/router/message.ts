
import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema } from "@/types/messages.schema";
import { z } from "zod";
export const messageRouter = router({
    createMessage: publicProcedure.input(CreateMessageSchema).mutation(({ ctx, input }) => {
        const name = ctx.session?.user?.name!
        const userId = ctx.session?.user?.id!

        const tagsToAdd = input.tags?.map((tag) => {
            console.log(tag)
            if (tag.tagId) return { tag: { connect: { id: tag.tagId } } }
            return { tag: { create: { tagName: tag.tagName, color: tag.color, userId } } }
        })

        return ctx.prisma.message.create({
            data: {
                text: input.text,
                userId,
                from: name,
                ...(tagsToAdd?.length && { tags: { create: tagsToAdd } })
            },
        });
    }),

    allMessages: publicProcedure.input(z.object({ page: z.number().optional(), tagId: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
        const page = input?.page || 1
        const take = 40
        const skip = (page - 1) * take

        const result = await ctx.prisma.message.findMany({
            take,
            skip,
            where: {
                userId: ctx.session?.user?.id!,
                tags: {
                    some: {
                        tagId: input?.tagId,
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
        return result.reverse();
    }),
    messagesByTag: publicProcedure.input(z.object({ tagId: z.string().optional(), page: z.number().optional() }))
        .query(async ({ ctx, input }) => {
            if(!input.tagId) return []
            const page = input.page || 1
            const take = 40
            const skip = (page - 1) * take

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
            return result.reverse();
        }),

    allTags: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.tag.findMany({
            where: {
                userId: ctx.session?.user?.id,
            },
        });
    }),
});
