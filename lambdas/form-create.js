'use strict';
const iopipe = require('@iopipe/iopipe')({ token: process.env.IO_PIPE_TOKEN });
const networks = require("./lib/eth-networks");
const encryption = require("./lib/encryption")
const forms = require("./lib/forms")
const ipfs = require("./lib/ipfs")

module.exports.createForm = iopipe(async (event, context, callback) => {
  console.log(event);
  context.callbackWaitsForEmptyEventLoop = false;

  let network = event.network;
  let company = event.company;
  let formId = event.formId;
  let authType = event.authType;
  let formType = event.formType || "netrosa";
  let status = (formType === "netrosa") ? "ready" : "open";

  if(!company){
    throw new Error("company is required")
  }
  if(!formId){
    throw new Error("formId is required")
  }
  if(!network){
    throw new Error("network is required")
  }
  if(!authType) {
    throw new Error("authType is required, (key, jwt)")
  }

  let nv = await networks.NetvoteProvider(event.network);
  let version = nv.version();
  let submissionLog = await nv.SubmissionLog(version);
  let form = await forms.getForm(company, formId);
  let formIdHash = nv.sha3(event.formId);
  let continuousReveal = event.continuousReveal || false;
  let transactor = nv.gatewayAddress();

  await encryption.generateKeys(formId, authType, form.ttlTimestamp);

  let keyHash = ""
  if(continuousReveal){
    let keyPem = await encryption.getDecryptedKey(formId, "encryption-private")
    keyHash = await ipfs.save({privateKey: keyPem});
    console.log(`saved key ${keyHash} to ipfs`)
  }

  // duplicate, fast succeed to avoid blowing gas
  // TODO: update if this create changes anything
  let exists = await submissionLog.formExists(formIdHash);
  if(exists){
    callback(null, {formId: formIdHash})
    return;
  }

  try{
    let nonce = await nv.Nonce();
    let tx = await submissionLog.createForm(transactor, keyHash, formIdHash, {from: transactor, nonce: nonce})
    console.log(tx);
    
    let txHash = tx.tx;    
    let logAddress = submissionLog.address;
    await forms.setFormSuccess(company, formId, status, version, txHash, formIdHash, logAddress);

    callback(null, {formIdHash: formIdHash, txId: txHash})

  } catch(e){
    console.error(e);
    await forms.setFormError(company, formId, e.message);

    //not repeating because don't want to run out of ether
    callback(null, {error: e.message})
  }
});
