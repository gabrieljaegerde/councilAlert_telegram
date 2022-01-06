import { GenericCall } from "@polkadot/types";
import { calcMultisigAddress, tryInitCall } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { BountyMethods, Modules, MultisigMethods, ProxyMethods } from "../../../tools/constants.js";
import { getBountyCollection } from "../../mongo/index.js";

export const getBountyMeta = async (blockHash, bountyIndex) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawMeta;
    if (blockApi.query.treasury?.bounties) {
        rawMeta = await blockApi.query.treasury?.bounties(bountyIndex);
    } else {
        rawMeta = await blockApi.query.bounties.bounties(bountyIndex);
    }

    return rawMeta.toJSON();
};

export const getBountyDescription = async (blockHash, bountyIndex) => {
    const blockApi = await botParams.api.at(blockHash);

    let rawMeta;
    if (blockApi.query.treasury?.bountyDescriptions) {
        rawMeta = await blockApi.query.treasury?.bountyDescriptions(bountyIndex);
    } else {
        rawMeta = await blockApi.query.bounties.bountyDescriptions(bountyIndex);
    }

    return rawMeta.toHuman();
};

export const isBountyMethod = (method) => {
    return [
        BountyMethods.approveBounty,
        BountyMethods.proposeCurator,
        BountyMethods.unassignCurator,
        BountyMethods.closeBounty,
    ].includes(method);
};

export const getBountyVotingName = (method) => {
    switch (method) {
        case BountyMethods.approveBounty:
            return "ApproveVoting";
        case BountyMethods.proposeCurator:
            return "ProposeCuratorVoting";
        case BountyMethods.unassignCurator:
            return "UnassignCuratorVoting";
        case BountyMethods.closeBounty:
            return "CloseVoting";
    }
};

export const getRealCaller = (call, caller) => {
    const { section, method } = call;

    if (Modules.Proxy === section && ProxyMethods.proxy === method) {
        return call.args[0].toJSON();
    }

    if (
        Modules.Multisig === section &&
        MultisigMethods.asMulti === method
        // TODO:  Maybe other methods, check them out
    ) {
        const callHex = call.args[3];
        const innerCall = tryInitCall(call.registry, callHex);
        if (
            Modules.Proxy === innerCall.section &&
            ProxyMethods.proxy === innerCall.method
        ) {
            return innerCall.args[0].toJSON();
        }

        const threshold = call.args[0].toNumber();
        const otherSignatories = call.args[1].toJSON();
        return calcMultisigAddress(
            [caller, ...otherSignatories],
            threshold,
            call.registry.chainSS58
        );
    }

    return caller;
};

export const getBountyMetaByBlockHeight = async (height, bountyIndex) => {
    const blockHash = await botParams.api.rpc.chain.getBlockHash(height);
    return await getBountyMeta(blockHash, bountyIndex);
};
