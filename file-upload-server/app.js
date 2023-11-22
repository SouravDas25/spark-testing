const cmis = require("cmis");
const {default: axios} = require("axios");
const fs = require("fs");

const path = require("path");
const os = require("os");
const {CmisSessionManager} = require("../../../NCS/Demo/general-srv/srv/docstore/DocumentService");
const express = require("express");
const multer = require("multer");
const busboy = require("busboy");
const bodyParser = require('body-parser');
const cors = require('cors');
const {Readable} = require("stream");

const sdmCredentials = {
    "endpoints": {
        "ecmservice": {
            "url": "https://api-sdm-di.cfapps.us10.hana.ondemand.com/",
            "timeout": 900000
        },
        "migrationservice": {
            "url": "https://sdm-migration.cfapps.us10.hana.ondemand.com"
        }
    },
    "html5-apps-repo": {
        "app_host_id": "9571327e-cbde-41cd-ac47-dd32c4591b16"
    },
    "saasregistryenabled": true,
    "sap.cloud.service": "com.sap.ecm.reuse",
    "uaa": {
        "clientid": "sb-5a2194a0-3a18-489f-9cf6-de60878ddbe4!b137027|sdm-di-DocumentManagement-sdm_integration!b6332",
        "clientsecret": "Dc20lAkRDMb147s5gJkyotoPpwg=",
        "url": "https://demo-nrdspy5x.authentication.us10.hana.ondemand.com",
        "identityzone": "demo-nrdspy5x",
        "identityzoneid": "0892d690-9f17-4830-90e5-0de63db8fc48",
        "tenantid": "0892d690-9f17-4830-90e5-0de63db8fc48",
        "tenantmode": "dedicated",
        "sburl": "https://internal-xsuaa.authentication.us10.hana.ondemand.com",
        "apiurl": "https://api.authentication.us10.hana.ondemand.com",
        "verificationkey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApeb5Vt4QBbtTAYbZij15\nqRZOp+L4qPreIZazrF2QKcDnQ6a4/0Y7IZTNwf3xuyRYtKtLqRcDeyxPM+d+83DJ\n47T408xrYEXWRQbMEDchAPphKu+QzEM/LvKKMAp/HWmqp6wGnP/ZfYoNvM4WRNXN\num0l0Z8dyMsUGqNv3DruuxALFEbd+QuvaP9QCQGM/gS1uNQNjQIU/X12jfQZv5k6\nb/E6wL1jE6dj2Nvp5rG807PptdBG/PIOrEt+Qz/R+/9mXGAmEPKHWr6h6lXR6/O4\nRthMx229mwDGWQ5WpJ6MPcHCY/g8YYN3muxFJhoEFABZc9t+GJ1mEz0QpmGTMkgX\n1wIDAQAB\n-----END PUBLIC KEY-----",
        "xsappname": "5a2194a0-3a18-489f-9cf6-de60878ddbe4!b137027|sdm-di-DocumentManagement-sdm_integration!b6332",
        "subaccountid": "0892d690-9f17-4830-90e5-0de63db8fc48",
        "uaadomain": "authentication.us10.hana.ondemand.com",
        "zoneid": "0892d690-9f17-4830-90e5-0de63db8fc48",
        "credential-type": "instance-secret"
    },
    "uri": "https://api-sdm-di.cfapps.us10.hana.ondemand.com/"
};

async function dummy() {

    // const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
    // const sdmCredentials = VCAP_SERVICES.sdm[0].credentials;

    const REPOSITORY_ID = "sg.com.ncs.document.demo";
    let sm = new CmisSessionManager(sdmCredentials);
    let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");

    // let parentObj = await session.getObjectByPath("/");
    // const content = "dummy-content";
    // let result = await session.createDocument(parentObj.succinctProperties["cmis:objectId"], content, "abcd.txt");
    // console.log(result);

    // let obj = await session.getObjectByPath("/abcd.txt");
    // let result = await session.appendContentFromString(obj.succinctProperties["cmis:objectId"], "-xyz", "abcd.txt");
    // console.log(result);

    // let stream = fs.createReadStream("./mta.yaml");
    // let result = await session.createDocumentFromStream("/", stream, `test.txt`);
    // console.log(result);

    let obj = await session.getObjectByPath("/abcd.txt");
    let stream = fs.createReadStream("./mta.yaml");
    let result = await session.appendContentFromStream(obj.succinctProperties["cmis:objectId"], stream);
    console.log(result);

    // let obj = await session.getObjectByPath("/abcd.txt");
    // let result = await session.getContentStream(obj.succinctProperties["cmis:objectId"]);
    // let writeStream = fs.createWriteStream("./abcd.txt");
    // result.body.pipe(writeStream);

    // let result = await session.createPath(parentObj.succinctProperties["cmis:objectId"], "/a/b/c/d");
    // console.log(result);


    console.log("completed");


}


