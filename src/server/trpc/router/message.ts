
import { router, publicProcedure } from "../trpc";
import { CreateMessageSchema } from "@/types/messages.schema";

export const messageRouter = router({
    createMessage: publicProcedure.input(CreateMessageSchema).mutation(({ ctx, input }) => {
        return ctx.prisma.message.create({
            data: {
                ...input,
                userId: ctx.session?.user?.id!,
            },
        });
    }),
    allMessages: publicProcedure.query(({ ctx }) => {
        return ctx.prisma.message.findMany({
            where: {
                userId: ctx.session?.user?.id!,
            },
        });
    }),
});
