// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgriDirectWheatTracker
 * @dev Smart contract for tracking wheat lifecycle events on-chain
 */
contract AgriDirectWheatTracker {
    // Event emitted when a new lifecycle event is recorded
    event EventRecorded(
        bytes32 indexed productIdHash,
        string eventName,
        string primaryCID,
        uint256 timestamp,
        address indexed actor,
        uint256 indexed blockNumber
    );

    // Mapping from productIdHash to last event block number
    mapping(bytes32 => uint256) public lastEventBlockNumber;
    
    // Mapping from productIdHash to event count
    mapping(bytes32 => uint256) public eventCount;
    
    // Owner of the contract
    address public owner;
    
    // Mapping of registered actors (farmer, distributor, retailer addresses)
    mapping(address => bool) public registeredActors;
    
    // Modifier to restrict access to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Modifier to allow registered actors or owner
    modifier onlyRegisteredActor() {
        require(registeredActors[msg.sender] || msg.sender == owner, "Not a registered actor");
        _;
    }
    
    // Constructor sets the deployer as the owner
    constructor() {
        owner = msg.sender;
        registeredActors[msg.sender] = true;
    }
    
    /**
     * @dev Register an actor (farmer, distributor, retailer)
     * @param actor The address to register
     */
    function registerActor(address actor) external onlyOwner {
        registeredActors[actor] = true;
    }
    
    /**
     * @dev Unregister an actor
     * @param actor The address to unregister
     */
    function unregisterActor(address actor) external onlyOwner {
        registeredActors[actor] = false;
    }
    
    /**
     * @dev Core function to record any event
     * @param productIdHash The keccak256 hash of the batchId/productId
     * @param eventName The name of the event
     * @param primaryCID The IPFS CID of the primary event data
     * @param timestamp The timestamp of the event
     * @param actor The address of the actor performing the event
     * @return eventHash The hash of the event
     */
    function recordEvent(
        bytes32 productIdHash,
        string calldata eventName,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        require(bytes(eventName).length > 0, "Event name cannot be empty");
        require(bytes(primaryCID).length > 0, "IPFS CID cannot be empty");
        require(actor != address(0), "Actor cannot be zero address");
        
        // Increment event count
        eventCount[productIdHash]++;
        
        // Update last event block number
        lastEventBlockNumber[productIdHash] = block.number;
        
        // Emit event
        emit EventRecorded(
            productIdHash,
            eventName,
            primaryCID,
            timestamp,
            actor,
            block.number
        );
        
        // Return a hash of the event data
        return keccak256(abi.encodePacked(productIdHash, eventName, primaryCID, timestamp, actor, block.number));
    }
    
    /**
     * @dev Convenience wrapper for SOWING event
     */
    function registerSowing(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "SOWING", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for TILLERING event
     */
    function recordTillering(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "TILLERING", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for FLOWERING event
     */
    function recordFlowering(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "FLOWERING", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for GRAIN_FILLING event
     */
    function recordGrainFilling(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "GRAIN_FILLING", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for HARVEST event
     */
    function recordHarvest(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "HARVEST", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for PRODUCT_CREATED event
     */
    function productCreated(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "PRODUCT_CREATED", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for CERTIFICATE_GENERATED event
     */
    function certificateGenerated(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "CERTIFICATE_GENERATED", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for QR_GENERATED event
     */
    function qrGenerated(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "QR_GENERATED", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for SENT_TO_DISTRIBUTOR event
     */
    function sentToDistributor(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "SENT_TO_DISTRIBUTOR", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Convenience wrapper for DISTRIBUTOR_ACCEPTED event
     */
    function distributorAccepted(
        bytes32 productIdHash,
        string calldata primaryCID,
        uint256 timestamp,
        address actor
    ) external onlyRegisteredActor returns (bytes32) {
        return recordEvent(productIdHash, "DISTRIBUTOR_ACCEPTED", primaryCID, timestamp, actor);
    }
    
    /**
     * @dev Get event count for a product
     * @param productIdHash The keccak256 hash of the batchId/productId
     * @return The number of events recorded for this product
     */
    function getEventCount(bytes32 productIdHash) external view returns (uint256) {
        return eventCount[productIdHash];
    }
    
    /**
     * @dev Get last event block number for a product
     * @param productIdHash The keccak256 hash of the batchId/productId
     * @return The block number of the last event
     */
    function getLastEventBlockNumber(bytes32 productIdHash) external view returns (uint256) {
        return lastEventBlockNumber[productIdHash];
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }
}

