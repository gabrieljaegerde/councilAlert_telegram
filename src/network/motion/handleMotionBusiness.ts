import { BountyMethods, MotionState, TreasuryProposalMethods } from "../../../tools/constants.js";
import { handleWrappedCall, isBountyMotion, isProposalMotion, isStateChangeBountyMotion } from "./motionHelpers.js";
import { logger } from "../../../tools/logger.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { updateBounty } from "../../mongo/service/bounty.js";

async function handleProposalCall(motion, call, author, indexer) {
    const { section, method, args } = call;
    if (!isProposalMotion(section, method)) {
        return;
    }

    const treasuryProposalIndex = args[0].toJSON();
    const motionInfo = {
        indexer,
        index: motion.index,
        hash: motion.hash,
        method,
        proposer: author,
    };

    const stateName =
        method === TreasuryProposalMethods.approveProposal
            ? MotionState.ApproveVoting
            : MotionState.RejectVoting;

    const state = {
        indexer,
        state: stateName,
        data: {
            motionState: motion.state,
            motionVoting: motion.voting,
        },
    };

    logger.info(`Detected motion for treasury proposal ${treasuryProposalIndex} ${method}`, motionInfo);
    await updateProposal(treasuryProposalIndex, { state }, null, motionInfo);
}

async function handleBountyCall(motion, call, author, indexer) {
    const { section, method, args } = call;
    if (!isBountyMotion(section, method)) {
        return;
    }

    const treasuryBountyIndex = args[0].toJSON();
    const motionInfo = {
        indexer,
        index: motion.index,
        hash: motion.hash,
        method,
        proposer: author,
    };

    let updates = {};
    if (isStateChangeBountyMotion(method)) {
        let stateName;
        if (BountyMethods.closeBounty === method) {
            stateName = 'CloseVoting';
        } else if (BountyMethods.approveBounty === method) {
            stateName = 'ApproveVoting';
        }

        updates = {
            state: {
                indexer,
                state: stateName,
                data: {
                    motionState: motion.state,
                    motionVoting: motion.voting,
                },
            }
        };
    }

    logger.info(`Detected motion for bounty ${treasuryBountyIndex} ${method}`, motionInfo);
    await updateBounty(treasuryBountyIndex, updates, null, motionInfo);
}

async function handleBusiness(call, author, indexer) {
    await handleProposalCall(this.motion, call, author, indexer);
    await handleBountyCall(this.motion, call, author, indexer);
}

export const handleBusinessWhenMotionProposed = async (motionDbObj, rawProposal, indexer, blockEvents) => {
    await handleWrappedCall(
        rawProposal,
        motionDbObj.proposer,
        indexer,
        blockEvents,
        handleBusiness.bind({ motion: motionDbObj }),
    );
};