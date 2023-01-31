import { CreateMessageSchema, EditMessageSchema, GetMessagesSchema, ServerMessageType } from "@/types/messages.schema";
import { extractAfterDate, extractBeforeDate, extractDuringDate, extractSearchTermFromSearchString as extractSearchTerm, extractTagsFromSearchTerm as extractTags } from "@/utils/common";
import { prisma } from "@/server/db/client";

export const createMessage = async (
    message: CreateMessageSchema, userId: string
) => {
    const { content, type, from, tags, vector } = message;
    const tagsToAdd = tags?.map((tag) => {
        if (tag.id) return { tag: { connect: { id: tag.id } } };
        return {
            tag: { create: { tagName: tag.tagName, color: tag.color, userId } },
        };
    });

    return await prisma.message.create({
        data: {
            content,
            type,
            userId,
            from,
            vector,
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
}

export const getMessages = async (
    query: GetMessagesSchema, userId: string
) => {
    const page = query?.page || 1;
    const take = 40;
    const skip = (page - 1) * take;

    const tagNames = extractTags(query?.searchTerm) || [];
    const searchTerm = extractSearchTerm(query?.searchTerm) || "";

    const during = extractDuringDate(query?.searchTerm);
    const after = extractAfterDate(query?.searchTerm);
    const before = extractBeforeDate(query?.searchTerm);


    let result = await prisma.message.findMany({
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
}

export const getAllMesages = async (
    userId: string
) => {
    const result = await prisma.message.findMany({
        where: {
            userId,
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
        }
    });
    return result;
}


export const editMessage = async (
    message: EditMessageSchema, userId: string
) => {
    const tagsToAdd = message.tags?.map((tag) => {
        if (tag.id) return { tag: { connect: { id: tag.id } } };
        return {
            tag: { create: { tagName: tag.tagName, color: tag.color, userId } },
        };
    });
    // reset tags
    await prisma.tagsOnMessages.deleteMany({
        where: {
            messageId: message.id,
        },
    });

    const result = await prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            content: message.content,
            type: message.type,
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
}

export const deleteMessage = async (
    messageId: string, userId: string
) => {
    // delete message - tag relations
    await prisma.tagsOnMessages.deleteMany({
        where: {
            messageId,
        },
    });

    return await prisma.message.delete({
        where: {
            id: messageId,
        },
    });
}

const formatResult = (result: ServerMessageType[]) => {
    return result.map((message) => {
        return {
            ...message,
            tags: message.tags.map((tag) => tag.tag),
        };
    });
}