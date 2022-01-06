import { tryInitCall } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { Modules, MultisigMethods, TreasuryProposalMethods, ProxyMethods } from "../../../tools/constants.js";

export const isProposalMotion = (method) => {
    return [
        TreasuryProposalMethods.approveProposal,
        TreasuryProposalMethods.rejectProposal,
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
        console.log("in heare", normalizedExtrinsic);
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

export const getTreasuryProposalMeta = async (blockHash, proposalIndex) => {
    const blockApi = await botParams.api.at(blockHash);

    const raw = await blockApi.query.treasury.proposals(proposalIndex);
    return raw.toJSON();
  }