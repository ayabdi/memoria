
import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema } from "@/types/messages.schema";

export const messageRouter = router({
    createMessage: publicProcedure.input(CreateMessageSchema).mutation(({ ctx, input }) => {
        const name = ctx.session?.user?.name!
        const userId = ctx.session?.user?.id!

        const tagsToAdd = input.tags?.map((tag) => {
            // If the tag is an existing tag, connect to it, otherwise create a new one
            if (tag.type === 'existing') return { tag: { connect: { id: tag.tagId } } }
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

    allMessages: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.message.findMany({
            where: {
                userId: ctx.session?.user?.id!,
            },
            include: {
                tags: {
                    include: {
                        tag: true,
                    },
                },
        },
        });
    }),
});
