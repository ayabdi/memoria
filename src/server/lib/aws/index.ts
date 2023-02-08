import * as AWS from 'aws-sdk';
import { env } from "../../../env/server.mjs";

const s3 = new AWS.S3({
    credentials: {
        accessKeyId: env._AWS_ACCESSKEY_ID,
        secretAccessKey: env._AWS_SECRET_ACCESSKEY
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
    let resultKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
        const params = { Bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: continuationToken };
        const data = await s3.listObjectsV2(params).promise();
        if (!data.Contents)
            break;

        resultKeys = resultKeys.concat(data.Contents.map((obj) => obj.Key || ''));
        continuationToken = data.NextContinuationToken;
    } while (continuationToken);

    return resultKeys
}

export const deleteFile = async (filepath: string): Promise<void> => {
    const params = { Bucket, Key: filepath };
    await s3.deleteObject(params).promise();
}