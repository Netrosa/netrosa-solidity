'use strict';
const iopipe = require('@iopipe/iopipe')({ token: process.env.IO_PIPE_TOKEN });
const networks = require("./lib/eth-networks");
const forms = require("./lib/forms")

const open = async (submissionLog, formIdHash, transactor, nonce) => {
    return await submissionLog.open(formIdHash, {from: transactor, nonce:nonce})
}

const close = async (submissionLog, formIdHash, transactor, nonce) => {
    return await submissionLog.close(formIdHash, {from: transactor, nonce:nonce})
}

const lock = async (submissionLog, formIdHash, transactor, nonce) => {
    return await submissionLog.lock(formIdHash, {from: transactor, nonce:nonce})
}

const statusHandlers = {
    "open": open,
    "closed": close,
    "locked": lock
}

module.exports.setStatus = iopipe(async (event, context, callback) => {
  console.log(event);
  context.callbackWaitsForEmptyEventLoop = false;

  let company = event.company;
  let formId = event.formId;
  let status = event.status;

  try{
    if(!company){
        throw new Error("company is required")
    }
    if(!formId){
        throw new Error("formId is required")
    }
    if(!status) {
        throw new Error("authType is required, (key, jwt)")
    }
    if(!statusHandlers[status]){
        throw new Error("allowed statuses: locked, open, closed, attempted="+status)
    }

    let form = await forms.getForm(company, formId);
    let formIdHash = form.formIdHash;
    let nv = await networks.NetvoteProvider(form.network);
    let submissionLog = await nv.SubmissionLog(form.version);
    let transactor = nv.gatewayAddress(); 

    let nonce = await nv.Nonce();
    let tx = await statusHandlers[status](submissionLog, formIdHash, transactor, nonce)
    console.log(tx);

    await forms.setFormStatus(company, formId, status);
    callback(null, {txId: tx.tx})
  } catch(e) {

    console.error(e);
    await forms.setFormError(company, formId, e.message);

    //not repeating because don't want to run out of ether
    callback(null, {error: e.message})
  }

});
