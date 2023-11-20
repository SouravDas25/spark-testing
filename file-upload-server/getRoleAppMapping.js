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