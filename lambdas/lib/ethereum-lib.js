const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient()

let NETWORK;

const rp = require('request-promise-native');
const HDWalletProvider = require("truffle-hdwallet-provider");
const contract = require('truffle-contract');
const Web3 = require("web3");

const contractCache = {}

let web3Provider;
let web3;
let web3Defaults;

const initProvider = async () => {
    if(!NETWORK) {
        throw new Error("network not initialized");
    }
    let secrets = new AWS.SecretsManager();
    let secretName = "election/ethereum/mnemonic";
    let secret = await secrets.getSecretValue({SecretId: secretName}).promise();
    let mnemonic = JSON.parse(secret.SecretString)[NETWORK.id]
    web3Provider = new HDWalletProvider(mnemonic, NETWORK.url);
    web3 = new Web3(web3Provider);
    web3.eth.defaultAccount = web3Provider.getAddress();
    web3Defaults = {
        from: web3Provider.getAddress(),
        chainId: NETWORK.chainId,
        gas: NETWORK.gas
    };
    
    if(NETWORK.gasPrice){
        web3Defaults.gasPrice = NETWORK.gasPrice;
    }
}

const toContractUrl = (name, version) => {
    return `https://s3.amazonaws.com/netrosa-contracts/${version}/${name}.json`
}

const getAbi = async (name, version) => {
    const url = toContractUrl(name, version);
    let c = contractCache[url];
    if(!c) {
        c = contract(await rp(url, { json: true }))
        console.log(`loaded ${name}/${version} from S3`)
    }
    //set every time in case config changed in dynamodb (gas price mainly)
    c.setProvider(web3Provider)
    c.defaults(web3Defaults);
    contractCache[url] = c;
    return c;
}
const getNonce = () => {
    const table = "nonces";
    const expression = "set nonce = nonce + :val"
    return new Promise((resolve, reject) => {
        var params = {
            TableName: table,
            Key:{
                "name": NETWORK.id
            },
            UpdateExpression: expression,
            ExpressionAttributeValues:{
                ":val": 1
            },
            ReturnValues:"UPDATED_NEW"
        };

        docClient.update(params, function(err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                resolve(data.Attributes.nonce);
            }
        });
    })
}



module.exports = {
    Init: async (network) => {
        let params = {
            TableName: "networks",
            Key:{
                "id": network
            }
        };
        let data = await docClient.get(params).promise();
        NETWORK = data.Item;
        await initProvider();
    },
    Nonce: () => {
        return getNonce();
    },
    SubmissionLog: async (version) => {
        let abi = await getAbi("SubmissionLog", version)
        return await abi.deployed();
    },
    network: () => {
        return NETWORK.id
    },
    version: () => {
        return NETWORK.netrosaVersion
    },
    gatewayAddress: () => {
        return web3Provider.getAddress();
    },
    web3: () => {
        return web3;
    },
    ethUrl: () => {
        return NETWORK.url;
    },
    sha3: (str) => {
        return web3.utils.sha3(str)
    }
}