import { updateMotionByHash } from "../../mongo/service/motion.js";
import { CouncilEvents, TimelineItemTypes, TreasuryProposalMethods } from "../../../tools/constants.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { getMotionCollection } from "../../mongo/index.js";

const handleProposal = async (proposalInfo, indexer) => {
    const { index: treasuryProposalIndex, method } = proposalInfo;

    const isApproved = TreasuryProposalMethods.approveProposal === method;
    if (!isApproved) {
        return;
    }

    const state = {
        indexer,
        state: CouncilEvents.Approved,
    };

    await updateProposal(treasuryProposalIndex, { state });
};

const handleBusinessWhenMotionApproved = async (motionHash, indexer) => {
    const col = await getMotionCollection();
    const motion = await col.findOne({ hash: motionHash, isFinal: false });
    if (!motion) {
        return;
    }

    for (const proposalInfo of motion.treasuryProposals || []) {
        await handleProposal(proposalInfo, indexer);
    }
};

export const handleApproved = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [hash] = eventData;

    const state = {
        state: CouncilEvents.Approved,
        data: eventData,
        indexer,
    };

    const timelineItem = {
        type: TimelineItemTypes.event,
        method: CouncilEvents.Approved,
        args: {
            hash,
        },
        indexer,
    };

    const updates = { state };
    await updateMotionByHash(hash, updates, timelineItem);
    await handleBusinessWhenMotionApproved(hash, indexer);
};