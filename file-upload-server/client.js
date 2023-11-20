const axios = require('axios');

const fs = require("fs");
const crypto = require("crypto");
const {join} = require("path");

const chunkSize = 65 * 1024; // 65 KB
const totalFiles = 20;
const totalSize = 12 * 1024 * 1024 * 1024; // 1 GB

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(characters.length);
        randomString += characters.charAt(randomIndex);
    }

    return randomString;
}


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
        const stream = fs.createReadStream(filePath, { highWaterMark: 8 * 1024 * 1024 });
        uploadFileInChunks(file, stream);
    }
}

async function writeInChunks(filename, fileSize) {
    const stream = fs.createWriteStream(filename);
    const chunkSize = Math.min(fileSize / (64 * 1024), fileSize);
    for (let j = 0; j < fileSize; j += chunkSize) {
        stream.write(generateRandomString(chunkSize))
    }
    stream.end(() => {
        console.log("completed", filename)
    });
    // stream.close();
    // stream.destroy();
    console.log("closed", filename)
    await new Promise((resolve, reject) => setTimeout(resolve, 50));
}

async function file_generator() {
    if (fs.existsSync("./file-content")) {
        fs.unlinkSync("./file-content", {recursive: true});
    }
    fs.mkdirSync("./file-content");
    const fileSize = Math.ceil(totalSize / totalFiles);
    console.log("filesize", fileSize);
    for (let i = 0; i < totalFiles; i++) {
        const filename = `./file-content/test-file-${i}.txt`;
        await writeInChunks(filename, fileSize);
    }
}

async function main() {

    // file_generator();

    uploadFiles();
}

main();