async function main() {
    const REPOSITORY_ID = "sg.com.ncs.document.demo";

    let sm = new CmisSessionManager(sdmCredentials);
    await sm.createRepositoryIfNotExists(REPOSITORY_ID, "provider", {
        "displayName": "Name of the repository",
        "description": "Description for the repository",
        "repositoryType": "internal",
        "isVersionEnabled": "false",
        "isVirusScanEnabled": "true",
        "skipVirusScanForLargeFile": "false",
        "isThumbnailEnabled": "false",
        "isEncryptionEnabled": "false",
        "hashAlgorithms": "SHA-256",
        "isContentBridgeEnabled": "true",
        "externalId": "sg.com.ncs.document.demo"
    });
    let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");


    const app = express();
    const port = 3000;
    app.use(cors());

    // Set up storage for uploaded files
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/');
        }
    });

    // Create multer instance with the storage configuration
    const upload = multer({storage: storage})

    app.get('/', (req, res) => {
        res.send('Welcome to my server!');
    });

    app.get('/download', async (req, res) => {
        let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");
        let obj = await session.getObjectByPath("/test/automation.js");
        let result = await session.getContentStream(obj.succinctProperties["cmis:objectId"]);
        res.header('Content-Type', obj.succinctProperties["cmis:contentStreamMimeType"]);
        res.header('Content-Length', obj.succinctProperties["cmis:contentStreamLength"]);
        res.header('Content-Disposition', `attachment; filename="${obj.succinctProperties["cmis:name"]}"`);
        result.body.pipe(res);
    });

    app.post('/upload', upload.single('file'), async (req, res) => {
        if (req.file) {
            let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");

            // let writeStream = fs.createWriteStream(req.file.originalname);
            let readStream = fs.createReadStream(req.file.path);
            let response = await session.createDocumentFromStream("/temp", readStream, req.file.originalname)

            res.status(200).end(response.data);
        } else {
            res.status(400).end('Uploaded File not found.');
        }
    });

    app.post('/upload-optimised', async (req, res) => {
        const fileName = req.headers["cs-filename"];
        const opType = req.headers["cs-operation"];
        const mimeType = req.headers["content-type"];

        let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");
        let response = {success: "false"};

        if (opType === "create") {
            response = await session.createDocumentFromStream("/temp", req, fileName);
        }

        if (opType === "append") {
            const obj = await session.getObjectByPath("/temp/" + fileName);
            const objId = obj.succinctProperties["cmis:objectId"];
            response = await session.appendContentFromStream(objId, req);
        }

        res.json(response);
    });

    app.post('/upload-busboy', async (req, res) => {
        const bb = busboy({headers: req.headers});
        let responseArray = [];
        bb.on('file', (name, file, info) => {
            const {filename, encoding, mimeType} = info;
            console.log(
                `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
                filename,
                encoding,
                mimeType
            );
            file.pause();
            file.on('readable', async function () {
                let session = await sm.getOrCreateConnection(REPOSITORY_ID, "provider");
                let count = 1;
                let objId;
                var chunk = file.read();
                // does not work
                if (chunk != null) {
                    console.log(`chuck ${count} ${filename} ${chunk.length}`);
                    let response = await session.createDocumentFromString("/temp", chunk.toString(), filename);
                    objId = response.succinctProperties["cmis:objectId"];
                    responseArray.push(response);
                    while ((chunk = file.read()) != null) {
                        console.log(`chuck ${count} ${filename} ${chunk.length}`);
                        let response = await session.appendContentFromString(objId, chunk.toString(), filename);
                        count++;
                    }
                }
                console.log("chunk count ", count);
            });

            file.on('end', function () {
                console.log("file ended");
                res.writeHead(303, {Connection: 'close', Location: '/'});
                res.json(responseArray);
            });
        });
        bb.on('close', () => {
            console.log('Done parsing form!');
        });
        req.pipe(bb);
    });


    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

main()




