import { TokenMintTransaction, TopicCreateTransaction } from "@hashgraph/sdk";

async function topicMintFcn(walletData, accountId) {

	const hashconnect = walletData[0];
	const saveData = walletData[1];
	const provider = hashconnect.getProvider("testnet", saveData.topic, accountId);
	const signer = hashconnect.getSigner(provider);

	const topicCreateTx = await new TopicCreateTransaction()
		.freezeWithSigner(signer);

	const topicCreateSubmit = await topicCreateTx.executeWithSigner(signer);
	const topicCreateRx = await provider.getTransactionReceipt(topicCreateSubmit.transactionId);
	
	const topicId =  topicCreateRx.topicId;
	console.log(`- Tokens minted. The new topic id is ${topicId}`);

	return [topicId];
}

export default tokenMintFcn;
