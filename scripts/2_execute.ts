import dotenv from "dotenv";
dotenv.config();
import { deployments, ethers } from "hardhat";
import { Provider } from "ethers";

import { execTransaction } from "../utils/safe";
import { getSafeAtAddress } from "../utils/setup";

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
    const safe = await getSafeAtAddress(account);

    const amount = 1n;
    if ((await provider.getBalance(account)) < amount) {
        await relayer.sendTransaction({
            to: account,
            value: amount,
        });
    }

    // Transfer value from the account
    const tx = await execTransaction(relayer, owners, safe, await relayer.getAddress(), amount.toString(), "0x", "0");
    console.log(`Transaction hash [${(await tx.wait())?.hash}]`);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
