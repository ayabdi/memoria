import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { allMessagesAtom, tagsToFilterAtom } from "../store";
import {
  Editor,
  EditorState,
  CompositeDecorator,
  convertFromRaw,
  ContentBlock,
} from "draft-js";
import "draft-js/dist/Draft.css";
import { MoonLoader } from "react-spinners";

export const SearchBar = () => {
  const [tagsToFilter, setTagsToFilter] = useAtom(tagsToFilterAtom);
  const [allMessages, setAllMessages] = useAtom(allMessagesAtom);

  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(emptyContentState)
  );

  const {
    refetch,
    isFetching,
  } = trpc.message.allMessages.useQuery(
    {
      searchTerm: editorState.getCurrentContent().getPlainText(),
    },
    {
      enabled: false,
      onSuccess: (data) => {
        if (data?.length) setAllMessages(data);
        else setAllMessages([]);
      },
    }
  );

  const findSearchParams = (contentBlock: ContentBlock) => {
    const text = contentBlock.getText();

    const TAG_REGEX = /tag:\w+/;
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

  useEffect(() => {
    if (editorState) {
      const newEditorState = EditorState.set(editorState, {
        decorator: searchDecorator,
      });
      setEditorState(newEditorState);
    }
  }, []);

  // search with debounce
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      refetch();
    }, 500);
    return () => clearTimeout(timeout);
  }, [editorState]);

  return (
    <div className="mx-auto -mt-0.5 flex w-1/2 min-w-[600px] max-w-[700px] rounded border-[0.1px] border-zinc-600 bg-[#36363B] px-2.5 py-0.5 text-white shadow">
      <div className="flex-1">
        <Editor editorState={editorState} onChange={handleEditorChange} />
      </div>
      <MoonLoader
        color="#ffff"
        size={15}
        className="mt-0.5"
        loading={isFetching}
      />
      <img
        className="my-auto ml-2 h-5 cursor-pointer"
        src="/icons/filter.svg"
      />
      <img
        className="my-auto ml-2 h-5 cursor-pointer bg-inherit"
        src="/icons/search.svg"
      />
    </div>
  );
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
