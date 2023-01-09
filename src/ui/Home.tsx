import { useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/ui/components/MessageInputBox";
import { MessageRow } from "@/ui/components/MessageRow";
import { useEffect, useRef, useState } from "react";
import { CreateMessageSchema, MessageType } from "@/types/messages.schema";
import { Tag } from "@prisma/client";
import { MoonLoader } from "react-spinners";
import Avatar from "react-avatar";

const isWithinFiveMinutes = (dateX: Date, dateY: Date | undefined) => {
  if (!dateY) return false;
  const diff = Math.abs(dateX.getTime() - dateY.getTime());
  return diff < 5 * 60 * 1000;
};

export const Home = () => {
  const [pageNo, setPageNo] = useState<number>(1);
  const [tagToFilter, setTagToFilter] = useState<Tag | null>(null);

  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);

  const {
    data: messages,
    refetch,
    isFetched,
    isLoading,
  } = trpc.message.allMessages.useQuery({
    page: pageNo,
  });
  const [allMessages, setAllMessages] = useState<typeof messages>([]);

  const { data: tags } = trpc.message.allTags.useQuery();

  // to display messages that are not yet sent to the server (optimistic UI)
  const [unsentMessages, setUnsentMessages] = useState<CreateMessageSchema[]>(
    []
  );
  const removeUnsentMessage = (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => {
      const idx = prev.indexOf(message);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const { mutate } = trpc.message.createMessage.useMutation();
  const createMessage = async (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => [...prev, message]);
    setPageNo(1);
    mutate(message, {
      onSuccess: () =>
        refetch().then(({ data }) => {
          removeUnsentMessage(message);
          if (data?.length) setAllMessages(data);
        }),
      onError: () => removeUnsentMessage(message),
    });
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // set all messages when the page is loaded for the first time
  useEffect(() => {
    if (isFetched && pageNo === 1) setAllMessages(messages);
  }, [isFetched]);

  // scroll to the last fetched message every page load
  // this to prevent abrupt scrolling to the top when new messages are fetched
  useEffect(() => {
    if (messages) scrollToLastMessage();
  }, [allMessages]);

  // scroll to the bottom when new messages are added but not yet sent to the server
  useEffect(() => {
    if (unsentMessages.length) scrollToBottom();
  }, [unsentMessages]);

  const user = useSession().data?.user;

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
    return () => {
      chatContainerRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, [isFetched, allMessages, messages]);

  // refetch when page number changes
  useEffect(() => {
    if (pageNo > 1)
      refetch().then(({ data }) => {
        if (data?.length) setAllMessages((prev) => [...data, ...prev!]);
        else setHasMoreMessages(false);
      });
  }, [pageNo]);

  const onClickTagToFilter = (tag: Tag) => {
    setTagToFilter(tag);
    setPageNo(1);
  };

  const {
    data: filteredMessages,
    refetch: refetchFilteredMessages,
    isLoading: isFilterLoading,
  } = trpc.message.messagesByTag.useQuery({
    tagId: tagToFilter?.id,
  });

  useEffect(() => {
    if (!tagToFilter) return scrollToBottom();
    refetchFilteredMessages();
  }, [tagToFilter]);

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
            onClickTag={onClickTagToFilter}
            isLoading={tagToFilter ? isFilterLoading : isLoading}
          />

          {unsentMessages &&
            unsentMessages.map((message, idx) => (
              <MessageRow
                content={message.content}
                createdAt={new Date()}
                from={user?.name!}
                type={message.type}
                tags={message.tags as Tag[]}
                onClickTag={onClickTagToFilter}
                key={idx}
                className={messages?.length === 0 ? "mt-auto " : ""}
              />
            ))}
        </div>
        <div className="flex-0 px-6 mt-4">
          <MessageInputBox
            existingTags={tags}
            tagToFilter={tagToFilter}
            onSubmit={createMessage}
          />
        </div>
      </div>
    </>
  );
};

interface DisplayMessagesProps {
  messages: MessageType[];
  onClickTag: (tag: Tag) => void;
  isLoading: boolean;
}
const DisplayMessages = (props: DisplayMessagesProps) => {
  const { messages, onClickTag, isLoading } = props;
  const [messageToEdit, setMessageToEdit] = useState<string | null>(null);

  return (
    <>
      {messages?.map((message, idx) => (
        <div id={message.id} className={idx === 0 ? "mt-auto " : ""}>
          {messageToEdit && messageToEdit === message.id ? (
            <div className="flex px-6">
              <Avatar
                name={message.from}
                size="50"
                className="mb-auto mt-1 mr-4 rounded-md"
              />
              <MessageInputBox
                onSubmit={() => null}
                messageToEdit={message}
                setMessageToEdit={setMessageToEdit}
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
              setMessageToEdit={() => setMessageToEdit(message.id)}
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
        loading={isLoading}
      />
    </>
  );
};
