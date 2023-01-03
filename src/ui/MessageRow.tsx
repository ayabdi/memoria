import { useSession } from "next-auth/react";
import React from "react";
import Avatar from "react-avatar";
import { Message, TagsOnMessages, Tag } from "@prisma/client";

interface MessageRowProps {
  message: Message & {
    tags: (TagsOnMessages & {
      tag: Tag;
    })[];
  };
  hideLabels?: boolean;
  className?: string;
}

export const MessageRow = (props: MessageRowProps) => {
  const { message, className } = props;
  const { text, from, createdAt, tags } = message;
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === from;

  return (
    <div className={`justify-between pt-8 ${className}`}>
      <div className="flex flex-row items-center">
        <Avatar name={from} size="50" className="rounded-md" />
        <div className="ml-4 flex flex-col">
          <p className="font-semibold text-white">
            {isYou ? "You" : from}
            <span className="ml-1.5 text-xs text-slate-400">
              {formattedDate}
            </span>
          </p>
          <div className="flex">
            {tags.map((tag) => (
              <div
                className={`my-1 mr-1.5 w-max rounded-2xl border px-3.5 py-0.5 text-sm text-white`}
                style={{
                  backgroundColor: tag.tag.color.replace("1)", "0.2)"),
                  // @ts-ignore
                  borderColor: tag.tag.color,
                }}
              >
                {tag.tag.tagName}
              </div>
            ))}
          </div>
          <p className="text-white">{text}</p>
        </div>
      </div>
    </div>
  );
};
