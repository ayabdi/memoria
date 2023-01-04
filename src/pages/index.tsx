import { type NextPage } from "next";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { MainFeed } from "@/ui/MainFeed";
import { Login } from "@/ui/Login";

const Home: NextPage = () => {
  const { data: session } = useSession();
  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
        {session?.user ? (
          <MainFeed/>
        ) : (
          <Login />
        )}
      </main>
    </>
  );
};

export default Home;
