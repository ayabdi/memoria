
import { MessageSchema, TagSchema } from '@/types/messages.schema';
import { atom } from 'jotai'

export const messageToEditAtom = atom<MessageSchema | null>(null);
export const tagsToFilterAtom = atom<TagSchema[] | null>(null);