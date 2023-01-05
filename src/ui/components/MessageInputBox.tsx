import React, { useEffect, useState } from "react";
import ContentEditable from "react-contenteditable";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { CreateMessageSchema } from "@/types/messages.schema";
import { Tag } from "@prisma/client";
import { cleanMessage } from "@/utils/funtions";

interface MessageBoxProps {
  onSubmit: (message: CreateMessageSchema) => void;
  existingTags?: Tag[];
  tagToFilter?: Tag | null;
}

export const MessageInputBox = (props: MessageBoxProps) => {
  const { existingTags, onSubmit, tagToFilter: selectedTag } = props;
  const [message, setMessage] = React.useState("");
  const [tags, setTags] = useState<{ color: string; tagName: string }[]>([]);
  const [tagInput, setTagInput] = useState("");

  const contentEditable = React.useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      text: cleanMessage(message),
      tags: tags.map((tag) => {
        const existingTag = existingTags?.find(
          (existingTag) =>
            existingTag.tagName.toLowerCase() === tag.tagName.toLowerCase()
        );
        return { tagName: tag.tagName, color: tag.color, tagId: existingTag?.id };
      }),
    });
    setMessage("");
    setTags([]);
  };

  const submitTags = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent
  ) => {
    e.preventDefault();
    setTags([...tags, { color: randomColor()!, tagName: tagInput }]);
    setTagInput("");
  };

  const searchExistingTags = () => {
    if (!existingTags) return [];
    return existingTags
      .filter((tag) => !tags.find((t) => t.tagName === tag.tagName))
      .filter((tag) =>
        tag.tagName.toLowerCase().includes(tagInput.toLowerCase())
      );
  };

  // include filter tag in tags if not already included
  useEffect(() => {
    setTags([]);
    if(!selectedTag) return
    
    if (!tags.find((t) => t.tagName === selectedTag?.tagName)) {
      setTags([...tags, { color: selectedTag!.color, tagName: selectedTag!.tagName }]);
    }
  }, [selectedTag]);

  return (
    <div className="h-26 mt-6 flex w-full flex-col rounded bg-[#36363B] px-3 py-2">
      <div className="flex h-6 w-full flex-row">
        {/* add tag button */}
        <Popover>
          <Popover.Button>
            <img className="inline h-6 cursor-pointer" src="/icons/tag.svg" />
          </Popover.Button>

          <Popover.Panel className="absolute z-10">
            <div className="absolute  -left-10 -top-[110px] z-10 my-2 min-h-[66px] w-80 origin-bottom-right rounded-md border-[0.5px] border-zinc-600 bg-[#36363B] text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <form onSubmit={submitTags}>
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
                    onClick={(e) => submitTags(e)}
                  />
                </div>
              </form>
              <div className="flex flex-row ml-2.5 mt-8 mb-3">
                {/* Search existing tags based on input */}
                {tagInput.length > 0 &&
                  searchExistingTags().map((tag, idx) => (
                    <div
                      className="my-auto ml-1.5 flex w-max rounded-2xl border py-0.5 px-3 text-sm text-white text-center"
                      style={{
                        // replace last 2 characters with 0.2)
                        backgroundColor: tag.color.slice(0, -2) + "0.2)",
                        // @ts-ignore
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
        {tags.map((tag, idx) => (
          <div
            className="my-auto ml-1.5 flex w-max rounded-2xl border py-0.5 pl-3 pr-2 text-sm text-white"
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
      <form className="flex flex-col" onSubmit={handleSubmit}>
        <ContentEditable
          className="mt-3 w-full resize-none bg-[#36363B] text-white outline-none"
          innerRef={contentEditable}
          html={message} // innerHTML of the editable div
          disabled={false} // use true to disable editing
          onChange={(e) => setMessage(e.target.value)}
          tagName="div"
          placeholder="Type your message..."
        />
        <button type="submit" className="self-end">
          <img className="mr-2 h-7" src="/icons/send.svg" />
        </button>
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
