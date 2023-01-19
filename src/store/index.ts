
import { MessageSchema, TagSchema } from '@/types/messages.schema';
import { atom } from 'jotai'

export const messageToEditAtom = atom<MessageSchema | null>(null);
export const displayedMessagesAtom = atom<MessageSchema[] | null>(null);
export const tagsToFilterAtom = atom<TagSchema[] | null>(null);
export const searchModeAtom = atom<boolean>(false);
export const searchTermAtom = atom<string| null>(null);