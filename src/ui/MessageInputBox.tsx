import React, { useState } from "react";
import ContentEditable from "react-contenteditable";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface MessageBoxProps {
  onSubmit: (message: string) => void;
}

export const MessageInputBox = (props: MessageBoxProps) => {
  const [message, setMessage] = React.useState("");
  const [tags, setTags] = useState<{ color: String; tagName: String }[]>([]);
  const [tagInput, setTagInput] = useState("");

  const contentEditable = React.useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    props.onSubmit(message);
    setMessage("");
  };

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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setTags([
                    ...tags,
                    { color: randomColor()!, tagName: tagInput },
                  ]);
                  setTagInput("");
                }}
              >
                <div className="flex h-6 flex-row p-4">
                  <input
                    className="h-9 w-full rounded-md border-[0.5px] border-zinc-600 bg-zinc-800 px-3 py-2 pb-3 outline-none"
                    placeholder="add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                  />
                  <img
                    className="ml-2 mt-0.5 inline h-7 cursor-pointer"
                    src="/icons/plus.svg"
                  />
                </div>
              </form>
            </div>
          </Popover.Panel>
        </Popover>

        <img className="ml-1.5 inline h-6" src="/icons/plus.svg" />
        {tags.map((tag, idx) => (
          <div
            className="my-auto ml-1.5 flex w-max rounded-2xl border py-0.5 pl-3 pr-2 text-sm text-white"
            style={{
              backgroundColor: tag.color.replace("1)", "0.2)"),
              // @ts-ignore
              borderColor: tag.color,
            }}
            key={idx}
          >
            {tag.tagName}
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
          placeholder="Type a message..."
        />
        <button type="submit" className="self-end">
          <img className="mr-2 h-7" src="/icons/send.svg" />
        </button>
      </form>
    </div>
  );
};

const randomColor = () => {
  // 30 different colors in rgba
  const colors = [
    "rgba(239,68,68,1)",
    "rgba(252,211,77,1)",
    "rgba(6,214,160,1)",
    "rgba(6,152,214,1)",
    "rgba(108,92,231,1)",
    "rgba(190,88,255,1)",
    "rgba(255,7,110,1)",
    "rgba(209,213,219,1)",
    "rgba(99,102,241,1)",
    "rgba(239,68,68,0.8)",
    "rgba(252,211,77,0.8)",
    "rgba(6,214,160,0.8)",
    "rgba(6,152,214,0.8)",
    "rgba(108,92,231,0.8)",
    "rgba(190,88,255,0.8)",
    "rgba(255,7,110,0.8)",
    "rgba(209,213,219,0.8)",
    "rgba(99,102,241,0.8)",
    "rgba(239,68,68,0.6)",
    "rgba(252,211,77,0.6)",
    "rgba(6,214,160,0.6)",
    "rgba(6,152,214,0.6)",
    "rgba(108,92,231,0.6)",
    "rgba(190,88,255,0.6)",
    "rgba(255,7,110,0.6)",
    "rgba(209,213,219,0.6)",
    "rgba(99,102,241,0.6)",
    "rgba(239,68,68,0.4)",
    "rgba(252,211,77,0.4)",
    "rgba(6,214,160,0.4)",
    "rgba(6,152,214,0.4)",
    "rgba(108,92,231,0.4)",
    "rgba(190,88,255,0.4)",
    "rgba(255,7,110,0.4)",
    "rgba(209,213,219,0.4)",
    "rgba(99,102,241,0.4)",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};
