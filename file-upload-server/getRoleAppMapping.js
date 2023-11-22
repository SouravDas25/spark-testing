import fs from "fs";
import {filesize} from "filesize";

async function writeInChunks(filename, fileSize) {
    // writing in chunks to reduce memory usage
    const chunkSize = Math.min(highWaterMark, fileSize);
    for (let j = 0; j < fileSize; j += chunkSize) {
        // write 8 mb to file
        fs.appendFileSync(filename, generateRandomString(chunkSize));
        console.log(`${filesize(j)} written in ${filename} `);
    }
}