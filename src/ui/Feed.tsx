import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/ui/components/MessageInputBox";
import { MessageRow } from "@/ui/components/MessageRow";
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
import { allMessagesAtom, messageToEditAtom, tagsToFilterAtom } from "./store";

export const Feed = () => {
  const [tagsToFilter, setTagsToFilter] = useAtom(tagsToFilterAtom);
  const [allMessages, setAllMessages] = useAtom(allMessagesAtom);
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);

  const [pageNo, setPageNo] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);

  // to display messages that are not yet sent to the server (optimistic UI)
  const [unsentMessages, setUnsentMessages] = useState<CreateMessageSchema[]>(
    []
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    refetch,
    isFetched,
    isFetching,
    isLoading,
  } = trpc.message.allMessages.useQuery(
    {
      page: pageNo,
      ...(tagsToFilter?.length && {
        searchTerm: `tag:${tagsToFilter?.map((tag) => tag.tagName).join(",")}`,
      }),
    },
    {
      enabled: allMessages === null,
      onSuccess: (data) => {
        if (data?.length) setAllMessages(data);
        if (data?.length < 40) setHasMoreMessages(false);
      },
    }
  );
  trpc.message.allTags.useQuery();

  const { mutate } = trpc.message.createMessage.useMutation();
  const { mutate: editMessage } = trpc.message.editMessage.useMutation();
  const { mutate: deleteMessage } = trpc.message.deleteMessage.useMutation();

  const createMessage = async (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => [...prev, message]);
    setPageNo(1);
    mutate(message, {
      onSuccess: () =>
        refetch().then(({ data }) => {
          if (data?.length) setAllMessages(data);
          removeUnsentMessage(message);
          scrollToBottom();
        }),
      onError: () => removeUnsentMessage(message),
    });
  };

  const handleEdit = (message: EditMessageSchema) => {
    editMessage(message);
    setAllMessages((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((m) => m.id === message!.id);
      if (index === -1) return prev;
      const newMessages = [...prev];
      newMessages[index] = message!;
      return newMessages;
    });
  };
  const handleDelete = (id: string) => {
    deleteMessage(id);
    setAllMessages((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((m) => m.id === id);
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
    const lastMessage = document.getElementById(
      messages[messages.length - 1]?.id || ""
    );
    if (lastMessage) lastMessage.scrollIntoView();
  };

  const scrollToBottom = () => {
    const scroll =
      (chatContainerRef.current?.scrollHeight || 0) -
      (chatContainerRef.current?.clientHeight || 0);
    chatContainerRef.current?.scrollTo(0, scroll);
  };

  const onTagFilter = (tag: TagSchema) => {
    // add tag to filter if not already present
    setTagsToFilter((prev) => {
      if (!prev) return [tag];
      const idx = prev.indexOf(tag);
      if (idx === -1) return [...prev, tag];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    setPageNo(1);
    setAllMessages([]);
  };

  // scroll to the last fetched message every page load
  // this to prevent abrupt scrolling to the top when new messages are fetched
  useEffect(() => {
    if (!allMessages?.length || !isFetched) return;

    // scroll to last message when user scrolls to top of page
    if (pageNo > 1) scrollToLastMessage();

    // hack to keep messages view scrolled to the bottom on initial load
    // this is done because markdown messages take a while to render then screws up the scroll position
    if (initialLoad) return;
    const interval = setInterval(() => {
      setInitialLoad(true);
      scrollToBottom();
    }, 10);
    setTimeout(() => {
      clearInterval(interval);
    }, 2000);
  }, [allMessages]);

  // scroll to the bottom when new messages are added but not yet sent to the server
  useEffect(() => {
    if (unsentMessages.length) scrollToBottom();
  }, [unsentMessages]);

  // trigger page number change when user scrolls to top of page
  // would ideally refetch and update pagNo in one go, but cant pass input to refetch function for some reason
  useEffect(() => {
    if (!isFetched || !chatContainerRef.current) return;
    const handleScroll = () => {
      if (chatContainerRef.current?.scrollTop === 0 && hasMoreMessages)
        setPageNo((prev) => prev + 1);
    };
    chatContainerRef.current.addEventListener("scroll", handleScroll);
    return () => {
      chatContainerRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [isFetched]);

  // refetch when page number changes
  useEffect(() => {
    if (pageNo > 1)
      refetch().then(({ data }) => {
        if (data?.length) setAllMessages((prev) => [...data, ...prev!]);
        else setHasMoreMessages(false);
      });
  }, [pageNo]);

  useEffect(() => {
    if (!tagsToFilter === null) refetch();
    else
      refetch().then(({ data }) => {
        if (data?.length) setAllMessages(data);
      });
  }, [tagsToFilter]);

  return (
    <>
      <div className="mt-auto flex h-[calc(100vh_-_55px)] w-1/2 min-w-[600px] max-w-[800px] flex-col border-x border-slate-700 pb-5">
        {tagsToFilter?.length ? (
          <div className="flex w-full px-4 py-4 text-lg text-white">
            <img
              src="/icons/left-arrow.svg"
              className="my-auto h-[18px] cursor-pointer pr-3 "
              onClick={() => {
                setTagsToFilter(null);
                setAllMessages([])
              }}
            />
            {/* <p> {tagsToFilter.map((tag) => tag.tagName).join(", ")}</p> */}
          </div>
        ) : (
          <></>
        )}
        <div
          ref={chatContainerRef}
          className="flex h-full w-full flex-1 flex-col overflow-y-auto whitespace-pre-wrap"
        >
          {allMessages?.map((message, idx) => (
            <div
              id={message.id}
              key={idx}
              className={idx === 0 ? "mt-auto " : ""}
            >
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
                  setMessageToEdit={() => setMessageToEdit(message)}
                  deleteMessage={() => handleDelete(message.id!)}
                  onClickTag={onTagFilter}
                  className={idx === 0 ? "mt-auto" : ""}
                />
              )}
            </div>
          ))}
          <MoonLoader
            color="#fff"
            size={70}
            className="m-auto"
            loading={isFetching && allMessages?.length === 0}
          />

          {unsentMessages &&
            unsentMessages.map((message, idx) => (
              <MessageRow
                message={message}
                isLoadingMessage={true}
                onClickTag={onTagFilter}
                key={idx}
                className={messages?.length === 0 ? "mt-auto " : ""}
              />
            ))}
        </div>
        <div className="flex-0 mt-4 px-6">
          <MessageInputBox mode="create" onSubmit={createMessage} />
        </div>
      </div>
    </>
  );
};
