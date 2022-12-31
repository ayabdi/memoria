import { useSession } from "next-auth/react";
import React from "react";
import Avatar from "react-avatar";

interface MessageRowProps {
  name: string;
  date: Date;
  message: string;
  hideLabels?: boolean;
}

export const MessageRow = (props: MessageRowProps) => {
  const { name, date, message } = props;
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  const { data: sessionData } = useSession();
  const isYou = sessionData?.user?.name === name;

  return !props.hideLabels ? (
    <div className="justify-between pt-8">
      <div className="flex flex-row items-center">
        <Avatar name={name} size="50" className="rounded-md" />
        <div className="ml-4 flex flex-col">
          <p className="font-semibold text-white">
            {isYou ? "You" : name}
            <span className="ml-1.5 text-xs text-slate-400">
              {formattedDate}
            </span>
          </p>
          <p className="text-white">{message}</p>
        </div>
      </div>
    </div>
  ) : (
    <p className="ml-[67px] text-white">{message}</p>
  );
};
