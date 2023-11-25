const axios = require('axios');
const FormData = require('form-data');
const fs = require("fs");
const crypto = require("crypto");
const {join} = require("path");
const {filesize} = require("filesize");

const highWaterMark = 8 * 1024 * 1024; // 8 MB
const totalFiles = 10;
const totalSize = 2 * 1024 * 1024 * 1024; // 1 GB


async function uploadFileInChunks(file, stream) {
    // Specify your desired chunk size
    // console.log(content);
    let i = 0;
    for await (const chunk of stream) {
        console.log('Chunk :', file.name, i, chunk.length); // Process the chunk
        const operation = i === 0 ? "create" : "append";
        let config = {
            method: 'post',
            url: 'http://localhost:3000/upload-optimised/',
            headers: {
                'cs-filename': file.name,
                'cs-operation': operation,
                'Content-Type': file.type
            },
            data: chunk
        };
        let response = await axios.request(config);
        console.log(response.data.succinctProperties["cmis:objectId"], response.data.succinctProperties["cmis:contentStreamFileName"]);
        i++;
    }
}

async function uploadFiles() {
    for (const name of fs.readdirSync("./file-content")) {
        const filePath = join("./file-content", name);
        const file = {name: name, type: "plain/txt"};
        const stream = fs.createReadStream(filePath, {highWaterMark: highWaterMark});
        // uploadFileInChunks(file, stream);
        uploadWithFormData(file, stream);
    }
}

async function uploadWithFormData(file, stream) {

    let data = new FormData();
    data.append('file', stream);

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'http://localhost:3000/upload',
        headers: {
            ...data.getHeaders()
        },
        data: data
    };

    const response = await axios.request(config);
    console.log(JSON.stringify(response.data));

}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    // randomizing to eleminate server side caching
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}

// generate a file with the given name, with the fixed size.
async function writeInChunks(filename, fileSize) {
    // writing in chunks to reduce memory usage
    const chunkSize = Math.min(highWaterMark, fileSize);
    for (let j = 0; j < fileSize; j += chunkSize) {
        fs.appendFileSync(filename, generateRandomString(chunkSize));
        console.log(`${filesize(j)} written in ${filename} `);
    }
}

async function generateFiles() {
    fs.mkdirSync("file-content");
    // calculate each file size
    const fileSize = Math.ceil(totalSize / totalFiles);
    for (let i = 0; i < totalFiles; i++) {
        const filename = join("file-content", `test-file-${i}.txt`);
        //  write to all files in chunks concurrently
        writeInChunks(filename, fileSize);
    }
}

async function main() {

    // generateFiles();

    // uploadFiles();
}

main();