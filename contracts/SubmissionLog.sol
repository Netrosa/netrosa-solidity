pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract SubmissionLog is Ownable {

    enum FormState { unknown, open, closed, locked }

    struct Entry {
        bytes32 senderId;
        string value;
    }

    struct FormSettings {
        address transactor;
        FormState state;
    }

    mapping (bytes32 => FormSettings) public forms;
    mapping (bytes32 => bool) public formExists;
    mapping (bytes32 => Entry[]) public entries;
    mapping (bytes32 => string) public decryptionKey;
    mapping (bytes32 => bool) public tokens;

    // each formId can only exist once, globally
    modifier notExisting(bytes32 formId) {
        require(!formExists[formId], "formId already exists");
        _;
    }

    // entries must only be for existing forms
    modifier onlyExisting(bytes32 formId) {
        require(formExists[formId], "formId does not exist");
        _;
    }

    modifier onlyTransactor(bytes32 formId) {
        require(isOwner() || msg.sender == forms[formId].transactor, "only approved transactor allowed");
        _;
    }

    modifier notDuplicateToken(bytes32 tokenId) {
        require(!tokens[tokenId], "tokenId may only be used once");
        _;
    }

    // create a new form with new rules
    function createForm(
        address transactor, 
        string key, 
        bytes32 formId) public onlyOwner notExisting(formId) 
    {
        require(transactor != address(0), "transactor must not be null");
        forms[formId] = FormSettings({
            transactor: transactor,
            state: FormState.open
        });
        decryptionKey[formId] = key;
        formExists[formId] = true;
    }

    // add entry
    function addEntry(
        bytes32 formId,
        bytes32 senderId,
        string value,
        bytes32 tokenId) public onlyExisting(formId) onlyTransactor(formId) notDuplicateToken(tokenId)
    {
        require(bytes(value).length > 0, "value cannot be empty");
        require(forms[formId].state == FormState.open, "form state must be open");
        entries[formId].push(Entry({
            senderId: senderId,
            value: value
        }));
        tokens[tokenId] = true;
    }

    function getEntriesCount(bytes32 formId) public view returns (uint256) {
        return entries[formId].length;
    }


    function getEntryAt(bytes32 formId, uint256 index) public view returns (string) {
        return entries[formId][index].value;
    }

    // override setting
    function setTransactor(bytes32 formId, address transactor) public onlyExisting(formId) onlyTransactor(formId) {
        forms[formId].transactor = transactor;
    }

    function revealKey(bytes32 formId, string key) public onlyExisting(formId) onlyTransactor(formId) {
        require(bytes(key).length > 0, "key cannot be blank");
        decryptionKey[formId] = key;
    }

    function open(bytes32 formId) public onlyExisting(formId) onlyTransactor(formId) {
        forms[formId].state = FormState.open;
    }

    function close(bytes32 formId) public onlyExisting(formId) onlyTransactor(formId) {
        forms[formId].state = FormState.closed;
    }

    function lock(bytes32 formId) public onlyExisting(formId) onlyTransactor(formId) {
        forms[formId].state = FormState.locked;
    }

    function getState(bytes32 formId) public view returns (FormState) {
        return forms[formId].state;
    }

}