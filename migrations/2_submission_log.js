var SubmissionLog = artifacts.require("./SubmissionLog.sol");

module.exports = function(deployer) {
  return deployer.deploy(SubmissionLog).then(function() {
    return SubmissionLog.deployed()
  }).then(function(log){
    return log.transferOwnership("0x8eedf056de8d0b0fd282cc0d7333488cc5b5d242")
  });
};
