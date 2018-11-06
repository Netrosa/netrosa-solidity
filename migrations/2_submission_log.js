var SubmissionLog = artifacts.require("./SubmissionLog.sol");

module.exports = function(deployer) {
  deployer.deploy(SubmissionLog);
};
