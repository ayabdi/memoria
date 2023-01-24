
import { listFiles, openFile, saveFile } from "../lib/aws";
import { gptCompletion, gptEmbedding } from "../lib/openai";
import { ServerMessageType } from "@/types/messages.schema";
import fs from "fs";
import { User } from "next-auth";
import { z } from "zod";

export const EmbeddingSchema = z.object({
    vector: z.array(z.number()),
    content: z.string(),
    createdAt: z.date(),
    id: z.string()
});
export type Embedding = z.infer<typeof EmbeddingSchema>;

export const executePrompt = async (input: string, user: User) => {
    const [vector, conversations, messages] = await Promise.all([
        createChatEmbedding(input, user.id),
        loadEmbeddings('chat_logs', 20),
        loadEmbeddings('message_logs')
    ]);
    const memories = fetchMemories(vector, messages);

    const prompt = fs.readFileSync('prompt_template.txt', 'utf8')
        .replace('<<MEMORIES>>', memories.join('\n\n'))
        .replace('<<CONVERSATIONS>>', conversations.join('\n\n'))

    // get response
    const response = await createCompletion(prompt, user);
    createChatEmbedding(response, 'MEMORIA_BOT');

    return response
}

export const createMessageEmbedding = async (message: ServerMessageType) => {
    const { content, userId, id, createdAt, tags } = message;
    const tagNames = tags.map(tag => tag.tag.tagName).join(',');
    const combined = `${content} \n Tags: ${tagNames} \n Date: ${createdAt}`
    const vector = await gptEmbedding(combined);

    const jsonContent = JSON.stringify({ vector, combined, createdAt, id });
    await saveFile(`message_logs/${userId}/${id}.json`, jsonContent);

    return vector
}

const createChatEmbedding = async (message: string, from: string) => {
    const vector = await gptEmbedding(message);
    const jsonContent = JSON.stringify({ vector, message });
    await saveFile(`chat_logs/${from}-${Date.now()}.json`, jsonContent);

    return vector
}

export const createCompletion = async (prompt: string, user: User) => {
    const stop = [`${user.email}:`, 'MEMORIA_BOT:'];
    const result = await gptCompletion(prompt, stop);

    // save to logs
    const filename = `${Date.now()}_gpt3.txt`;
    await saveFile(`gpt3_logs/${user.id}/${filename}`, `${prompt}\n\n==========\n\n${result}`);

    return result;
}

export async function loadJson(filepath: string): Promise<any> {
    const data = await openFile(filepath);
    return JSON.parse(data);
}

export async function saveJson(filepath: string, payload: any): Promise<void> {
    const content = JSON.stringify(payload, null, 2);
    await saveFile(filepath, content);
}

export function similarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
        dotProduct += (v1[i] || 0) * (v2[i] || 0);
    }
    const norm1 = Math.sqrt(v1.reduce((sum, value) => sum + value ** 2, 0));
    const norm2 = Math.sqrt(v2.reduce((sum, value) => sum + value ** 2, 0));
    return dotProduct / (norm1 * norm2);
}

export function fetchMemories(vector: number[], logs: Embedding[]): string[] {
    const scores = [];
    for (const log of logs) {
        if (vector === log.vector) {
            continue;
        }
        const score = similarity(log.vector, vector);
        scores.push({ ...log, score });
    }
    const ordered = scores.sort((a, b) => b.score - a.score);
    const top = ordered.filter((log) => log.score > 0.75);

    if (top.length > 0) return top.map((l) => l.content);
    return ordered.slice(0, 10).map((l) => l.content);
}

export async function loadEmbeddings(path: string, limit?: number): Promise<Embedding[]> {
    const data = await listFiles(path);
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const file of jsonFiles) {
        const content = await loadJson(file);
        result.push(EmbeddingSchema.parse(content));
        if (limit && result.length >= limit) break;
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

