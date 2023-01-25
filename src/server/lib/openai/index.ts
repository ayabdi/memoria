import { Configuration, OpenAIApi } from "openai";
import { env } from "../../../env/server.mjs";
import { User } from "@prisma/client";

const config = new Configuration({
    apiKey: env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);


export async function gptEmbedding(input: string): Promise<number[]> {
    const response = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input
    });
    if (!response.data.data || response.data.data.length === 0)
        throw new Error('No embedding found');

    const vector = response.data.data[0]?.embedding
    if (!vector)
        throw new Error('No vector found');

    return vector;
}


export async function gptCompletion(prompt: string, stop: string[]): Promise<string> {
    const max_retry = 5;
    let retry = 0;
    prompt = prompt.replace(/[^\x00-\x7F]/g, "");
    while (true) {
        try {
            const response = await openai.createCompletion({
                model: 'text-davinci-003',
                prompt,
                temperature: 0.0,
                max_tokens: 400,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
                stop
            });
            if (!response?.data?.choices || response?.data?.choices.length === 0) {
                return 'GPT3 error: No response';
            }
            let text = response.data.choices[0]?.text?.trim() || '';
            text = text.replace(/[\r\n]+/g, '\n');
            text = text.replace(/[\t ]+/g, ' ');
            return text;
        } catch (error) {
            retry += 1;
            if (retry >= max_retry) {
                return `GPT3 error: ${error}`;
            }
            console.log(`Error communicating with OpenAI: ${error}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}