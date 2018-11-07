const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const FORM_TABLE = "forms"

const setFormSuccess = async (company, formId, version, txId) => {
    var params = {
        TableName: FORM_TABLE,
        Key:{
            "company": company,
            "formId": formId
        },
        UpdateExpression: "set version = :v, txStatus = :s, txId = :t",
        ExpressionAttributeValues:{
            ":v": version,
            ":s": "complete",
            ":t": txId
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

module.exports = {
    setFormSuccess: setFormSuccess,
    setFormError: setFormError
}