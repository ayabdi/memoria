import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/ui/MessageInputBox";
import { MessageRow } from "@/ui/MessageRow";
import { useRef, useState } from "react";
import { cleanMessage } from "@/utils/funtions";
import { Tag } from "@/ui/Tag";

const isWithinFiveMinutes = (dateX: Date, dateY: Date | undefined) => {
  if (!dateY) return false;
  const diff = Math.abs(dateX.getTime() - dateY.getTime());
  return diff < 5 * 60 * 1000;
};

const Home: NextPage = () => {
  const { data: messages, refetch } = trpc.message.allMessages.useQuery();

  const { mutate } = trpc.message.createMessage.useMutation();
  const createMessage = async (text: string) => {
    const message = cleanMessage(text);
    scrollToBottom();
    setUnsentMessages((prev) => [...prev, message]);
    mutate(
      { text: message },
      {
        onSuccess: () => refetch().then(() => removeUnsentMessage(message)),
        onError: () => removeUnsentMessage(message),
      }
    );
  };

  // to display messages that are not yet sent to the server (optimistic UI)
  const [unsentMessages, setUnsentMessages] = useState<string[]>([]);
  const removeUnsentMessage = (text: string) => {
    setUnsentMessages((prev) => {
      const idx = prev.indexOf(text);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    const scroll =
      chatContainerRef.current?.scrollHeight! -
      chatContainerRef.current?.clientHeight!;
    chatContainerRef.current?.scrollTo(0, scroll);
  };
  scrollToBottom();

  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
        {useSession().data?.user ? (
          <div className="flex h-full w-1/2 min-w-[400px] max-w-[900px] flex-col border-x border-slate-700 px-6 pb-5">
            <div
              ref={chatContainerRef}
              className="flex h-[95vw] w-full flex-1 flex-col overflow-y-auto whitespace-pre-wrap first:mt-auto"
            >
              {messages?.map((message, idx) => (
                <MessageRow
                  message={message}
                  key={idx}
                  hideLabels={isWithinFiveMinutes(
                    message.createdAt,
                    messages[idx - 1]?.createdAt
                  )}
                  className={idx === 0 ? "mt-auto" : ""}
                />
              ))}
              {unsentMessages &&
                unsentMessages.map((message, idx) => (
                  <p className="ml-[67px] text-white">{message}</p>
                ))}
            </div>
            <div className="flex-0">
              <MessageInputBox onSubmit={createMessage} />
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
