import { useSession } from "next-auth/react";
import React, { Dispatch, SetStateAction } from "react";
import Avatar from "react-avatar";
import { Tag } from "@prisma/client";
import { Popover } from "@headlessui/react";
import { Markdown } from "./Markdown";
import { trpc } from "@/utils/trpc";

interface MessageRowProps {
  content: string;
  from: string;
  createdAt: Date;
  tags: Tag[];
  type: string;
  setMessageToEdit?:()=>void;
  deleteMessage?:()=>void;
  onClickTag?: (tag: Tag) => void;
  hideLabels?: boolean;
  className?: string;
}

export const MessageRow = (props: MessageRowProps) => {
  const { content, type, from, createdAt, tags, className, onClickTag, setMessageToEdit, deleteMessage } = props;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === from;

  const [showOptions, setShowOptions] = React.useState(false);
  
  return (
    <div
      className={`justify-between py-4 px-6 hover:bg-zinc-700/20 ${className}`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      <div className="flex flex-row items-center">
        <Avatar name={from} size="50" className="mb-auto mt-1 rounded-md" />
        <div className="relative ml-4 w-full flex-col">
          <div className="flex max-h-[24px] w-full">
            <p className="font-semibold text-white">
              {isYou ? "You" : from}
              <span className="ml-1.5 text-xs text-slate-400">
                {formattedDate}
              </span>
            </p>
            {showOptions && (
              <div className="h-50px z-100 relative right-0 ml-auto  h-max origin-bottom-right   rounded-md border-[0.3px] border-zinc-600 bg-[#36363B] py-1 text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <img
                  className="mx-1.5 inline h-5 cursor-pointer text-slate-600"
                  src="/icons/edit.svg"
                  onClick={setMessageToEdit}
                />
                <img
                  className="mr-1.5 inline h-5 cursor-pointer"
                  src="/icons/delete.svg"
                  onClick={deleteMessage}
                />
              </div>
            )}
          </div>
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
