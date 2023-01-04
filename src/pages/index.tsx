import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/ui/MessageInputBox";
import { MessageRow } from "@/ui/MessageRow";
import { useEffect, useRef, useState } from "react";
import { CreateMessageSchema } from "@/types/messages.schema";
import { Tag } from "@prisma/client";

const isWithinFiveMinutes = (dateX: Date, dateY: Date | undefined) => {
  if (!dateY) return false;
  const diff = Math.abs(dateX.getTime() - dateY.getTime());
  return diff < 5 * 60 * 1000;
};

const Home: NextPage = () => {
  const [pageNo, setPageNo] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);

  const {
    data: messages,
    refetch,
    isFetched,
  } = trpc.message.allMessages.useQuery({ page: pageNo });
  const [allMessages, setAllMessages] = useState<typeof messages>([]);

  const { data: tags } = trpc.message.allTags.useQuery();

  const { mutate } = trpc.message.createMessage.useMutation();
  const createMessage = async (message: CreateMessageSchema) => {
    setUnsentMessages((prev) => [...prev, message]);
    mutate(message, {
      onSuccess: () => refetch().then(() => removeUnsentMessage(message)),
      onError: () => removeUnsentMessage(message),
    });
  };

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

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToLastMessage = () => {
    if (!messages?.length) return;
    const lastMessage = document.getElementById(
      messages[messages.length - 1]?.id!
    );
    if (lastMessage) lastMessage.scrollIntoView();
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

  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
        {user ? (
          <div className="flex h-full w-1/2 min-w-[400px] max-w-[900px] flex-col border-x border-slate-700 px-6 pb-5">
            <div
              ref={chatContainerRef}
              className="flex h-[95vw] w-full flex-1 flex-col overflow-y-auto whitespace-pre-wrap first:mt-auto"
            >
              {allMessages?.map((message, idx) => (
                <div id={message.id}>
                  <MessageRow
                    text={message.text}
                    createdAt={message.createdAt}
                    from={message.from}
                    tags={message.tags.map((tag) => tag.tag)}
                    key={message.id}
                    hideLabels={isWithinFiveMinutes(
                      message.createdAt,
                      allMessages[idx - 1]?.createdAt
                    )}
                    className={idx === 0 ? "mt-auto" : ""}
                  />
                </div>
              ))}

              {unsentMessages &&
                unsentMessages.map((message, idx) => (
                  <MessageRow
                    text={message.text}
                    createdAt={new Date()}
                    from={user?.name!}
                    tags={message.tags as Tag[]}
                    key={idx}
                    className={messages?.length === 0 ? "mt-auto" : ""}
                  />
                ))}
            </div>
            <div className="flex-0">
              <MessageInputBox existingTags={tags} onSubmit={createMessage} />
            </div>
          </div>
        ) : (
          <AuthShowcase />
        )}
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => signOut() : () => signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
