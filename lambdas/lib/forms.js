const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const FORM_TABLE = "forms"

const setFormSuccess = async (company, formId, version, txId, formIdHash) => {
    var params = {
        TableName: FORM_TABLE,
        Key:{
            "company": company,
            "formId": formId
        },
        UpdateExpression: "set version = :v, txStatus = :s, txId = :t, formIdHash = :f, formStatus = :s",
        ExpressionAttributeValues:{
            ":v": version,
            ":s": "complete",
            ":t": txId,
            ":f": formIdHash,
            ":s": "ready"
        }
    };
    await docClient.update(params).promise();
}

const setFormError = async (company, formId, errorMsg) => {
    var params = {
        TableName: FORM_TABLE,
        Key:{
            "company": company,
            "formId": formId
        },
        UpdateExpression: "set txStatus = :s, errorMessage = :m",
        ExpressionAttributeValues:{
            ":s": "error",
            ":m": errorMsg
        }
    };
    await docClient.update(params).promise();
}

const getForm = async (company, formId) => {
    var params = {
        TableName: FORM_TABLE,
        Key:{
            "company": company,
            "formId": formId
        }
    };

    let f = await docClient.get(params).promise();
    return f.Item;
}

const setFormStatus = async (company, id, status) => {
    let params = {
        TableName: FORM_TABLE,
        Key: {
            "company": company,
            "formId": id
        },
        UpdateExpression: "set formStatus = :s",
        ExpressionAttributeValues:{
            ":s": status
        }
    }
    await docClient.update(params).promise();
}

module.exports = {
    setFormSuccess: setFormSuccess,
    setFormError: setFormError,
    setFormStatus: setFormStatus,
    getForm: getForm
}