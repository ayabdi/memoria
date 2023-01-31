import { prisma } from "@/server/db/client";

export const getTags = async (userId: string) => {
    const result = await prisma.tagsOnMessages.findMany({
        where: {
            message: {
                userId,
            },
        },
        include: {
            tag: true,
        },
    });
    const tags = result.map((tag) => tag.tag);
    return tags;
}
