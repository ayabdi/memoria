
import { MessageSchema } from '@/types/messages.schema';
import { atom } from 'jotai'

export const messageToEditAtom = atom<MessageSchema | null>(null);
export const allMessagesAtom = atom<MessageSchema[]>([]);