# MyMarket Contract

MyMarket is a minimal on-chain escrow marketplace for physical or digital goods. Sellers create orders, buyers fund them with either ERC-20 tokens or ETH, sellers mark items shipped, and funds are released when delivery is confirmed or after a 7-day timeout. Buyers can also request a refund before shipping.

## Table of Contents
- Overview
- Core Concepts
- Contract Addressing
- Order Lifecycle
- Key Functions
- Events
- Development Setup
- Build, Test, and Format
- Deployment
- Usage Examples
- Security Notes and Limitations
- Project Structure

## Overview
The contract implements a simple escrow flow for marketplace transactions:
- A seller posts an order with a fixed price and payment type (ETH or ERC-20).
- A buyer funds the order by depositing the exact price in the chosen payment type.
- The seller marks the order shipped.
- The buyer confirms delivery to release funds, or the seller can claim funds after 7 days if the buyer is inactive.
- The buyer may request a refund only while the order is funded and not yet shipped.

This is intentionally minimal and designed for learning, prototyping, or small marketplaces.

## Core Concepts
### Payment Types
- ETH payments use native ETH transfers.
- TOKEN payments use an ERC-20 token address provided at deployment.

### Order States
- `Created`: Order created by seller, awaiting buyer funding.
- `Funded`: Buyer has deposited funds into escrow.
- `Shipped`: Seller has indicated shipment.
- `Delivered`: Buyer confirmed delivery or seller claimed after timeout; funds released to seller.
- `Refunded`: Buyer refunded while order was funded.

## Contract Addressing
The contract is deployed with a single ERC-20 token address used for TOKEN orders:
- `paymentToken` is immutable and set in the constructor.
- ETH orders do not use this token.

## Order Lifecycle
1. Seller creates an order with a price and payment type.
2. Buyer funds the order:
   - ETH orders require `msg.value == price`.
   - TOKEN orders require `approve()` first, then `transferFrom()`.
3. Seller marks the order shipped.
4. Funds release:
   - Buyer confirms delivery, or
   - Seller claims after 7 days from shipment timestamp.
5. Buyer refund is only available in `Funded` state, before shipping.

## Key Functions
### Order Creation
- `createOrder(uint256 price)`
  - Creates a TOKEN-based order.
- `createOrderEth(uint256 price)`
  - Creates an ETH-based order.
- `createOrderToken(uint256 price)`
  - Same as `createOrder`, explicit token order.

### Funding
- `depositToken(uint256 orderId)`
  - Transfers ERC-20 tokens into escrow. Requires prior `approve()`.
- `depositEth(uint256 orderId)`
  - Funds order with native ETH. Requires exact amount.

### Fulfillment
- `markShipped(uint256 orderId)`
  - Seller marks order as shipped.
- `confirmDelivery(uint256 orderId)`
  - Buyer confirms delivery; releases funds to seller.
- `claimAfterTimeout(uint256 orderId)`
  - Seller claims funds 7 days after shipping if buyer does not confirm.

### Refunds
- `refundBuyer(uint256 orderId)`
  - Buyer can refund only while order is `Funded`.

## Events
- `OrderCreated(uint256 orderId, address seller)`
- `OrderFunded(uint256 indexed orderId, address indexed buyer, uint256 amount)`
- `OrderShipped(uint256 indexed orderId, address indexed seller)`
- `OrderDelivered(uint256 indexed orderId, address indexed buyer)`
- `Refunded(uint256 orderId)`

## Development Setup
### Prerequisites
- Foundry toolchain (`forge`, `cast`, `anvil`).

Install Foundry:
```text
https://book.getfoundry.sh/getting-started/installation
```

### Install Dependencies
```bash
forge install
```

## Build, Test, and Format
### Build
```bash
forge build
```

### Test
```bash
forge test
```

### Format
```bash
forge fmt
```

## Deployment
Deploy using Foundry scripts or direct `forge create`.

Example (script deployment):
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url <YOUR_RPC_URL> \
  --private-key <YOUR_PRIVATE_KEY>
```

Example (direct create):
```bash
forge create src/MyMarket.sol:MyMarket \
  --constructor-args <TOKEN_ADDRESS> \
  --rpc-url <YOUR_RPC_URL> \
  --private-key <YOUR_PRIVATE_KEY>
```

## Usage Examples
### Create a Token Order
```bash
cast send <MYMARKET_ADDRESS> \
  "createOrderToken(uint256)" \
  1000000000000000000 \
  --private-key <SELLER_KEY> \
  --rpc-url <RPC_URL>
```

### Approve and Fund Token Order
```bash
cast send <TOKEN_ADDRESS> \
  "approve(address,uint256)" \
  <MYMARKET_ADDRESS> \
  1000000000000000000 \
  --private-key <BUYER_KEY> \
  --rpc-url <RPC_URL>

cast send <MYMARKET_ADDRESS> \
  "depositToken(uint256)" \
  0 \
  --private-key <BUYER_KEY> \
  --rpc-url <RPC_URL>
```

### Create and Fund an ETH Order
```bash
cast send <MYMARKET_ADDRESS> \
  "createOrderEth(uint256)" \
  100000000000000000 \
  --private-key <SELLER_KEY> \
  --rpc-url <RPC_URL>

cast send <MYMARKET_ADDRESS> \
  "depositEth(uint256)" \
  1 \
  --value 100000000000000000 \
  --private-key <BUYER_KEY> \
  --rpc-url <RPC_URL>
```

### Mark Shipped and Confirm Delivery
```bash
cast send <MYMARKET_ADDRESS> \
  "markShipped(uint256)" \
  1 \
  --private-key <SELLER_KEY> \
  --rpc-url <RPC_URL>

cast send <MYMARKET_ADDRESS> \
  "confirmDelivery(uint256)" \
  1 \
  --private-key <BUYER_KEY> \
  --rpc-url <RPC_URL>
```

### Claim After Timeout
```bash
cast send <MYMARKET_ADDRESS> \
  "claimAfterTimeout(uint256)" \
  1 \
  --private-key <SELLER_KEY> \
  --rpc-url <RPC_URL>
```

## Security Notes and Limitations
- No dispute resolution: once shipped, only the buyer or timeout can release funds.
- No off-chain order metadata (product descriptions, shipping info) is stored on-chain.
- No admin or arbitration role exists.
- `refundBuyer` is only valid in `Funded` state; buyers cannot refund after shipping.
- The `shippedAt` timestamp is set at creation and updated on shipping; timeout uses `shippedAt` + 7 days.
- This contract assumes the ERC-20 token conforms to the standard `transferFrom`/`transfer` behavior.

## Project Structure
- `src/MyMarket.sol`: Main contract
- `script/`: Deployment scripts
- `test/`: Tests
- `foundry.toml`: Foundry configuration

## License
MIT
