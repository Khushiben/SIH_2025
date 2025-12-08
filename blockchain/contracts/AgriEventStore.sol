// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgriEventStore
 * @dev A smart contract for storing immutable event references for agricultural products
 */
contract AgriEventStore {
    // Event emitted when a new event is recorded
    event EventRecorded(
        uint256 indexed productId,
        uint256 indexed eventIndex,
        string eventName,
        string ipfsCID,
        uint256 timestamp,
        address indexed actor
    );

    // Event reference structure
    struct EventReference {
        uint256 index;
        string eventName;
        string ipfsCID;
        uint256 timestamp;
        address actor;
    }

    // Mapping from productId to its events
    mapping(uint256 => EventReference[]) public productEvents;

    // Mapping to store the contract owner
    address public owner;

    // Modifier to restrict access to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Constructor sets the deployer as the owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Record a new event for a product
     * @param productId The ID of the product
     * @param eventName The name of the event
     * @param ipfsCID The IPFS CID of the event data
     * @return The index of the new event
     */
    function recordEvent(
        uint256 productId,
        string calldata eventName,
        string calldata ipfsCID
    ) external returns (uint256) {
        require(bytes(eventName).length > 0, "Event name cannot be empty");
        require(bytes(ipfsCID).length > 0, "IPFS CID cannot be empty");

        uint256 index = productEvents[productId].length;
        
        // Create new event reference
        EventReference memory newEvent = EventReference({
            index: index,
            eventName: eventName,
            ipfsCID: ipfsCID,
            timestamp: block.timestamp,
            actor: msg.sender
        });
        
        // Add to storage
        productEvents[productId].push(newEvent);
        
        // Emit event
        emit EventRecorded(
            productId,
            index,
            eventName,
            ipfsCID,
            block.timestamp,
            msg.sender
        );
        
        return index;
    }

    /**
     * @dev Get all events for a product
     * @param productId The ID of the product
     * @return An array of EventReference structs
     */
    function getEvents(uint256 productId) external view returns (EventReference[] memory) {
        return productEvents[productId];
    }

    /**
     * @dev Get the count of events for a product
     * @param productId The ID of the product
     * @return The number of events
     */
    function getEventCount(uint256 productId) external view returns (uint256) {
        return productEvents[productId].length;
    }

    /**
     * @dev Transfer ownership of the contract
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }

    /**
     * @dev Get the owner of the contract
     * @return The address of the owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }
}
