##### **Simple royalties distribution example**

1. git clone this repo
2. Create a .env file for your private key
   You have to select your desired network depending on where do you want to deploy your contract.
   1. Use `export PRIVATE_KEY_NILE= "Your private key here without quotes" `for nile testnet
   2. Use `export PRIVATE_KEY_SHASTA= "Your private key here without quotes" `for shasta testnet
   3. Use `export PRIVATE_KEY_MAINNET= "Your private key here without quotes"``` for mainnet deployment (this will cost you real TRX so be cautios here)
3. Compile the code:` tronbox compile`
4. Deploy your contract: `source .env && tronbox migrate --network nile ` (Example for nile testnet, you can use shasta or mainnet instead in the network argument

For details on how to use tronbox please refer to https://github.com/tronprotocol/tronbox or https://developers.tron.network/reference/tronbox-command-line
