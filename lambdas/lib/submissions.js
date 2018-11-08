const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE = "formSubmissions"

const setSuccess = async (formId, subId, txId, entryHash) => {
    var params = {
        TableName: TABLE,
        Key:{
            "formId": formId,
            "subId": subId
        },
        UpdateExpression: "set txStatus = :s, entryHash = :h, txId = :t",
        ExpressionAttributeValues:{
            ":s": "complete",
            ":t": txId,
            ":h": entryHash
        }
    };
    await docClient.update(params).promise();
}

const setError = async (formId, subId, errorMsg) => {
    var params = {
        TableName: TABLE,
        Key:{
            "formId": formId,
            "subId": subId
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
    setSuccess: setSuccess,
    setError: setError
}