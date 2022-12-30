import React from "react";

interface MessageBoxProps {
  onSubmit: (message: string) => void;
}

export const MessageBox = (props: MessageBoxProps) => {
  const [message, setMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    props.onSubmit(message);
    setMessage("");
  };

  return (
    <div className="h-26 flex w-full flex-col rounded bg-[#36363B] px-3  py-2">
      <div className="h-6 w-full">
        <img className="inline h-6" src="/icons/tag.svg" />
        <img className="ml-1.5 inline h-6" src="/icons/plus.svg" />
      </div>
      <form className="flex flex-col" onSubmit={handleSubmit}>
        <input
          className="mt-3 w-full bg-[#36363B] text-white outline-none"
          placeholder="Jot something down..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="self-end">
          <img className="mr-2 h-7" src="/icons/send.svg" />
        </button>
      </form>
    </div>
  );
};
