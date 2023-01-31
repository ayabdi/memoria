import { useSession } from "next-auth/react";
import React from "react";
import Avatar from "react-avatar";
import { Markdown } from "./Markdown";
import { MessageSchema, TagSchema } from "@/types/messages.schema";
import { messageToEditAtom } from "@/store";
import { useAtom } from "jotai";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface MessageRowProps {
  message: MessageSchema;
  isLoadingMessage?: boolean;
  deleteMessage?: () => void;
  onClickTag?: (tag: TagSchema) => void;
  className?: string;
}

export const MessageRow = (props: MessageRowProps) => {
  const { message, isLoadingMessage, className, onClickTag, deleteMessage } =
    props;

  const formattedDate = new Date(
    message.createdAt ?? new Date()
  ).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === message.from;

  const [showOptions, setShowOptions] = React.useState(false);
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);

  const Text = () => {
    const splitText = message.content.split(" ");
    const content = splitText.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <React.Fragment key={index}>
            <span className="rounded bg-zinc-500/30 py-0.5 px-1 text-indigo-300">
              {part}
            </span>{" "}
          </React.Fragment>
        );
      } else {
        return part + " ";
      }
    });

    return (
      <div className={`${isLoadingMessage ? "text-zinc-500" : "text-white"}`}>
        {content}
      </div>
    );
  };
  return (
    <div
      className={`justify-between py-4 px-6 hover:bg-zinc-700/20 ${className}`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      <div className="flex flex-row items-center">
        {isYou ? (
          <Avatar
            name={message.from}
            size="48"
            className="mb-auto mt-1 rounded-md"
          />
        ) : (
          <img
            src="/icons/chatbot.svg"
            className="mb-auto mt-1 h-12 rounded-md bg-blue-600 p-1.5"
          />
        )}

        <div className="relative ml-4 w-full flex-col">
          <div className="flex max-h-[24px] w-full">
            <p className="font-semibold text-white">
              {isYou ? "You" : message.from}
              <span className="ml-1.5 text-xs text-slate-400">
                {formattedDate}
              </span>
            </p>
            {showOptions && (
              <div className="h-50px z-100 relative right-0 ml-auto  h-max origin-bottom-right   rounded-md border-[0.3px] border-zinc-600 bg-[#36363B] py-1 text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <img
                  id="edit"
                  className="mx-1.5 inline h-5 cursor-pointer text-slate-600"
                  src="/icons/edit.svg"
                  onClick={() => setMessageToEdit(message)}
                />
                <Tooltip anchorId="edit" place="top" content="Edit" />
                <img
                  id="delete"
                  className="mr-1.5 inline h-5 cursor-pointer"
                  src="/icons/delete.svg"
                  onClick={deleteMessage}
                />
                <Tooltip anchorId="delete" place="top" content="Delete" />
              </div>
            )}
          </div>
          <div className="mb-1 flex">
            {message.tags?.map((tag) => (
              <div
                key={tag.id}
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
          {message.type === "markdown" ? (
            <Markdown
              source={message.content}
              style={{ color: isLoadingMessage ? "grey" : "white" }}
            />
          ) : (
            <Text />
          )}
        </div>
      </div>
    </div>
  );
};
