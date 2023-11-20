using {general as my} from '../db/schema';

@path: '/service/general'
// @requires: 'authenticated-user'
service generalService {

    entity DOCUMENT_TABLE as
        projection on my.Document;

    action createDocument(filename:String, content:String, mimeType:String);
    action updateDocument(filename:String, content:String, mimeType:String);
    function readDocument() returns String;

    
}
