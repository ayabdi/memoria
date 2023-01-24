import * as AWS from 'aws-sdk';
import { env } from "../../../env/server.mjs";

const s3 = new AWS.S3({
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
});

const Bucket = 'memoria.io'

export const openFile = async (filepath: string): Promise<string> => {
    const params = { Bucket, Key: filepath };
    const data = await s3.getObject(params).promise();
    if (!data.Body) {
        throw new Error('No body in data');
    }
    return data.Body.toString();
}

export const saveFile = async (filepath: string, content: any): Promise<void> => {
    const params = { Bucket, Key: filepath, Body: content };
    await s3.putObject(params).promise();
}

export const listFiles = async (prefix: string): Promise<string[]> => {
    const params = { Bucket, Prefix: prefix };
    const data = await s3.listObjectsV2(params).promise();

    if (!data.Contents)
        return [];

    return data.Contents.map((obj) => obj.Key || '');
}