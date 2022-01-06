import { updateMotionByHash } from "../../mongo/service/motion.js";
import { BountyMethods, BountyStatus, CouncilEvents, TimelineItemTypes, TreasuryProposalEvents, TreasuryProposalMethods } from "../../../tools/constants.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { getBountyMeta } from "../bounty/bountyHelpers.js";
import { updateBounty } from "../../mongo/service/bounty.js";
import { getMotionCollection } from "../../mongo/index.js";
import { botParams } from "../../../config.js";

const handleRejectTreasuryProposal = async (proposalInfo, indexer) => {
    if (botParams.settings.network.name !== 'kusama') {
        return;
    }

    const { index: proposalIndex, method } = proposalInfo;

    if (method !== TreasuryProposalMethods.rejectProposal) {
        return;
    }

    const state = {
        state: TreasuryProposalEvents.Rejected,
        indexer,
    };

    await updateProposal(proposalIndex, { state });
};

const handleBounty = async (bountyInfo, indexer) => {
    const { index: bountyIndex, method } = bountyInfo;

    let updates= { meta: null, state: null};

    const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
    if (meta) {
        updates.meta = meta;
    }

    if (BountyMethods.approveBounty === method) {
        updates.state = {
            indexer,
            state: BountyStatus.Approved,
        };
    }

    if (updates.meta || updates.state) {
        await updateBounty(bountyIndex, updates);
    }
}

const handleBusinessWhenMotionExecuted = async (motionHash, indexer) => {
    const col = await getMotionCollection();
    const motion = await col.findOne({ hash: motionHash, isFinal: false });
    if (!motion) {
        return;
    }

    for (const proposalInfo of motion.treasuryProposals || []) {
        await handleRejectTreasuryProposal(proposalInfo, indexer);
    }

    for (const bountyInfo of motion.treasuryBounties || []) {
        await handleBounty(bountyInfo, indexer);
    }
}

export const handleExecuted = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [hash, dispatchResult] = eventData;

    const state = {
        state: CouncilEvents.Executed,
        data: eventData,
        indexer,
    };

    const timelineItem = {
        type: TimelineItemTypes.event,
        method: CouncilEvents.Executed,
        args: {
            hash,
            dispatchResult,
        },
        indexer,
    };

    await handleBusinessWhenMotionExecuted(hash, indexer);
    const updates = { state, isFinal: true };
    await updateMotionByHash(hash, updates, timelineItem);
};