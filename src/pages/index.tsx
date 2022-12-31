import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { trpc } from "../utils/trpc";
import { MessageInputBox } from "@/components/MessageInputBox";
import { MessageRow } from "@/components/MessageRow";

const Home: NextPage = () => {
  const { data: messages } = trpc.message.allMessages.useQuery();

  const { mutate } = trpc.message.createMessage.useMutation();
  const createMessage = (text: string) => mutate({ text });
  
  const isWithinFiveMinutes = (dateX: Date, dateY: Date) => {
    if(!dateY) return false;
    const diff = Math.abs(dateX.getTime() - dateY.getTime());
    return diff < 5 * 60 * 1000;
  };

  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
        {useSession().data?.user ? (
          <div className="flex h-full w-1/2 max-w-[900px] min-w-[400px] border-x border-slate-700">
            <div className="w-full self-end px-6 pb-10">
              {messages?.map((message, idx) => (
                <MessageRow
                  message={message.text}
                  name={message.from}
                  date={message.createdAt}
                  key={idx}
                  hideLabels={isWithinFiveMinutes(message.createdAt, messages[idx - 1]?.createdAt!)}
                />
              ))}
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
