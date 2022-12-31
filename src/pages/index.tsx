import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/components/MessageInputBox";
import { MessageRow } from "@/components/MessageRow";
import { useRef, useState } from "react";

const isWithinFiveMinutes = (dateX: Date, dateY: Date | undefined) => {
  if (!dateY) return false;
  const diff = Math.abs(dateX.getTime() - dateY.getTime());
  return diff < 5 * 60 * 1000;
};

const Home: NextPage = () => {
  const { data: messages, refetch } = trpc.message.allMessages.useQuery();
  const { mutate } = trpc.message.createMessage.useMutation();
  const createMessage = async (text: string) => {
    scrollToBottom();
    setUnsentMessages((prev) => [...prev, text]);
    mutate(
      { text },
      {
        onSuccess: () => refetch().then(() => removeUnsentMessage(text)),
        onError: () => removeUnsentMessage(text),
      }
    );
  };

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
    const scroll = chatContainerRef.current?.scrollHeight! - chatContainerRef.current?.clientHeight!;
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
            <div ref={chatContainerRef} className="h-[95vw] w-full flex-1 overflow-y-auto flex flex-col justify-end">
              {messages?.map((message, idx) => (
                <MessageRow
                  message={message.text}
                  name={message.from}
                  date={message.createdAt}
                  key={idx}
                  hideLabels={isWithinFiveMinutes(
                    message.createdAt,
                    messages[idx - 1]?.createdAt
                  )}
                />
              ))}
              {unsentMessages &&
                unsentMessages.map((message, idx) => (
                  <MessageRow
                    message={message}
                    name="You"
                    date={new Date()}
                    hideLabels={isWithinFiveMinutes(
                      new Date(),
                      messages?.[messages.length - 1]?.createdAt
                    )}
                  />
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

  const { data: secretMessage } = trpc.auth.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined }
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
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
