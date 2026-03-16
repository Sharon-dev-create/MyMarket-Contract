-include .env

.PHONY: all clean build test deploy-anvil deploy-sepolia deploy-mainnet deploy-mock-sepolia format snapshot anvil help

DEFAULT_ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

help:
	@echo "  make build                 Build contracts"
	@echo "  make test                  Run tests"
	@echo "  make anvil                 Start local Anvil node"
	@echo "  make deploy-anvil          Deploy to local Anvil"
	@echo "  make deploy-mock-sepolia   Deploy MockERC20 to Sepolia"
	@echo "  make deploy-sepolia        Deploy MyMarket to Sepolia"
	@echo "  make deploy-mainnet        Deploy MyMarket to Mainnet"

all: clean build

build:
	forge build

clean:
	forge clean

test:
	forge test -vv

test-v:
	forge test -vvvv

test-gas:
	forge test --gas-report

test-coverage:
	forge coverage

format:
	forge fmt

snapshot:
	forge snapshot

anvil:
	anvil

deploy-anvil:
	forge script script/DeployMyMarketAndLog.s.sol:DeployMyMarketAndLog \
		--rpc-url http://127.0.0.1:8545 \
		--account myMarketDeployer \
		--sender $(DEPLOYER_ADDRESS) \
		--broadcast \
		-vvvv

deploy-mock-sepolia:
	forge script script/DeployMockERC20.s.sol:DeployMockERC20 \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--account myMarketDeployer \
		--sender $(DEPLOYER_ADDRESS) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		-vvvv

deploy-sepolia:
	forge script script/DeployMyMarketAndLog.s.sol:DeployMyMarketAndLog \
		--rpc-url $(SEPOLIA_RPC_URL) \
		--account myMarketDeployer \
		--sender $(DEPLOYER_ADDRESS) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		-vvvv

deploy-mainnet:
	forge script script/DeployMyMarketAndLog.s.sol:DeployMyMarketAndLog \
		--rpc-url $(MAINNET_RPC_URL) \
		--account myMarketDeployer \
		--sender $(DEPLOYER_ADDRESS) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		-vvvv
