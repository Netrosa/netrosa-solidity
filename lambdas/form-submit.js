'use strict';
const iopipe = require('@iopipe/iopipe')({ token: process.env.IO_PIPE_TOKEN });
const networks = require("./lib/eth-networks");
const forms = require("./lib/forms")
const submissions = require("./lib/submissions")
const ipfs = require("./lib/ipfs")

module.exports.addEntry = iopipe(async (event, context, callback) => {
    console.log(event);
    context.callbackWaitsForEmptyEventLoop = false;


    let formId = event.formId;
    let tokenId = event.subId;
    let senderId = event.senderId;
    let payload = event.payload;
    let company = event.company;

    try {
        if (!company) {
            throw new Error("company is required")
        }
        if (!formId) {
            throw new Error("formId is required")
        }
        if (!tokenId) {
            throw new Error("subId is required")
        }
        if (!senderId) {
            throw new Error("authType is required, (key, jwt)")
        }
        if (!payload) {
            throw new Error("paylod is required")
        }

        let entryHash = await ipfs.save(payload);

        let form = await forms.getForm(company, formId);
        let nv = await networks.NetvoteProvider(form.network);
        let submissionLog = await nv.SubmissionLog(form.version);
        let transactor = nv.gatewayAddress();

        let nonce = await nv.Nonce();
        let tx = await submissionLog.addEntry(form.formIdHash, senderId, entryHash, tokenId, {from: transactor, nonce: nonce});

        console.log(tx);

        await submissions.setSuccess(formId, tokenId, tx.tx, entryHash);


        callback(null, { txId: tx.tx })
    } catch (e) {
        console.error(e);
        await submissions.setError(formId, tokenId, e.message);
        //not repeating because don't want to run out of ether
        callback(null, { error: e.message })
    }

});
