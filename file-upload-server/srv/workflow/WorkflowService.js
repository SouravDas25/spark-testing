const cds = require("@sap/cds");
const axios = require('axios').default;


const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);

const sbpaCredentials = VCAP_SERVICES["process-automation-service"][0].credentials;
const API_PATH = "/workflow/rest/v1/workflow-instances";
const API_FULL_URL = sbpaCredentials.endpoints.api + API_PATH;
const BASE_URL = sbpaCredentials.endpoints.api;


const getWFToken = async function () {
    let res;
    try {

        //get auth token
        const clientId = sbpaCredentials.uaa.clientid
        const clientSecret = sbpaCredentials.uaa.clientsecret
        const tokenUrl = sbpaCredentials.uaa.url + '/oauth/token?grant_type=client_credentials'

        // console.log("clientId:"+clientId);
        // console.log("destinationServiceClientSecret:"+destinationServiceClientSecret);
        // console.log("tokenUrl:"+tokenUrl);

        // before we can fetch the destination from the destination service, we need to retrieve an auth token
        const token = await axios.post(tokenUrl, null, {
            headers: {
                authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            },
        })

        const accessToken = token.data.access_token
        console.log("----token------")
        console.log(accessToken);
        console.log("----token-end-----")
        // with this token, we can now request the "Server" destination from the destination service
        // const headers = {
        //     authorization: 'Bearer ' + accessToken,
        // }

        // let oPayload = {
        //     "definitionId": "ap10.meap-dev-88beeq16.poprocessflow.purchaseOrderProcess",
        //     "context": {
        //         "input": {
        //             "PORequestNumber": "P100",
        //             "PONumber": "P00001",
        //             "DocType": "Z8N1",
        //             "PurGrp": "SG1",
        //             "DropShip": "",
        //             "POValue": 10
        //         }
        //     }
        // };
        // const destinationResult = await axios.post(API_FULL_URL ,oPayload, {
        //     headers,
        // });

        // const oProcessResponse = destinationResult.data

        // console.log(oProcessResponse);
        // res = oProcessResponse;
        res = accessToken;
    } catch (err) {
        console.log(err);
        // LOG.info("in catch function"+err)
        res = err;
    }

    console.log('returning token');
    console.log(res);
    return res;

};

const startWF = async function (accessToken, oPayload) {
    let res;
    try {
        console.log("--startPOProcess--TOKEN:", accessToken);
        // with this token, we can now request the "Server" destination from the destination service
        const headers = {
            authorization: 'Bearer ' + accessToken,
        }

        console.log("--startPOProcess--API_FULL_URL--:" + API_FULL_URL);
        const destinationResult = await axios.post(API_FULL_URL, oPayload, {
            headers,
        });

        const oProcessResponse = destinationResult.data;

        console.log(oProcessResponse);
        res = oProcessResponse;

    } catch (err) {
        console.log(err);
        res = err;
    }
    return res;
};

const cancelWF = async function (accessToken, wfInstanceId) {
    let res;
    if (wfInstanceId === null || wfInstanceId === "") {
        console.log("WF INST ID not found ", wfInstanceId);
        return res;
    }
    try {
        console.log("--canclePOProcess--TOKEN:" + accessToken);
        //with this token, we can now request the "Server" destination from the destination service
        const headers = {
            authorization: 'Bearer ' + accessToken,
        }
        const API_FULL_URL_CCL = `${API_FULL_URL}/${wfInstanceId}`;

        let oPayload = {
            "status": "CANCELED",
            "cascade": true
        };

        console.log("--canclePOProcess--API_FULL_URL_CCL--:" + API_FULL_URL_CCL);

        const destinationResult = await axios.patch(API_FULL_URL_CCL, oPayload, {
            headers,
        });

        const oProcessResponse = destinationResult.data;

        console.log(oProcessResponse);
        res = oProcessResponse;

    } catch (err) {
        console.log(err);
        // LOG.info("in catch function"+err)
        res = err;
    }
    return res;
};

const getReadyTask = async function (accessToken, wfInstanceId) {

    const url = `${BASE_URL}/public/workflow/rest/v1/task-instances?Status=READY&workflowInstanceId=${wfInstanceId}`;
    let config = {
        method: 'GET',
        url: url,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    };

    const res = await axios.request(config);
    console.log(res);

    return res.data;
}


const updateTask = async function (accessToken, taskId, decision) {
    let res;
    const headers = {
        authorization: 'Bearer ' + accessToken,
    }
    const API_FULL_URL_CCL = `${BASE_URL}/public/workflow/rest/v1/task-instances/${taskId}`;

    var oPayload = { "status": "COMPLETED", "decision": decision === "APPR" ? "approve": "reject"};

    const destinationResult = await axios.patch(API_FULL_URL_CCL, oPayload, {
        headers,
    });
    const oProcessResponse = destinationResult.data;

    console.log(oProcessResponse);
    res = oProcessResponse;
    return res;
}

module.exports = {
    getAccessToken: getWFToken,
    start: startWF,
    cancel: cancelWF,
    updateTask: updateTask,
    getReadyTask: getReadyTask
}