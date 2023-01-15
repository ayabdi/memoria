import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";
import React from "react";
import { allMessagesAtom, searchTermAtom, tagsToFilterAtom } from "../store";
import { MoonLoader } from "react-spinners";

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useAtom(searchTermAtom);
  const [tagsToFilter, setTagsToFilter] = useAtom(tagsToFilterAtom);
  const [allMessages, setAllMessages] = useAtom(allMessagesAtom);
  const {
    data: messages,
    refetch,
    isFetching,
  } = trpc.message.allMessages.useQuery(
    {
      tagNames: tagsToFilter?.map((tag) => tag.tagName),
      searchTerm
    },
    {
      enabled: false,
      onSuccess: (data) => {
        console.log(data);
        if (data?.length) setAllMessages(data);
        else setAllMessages([]);
      },
    }
  );

  // search with debounce
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      refetch();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  return (
    <div className="mx-auto -mt-0.5 flex w-1/2 min-w-[600px] max-w-[700px] rounded border-[0.1px] border-zinc-600 bg-[#36363B] px-2.5 py-0.5 text-white shadow">
      <input
        value={searchTerm}
        placeholder="Search"
        className="w-full flex-1 bg-inherit outline-none placeholder:text-slate-200"
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <MoonLoader
        color="#ffff"
        size={15}
        className="mt-0.5"
        loading={isFetching}
      />
      <img
        className="my-auto ml-2 h-5 cursor-pointer"
        src="/icons/filter.svg"
      />
      <img
        className="my-auto ml-2 h-5 cursor-pointer bg-inherit"
        src="/icons/search.svg"
      />
    </div>
  );
};
