import { env } from '@/env/server.mjs';
import got from 'got';


const apiKey = env.PINECONE_API_KEY

const pinecone = got.extend({
    prefixUrl: 'https://squad-784c8ba.svc.us-east1-gcp.pinecone.io/',
    headers: {
        'Content-Type': 'application/json',
        'API-Key': apiKey,
    },  
});

export const addVector = async (id: string, values ) => {
    const response = await pinecone.post('vectors/upsert', {
        json: {
            vector,
            id: userId,
        },
    });
    return response;
}


