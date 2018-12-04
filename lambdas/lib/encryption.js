const AWS = require("aws-sdk");
const kmsClient = new AWS.KMS();
const docClient = new AWS.DynamoDB.DocumentClient();
const ursa = require('ursa')

const KEY_TABLE = "formKeys"
const ENCRYPT_KEY_ARN = "arn:aws:kms:us-east-1:891335278704:key/5880ec39-30e8-4995-b75a-e3abee2dbba0";

const addKey = async (formId, keyType, key, ttl) => {
    let obj = {
        formId: formId,
        keyType: keyType,
        value: key,
        encrypted: true,
        txTimestamp: new Date().getTime()
    }
    if(ttl){
        obj.ttlTimestamp = ttl;
    }

    let params = {
        TableName: KEY_TABLE,
        Item: obj
    }
    await docClient.put(params).promise();
    return obj.formId;
}

const addUnencryptedKey = async (formId, keyType, key, ttl) => {
    let obj = {
        formId: formId,
        keyType: keyType,
        value: key,
        encrypted: false,
        txTimestamp: new Date().getTime()
    }
    if(ttl){
        obj.ttlTimestamp = ttl;
    }

    let params = {
        TableName: KEY_TABLE,
        Item: obj
    }
    await docClient.put(params).promise();
    return obj.formId;
}

const kmsEncrypt = async (ctx, plaintext) => {
    const params = { EncryptionContext:ctx, KeyId: ENCRYPT_KEY_ARN, Plaintext: plaintext };
    const result = await kmsClient.encrypt(params).promise()
    return result.CiphertextBlob.toString("base64");
}

const kmsDecrypt = async (ctx, encryptedString) => {
    const cipherText = Buffer.from(encryptedString, "base64");
    const params = { EncryptionContext:ctx, CiphertextBlob: cipherText };
    const result = await kmsClient.decrypt(params).promise();
    return result.Plaintext.toString();
}

const getKey = async (formId, keyType) => {
    var params = {
        TableName: KEY_TABLE,
        Key:{
            "formId": formId,
            "keyType": keyType
        }
    };
    let data = await docClient.get(params).promise();
    return data.Item;
}

const generateKey = async (formId, keyType, ttl) => {
    let key = ursa.generatePrivateKey();
    let plaintext = key.toPrivatePem('base64');
    const ctx = {"id": formId,"type": keyType}
    let encrypted = await kmsEncrypt(ctx, plaintext);
    await addKey(formId, keyType, encrypted, ttl);
    return {
        plaintext: plaintext,
        encrypted: encrypted
    }
}

const encrypt = async (id, keyType, key) => {
    const ctx = {"id": id,"type": keyType}
    return await kmsEncrypt(ctx,  key);
}

const getDecryptedKey = async (formId, keyType) => {
    let key = await getKey(formId, keyType);
    const ctx = {"id": formId,"type": keyType}
    return await kmsDecrypt(ctx, key.value);
}

const generateKeyPair = async (formId, prefix, ttl) => {
    let keys = ursa.generatePrivateKey();
    let encryptedPrivatePem = await encrypt(formId, `${prefix}-private`, keys.toPrivatePem('base64'))
    let pubPem = keys.toPublicPem('base64');
    await addKey(formId, `${prefix}-private`, encryptedPrivatePem, ttl)
    await addUnencryptedKey(formId, `${prefix}-public`, pubPem, ttl);
}

const deleteSubmitKey = async (formId) => {
    let params = {
        TableName: KEY_TABLE,
        Key:{
            "formId": formId,
            "keyType": "anonymize"
        },
        UpdateExpression: "set #vl = :s",
        ExpressionAttributeNames: {
            "#vl": "value"
        },
        ExpressionAttributeValues:{
            ":s": "CLEARED"
        }
    }
    await docClient.update(params).promise();
}

const generateKeys = async (formId, authType, ttl) => {
    let tasks = [
        generateKey(formId, "anonymize", ttl),
        generateKeyPair(formId, "encryption", ttl),
    ];
    // if key, then netrosa will sign using own JWT keypair
    if(authType === "key"){
        tasks.push(generateKeyPair(formId, "jwt", ttl))
    }
    await Promise.all(tasks);
}

module.exports = { 
    generateKeys: generateKeys,
    deleteSubmitKey: deleteSubmitKey,
    getDecryptedKey: getDecryptedKey
}