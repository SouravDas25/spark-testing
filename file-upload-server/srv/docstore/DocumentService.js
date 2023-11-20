const axios = require('axios').default;
const FormData = require('form-data');
const cmis = require("cmis");
const jwt = require('jsonwebtoken');
const mutexify = require('mutexify/promise')


class CmisSessionManager {

    tenantSessions = new Map()
    lock = mutexify()

    constructor(sdmCredentials) {
        this.apiEndpoint = `${sdmCredentials.endpoints.ecmservice.url}browser`;
        this.sdmCredentials = sdmCredentials;
    }

    async getOrCreateConnection(repositoryName, tenantId) {
        const mapKey = `${tenantId}.${repositoryName}`;
        // to improve performance, other tenants whose session are there should not wait in lock
        if (!this.tenantSessions.has(mapKey) || this.isTokenExpired(this.tenantSessions.get(mapKey).getToken())) {
            // allow only a single instance of this code to run
            const release = await this.lock();
            // check if session is created by some other blocked execution
            if (!this.tenantSessions.has(mapKey) || this.isTokenExpired(this.tenantSessions.get(mapKey).getToken())) {
                let token = await this._fetchJwtToken();
                let session = new ExtendedCmisSession(this.apiEndpoint);
                session.setToken(token);
                await session.loadRepositories();
                session.defaultRepository = session.repositories[repositoryName];
                this.tenantSessions.set(mapKey, session);
                console.log(`${mapKey} session created.`);
            }
            // release the lock
            release();
        }

        return this.tenantSessions.get(mapKey);
    }

    async _fetchJwtToken() {
        // This is to get the oauth token , which is used to create the folder ID
        // implement your own as per requirement
        const oauthUrl = this.sdmCredentials.uaa.url;
        const oauthClient = this.sdmCredentials.uaa.clientid;
        const oauthSecret = this.sdmCredentials.uaa.clientsecret;
        const tokenUrl = oauthUrl + '/oauth/token?grant_type=client_credentials&response_type=token'
        const config = {
            headers: {
                Authorization: "Basic " + Buffer.from(oauthClient + ':' + oauthSecret).toString("base64")
            }
        }
        const res = await axios.get(tokenUrl, config);
        return res.data.access_token;
    }

    isTokenExpired(token) {
        try {
            const decodedToken = jwt.decode(token);
            if (decodedToken && decodedToken.exp) {
                const currentTimestamp = Math.floor(Date.now() / 1000); // Get the current time in seconds
                return decodedToken.exp < currentTimestamp;
            }
            return true; // Token has no expiration information
        } catch (error) {
            return true; // Token decoding failed
        }
    }

    async createRepositoryIfNotExists(repoId, tenantId, config) {
        let token = await this._fetchJwtToken();

        let session = new ExtendedCmisSession(this.apiEndpoint);
        session.setToken(token);
        await session.loadRepositories();
        if (session.repositories.hasOwnProperty(repoId)) {
            return;
        }

        config["externalId"] = repoId;

        let axiosConf = {
            method: 'post',
            url: `${this.sdmCredentials.endpoints.ecmservice.url}rest/v2/repositories`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            data: JSON.stringify({
                "repository": config
            })
        };

        const response = await axios.request(axiosConf);
        return response.data;

    }

}


class ExtendedCmisSession extends cmis.CmisSession {

    getToken() {
        return this.token;
    }

    async createPath(parentFolderId, path) {
        const pathElements = path.split('/');
        let currentFolderId = parentFolderId;
        let createdFolder;
        for (const folderName of pathElements) {
            if (folderName) {
                createdFolder = await this.createFolder(currentFolderId, folderName);
                currentFolderId = createdFolder.succinctProperties['cmis:objectId'];
            }
        }
        return createdFolder;
    }

    async createDocumentFromString(parentPath, content, filename) {
        let parentObj = await this.getObjectByPath(parentPath);
        return await this.createDocument(parentObj.succinctProperties["cmis:objectId"], content, filename);
    }


    async createDocumentFromStream(parentPath, content, filename) {

        let data = new FormData();
        data.append('cmisaction', 'createDocument');
        data.append('succinct', 'true');
        data.append('propertyId[0]', 'cmis:name');
        data.append('propertyValue[0]', filename);
        data.append('propertyId[1]', 'cmis:objectTypeId');
        data.append('propertyValue[1]', 'cmis:document');
        data.append('filename', filename);
        data.append('_charset', 'UTF-8');
        data.append('includeAllowableActions', 'true');
        data.append('media', content);

        const accessToken = this.token;

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${this.url}/${this.defaultRepository.repositoryId}/root${parentPath}`,
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                ...data.getHeaders()
            },
            data: data
        };

        const res = await axios.request(config);

        return res.data;

    }

    async appendContentFromString(objectId, content, filename) {
        return await this.appendContentStream(objectId, content, false, filename);
    }

    async appendContentFromStream(objectId, contentStream, isLastChunk = false) {
        let data = new FormData();
        data.append('cmisaction', 'appendContent');
        data.append('succinct', 'true');
        data.append('isLastChunk', isLastChunk.toString());
        data.append('objectId', objectId);
        data.append('media', contentStream);

        const accessToken = this.token;

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${this.url}/${this.defaultRepository.repositoryId}/root`,
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                ...data.getHeaders()
            },
            data: data
        };

        const response = await axios.request(config);

        return response.data;
    }

}

module.exports = {
    CmisSessionManager,
}