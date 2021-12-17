import { GenericCall } from "@polkadot/types";
import { tryInitCall } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { Modules, MultisigMethods, ProposalMethods, ProxyMethods } from "../../../tools/constants.js";
import { getProposalCollection } from "../../mongo/db.js";

export const isProposalMotion = (method) => {
    return [
        ProposalMethods.approveProposal,
        ProposalMethods.rejectProposal,
    ].includes(method);
};

export const extractCallIndexAndArgs = (normalizedExtrinsic, extrinsic) => {
    const { section, name } = normalizedExtrinsic;

    if (Modules.Proxy === section && ProxyMethods.proxy === name) {
        const proposeCall = tryInitCall(
            extrinsic.registry,
            extrinsic.args[2].toHex()
        );
        const call = tryInitCall(
            extrinsic.registry,
            proposeCall.args[1].toHex()
        );
        return [call.section, call.method, call.toJSON().args];
    }

    if ([Modules.Multisig, Modules.Utility].includes(section) && MultisigMethods.asMulti === name) {
        const proposeCall = tryInitCall(
            extrinsic.registry,
            extrinsic.method.args[3].toHex()
        );
        const call = tryInitCall(
            extrinsic.registry,
            proposeCall.args[1].toHex()
        );
        return [call.section, call.method, call.toJSON().args];
    }

    const {
        args: {
            proposal: { args: proposalArgs },
        },
    } = normalizedExtrinsic;
    const call = tryInitCall(extrinsic.registry, extrinsic.args[1].toHex());
    return [call.section, call.method, proposalArgs];
};

export const getMotionVoting = async (blockHash, motionHash) => {
    const api = await botParams.api.at(blockHash);
    const votingObject = await api.query.council.voting(motionHash);
    return votingObject.toJSON();
};

export const getMotionVotingByHeight = async (height, motionHash) => {
    const blockHash = await botParams.api.rpc.chain.getBlockHash(height);

    return await getMotionVoting(blockHash, motionHash);
};

export const updateProposalInDb = async (proposalIndex, updatesObj) => {
    const proposalCol = await getProposalCollection();
    await proposalCol.findOneAndUpdate({ proposalIndex }, updatesObj);
};