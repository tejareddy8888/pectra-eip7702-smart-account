
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import Safe from "@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json";


import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async ({ deployments, getNamedAccounts, network }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;


    await deploy("SafeEIP7702ProxyFactory", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSend", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSendCallOnly", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeLite", {
        from: deployer,
        args: ["0x0000000071727de22e5e9d8baf0edac6f37da032"],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeL2", {
        from: deployer,
        contract: SafeL2,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("Safe", {
        from: deployer,
        contract: Safe,
        args: [],
        log: true,
        deterministicDeployment: true,
    });
};

export default deploy;
