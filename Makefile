VERSION=3

.PHONY: build

clean:
	rm -rf ./build

build:
	truffle compile

migrate_ropsten:
	truffle migrate --network ropsten

migrate_netvote:
	truffle migrate --network netvote

migrate_mainnet:
	truffle migrate --network mainnet

migrate: migrate_ropsten migrate_netvote 

download:
	aws s3 sync s3://netrosa-contracts/$(VERSION)/ ./build/contracts/ 

upload:
	aws s3 sync ./build/contracts/ s3://netrosa-contracts/$(VERSION)/ --acl public-read

publish: build migrate upload

coverage:
	node_modules/.bin/solidity-coverage
