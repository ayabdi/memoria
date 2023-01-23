import { Configuration, OpenAIApi } from "openai";
import { listFiles, openFile, saveFile } from '../aws';

import { env } from "../../../env/server.mjs";

const config = new Configuration({
    apiKey: env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

export async function loadJson(filepath: string): Promise<any> {
    const data = await openFile(filepath);
    return JSON.parse(data);
}

export async function saveJson(filepath: string, payload: any): Promise<void> {
    const content = JSON.stringify(payload, null, 2);
    await saveFile(filepath, content);
}

export async function gpt3Embedding(input: string, model: string = 'text-embedding-ada-002'): Promise<number[]> {
    const response = await openai.createEmbedding({
        model,
        input
    });
    if (!response.data.data || response.data.data.length === 0)
        throw new Error('No embedding found');

    const vector = response.data.data[0]?.embedding
    if (!vector)
        throw new Error('No vector found');
    return vector;
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

export async function loadConvo(): Promise<any[]> {
    const data = await listFiles('chat_logs');
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const jsonFile of jsonFiles) {
        const jsonData = await loadJson(jsonFile);
        result.push(jsonData);
    }
    return result.sort((a, b) => a.time - b.time);
}

export async function loadMessages(): Promise<any[]> {
    const data = await listFiles('message_logs');
    const jsonFiles = data.filter((obj) => obj.endsWith('.json'));

    const result = [];
    for (const jsonFile of jsonFiles) {
        const jsonData = await loadJson(jsonFile);
        result.push(jsonData);
    }
    return result.sort((a, b) => a.time - b.time);
}

export function summarizeMemories(memories: any[]): string {
    memories = memories.sort((a, b) => a.time - b.time);
    let block = '';
    for (const mem of memories) {
        block += `${mem.speaker}: ${mem.message}\n\n`;
    }
    return block.trim();
}

export function getLastConversations(conversation: any[], limit: number): any[] {
    try {
        return conversation.slice(-limit);
    } catch (err) {
        return conversation;
    }
}

export async function gpt3_completion(prompt: string, model = 'text-davinci-003', temp = 0.0, top_p = 1.0, tokens = 400, freq_pen = 0.0, pres_pen = 0.0, stop = ['USER:', 'RAVENS:']): Promise<string> {
    const max_retry = 5;
    let retry = 0;
    prompt = prompt.replace(/[^\x00-\x7F]/g, "");
    while (true) {
        try {
            const response = await openai.createCompletion({
                model,
                prompt,
                temperature: temp,
                max_tokens: tokens,
                top_p,
                frequency_penalty: freq_pen,
                presence_penalty: pres_pen,
                stop
            });
            if (!response?.data?.choices || response?.data?.choices.length === 0) {
                return 'GPT3 error: No response';
            }
            let text = response.data.choices[0]?.text?.trim() || '';
            text = text.replace(/[\r\n]+/g, '\n');
            text = text.replace(/[\t ]+/g, ' ');
            const filename = `${Date.now()}_gpt3.txt`;

            await saveFile(`gpt3_logs/${filename}`, `${prompt}\n\n==========\n\n${text}`);
            return text;
        } catch (oops) {
            retry += 1;
            if (retry >= max_retry) {
                return `GPT3 error: ${oops}`;
            }
            console.log(`Error communicating with OpenAI: ${oops}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}