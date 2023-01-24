import { User } from "@prisma/client";
import { listFiles, openFile, saveFile } from "../lib/aws";
import { gptCompletion, gptEmbedding } from "../lib/openai";
import { MessageSchema, ServerMessageType } from "@/types/messages.schema";
import { z } from "zod";

export const EmbeddingSchema = z.object({
    vector: z.array(z.number()),
    content: z.string(),
    createdAt: z.date(),
    id: z.string()
});
export type Embedding = z.infer<typeof EmbeddingSchema>;

export const createEmbedding = async (message: ServerMessageType, pathPrefix: 'message_logs' | 'chat_logs') => {
    const { content, userId, id, createdAt } = message;

    const vector = await gptEmbedding(message.content);

    const jsonContent = JSON.stringify({ vector, content, createdAt, id });
    await saveFile(`${pathPrefix}/${userId}/${id}.json`, jsonContent);
}

export const createCompletion = async (prompt: string, user: User) => {
    const stop = [`${user.email}:`, 'MEMORIA_BOT:'];
    const result = await gptCompletion(prompt, stop);

    // save to logs
    const filename = `${Date.now()}_gpt3.txt`;
    await saveFile(`gpt3_logs/${user.id}/${filename}`, `${prompt}\n\n==========\n\n${result}`);
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

export async function loadEmbeddings(path: string): Promise<Embedding[]> {
    const data = await listFiles(path);
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const jsonFile of jsonFiles) {
        const jsonData = await loadJson(jsonFile);
        result.push(jsonData);
    }
    return result.sort((a, b) => a.time - b.time);
}