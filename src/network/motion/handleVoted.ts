import { updateMotionByHash } from "../../mongo/service/motion.js";
import { BountyMethods, CouncilEvents, MotionState, TimelineItemTypes, TreasuryProposalMethods } from "../../../tools/constants.js";
import { getMotionVoting, isStateChangeBountyMotion } from "./motionHelpers.js";
import { logger } from "../../../tools/logger.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { updateBounty } from "../../mongo/service/bounty.js";
import { getMotionCollection } from "../../mongo/index.js";

const getState = (name, motion, voting, indexer) => {
    return {
        indexer,
        state: name,
        data: {
            motionState: motion.state,
            motionVoting: voting,
        },
    };
}

const updateProposalState = async (proposalInfo, motion, voting, indexer) => {
    const { index: proposalIndex, method } = proposalInfo;
    const stateName =
        method === TreasuryProposalMethods.approveProposal
            ? MotionState.ApproveVoting
            : MotionState.RejectVoting;

    const state = getState(stateName, motion, voting, indexer);

    logger.info('proposal state updated by motion voted', indexer);
    await updateProposal(proposalIndex, { state });
}

const updateBountyState = async (bountyInfo, motion, voting, indexer) => {
    const { index: bountyIndex, method } = bountyInfo;
    if (!isStateChangeBountyMotion(method)) {
        return;
    }

    let stateName;
    if (BountyMethods.closeBounty === method) {
        stateName = 'CloseVoting';
    } else if (BountyMethods.approveBounty === method) {
        stateName = 'ApproveVoting';
    }

    if (!stateName) {
        return;
    }

    const state = getState(stateName, motion, voting, indexer);
    await updateBounty(bountyIndex, { state });
}

const handleBusinessWhenMotionVoted = async (motionHash, voting, indexer) => {
    const col = await getMotionCollection();
    const motion = await col.findOne({ hash: motionHash });
    if (!motion) {
        logger.error(`cannot find motion when handle motion voted business, hash: ${motionHash}`, indexer);
        return;
    }

    for (const proposalInfo of motion.treasuryProposals || []) {
        await updateProposalState(proposalInfo, motion, voting, indexer);
    }

    for (const bountyInfo of motion.treasuryBounties || []) {
        await updateBountyState(bountyInfo, motion, voting, indexer);
    }
}

export const handleVoted = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [voter, hash, approve,] = eventData;

    const voting = await getMotionVoting(indexer.blockHash, hash);
    const updates = { voting };
    const timelineItem = {
        type: TimelineItemTypes.event,
        method: CouncilEvents.Voted,
        args: {
            voter,
            hash,
            approve,
        },
        indexer,
    };

    await updateMotionByHash(hash, updates, timelineItem);
    await handleBusinessWhenMotionVoted(hash, voting, indexer);
};