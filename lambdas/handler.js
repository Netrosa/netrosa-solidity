'use strict';
const iopipe = require('@iopipe/iopipe')({ token: process.env.IO_PIPE_TOKEN });
const networks = require("./lib/eth-networks");


module.exports.createForm = async (event, context) => {
  let nv = await networks.NetvoteProvider(event.network);
  let version = nv.version();
  let submissionLog = await nv.SubmissionLog(version);

  let formId = event.formId;
  let continuousReveal = event.continuousReveal || false;
  


  //generate keys

//  .createForm(transactor, "", formId, {from: gateway})

};
