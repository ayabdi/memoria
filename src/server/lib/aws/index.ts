import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();

export const openFile = async (filepath: string): Promise<string> => {
    const params = { Bucket: 'your-bucket-name', Key: filepath };
    const data = await s3.getObject(params).promise();
    if (!data.Body) {
        throw new Error('No body in data');
    }
    return data.Body.toString();
}

export const saveFile = async (filepath: string, content: string): Promise<void> => {
    const params = { Bucket: 'your-bucket-name', Key: filepath, Body: content };
    await s3.putObject(params).promise();
}

export const listFiles = async (prefix: string): Promise<string[]> => {
    const params = { Bucket: 'your-bucket-name', Prefix: prefix };
    const data = await s3.listObjectsV2(params).promise();

    if (!data.Contents)
        return [];

    return data.Contents.map((obj) => obj.Key || '');
}