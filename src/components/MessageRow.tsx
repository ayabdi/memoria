import { useSession } from "next-auth/react";
import React from "react";
import Avatar from "react-avatar";
import { Markdown } from "./Markdown";
import { MessageSchema, TagSchema } from "@/types/messages.schema";


interface MessageRowProps {
  message: MessageSchema;
  isLoadingMessage?: boolean;
  setMessageToEdit?: () => void;
  deleteMessage?: () => void;
  onClickTag?: (tag: TagSchema) => void;
  className?: string;
}

export const MessageRow = (props: MessageRowProps) => {
  const {
    message,
    isLoadingMessage,
    className,
    onClickTag,
    setMessageToEdit,
    deleteMessage,
  } = props;

  const formattedDate = new Date(message.createdAt ?? new Date()).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === message.from;

  const [showOptions, setShowOptions] = React.useState(false);
  
  const Text = () => {
    let splitText = message.content.split(' ');
    let content = splitText.map((part, index) => {
        if (part.startsWith('@')) {
            return (
                <React.Fragment key={index}>
                    <span className="rounded bg-zinc-500/30 py-0.5 px-1 text-indigo-300">{part}</span>
                    {' '}
                </React.Fragment>
            );
        } else {
            return part + ' ';
        }
    });

    return (
        <div>
            {content}
        </div>
    );
}
  return (
    <div
      className={`justify-between py-4 px-6 hover:bg-zinc-700/20 ${className}`}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      <div className="flex flex-row items-center">
        <Avatar name={message.from} size="50" className="mb-auto mt-1 rounded-md" />
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
          <div className="flex mb-1">
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
            <Markdown source={message.content} style={{ color: isLoadingMessage ? "grey" : "white" }}/>
          ) : (
            <div className={`${ isLoadingMessage ? "text-zinc-500" :"text-white"}`}><Text/></div>
          )}
        </div>
      </div>
    </div>
  );
};
