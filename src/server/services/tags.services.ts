import { prisma } from "@/server/db/client";
import { Tag } from "@prisma/client";

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

  const uniqueTags = result.reduce((acc: Tag[], tag) => {
    if (!acc.find((t) => t.id === tag.tag.id)) {
      acc.push(tag.tag);
    }
    return acc;
  }, []);

  return uniqueTags;
};
