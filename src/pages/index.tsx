import { type NextPage } from "next";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { Feed } from "@/ui/Feed";
import { Login } from "@/ui/Login";
import { SearchBar } from "@/ui/SearchBar";

const App: NextPage = () => {
  const { data: session } = useSession();
  return (
    <>
      <Head>
        <title>Memoria</title>
        <meta name="description" content="Memoria" />
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen flex-col items-center justify-center bg-zinc-800">
        <div className="fixed z-10 top-0 h-[55px] w-full border-b-[0.5px] border-slate-700 py-4">
          {session?.user  && <SearchBar /> }
        </div>
        {session?.user ? <Feed /> : <Login />}
      </main>
    </>
  );
};

export default App;
