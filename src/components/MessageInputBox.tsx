import React, { useEffect, useState } from "react";
import {
  Editor,
  EditorState,
  CompositeDecorator,
  convertFromRaw,
  ContentBlock,
  ContentState,
  getDefaultKeyBinding,
  RichUtils,
} from "draft-js";
import { Popover } from "@headlessui/react";
import {
  CreateMessageSchema,
  EditMessageSchema,
  TagSchema,
} from "@/types/messages.schema";
import { MarkdownEditor } from "./Markdown";
import { useAtom } from "jotai";
import { messageToEditAtom, tagsToFilterAtom } from "../store";
import { trpc } from "@/utils/trpc";
import { useSession } from "next-auth/react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface MessageBoxProps {
  onSubmit: (message: CreateMessageSchema | EditMessageSchema) => void;
  mode: "edit" | "create";
}

export const MessageInputBox = (props: MessageBoxProps) => {
  const user = useSession().data?.user;
  const { onSubmit, mode } = props;

  const [tagsToFilter] = useAtom(tagsToFilterAtom);
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);

  const [inputMode, setInputMode] = useState<"regular" | "markdown" | "chat">(
    "regular"
  );
  const [mdValue, setMdValue] = useState("***hello world!***");
  const [tags, setTags] = useState<{ color: string; tagName: string }[]>([]);
  const [tagInput, setTagInput] = useState("");

  const { data: allTags, refetch: refetchTags } = trpc.message.allTags.useQuery(
    void 0,
    {
      enabled: false,
    }
  );
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(emptyContentState)
  );
  const editorText = editorState.getCurrentContent().getPlainText();

  const strategy = (
    contentBlock: ContentBlock,
    callback: (start: number, end: number) => void
  ) => {
    if (inputMode === "markdown") return;
    const text = contentBlock.getText();
    // regex for any word starting with @
    const regex = /@\w+/g;
    let matchArr, start;

    while ((matchArr = regex.exec(text)) !== null) {
      start = matchArr.index;
      setInputMode("chat");
      callback(start, start + matchArr[0].length);
    }
    if (!text.includes("@chat")) {
      setInputMode("regular");
    }
  };

  const searchDecorator = new CompositeDecorator([
    {
      strategy,
      component: (props: any) => {
        return (
          <span className="rounded bg-zinc-500/30 py-0.5 px-1 text-indigo-300">
            {props.children}
          </span>
        );
      },
    },
  ]);
  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(
      EditorState.set(newEditorState, { decorator: searchDecorator })
    );
  };

  const emptyState = () => {
    setEditorState(
      EditorState.moveFocusToEnd(
        EditorState.push(editorState, emptyContentState, "insert-characters")
      )
    );
  };

  const handleSubmit = () => {
    onSubmit({
      ...(mode === "edit" && {
        id: messageToEdit?.id,
        createdAt: messageToEdit?.createdAt,
      }),
      content: inputMode === "markdown" ? mdValue : editorText,
      type: inputMode,
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
    inputMode === "markdown" ? setMdValue("") : emptyState();
    setTags([]);
  };

  const addTag = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent
  ) => {
    e.preventDefault();
    const existingTag = allTags?.find(
      (tag) => tag.tagName.toLowerCase() === tagInput.toLowerCase()
    );
    if (existingTag) {
      setTags([...tags, existingTag]);
    } else {
      setTags([...tags, { color: randomColor()!, tagName: tagInput }]);
    }
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
  const toggleInputMode = () => {
    if (inputMode === "markdown") setInputMode("regular");
    else setInputMode("markdown");
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
      setInputMode("markdown");
    } else {
      setEditorState(
        EditorState.createWithContent(
          ContentState.createFromText(messageToEdit.content)
        )
      );
      setInputMode("regular");
    }
  }, []);

  return (
    <div className="h-26 flex w-full flex-col rounded bg-[#36363B] px-3 py-2">
      <div className="flex w-full flex-row">
        {/* add tag button */}
        <Popover>
          <Popover.Button>
            <img
              id="tag"
              className="inline h-6 cursor-pointer"
              src="/icons/tag.svg"
            />
            <Tooltip
              anchorId="tag"
              place="top"
              content="Add a tag"
              className="rounded"
            />
          </Popover.Button>

          <Popover.Panel className="relative z-10">
            <div className="absolute  -left-10 -top-[110px] z-10 my-2 min-h-[66px] w-80 origin-bottom-right rounded-md border-[0.5px] border-zinc-600 bg-[#36363B] text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <form onSubmit={addTag}>
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
                    onClick={(e) => addTag(e)}
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
          onClick={() => toggleInputMode()}
          className={`ml-auto h-6 cursor-pointer rounded-xl border-[1.5px] px-2.5 text-sm text-zinc-200 shadow hover:bg-zinc-700 ${
            inputMode === "markdown"
              ? "border-green-700 bg-green-700/10"
              : "border-zinc-500"
          }`}
        >
          Markdown Mode
          <span
            className={`mb-0.5 ml-1.5 inline-block h-1.5 w-1.5 rounded-full  ${
              inputMode === "markdown" ? "bg-green-600" : "bg-zinc-500"
            }`}
          ></span>
        </button>
      </div>
      <div className="flex flex-col text-white">
        {inputMode !== "markdown" ? (
          <div className="my-2 h-max max-h-[300px] min-h-[70px] px-0.5">
            <Editor
              editorState={editorState}
              onChange={handleEditorChange}
              placeholder="Jot down your thoughts..."
              handleReturn={(e) => {
                // add new line on shift + enter
                if (e.shiftKey) setEditorState(RichUtils.insertSoftNewline(editorState));
                else handleSubmit();
                return "handled";
              }}
            />
          </div>
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
              onClick={() => handleSubmit()}
              className="rounded bg-green-700 py-0.5 px-3 text-sm font-semibold text-white hover:bg-green-700/80"
            >
              Save
            </button>
          </div>
        ) : (
          <button onClick={() => handleSubmit()} className="self-end">
            <img className="mr-2 h-7" src="/icons/send.svg" />
          </button>
        )}
      </div>
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

const emptyContentState = convertFromRaw({
  entityMap: {},
  blocks: [
    {
      key: "637gr",
      text: "",
      type: "unstyled",
      depth: 0,

      inlineStyleRanges: [],
      entityRanges: [],
      data: {},
    },
  ],
});
