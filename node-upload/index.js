const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const PORT = 8000;
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

app.get("/test", (req, res) => {
    console.log({req});
    res.send("Hello world");
});

const mergeChunks = async (fileName, totalChunks) => {
    const chunkDir = __dirname + "/chunks";
    const mergedFilePath = __dirname + "/merged_files";

    if (!fs.existsSync(mergedFilePath)) {
        fs.mkdirSync(mergedFilePath);
    }

    const writeStream = fs.createWriteStream(`${mergedFilePath}/${fileName}`);
    for (let i = 0; i < totalChunks; i++) {
        const chunkFilePath = `${chunkDir}/${fileName}.part_${i}`;
        const chunkBuffer = await fs.promises.readFile(chunkFilePath);
        writeStream.write(chunkBuffer);
        fs.unlinkSync(chunkFilePath); // Delete the individual chunk file after merging
    }

    writeStream.end();
    console.log("Chunks merged successfully");
};

app.post("/uploads", upload.single("file"), async (req, res) => {
    console.log("Hit");
    const chunk = req.file.buffer;
    const chunkNumber = Number(req.body.chunkNumber); // Sent from the client
    const totalChunks = Number(req.body.totalChunks); // Sent from the client
    const fileName = req.body.originalname;

    const chunkDir = __dirname + "/chunks"; // Directory to save chunks

    if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir);
    }

    const chunkFilePath = `${chunkDir}/${fileName}.part_${chunkNumber}`;

    try {
        await fs.promises.writeFile(chunkFilePath, chunk);
        console.log(`Chunk ${chunkNumber}/${totalChunks} saved`);

        if (chunkNumber === totalChunks - 1) {
            // If this is the last chunk, merge all chunks into a single file
            await mergeChunks(fileName, totalChunks);
            console.log("File merged successfully");
        }

        res.status(200).json({message: "Chunk uploaded successfully"});
    } catch (error) {
        console.error("Error saving chunk:", error);
        res.status(500).json({error: "Error saving chunk"});
    }
});

app.get("/download/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const filepath = path.join(__dirname, '/uploads', id);
        // Check if the file exists
        if (!fs.existsSync(filepath)) {
            res.status(404).send('File not found');
            return;
        }
        // Set headers for the download response
        const fileSize = fs.statSync(filepath).size;
        // Handle range requests for resuming downloads
        const range = req.headers.range;
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileSize,
            'Content-Disposition': `attachment; id="${id}"`,
            'Cache-Control': 'public, max-age=31536000'
        });
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            console.log('start: ', start);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            console.log('end: ', end);
            const chunksize = (end - start) + 1;
            res.writeHead(206, {
                'Content-Type': 'application/octet-stream',
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': chunksize,
            });
            const file = fs.createReadStream(filepath, {start, end});
            let downloadedBytes = 0;
            file.on('data', function (chunk) {
                downloadedBytes += chunk.length;
                res.write(chunk);
            });
            file.on('end', function () {
                console.log('Download completed');
                res.end();
            });
            file.on('error', function (err) {
                console.log('Error while downloading file:', err);
                res.status(500).send('Error while downloading file');
            });
        } else {
            // Handle full file download requests
            const file = fs.createReadStream(filepath);
            // file(res);
            file.pipe(res);
        }
    } catch (error) {
        console.log('error: ', error);
        res.send(500)
    }
})

app.listen(PORT, () => {
    console.log(`Port listening on ${PORT}`);
});

/*

130 MB, of memory used when streams is used.


Postgres
General Purpose SSD (gp2) - Storage	$0.115 per GB-month

Mongo DB Dedicated Cluster
8 GB 2 GB 1 vCPU $0.08/hr

Amazon S3
Frequent Access Tier, First 50 TB / Month	$0.023 per GB


SAP Document Management Service
Storage in 100 GB Blocks	1	USD 331.50	GB of storage is defined as the amount of cloud storage. Measured in blocks of 100 gigabyte (GB) units.
Prices
For the following regions:
AWS
Singapore
Microsoft Azure
Singapore
Metric
Ranges
Fixed Fee
Unit Price per Month
Description
API Calls (in blocks of 50,000)	Up to 4		USD 135.20	A single call made between a customer application or a back-end data source and a cloud service API to send any user action or system action.
API Calls (in blocks of 50,000)	From 4		USD 33.80
 */
