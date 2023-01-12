
import { MessageType } from '@/types/messages.schema';
import { atom , useAtom } from 'jotai'

export const messageToEditAtom = atom<MessageType | null>(null);
export const allMessagesAtom = atom<MessageType[]>([]);