import { useSession } from "next-auth/react";
import React from "react";
import Avatar from "react-avatar";
import { Tag } from "@prisma/client";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import dynamic from "next/dynamic";

interface MessageRowProps {
  content: string;
  from: string;
  createdAt: Date;
  tags: Tag[];
  type: string;
  onClickTag?: (tag: Tag) => void;
  hideLabels?: boolean;
  className?: string;
}

const Markdown = dynamic(
  () =>
    import("@uiw/react-md-editor").then((mod) => {
      return mod.default.Markdown;
    }),
  { ssr: false }
);

export const MessageRow = (props: MessageRowProps) => {
  const { content, type, from, createdAt, tags, className, onClickTag } = props;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === from;

  // get input type "checkbox" and set disabled to false
  const checkbox = document.querySelector("input[type=checkbox]");
  checkbox?.setAttribute("disabled", "false");

  return (
    <div className={`justify-between pt-8 ${className}`}>
      <div className="flex flex-row items-center">
        <Avatar name={from} size="50" className="mb-auto mt-1 rounded-md" />
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
                className={`my-1 mr-1.5 -ml-1 w-max cursor-pointer rounded-2xl border px-2.5 py-[1px] text-[13px] text-white`}
                style={{
                  backgroundColor: tag.color.replace("1)", "0.2)"),
                  borderColor: tag.color,
                }}
                onClick={() => onClickTag?.(tag)}
              >
                {tag.tagName}
              </div>
            ))}
          </div>
          {type === "markdown" ? (
            <Markdown source={content} />
          ) : (
            <p className="text-white">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
};
