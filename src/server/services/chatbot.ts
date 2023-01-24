import { User } from "@prisma/client";
import { listFiles, openFile, saveFile } from "../lib/aws";
import { gptCompletion, gptEmbedding } from "../lib/openai";
import { MessageSchema } from "@/types/messages.schema";

export const createEmbedding = async (message: MessageSchema) => {
    const { content, userId, id, createdAt } = message;

    const vector = await gptEmbedding(message.content);

    const jsonContent = JSON.stringify({ vector, content, createdAt, id });
    await saveFile(`message_vectors/${userId}/${id}.json`, jsonContent);
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

export function fetchMemories(vector: number[], logs: any[]): any[] {
    const scores = [];
    for (const log of logs) {
        if (vector === log.vector) {
            continue;
        }
        const score = similarity(log.vector, vector);
        log.score = score;
        scores.push(log);
    }
    const ordered = scores.sort((a, b) => b.score - a.score);
    const top = ordered.filter((log) => log.score > 0.75);
    return top.length > 0 ? top : ordered.slice(0, 10);
}

export async function loadConvo(userId: string): Promise<any[]> {
    const data = await listFiles(`message_vectors/${userId}`);
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const jsonFile of jsonFiles) {
        const jsonData = await loadJson(jsonFile);
        result.push(jsonData);
    }
    return result.sort((a, b) => a.time - b.time);
}

export async function loadMessages(userId: string): Promise<any[]> {
    const data = await listFiles(`messages/${userId}`);
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const jsonFile of jsonFiles) {
        const jsonData = await loadJson(jsonFile);
        result.push(jsonData);
    }
    return result.sort((a, b) => a.time - b.time);
}