import express from "express";
import { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar, TransferTransaction, AccountId, TokenCreateTransaction, TokenType, TokenSupplyType, TokenAssociateTransaction } from "@hashgraph/sdk";
import dotenv from 'dotenv';

const app = express();
const port = 3000;
dotenv.config();

async function environmentSetup() {
    //  Grab your Hedera testnet account ID and priavte key your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;

    // if we weren't able to grab it, we should throw a new error
    if (!myAccountId || !myPrivateKey) {
        throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    // Create your Hedera Testnet client
    const client = Client.forTestnet()

    // Set your account as the client's operator
    client.setOperator(myAccountId, myPrivateKey);

    // Set the default maximum transaction fee (in Hbar)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    // Set the maximum payment for queries (in Hbar)
    client.setMaxQueryPayment(new Hbar(50));

    // Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    // Create a new account with 1000 tinybar staring balance
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);

    //   Get the new account ID
    const getReceipt = await newAccount.getReceipt(client)
    const newAccountId = getReceipt.accountId;

    // Log the account ID
    console.log("The new account ID  is: " + newAccountId);

    const supplyKey = PrivateKey.generate();

    // CREATE FUNGIBLE TOKEN (STABLECOIN)
    let tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("Hedera Tutorial Token")
        .setTokenSymbol("HTT")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(2)
        .setInitialSupply(10000)
        .setTreasuryAccountId(myAccountId)
        .setSupplyType(TokenSupplyType.Infinite)
        .setSupplyKey(supplyKey)
        .freezeWith(client);

    // SIGN WITH TREASURY KEY
    let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromString(myPrivateKey));

    // SUBMIT THE TRANSACTION
    let tokenCreateSubmit = await tokenCreateSign.execute(client);

    // GET THE TRANSACTION RECEIPT 
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

    // GET THE TOKEN ID
    let tokenId = tokenCreateRx.tokenId;

    // LOG THE TOKEN ID TO THE CONSOLE
    console.log(`- Created token with ID: ${tokenId} \n`);

    const transaction = await new TokenAssociateTransaction()
        .setAccountId(newAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client);


    const signTx = await transaction.sign(newAccountPrivateKey);

    const txResponse = await signTx.execute(client);

    const associationReceipt = await txResponse.getReceipt(client);

    const transactionStatus = associationReceipt.status;

    console.log("Transaction of association was: " + transactionStatus);

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

    const transferTransaction = await new TransferTransaction()
        .addTokenTransfer(tokenId, myAccountId, -10)
        .addTokenTransfer(tokenId, newAccountId, 10)
        .freezeWith(client);

    const signTransferTx = await transferTransaction.sign(PrivateKey.fromString(myPrivateKey));

    const transferTxResponse = await signTransferTx.execute(client)

    const transferReceipt = await transferTxResponse.getReceipt(client)

    const transferStatus = transferReceipt.status

    console.log("The status of the token transfer is: " + transferStatus);

    //BALANCE CHECK
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
    console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
}
environmentSetup();

app.listen(port, () => {
    console.log(`Listening at port ${port}`);
})

