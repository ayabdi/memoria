import { gptCompletion, gptEmbedding } from "../lib/openai";
import { CreateMessageSchema, ServerMessageType } from "@/types/messages.schema";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { User } from "next-auth";
import { prisma } from "@/server/db/client";
import path from "path";

export const executePrompt = async (prompt: number[], messages: ServerMessageType[], user: User) => {
    const memories = selectMemories(prompt, messages)
    const conversations = await fetchConversations(user.id, 10);

    const templateFile = path.join(process.cwd(), 'src', 'server', 'misc', 'prompt_template.txt')
    const template = readFileSync(templateFile, 'utf8')

    const fullPrompt = template
        .replace('<<MEMORIES>>', memories.join('\n\n'))
        .replace('<<CONVERSATION>>', conversations)

    const response = await createCompletion(fullPrompt, user);

    return response
}

const fetchConversations = async (userId: string, limit: number) => {
    const response = await prisma.chatLogs.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });

    const conversations = response.reverse().map(c => `${c.from}: ${c.content.replace("@chat", "")}`).join('\n\n')
    return conversations
}

export const createMessageEmbedding = async (message: CreateMessageSchema) => {
    const { content, tags } = message;

    const input = combined(content, new Date(), tags?.map(t => t.tagName));
    const vector = await gptEmbedding(input)

    return vector
}

export const createChatEmbedding = async (message: string, from: string, userId: string) => {
    const vector = await gptEmbedding(`${from}: ${message}`);
    await prisma.chatLogs.create({
        data: {
            content:  message,
            from,
            vector,
            userId
        },
    });

    return vector
}

export const createCompletion = async (prompt: string, user: User) => {
    const stop = [`${user.email}:`, 'MEMORIA_BOT:'];
    const result = await gptCompletion(prompt, stop);

    return result;
}

export const loadChatLogs = async (prisma: PrismaClient, userId: string) => {
    return prisma.chatLogs.findMany({
        where: {
            userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}

export const selectMemories = (inputVector: number[], messages: ServerMessageType[]): string[] => {
    const scores = messages.map(message => {
        const score = similarity(message.vector, inputVector);
        return { ...message, score };
    });
    const ordered = scores.sort((a, b) => b.score - a.score);
    const top = ordered.filter((log) => log.score > 0.74);

    if (top.length > 0) return top.map((l) => combined(l.content, l.createdAt, l.tags.map(t => t.tag.tagName)));
    return ordered.slice(0, 10).map((l) => combined(l.content, l.createdAt, l.tags.map(t => t.tag.tagName)));
}

const similarity = (v1: number[], v2: number[]): number => {
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += (v1[i] || 0) * (v2[i] || 0);
    }
    const norm1 = Math.sqrt(v1.reduce((sum, value) => sum + value ** 2, 0));
    const norm2 = Math.sqrt(v2.reduce((sum, value) => sum + value ** 2, 0));
    return dotProduct / (norm1 * norm2);
}

const combined = (content: string,  createdAt: Date, tagNames?: string[]) => {
    return `${content} ${tagNames?.length ? `\nTags: ${tagNames.join(', ')}` : ''} \nDate: ${createdAt}`
}