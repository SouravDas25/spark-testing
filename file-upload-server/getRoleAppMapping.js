const axios = require("axios");

async function uploadFileInChunks(file, stream) {
    let i = 0;
    // loop through chuck by chunk, only load 1 chunk at a time to memory
    for await (const chunk of stream) {
        console.log('Chunk :', file.name, i, chunk.length);
        // first we should create the file then append each of them.
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

        let status = 0;
        let response;

        // loop with delay until the server accepts the file.
        while (status !== 200) {
            try {
                response = await axios.request(config);
                status = response.status;
            } catch (e) {
                status = e.status;
            }
            // wait for 3s then try again
            await sleep(3000);
        }

        console.log(response.data);
        i++;
    }
}