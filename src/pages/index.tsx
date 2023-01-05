import { type NextPage } from "next";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { Home } from "@/ui/Home";
import { Login } from "@/ui/Login";

const App: NextPage = () => {
  const { data: session } = useSession();
  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
      <div className="h-[50px] py-4 fixed top-0 w-full border-b-[0.5px] border-slate-700"></div>
        {session?.user ? (
          <Home/>
        ) : (
          <Login />
        )}
      </main>
    </>
  );
};

export default App;
