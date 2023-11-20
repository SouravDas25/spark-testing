const cds = require("@sap/cds");

const LOG = cds.log('generalService');
const {Base64} = require('js-base64');
const fs = require('fs');
const {v4: uuidv4} = require('uuid');
const workflowService = require("./workflow/WorkflowService");
const {CmisSessionManager} = require("./docstore/DocumentService");

module.exports = cds.service.impl(async function () {

    const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
    const sdmCredentials = VCAP_SERVICES.sdm[0].credentials;
    const REPOSITORY_ID = "sg.com.ncs.document.demo";
    let sm = new CmisSessionManager(sdmCredentials);
    let documentService = await sm.openConnection(REPOSITORY_ID);

    const db = await cds.connect.to('db');

    function decodeBase64(base64String) {
        try {
            // Use the atob function from the js-base64 library
            const decodedString = decodeURIComponent(escape(Base64.atob(base64String)));
            return decodedString;
        } catch (error) {
            console.error('Error decoding Base64:', error);
            return null;
        }
    }


    const triggerDocumentWorkflow = async function (docItem) {
        const accessToken = await workflowService.getAccessToken();
        const oPayload = {
            "definitionId": "us10.demo-nrdspy5x.documentapproval.documentApprovalVerification",
            "context": {
                "docid": docItem.ID,
                "doctype": docItem.DOC_TYPE,
                "docno": docItem.DOC_NO,
                "docname": docItem.NAME
            }
        };
        const data = await workflowService.start(accessToken, oPayload);
        console.log('in triggerWorkflow', data);
        return data;
    }

    const updateRework = async function (docItem) {
        const accessToken = await workflowService.getAccessToken();
        const data = await workflowService.getReadyTask(accessToken, docItem.WF_INSTANCE_ID);
        console.log("docItem", docItem);
        console.log("tasks", data);
        const task = data.find(item => item.subject.includes("Rework"));
        console.log("task", task);

        let res = await workflowService.updateTask(accessToken, task.id, "APPR");

    }

    this.on('createDocument', async (context) => {
        let res;

        try {

            let data = context.data;

            const content = decodeBase64(data.content);

            console.log(content);
            const newUuid = uuidv4();

            const documentDetails = await documentService.createFromStringContent("/test", content, newUuid);

            console.log(documentDetails);

            const newDoc = {
                ID: newUuid,
                DOC_NO: newUuid.substring(0, 8).toUpperCase(),
                DOC_TYPE: "PURDOC", // PURDOC || SALEDOC
                DOC_ID: documentDetails.id,
                NAME: data.filename,
                MIME_TYPE: data.mimeType,
                STATUS: "NEW",
                CREATED_BY: "",
            };

            let query = INSERT.into("GENERAL_DOCUMENT").entries(newDoc);

            let insertedDoc = await db.tx(context).run(query);
            console.log(insertedDoc);

            const wfResponse = await triggerDocumentWorkflow(newDoc);

            console.log("wfResponse", wfResponse);

            query = UPDATE("GENERAL_DOCUMENT").where({ID: newUuid}).set({
                STATUS: "PENDING",
                WF_INSTANCE_ID: wfResponse.id
            });

            let updatedDoc = await db.tx(context).run(query);

            return insertedDoc;

        } catch (err) {
            LOG.error("in catch function", err)
            res = err;
        }

        return 'No Data';

    });

    this.on('updateDocument', async (context) => {
        let res;

        try {

            if (context.req.query.id === null || context.req.query.id === "") {
                return "Id not found";
            }

            let query = SELECT.from("GENERAL_DOCUMENT").where({ID: context.req.query.id})

            let document = await db.tx(context).run(query);
            if (document.length <= 0) return "Document Not Found";
            document = document[0];

            let data = context.data;
            console.log(data);
            const content = decodeBase64(data.content);

            const newUuid = uuidv4();

            const documentDetails = await documentService.createFromStringContent("test", content, newUuid);
            // await triggerDocumentWorkflow();
            console.log(documentDetails);

            await updateRework(document);

            const ID = context.req.query.id;

            query = UPDATE("GENERAL_DOCUMENT").where({
                ID: ID
            }).set({
                DOC_ID: documentDetails.id,
                NAME: data.filename,
                MIME_TYPE: data.mimeType,
                STATUS: "PENDING"
            });

            let updatedDoc = await db.tx(context).run(query);
            console.log(updatedDoc);


        } catch (err) {
            LOG.error("in catch function", err)
            res = err;
        }

        return 'No Data';

    });

    this.on('readDocument', async context => {
        console.log('in readDocument');
        let query = SELECT.from("GENERAL_DOCUMENT").where({ID: context.req.query.id})

        let document = await db.tx(context).run(query);
        if (document.length <= 0) return "Not Found";

        document = document[0];

        console.log(document);

        const content = await documentService.readDocument(document.DOC_ID);
        // console.log(data);

        context.res.setHeader('Content-Type', document.MIME_TYPE);
        context.res.setHeader('Content-Disposition', `attachment; filename="${document.NAME}"`);


        // Send the content as a file
        context.res.send(content);

    })


});