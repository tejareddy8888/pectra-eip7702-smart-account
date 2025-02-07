import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { Provider, SigningKey } from "ethers";


import { getAuthorizationList, getSignedTransaction, isAccountDelegatedToAddress } from './tx.helper';

import {
    getMultiSend,

} from "../utils/setup";

const setup = async (provider: Provider) => {
    await deployments.fixture();

    const delegator = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY || "", provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || "", provider);

    const multiSend = await getMultiSend();


    console.dir({
        relayer: relayer.address,
        delegator: delegator.address,
        multiSend: multiSend.address,
    })

    return {
        relayer,
        delegator,
        multiSend
    };
};

const main = async () => {
    const provider = ethers.provider;
    const { relayer, delegator, multiSend } = await setup(provider);
    const pkDelegator = process.env.ACCOUNT_PRIVATE_KEY || "";
    const relayerSigningKey = new SigningKey(process.env.RELAYER_PRIVATE_KEY || "");

    const chainId = (await provider.getNetwork()).chainId;
    const authNonce = BigInt(await delegator.getNonce());

    // Deploy SafeProxy with the delegator as owner
    const owners = [delegator];
    const ownerAddresses = await Promise.all(owners.map(async (owner): Promise<string> => await owner.getAddress()));

    // // Set Auth to MultiSend
    const authAddress = multiSend.target;
    const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
    const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList, delegator.address, 10000);

    // Set Auth to Zero Address 
    // const authAddress = ethers.ZeroAddress;
    // const authorizationList = getAuthorizationList(chainId, authNonce, pkDelegator, authAddress);
    // const encodedSignedTx = await getSignedTransaction(provider, relayerSigningKey, authorizationList, '0x47f44eFba94ba282AE65B4A5b83380E4c78fAAE1', 10000, '0x0000');

    const account = await delegator.getAddress();

    const isAlreadyDelegated = await isAccountDelegatedToAddress(provider, await delegator.getAddress(), authAddress);
    if (isAlreadyDelegated && (await provider.getStorage(account, 4)) == ethers.zeroPadValue("0x01", 32)) {
        console.log("Account already delegated to Safe Proxy and storage is setup. Returning");
        return;
    }

    console.log(await delegator.getAddress(), authAddress);
    console.log("Code at account before auth transaction: ", await provider.getCode(account));

    const response = await provider.send("eth_sendRawTransaction", [encodedSignedTx]);
    console.log("Set Auth transaction hash", response);

    console.log("Waiting for transaction confirmation");
    await (await provider.getTransaction(response))?.wait();

    // code for sleeping for 25 seconds to ensure Auth Addres has been updated
    await new Promise(resolve => setTimeout(resolve, 25000));

    console.log(await delegator.getAddress(), authAddress);
    console.log("Code at account after transaction: ", await provider.getCode(account));

    console.log("Account successfully delegated to Multi Send");

};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


// const data = getSetupData(ownerAddresses, 1);

// const proxyAddress = await calculateProxyAddress(safeEIP7702ProxyFactory, await safeSingleton.getAddress(), data, 0);
// const isContract = (await provider.getCode(proxyAddress)) === "0x" ? false : true;

// if (!isContract) {
//     console.log(`Deploying Proxy [${proxyAddress}]`);
//     const tx = await safeEIP7702ProxyFactory.connect(relayer).createProxyWithNonce(await safeSingleton.getAddress(), data, 0);
//     await tx.wait();
//     console.log(`Proxy deployment transaction hash: [${tx.hash}]`);
// } else {
//     console.log("Proxy already deployed: ", proxyAddress);
// }

// const setupTxResponse = await relayer.sendTransaction({ to: await delegator.getAddress(), data: data });
// await setupTxResponse.wait();