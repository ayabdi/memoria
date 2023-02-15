import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/components/MessageInputBox";
import { MessageRow } from "@/components/MessageRow";
import { useEffect, useRef, useState } from "react";
import {
  CreateMessageSchema,
  EditMessageSchema,
  MessageSchema,
  TagSchema,
} from "@/types/messages.schema";
import { MoonLoader } from "react-spinners";
import { useAtom } from "jotai";
import Avatar from "react-avatar";
import {
  displayedMessagesAtom,
  messageToEditAtom,
  searchTermAtom,
  tagsToFilterAtom,
} from "../store";
import { useSession } from "next-auth/react";

export const Feed = () => {
  const user = useSession().data?.user;
  const [tagsToFilter, setTagsToFilter] = useAtom(tagsToFilterAtom);
  const [displayedMessages, setDisplayedMessages] = useAtom(displayedMessagesAtom);
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [pageNo, setPageNo] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);

  // to display messages that are not yet sent to the server (optimistic UI)
  const [unsentMessages, setUnsentMessages] = useState<CreateMessageSchema[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    refetch,
    isFetched,
    isFetching,
  } = trpc.message.allMessages.useQuery(
    {
      page: pageNo,
      searchTerm: searchTerm || undefined,
    },
    {
      enabled: displayedMessages === null || searchTerm !== null,
      onSuccess: (data) => {
        if (!data.length) return;

        if (pageNo <= 1) setDisplayedMessages(data);
        else setDisplayedMessages((prev) => [...data, ...(prev ?? [])]);

        if (data?.length < 50) setHasMoreMessages(false);
        else setHasMoreMessages(true);
      },
    }
  );
  const { data: tags } = trpc.message.allTags.useQuery();
  const { mutate } = trpc.message.createMessage.useMutation();
  const { mutate: editMessage } = trpc.message.editMessage.useMutation();
  const { mutate: deleteMessage } = trpc.message.deleteMessage.useMutation();
  const { mutate: executePrompt, isLoading: isBotTyping } =
    trpc.message.executePrompt.useMutation();

  const createMessage = async (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => [...prev, message]);
    setPageNo(1);
    mutate(message, {
      onSuccess: (data) => {
        if (message.type === "prompt") executePrompt({prompt: message.content}, { onSuccess: () => refetch() });

        refetch().then(() => {
          removeUnsentMessage(message);
          scrollToBottom();
        });
      },
      onError: () => removeUnsentMessage(message),
    });
  };

  const handleEdit = (message: EditMessageSchema) => {
    editMessage(message);
    setDisplayedMessages((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((m) => m.id === message?.id);
      if (index === -1) return prev;
      const newMessages = [...prev];
      newMessages[index] = message;
      return newMessages;
    });
  };
  const handleDelete = (message: MessageSchema) => {
    if (!message.id) return;
    deleteMessage(message.id);

    setDisplayedMessages((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((m) => m.id === message.id);
      if (index === -1) return prev;
      const newMessages = [...prev];
      newMessages.splice(index, 1);
      return newMessages;
    });
  };

  const removeUnsentMessage = (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => {
      const idx = prev.indexOf(message);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const scrollToLastMessage = () => {
    if (!messages?.length) return;
    const lastMessage = document.getElementById(messages[messages.length - 1]?.id || "");
    if (lastMessage) lastMessage.scrollIntoView();
  };

  const scrollToBottom = () => {
    const scroll =
      (chatContainerRef.current?.scrollHeight || 0) - (chatContainerRef.current?.clientHeight || 0);
    chatContainerRef.current?.scrollTo(0, scroll);
  };

  const onTagFilter = (tag: TagSchema) => {
    setPageNo(1);
    // add tag to filter if not already present
    setTagsToFilter((prev) => {
      if (!prev) return [tag];
      const idx = prev.indexOf(tag);
      if (idx === -1) return [...prev, tag];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const resetState = () => {
    setTagsToFilter([]);
    setDisplayedMessages([]);
    setSearchTerm("");
  };

  // scroll to the last fetched message every page load
  // this to prevent abrupt scrolling to the top when new messages are fetched
  useEffect(() => {
    if (pageNo <= 1) return;
    // scroll to last message when user scrolls to top of page
    scrollToLastMessage();
  }, [displayedMessages]);

  useEffect(() => {
    if (pageNo > 1 || !messages?.length || !isFetched) return;
    // hack to keep messages view scrolled to the bottom on load
    // this is done because markdown messages take a while to render then screws up the scroll position
    const interval = setInterval(() => {
      scrollToBottom();
    }, 10);
    setTimeout(() => {
      clearInterval(interval);
    }, 1000);
  }, [messages]);

  // scroll to the bottom when new messages are added but not yet sent to the server
  useEffect(() => {
    if (unsentMessages.length) scrollToBottom();
  }, [unsentMessages]);

  // trigger page number change when user scrolls to top of page
  // would ideally refetch and update pagNo in one go, but cant pass input to refetch function for some reason
  useEffect(() => {
    if (!isFetched || !chatContainerRef.current) return;
    const handleScroll = () => {
      if (chatContainerRef.current?.scrollTop === 0 && hasMoreMessages) {
        setPageNo((prev) => prev + 1);
      }
    };
    chatContainerRef.current.addEventListener("scroll", handleScroll);
    return () => chatContainerRef.current?.removeEventListener("scroll", handleScroll);
  }, [displayedMessages]);

  // refetch when page number changes
  useEffect(() => {
    if (pageNo <= 1 || !hasMoreMessages) return;
    refetch();
  }, [pageNo]);

  useEffect(() => {
    if (!tagsToFilter?.length) return;

    setSearchTerm(`tag:${tagsToFilter?.map((tag) => tag.tagName).join(",")}`);
    setDisplayedMessages([]);
  }, [tagsToFilter]);

  const mostRecentTags = tags
    ?.filter((tag) => tag.tagName !== "Bot")
    .sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, 5);
  return (
    <>
      <div className="absolute left-10 top-24 w-[15%] max-w-[300px] rounded border border-slate-700 p-3">
        <div className="px-3 py-1 font-semibold uppercase text-zinc-100">Recents</div>
        <div className="flex flex-col pt-2">
          {mostRecentTags?.map(
            (tag, idx) =>
              tag.tagName !== "Bot" &&
              idx <= 5 && (
                <div
                  key={tag.id}
                  className="flex cursor-pointer items-center px-3 py-1 text-lg text-zinc-100 hover:bg-zinc-700"
                  onClick={() => onTagFilter(tag)}
                >
                  <div className="my-auto flex">
                    <span
                      className="my-auto inline-block h-4 w-4 rounded-full border text-center"
                      style={{
                        backgroundColor: tag.color.replace("1)", "0.5)"),
                        borderColor: tag.color,
                      }}
                    ></span>
                    <p className="ml-3 text-zinc-300">{tag.tagName}</p>
                  </div>
                </div>
              )
          )}
        </div>
      </div>
      <div className="mt-auto flex h-[calc(100vh_-_55px)] w-full min-w-[370px] max-w-[800px]  flex-col border-x border-slate-700 pb-5 md:w-3/4 2xl:w-1/2">
        {tagsToFilter?.length || !!searchTerm ? (
          <div className="flex w-full px-4 pt-4 pb-1 text-lg text-white">
            <img
              src="/icons/left-arrow.svg"
              className="my-auto h-[18px] cursor-pointer pr-3 "
              onClick={() => resetState()}
            />
            {/* <p> {tagsToFilter.map((tag) => tag.tagName).join(", ")}</p> */}
          </div>
        ) : (
          <></>
        )}
        {displayedMessages?.length ? (
          <div
            ref={chatContainerRef}
            className="flex h-full w-full flex-1 flex-col overflow-y-auto whitespace-pre-wrap"
          >
            <div className="py-3">
              <MoonLoader
                color="#fff"
                size={20}
                className="m-auto"
                loading={isFetching && !!displayedMessages?.length}
              />
            </div>

            {displayedMessages?.map((message, idx) => (
              <div id={message.id} key={idx} className={idx === 0 ? "mt-auto " : ""}>
                {messageToEdit && messageToEdit.id === message.id ? (
                  <div className="flex px-6">
                    <Avatar
                      name={message.from}
                      size="50"
                      className="mb-auto mt-1 mr-4 rounded-md"
                    />
                    <MessageInputBox
                      onSubmit={(m: CreateMessageSchema | EditMessageSchema) => {
                        handleEdit(m as EditMessageSchema);
                        setMessageToEdit(null);
                      }}
                      mode="edit"
                    />
                  </div>
                ) : (
                  <MessageRow
                    message={message}
                    key={message.id + idx.toString()}
                    deleteMessage={() => handleDelete(message)}
                    onClickTag={onTagFilter}
                    className={idx === 0 ? "mt-auto" : ""}
                  />
                )}
              </div>
            ))}

            {unsentMessages &&
              unsentMessages.map((message, idx) => (
                <MessageRow
                  message={{ ...message, id: idx.toString() }}
                  isLoadingMessage={true}
                  onClickTag={onTagFilter}
                  key={idx}
                  className={messages?.length === 0 ? "mt-auto " : ""}
                />
              ))}
          </div>
        ): <></>}
        <MoonLoader
          color="#fff"
          size={70}
          className="m-auto"
          loading={isFetching && !displayedMessages?.length}
        />
        <div className="flex-0 mt-4 px-6">
          {isBotTyping && (
            <p className="p-1 pt-0 text-sm text-slate-400">Memoria Bot is typing...</p>
          )}
          <MessageInputBox mode="create" onSubmit={createMessage} />
        </div>
      </div>
    </>
  );
};
