import React, {
  useEffect,
  useState,
} from "react";
import ContentEditable from "react-contenteditable";
import { Popover } from "@headlessui/react";
import {
  CreateMessageSchema,
  EditMessageSchema,
  TagSchema,
} from "@/types/messages.schema";
import { Tag } from "@prisma/client";
import { cleanMessage } from "@/utils/funtions";
import { MarkdownEditor } from "./Markdown";
import { useAtom } from "jotai";
import { messageToEditAtom, tagsToFilterAtom } from "../store";
import { trpc } from "@/utils/trpc";
import { useSession } from "next-auth/react";

interface MessageBoxProps {
  onSubmit: (message: CreateMessageSchema | EditMessageSchema) => void;
  mode: "edit" | "create";
}

export const MessageInputBox = (props: MessageBoxProps) => {
  const user = useSession().data?.user;
  const { onSubmit, mode } = props;
  
  const [tagsToFilter] = useAtom(tagsToFilterAtom)
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);

  const [message, setMessage] = useState("");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [mdValue, setMdValue] = useState("***hello world!***");
  const [tags, setTags] = useState<{ color: string; tagName: string }[]>([]);
  const [tagInput, setTagInput] = useState("");


  const { data: allTags, refetch: refetchTags } = trpc.message.allTags.useQuery(void 0, {
    enabled: false,
  });

  const contentEditable = React.useRef<HTMLDivElement>(null);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      ...(mode === "edit" && {
        id: messageToEdit?.id,
        createdAt: messageToEdit?.createdAt,
      }),
      content: markdownMode ? mdValue : cleanMessage(message),
      type: markdownMode ? "markdown" : "text",
      from: user?.name ?? user?.email ?? "Anonymous",
      tags: tags.map((tag) => {
        const existingTag = allTags?.find(
          (t) => t.tagName.toLowerCase() === tag.tagName.toLowerCase()
        );
        return {
          tagName: tag.tagName,
          color: tag.color,
          id: existingTag?.id,
        };
      }),
    });
    refetchTags();
    // reset state
    markdownMode ? setMdValue("") : setMessage("");
    setTags([]);
  };

  const submitTag = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent
  ) => {
    e.preventDefault();
    setTags([...tags, { color: randomColor()!, tagName: tagInput }]);
    setTagInput("");
  };

  const searchExistingTags = () => {
    if (!allTags) return [];
    return allTags
      .filter((tag) => !tags.find((t) => t.tagName === tag.tagName))
      .filter((tag) =>
        tag.tagName.toLowerCase().includes(tagInput.toLowerCase())
      );
  };

  // include filter tag in tags if not already included
  useEffect(() => {
    setTags([]);
    if (!tagsToFilter?.length) return;
    setTags((prev) => {
      const newTags = [...prev];
      tagsToFilter.forEach((tag) => {
        if (!newTags.find((t) => t.tagName === tag.tagName)) {
          newTags.push(tag);
        }
      });
      return newTags;
    });
  }, [tagsToFilter]);

  useEffect(() => {
    if (!messageToEdit) return;
    setTags(messageToEdit!.tags as TagSchema[]);

    if (messageToEdit.type === "markdown") {
      setMdValue(messageToEdit.content);
      setMarkdownMode(true);
    } else {
      setMessage(messageToEdit.content);
      setMarkdownMode(false);
    }
  }, []);

  return (
    <div className="h-26 flex w-full flex-col rounded bg-[#36363B] px-3 py-2">
      <div className="flex w-full flex-row">
        {/* add tag button */}
        <Popover>
          <Popover.Button>
            <img className="inline h-6 cursor-pointer" src="/icons/tag.svg" />
          </Popover.Button>

          <Popover.Panel className="relative z-10">
            <div className="absolute  -left-10 -top-[110px] z-10 my-2 min-h-[66px] w-80 origin-bottom-right rounded-md border-[0.5px] border-zinc-600 bg-[#36363B] text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <form onSubmit={submitTag}>
                <div className="flex h-6 flex-row p-4">
                  <input
                    className="h-9 w-full rounded-md border-[0.5px] border-zinc-600 bg-zinc-800 px-3 py-2 pb-3 outline-none"
                    placeholder="add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    autoFocus
                  />
                  <img
                    className="ml-2 mt-0.5 inline h-7 cursor-pointer"
                    src="/icons/plus.svg"
                    onClick={(e) => submitTag(e)}
                  />
                </div>
              </form>
              <div className="ml-2.5 mt-8 mb-3 flex flex-row">
                {/* Search existing tags based on input */}
                {tagInput.length > 0 &&
                  searchExistingTags().map((tag, idx) => (
                    <div
                      className="my-auto ml-1.5 flex w-max rounded-2xl border py-0.5 px-3 text-center text-sm text-white"
                      style={{
                        // replace last 2 characters with 0.2)
                        backgroundColor: tag.color.slice(0, -2) + "0.2)",
                        borderColor: tag.color,
                      }}
                      key={idx}
                      onClick={() => {
                        setTags([
                          ...tags,
                          { color: tag.color, tagName: tag.tagName },
                        ]);
                        setTagInput("");
                      }}
                    >
                      {tag.tagName}
                    </div>
                  ))}
              </div>
            </div>
          </Popover.Panel>
        </Popover>

        <img className="ml-1.5 inline h-6" src="/icons/plus.svg" />
        <div className="max-w-[60%]">
          {tags.map((tag, idx) => (
            <div
              className="my-auto ml-1.5 mb-1.5 inline-flex w-max rounded-2xl border py-0.5 pl-3 pr-2 text-sm text-white"
              style={{
                // replace last 2 characters with 0.2)
                backgroundColor: tag?.color.slice(0, -2) + "0.2)",
                borderColor: tag?.color,
              }}
              key={idx}
            >
              {tag?.tagName}
              <p
                className="ml-1.5 cursor-pointer"
                onClick={() => setTags(tags.filter((_, i) => i !== idx))}
              >
                ×
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setMarkdownMode(!markdownMode)}
          className={`ml-auto h-6 cursor-pointer rounded-xl border-[1.5px] px-2.5 text-sm text-zinc-200 shadow hover:bg-zinc-700 ${
            markdownMode
              ? "border-green-700 bg-green-700/10"
              : "border-zinc-500"
          }`}
        >
          Markdown Mode
          <span
            className={`mb-0.5 ml-1.5 inline-block h-1.5 w-1.5 rounded-full  ${
              markdownMode ? "bg-green-600" : "bg-zinc-500"
            }`}
          ></span>
        </button>
      </div>
      <form className="flex flex-col" onSubmit={handleSubmit}>
        {!markdownMode ? (
          <ContentEditable
            className="mt-3.5 h-[70px] w-full resize-none bg-[#36363B] text-white outline-none"
            innerRef={contentEditable}
            html={message} // innerHTML of the editable div
            disabled={false} // use true to disable editing
            onChange={(e) => setMessage(e.target.value)}
            tagName="div"
            placeholder="Jot down your thoughts..."
          />
        ) : (
          <div className="my-2 -ml-2 rounded-md bg-[#36363B]">
            <MarkdownEditor
              value={mdValue}
              preview="edit"
              className="h-max max-h-[300px] min-h-[70px]"
              height={0}
              hideToolbar={true}
              onChange={(e: any) => setMdValue(e)}
            />
          </div>
        )}
        {mode === "edit" ? (
          <div className="mr-1 flex">
            <button
              onClick={() => setMessageToEdit?.(null)}
              className="ml-auto mr-2 rounded border border-zinc-500 bg-transparent py-0.5 px-3 text-sm font-semibold text-white  hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-green-700 py-0.5 px-3 text-sm font-semibold text-white hover:bg-green-700/80"
            >
              Save
            </button>
          </div>
        ) : (
          <button type="submit" className="self-end">
            <img className="mr-2 h-7" src="/icons/send.svg" />
          </button>
        )}
      </form>
    </div>
  );
};

const randomColor = () => {
  const colors = [
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
    "rgba(255, 159, 64, 1)",
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(255, 0, 0, 1)",
    "rgba(255, 0, 255, 1)",
    "rgba(0, 0, 255, 1)",
    "rgba(0, 255, 255, 1)",
    "rgba(0, 255, 0, 1)",
    "rgba(255, 255, 0, 1)",
    "rgba(255, 127, 0, 1)",
    "rgba(255, 0, 127, 1)",
    "rgba(127, 0, 255, 1)",
    "rgba(127, 255, 0, 1)",
    "rgba(0, 127, 255, 1)",
    "rgba(0, 255, 127, 1)",
    "rgba(255, 127, 127, 1)",
    "rgba(127, 255, 255, 1)",
    "rgba(255, 255, 127, 1)",
    "rgba(127, 127, 255, 1)",
    "rgba(255, 127, 255, 1)",
    "rgba(127, 255, 127, 1)",
    "rgba(127, 127, 127, 1)",
    "rgba(255, 255, 255, 1)",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};