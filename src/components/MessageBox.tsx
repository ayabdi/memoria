import React from "react";

interface MessageBoxProps {
  onClick: (message: string) => void;
}

export const MessageBox = (props: MessageBoxProps) => {
  return (
    <div className="h-26 flex w-full flex-col rounded bg-[#36363B] px-3  py-2">
      <div className="h-6 w-full">
        <img className="inline h-6" src="/icons/tag.svg" />
        <img className="ml-1.5 inline h-6" src="/icons/plus.svg" />
      </div>
      <input
        className="mt-3 w-full bg-[#36363B] text-white outline-none"
        placeholder="Jot something down..."
      />
      <img onClick={() => props.onClick('test message')} className="mr-2 h-7 self-end" src="/icons/send.svg" />
    </div>
  );
};
