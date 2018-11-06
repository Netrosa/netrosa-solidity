let SubmissionLog = artifacts.require("SubmissionLog");

let assertThrowsAsync = async (fn, regExp) => {
    let f = () => {};
    try {
        await fn();
    } catch(e) {
        f = () => {throw e};
    } finally {
        assert.throws(f, regExp);
    }
};

assertNotExists = async (log, formId) => {
    let exists = await log.formExists(formId);
    assert.equal(exists, false, `${formId} should not exist, but does`);
}

assertExists = async (log, formId) => {
    let exists = await log.formExists(formId);
    assert.equal(exists, true, `${formId} should exist`);
}

assertEntryAt = async (log, formId, index, value) => {
    let entry = await log.getEntryAt(formId, index);
    assert.equal(entry, value, `entry was not ${value} as expected: ${entry}`)
}

assertState = async(log, formId, expectedState) => {
    let state = await log.getState(formId);
    assert.equal(formStates[state], expectedState, `expected ${expectedState} but was ${formStates[state]}`)
}

const formStates = [
    "unknown",
    "open",
    "closed",
    "locked"
]


contract('Submission Logging', function (accounts) {
    let log;
    let gateway;
    let other;
    let transactor;
    let formId;

    before(async () => {
        owner = accounts[0];
        gateway = accounts[2];
        transactor = accounts[1];
        other = accounts[3];

        log = await SubmissionLog.new({from: gateway});
        
        formId = web3.sha3("testForm");
    })

    it("should create form settings", async function () {
        await assertNotExists(log, formId);
        await log.createForm(transactor, "", formId, {from: gateway})
        await assertExists(log, formId);
        await assertState(log, formId, "open");
    });

    it("should not allow duplicate form", async function () {
        await assertExists(log, formId);
        await assertThrowsAsync(async ()=>{
            await log.createForm(transactor, "", formId, {from: gateway})
        }, /Exception/);
    });

    it("should not allow create from non-gateway", async function () {
        let differentFormId = web3.sha3("different-sender");
        await assertNotExists(log, differentFormId);
        await assertThrowsAsync(async ()=>{
            await log.createForm(transactor, "", differentFormId, {from: other})
        }, /Exception/);
    });

    it("should submit entry", async function () {
        let value = "value"
        let senderId = web3.sha3("senderId");

        let length = await log.getEntriesCount(formId);
        assert.equal(length, 0, "should have no entries");

        await log.addEntry(formId, senderId, value, {from: transactor});

        length = await log.getEntriesCount(formId);
        assert.equal(length, 1, "should have 1 entry");

        await assertEntryAt(log, formId, 0, value)
    });

    it("should allow a duplicate entry", async function () {
        let value = "value"
        let senderId = web3.sha3("senderId");

        let length = await log.getEntriesCount(formId);
        assert.equal(length, 1, "should have no entries");

        await log.addEntry(formId, senderId, value, {from: transactor});

        length = await log.getEntriesCount(formId);
        assert.equal(length, 2, "should have 1 entry");

        await assertEntryAt(log, formId, 0, value)
        await assertEntryAt(log, formId, 1, value)

    });

    it("should submit a non-duplicate entry", async function () {
        let value = "value2"
        let senderId = web3.sha3("senderId");

        let length = await log.getEntriesCount(formId);
        assert.equal(length, 2, "should have no entries");

        await log.addEntry(formId, senderId, value, {from: transactor});

        length = await log.getEntriesCount(formId);
        assert.equal(length, 3, "should have 1 entry");

        await assertEntryAt(log, formId, 2, value)
    });

    it("should not allow from non-transactor", async function () {
        let value = "value"
        let senderId = web3.sha3("senderId");

        await assertThrowsAsync(async ()=>{
            await log.addEntry(formId, senderId, value, {from: other});
        }, /Exception/);
    });

    it("should allow from non-transactor after change", async function () {
        let value = "value"
        let senderId = web3.sha3("senderId");
        await log.setTransactor(formId, other, {from: transactor});
        await log.addEntry(formId, senderId, value, {from: other});
        await log.setTransactor(formId, transactor, {from: other});
        await log.addEntry(formId, senderId, value, {from: transactor});

    });

    it("should now allow empty value", async function () {
        let value = ""
        let senderId = web3.sha3("senderId");

        await assertThrowsAsync(async ()=>{
            await log.addEntry(formId, senderId, value, {from: transactor});
        }, /Exception/);
    });

    it("should now allow non-existing form", async function () {
        let value = "value"
        let senderId = web3.sha3("senderId");
        let missingFormId = web3.sha3("missing");

        await assertThrowsAsync(async ()=>{
            await log.addEntry(missingFormId, senderId, value, {from: transactor});
        }, /Exception/);
    });

    it("should verify states", async function() {
        await assertState(log, formId, "open");
        await log.close(formId, {from: transactor});
        await assertState(log, formId, "closed");
        await log.open(formId, {from: transactor});
        await assertState(log, formId, "open");
        await log.lock(formId, {from: transactor});
        await assertState(log, formId, "locked");
        await log.open(formId, {from: transactor});
        await assertState(log, formId, "open");
        await assertState(log, "unkownFormId", "unknown");
    })

    it("should reveal key", async function () {
        let key = "publickey"

        let notAKey = await log.publicKey(formId);
        assert.equal(notAKey, "", "should not have a key");

        await log.revealKey(formId, key, {from: transactor});

        let isAKey = await log.publicKey(formId);
        assert.equal(isAKey, key, "should have a key");
    });

    it("should not accept blank key", async function () {
        let key = ""

        await assertThrowsAsync(async ()=>{
            await log.revealKey(formId, key, {from: transactor});
        }, /Exception/);
    });

    it("should not accept key from non-transactor", async function () {
        let key = "publickey"

        await assertThrowsAsync(async ()=>{
            await log.revealKey(formId, key, {from: other});
        }, /Exception/);
    });


});
