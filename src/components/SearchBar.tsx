import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { displayedMessagesAtom, searchTermAtom } from "../store";
import {
  Editor,
  EditorState,
  CompositeDecorator,
  convertFromRaw,
  ContentBlock,
} from "draft-js";
import "draft-js/dist/Draft.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [displayedMessages, setDisplayedMessages] = useAtom(displayedMessagesAtom);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(emptyContentState)
  );
  const editorText = editorState.getCurrentContent().getPlainText();

  const strategy = (
    contentBlock: ContentBlock,
    callback: (start: number, end: number) => void
  ) => {
    const searchParams = findSearchParams(contentBlock);
    if (searchParams) {
      searchParams.forEach((param) => {
        if (!param) return;
        const start = contentBlock.getText().indexOf(param);
        const end = start + param.length;
        callback(start, end);
      });
    }
  };

  const searchDecorator = new CompositeDecorator([
    {
      strategy,
      component: (props: any) => {
        return (
          <span className="bg-zinc-600 py-[0.px] px-1">{props.children}</span>
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
    setSelectedTags([]);
  };

  const triggerSearch = () => {
    if (!editorText.length) return;

    setSearchTerm(editorText);
    setDisplayedMessages([]);
    setShowOptions(false);
  };

  const insertText = (text: string) => {
    let currentContent = editorState.getCurrentContent().getPlainText();

    // Split the input text on ":"
    const [term, value] = text.split(":");

    // Check if the term is already present in the current content
    const regex = new RegExp(`${term}:[^\\s]+`, "g");
    currentContent = currentContent.replace(regex, `${term}:${value}`);

    //Check if the term already exists
    if (currentContent === editorState.getCurrentContent().getPlainText()) {
      currentContent = text + " " + currentContent;
    }

    setEditorState((e) =>
      EditorState.push(
        editorState,
        convertFromRaw({
          entityMap: {},
          blocks: [
            {
              key: "637gr",
              text: currentContent,
              type: "unstyled",
              depth: 0,
              inlineStyleRanges: [],
              entityRanges: [],
            },
          ],
        }),
        "insert-characters"
      )
    );
  };

  useEffect(() => {
    if (editorState) {
      const newEditorState = EditorState.set(editorState, {
        decorator: searchDecorator,
      });
      setEditorState(newEditorState);
    }
  }, []);

  useEffect(() => {
    if (!selectedTags.length) return;

    const tags = selectedTags.map((tag) => tag).join(",");
    if (!tags) return;

    insertText(`tag:${tags}`);
  }, [selectedTags]);

  useEffect(() => {
    if (searchTerm?.length === 0) emptyState();
  }, [searchTerm]);

  useEffect(() => {
    const handleClick = (e: any) => {
      if (!e.target.closest(".popover-el")) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener("click", handleClick);
    }
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [showOptions]);

  return (
    <div className="popover-el mx-auto -mt-0.5 flex 2xl:w-1/2 w-full md:w-3/4  min-w-[400px] max-w-[700px] rounded border-[0.1px] border-zinc-600 bg-[#36363B] px-2.5 py-0.5 text-white shadow">
      <div>
        {showOptions && (
          <FilterOptions
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            insertText={insertText}
          />
        )}
      </div>
      <div className="flex-1">
        <Editor
          editorState={editorState}
          onChange={handleEditorChange}
          onFocus={() => setShowOptions(true)}
          placeholder="Search..."
          handleReturn={(e) => {
            e.preventDefault();
            triggerSearch();
            return "handled";
          }}
        />
      </div>

      {editorText && (
        <img
          className="mt-0.5 ml-2 mr-1 h-5 cursor-pointer text-white"
          src="/icons/x.svg"
          onClick={() => {
            emptyState();
          }}
        />
      )}
      <img
        className="ml-auto inline h-6 cursor-pointer"
        src="/icons/filter.svg"
        onClick={() => setShowOptions(!showOptions)}
      />
      <img
        className="my-auto ml-2 h-5 cursor-pointer bg-inherit"
        src="/icons/search.svg"
        onClick={() => triggerSearch()}
      />
    </div>
  );
};

interface FilterOptionsProps {
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  insertText: (text: string) => void;
}
const FilterOptions = (props: FilterOptionsProps) => {
  const { selectedTags, setSelectedTags, insertText } = props;

  const { data: tags } = trpc.message.allTags.useQuery(void 0, {
    enabled: false,
  });
  const [showTags, setShowTags] = useState(false);

  const [dateType, setDateType] = useState<"during" | "before" | "after">();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openDatePicker = (type: "during" | "before" | "after") => {
    setShowDatePicker(true);
    setDateType(type);
  };

  return (
    <div className="popover-el absolute">
      <div
        className={`absolute -left-3  top-8 z-10 max-w-[700px] origin-top-right  rounded-md  border-[0.5px] border-zinc-600 bg-[#36363B] pt-3 text-zinc-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
          showDatePicker ? "w-[320px]" : "min-w-[600px]"
        }`}
      >
        {!showTags && !showDatePicker && (
          <div className="popover-el mb-1">
            <div className="px-3 py-1 font-semibold uppercase">
              Search Options
            </div>
            <div
              className="cursor-pointer px-3 py-1.5 hover:bg-zinc-700"
              onClick={() => setShowTags(true)}
            >
              <span className="font-semibold">tags: </span>
              <span className="ml-1 text-zinc-300">specific tags</span>
            </div>
            <div
              className="cursor-pointer px-3 py-1.5 hover:bg-zinc-700"
              onClick={() => openDatePicker("during")}
            >
              <span className="font-semibold">during: </span>
              <span className="ml-1 text-zinc-300">specific date</span>
            </div>
            <div
              className="cursor-pointer px-3 py-1.5 hover:bg-zinc-700"
              onClick={() => openDatePicker("before")}
            >
              <span className="font-semibold">before: </span>
              <span className="ml-1 text-zinc-300">before date</span>
            </div>
            <div
              className="cursor-pointer px-3 py-1.5 hover:bg-zinc-700"
              onClick={() => openDatePicker("after")}
            >
              <span className="font-semibold">after: </span>
              <span className="ml-1 text-zinc-300">after date</span>
            </div>
          </div>
        )}
        {showDatePicker && (
          <DayPicker
            mode="single"
            onSelect={(d) => {
              if (!d) return;
              const text = `${dateType}:${d.toISOString().split("T")[0]}`;
              insertText(text);
            }}
          />
        )}
        {showTags && (
          <div className="popover-el mb-1">
            <div className="mb-1 px-4 font-semibold uppercase">Tags</div>
            {tags?.map((tag) => (
              <div
                key={tag.tagName}
                className="py-2.5 px-4 hover:bg-zinc-700"
                onClick={() => {
                  if (selectedTags?.find((t) => t === tag.tagName)) {
                    setSelectedTags(
                      selectedTags.filter((t) => t !== tag.tagName)
                    );
                  } else {
                    setSelectedTags([...selectedTags, tag.tagName]);
                  }
                }}
              >
                <div className="my-auto flex">
                  <span
                    className="my-auto inline-block h-5 w-5 rounded-full border text-center"
                    style={{
                      backgroundColor: tag.color.replace("1)", "0.3)"),
                      borderColor: tag.color,
                    }}
                  >
                    {selectedTags?.find((t) => t === tag.tagName) && (
                      <img src="/icons/check.svg" className="h-5" />
                    )}
                  </span>
                  <p className="ml-3 text-zinc-300">{tag.tagName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const findSearchParams = (contentBlock: ContentBlock) => {
  const text = contentBlock.getText();

  const TAG_REGEX = /tag:\w+(,\w+)*/;
  const BEFORE_REGEX = /before:\d{4}-\d{2}-\d{2}/;
  const AFTER_REGEX = /after:\d{4}-\d{2}-\d{2}/;
  const DURING_REGEX = /during:\d{4}-\d{2}-\d{2}/;

  const params = [];
  if (TAG_REGEX.test(text)) params.push(text.match(TAG_REGEX)?.[0]);
  if (BEFORE_REGEX.test(text)) params.push(text.match(BEFORE_REGEX)?.[0]);
  if (AFTER_REGEX.test(text)) params.push(text.match(AFTER_REGEX)?.[0]);
  if (DURING_REGEX.test(text)) params.push(text.match(DURING_REGEX)?.[0]);

  return params;
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
