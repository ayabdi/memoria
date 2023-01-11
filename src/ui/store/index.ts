
import { MessageType } from '@/types/messages.schema';
import { Tag } from '@prisma/client';
import { atom , useAtom } from 'jotai'

export const messageToEditAtom = atom<MessageType | null>(null);
export const allTagsAtom = atom<Tag[]>([])