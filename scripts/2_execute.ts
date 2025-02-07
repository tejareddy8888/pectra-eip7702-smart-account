import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { Provider } from "ethers";

import { execTransaction } from "../utils/safe";
import { getMultiSend, getMultiSendAtAddress } from "../utils/setup";
import { encodeMultiSend, MetaTransaction } from "@safe-global/safe-smart-account";

const setup = async (provider: Provider) => {
    await deployments.fixture();

    const delegator = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY || "", provider);
    const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || "", provider);

    return {
        relayer,
        delegator,
    };
};

const main = async () => {
    const provider = ethers.provider;
    const { relayer, delegator } = await setup(ethers.provider);
    const owners = [delegator];
    const account = await delegator.getAddress();
    console.log(`Using account [${account}]`);
    const multiSend = await getMultiSendAtAddress(account);

    const amount = 1n;
    if ((await provider.getBalance(account)) < amount) {
        await relayer.sendTransaction({
            to: account,
            value: amount,
        });
    }

    const txs: MetaTransaction[] = [
        {
            to: await relayer.getAddress(),
            value: 1n,
            data: "0x",
            operation: 0,
        },
        {
            to: await relayer.getAddress(),
            value: 1n,
            data: "0x",
            operation: 0,
        },
    ];

    const multiSendData = encodeMultiSend(txs);
    // Transfer value from the account
    const tx = await multiSend.connect(relayer).multiSend(multiSendData);
    // const tx = await execTransaction(relayer, owners, multiSend, await relayer.getAddress(), amount.toString(), "0x", "0");
    console.log(`Transaction hash [${(await tx.wait())?.hash}]`);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
