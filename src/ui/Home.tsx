import { useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/ui/components/MessageInputBox";
import { MessageRow } from "@/ui/components/MessageRow";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { CreateMessageSchema, MessageType } from "@/types/messages.schema";
import { Tag } from "@prisma/client";
import { MoonLoader } from "react-spinners";
import { useAtom } from "jotai";
import Avatar from "react-avatar";
import { messageToEditAtom } from "./store";

export const Home = () => {
  const user = useSession().data?.user;
  const [pageNo, setPageNo] = useState<number>(1);
  const [tagToFilter, setTagToFilter] = useState<Tag | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [allMessages, setAllMessages] = useState<MessageType[]>([]);

  // to display messages that are not yet sent to the server (optimistic UI)
  const [unsentMessages, setUnsentMessages] = useState<CreateMessageSchema[]>(
    []
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    refetch,
    isFetched,
    isLoading,
  } = trpc.message.allMessages.useQuery(
    { page: pageNo },
    {
      enabled: allMessages.length === 0,
      onSuccess: (data) => {
        if (data?.length) setAllMessages(data);
        if (data?.length < 40) setHasMoreMessages(false);
      },
    }
  );
  const { data: tags } = trpc.message.allTags.useQuery();

  // to display messages that are filtered by a tag
  const { data: filteredMessages, isLoading: isFilterLoading } =
    trpc.message.messagesByTag.useQuery(
      { tagId: tagToFilter?.id },
      { enabled: !!tagToFilter, onSuccess: () => scrollToBottom() }
    );

  const { mutate } = trpc.message.createMessage.useMutation();

  const removeUnsentMessage = (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => {
      const idx = prev.indexOf(message);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

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

  const scrollToLastMessage = () => {
    if (!messages?.length) return;
    const lastMessage = document.getElementById(
      messages[messages.length - 1]?.id!
    );
    if (lastMessage) lastMessage.scrollIntoView();
  };

  const scrollToBottom = () => {
    const scroll =
      chatContainerRef.current?.scrollHeight! -
      chatContainerRef.current?.clientHeight!;
    chatContainerRef.current?.scrollTo(0, scroll);
  };

  const onTagFilter = (tag: Tag) => {
    setTagToFilter(tag);
    setPageNo(1);
  };

  // scroll to the last fetched message every page load
  // this to prevent abrupt scrolling to the top when new messages are fetched
  useEffect(() => {
    if (!allMessages?.length) return;

    // scroll to last message when user scrolls to top of page
    if (pageNo > 1) scrollToLastMessage();

    // hack to keep messages view scrolled to the bottom on initial load
    // this is done because markdown messages take a while to render then screws up the scroll position
    const interval = setInterval(() => {
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

  return (
    <>
      <div className="mt-auto flex h-[calc(100vh_-_50px)] w-1/2 min-w-[600px] max-w-[800px] flex-col border-x border-slate-700 pb-5">
        {tagToFilter && (
          <div className="flex w-full border-b-[0.5px] border-slate-700 px-6 py-4 text-lg text-white">
            <img
              src="/icons/left-arrow.svg"
              className="my-auto h-5 cursor-pointer pr-3 "
              onClick={() => {
                setTagToFilter(null);
              }}
            />
            <p> {tagToFilter?.tagName}</p>
          </div>
        )}
        <div
          ref={chatContainerRef}
          className="flex h-full w-full flex-1 flex-col overflow-y-auto whitespace-pre-wrap"
        >
          <DisplayMessages
            messages={tagToFilter ? filteredMessages! : allMessages!}
            onClickTag={onTagFilter}
            isLoading={tagToFilter ? isFilterLoading : isLoading}
            setMessages={setAllMessages}
          />

          {unsentMessages &&
            unsentMessages.map((message, idx) => (
              <MessageRow
                content={message.content}
                createdAt={new Date()}
                from={user?.name!}
                type={message.type}
                tags={message.tags as Tag[]}
                onClickTag={onTagFilter}
                key={idx}
                className={messages?.length === 0 ? "mt-auto " : ""}
              />
            ))}
        </div>
        <div className="flex-0 mt-4 px-6">
          <MessageInputBox tagToFilter={tagToFilter} onSubmit={createMessage} />
        </div>
      </div>
    </>
  );
};

interface DisplayMessagesProps {
  messages: MessageType[];
  onClickTag: (tag: Tag) => void;
  isLoading: boolean;
  setMessages: Dispatch<SetStateAction<MessageType[]>>;
}
const DisplayMessages = (props: DisplayMessagesProps) => {
  const { messages, onClickTag, isLoading, setMessages } = props;
  const [messageToEdit, setMessageToEdit] = useAtom(messageToEditAtom);
  const { mutate: editMessage } = trpc.message.editMessage.useMutation({
    onSuccess: (data) =>
      // update message in messages array
      setMessages &&
      setMessages((prev) => {
        if (!prev) return prev;
        const index = prev.findIndex((m) => m.id === data.id);
        if (index === -1) return prev;
        const newMessages = [...prev];
        newMessages[index] = data;
        return newMessages;
      }),
  });

  return (
    <>
      {messages?.map((message, idx) => (
        <div id={message.id} key={idx} className={idx === 0 ? "mt-auto " : ""}>
          {messageToEdit && messageToEdit.id === message.id ? (
            <div className="flex px-6">
              <Avatar
                name={message.from}
                size="50"
                className="mb-auto mt-1 mr-4 rounded-md"
              />
              <MessageInputBox
                onSubmit={(m: CreateMessageSchema) => {
                  editMessage({ ...m, messageId: message.id });
                  setMessageToEdit(null);
                }}
              />
            </div>
          ) : (
            <MessageRow
              content={message.content}
              createdAt={message.createdAt}
              type={message.type}
              from={message.from}
              tags={message.tags.map((tag) => tag.tag)}
              key={message.id}
              setMessageToEdit={() => setMessageToEdit(message)}
              onClickTag={onClickTag}
              className={idx === 0 ? "mt-auto" : ""}
            />
          )}
        </div>
      ))}
      <MoonLoader
        color="#fff"
        size={70}
        className="m-auto"
        loading={isLoading && !messages?.length}
      />
    </>
  );
};
