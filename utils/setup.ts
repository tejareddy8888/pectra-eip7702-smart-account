import hre, { ethers } from "hardhat";
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import Safe from "@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json";
import ISafe from "@safe-global/safe-smart-account/build/artifacts/contracts/interfaces/ISafe.sol/ISafe.json";
import MultiSendCallOnly from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
import MultiSend from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";
import { Address } from "hardhat-deploy/types";

export const getSafeSingleton = async () => {
    const safe = await hre.deployments.get("Safe");
    return ethers.getContractAt(Safe.abi, safe.address);
};

export const getSafeL2Singleton = async () => {
    const safe = await hre.deployments.get("SafeL2");
    return ethers.getContractAt(SafeL2.abi, safe.address);
};

export const getSafeSingletonAtAddress = async (address: string) => {
    return ethers.getContractAt(ISafe.abi, address);
};

export const getSafeEIP7702ProxyFactory = async () => {
    const safeEIP7702ProxyFactory = await hre.deployments.get("SafeEIP7702ProxyFactory");
    return ethers.getContractAt("SafeEIP7702ProxyFactory", safeEIP7702ProxyFactory.address);
};

export const getMultiSendCallOnly = async () => {
    const multiSendCallOnly = await hre.deployments.get("MultiSendCallOnly");
    return ethers.getContractAt(MultiSendCallOnly.abi, multiSendCallOnly.address);
};

export const getMultiSend = async () => {
    const multiSend = await hre.deployments.get("MultiSend");
    return ethers.getContractAt(MultiSend.abi, multiSend.address);
};

export const getMultiSendAtAddress = async (address: string) => {
    return ethers.getContractAt(MultiSend.abi, address);
};

export const getSafeLite = async () => {
    const safeLite = await hre.deployments.get("SafeLite");
    return ethers.getContractAt("SafeLite", safeLite.address);
}

export const getSafeLiteAtAddress = async (address: Address) => {
    return ethers.getContractAt("SafeLite", address);
}