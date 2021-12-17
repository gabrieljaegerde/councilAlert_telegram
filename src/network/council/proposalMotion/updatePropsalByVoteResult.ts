import { ProposalEvents } from "../../../../tools/constants.js";
import { getMotionCollection, getProposalCollection } from "../../../mongo/db.js";
import { isProposalMotion, updateProposalInDb } from "../../proposal/porposalHelpers.js";

export const updateProposalStateByVoteResult = async (hash, isApproved, indexer) => {
    const motionCol = await getMotionCollection();
    const motion = await motionCol.findOne({ hash, isFinal: false });
    if (!motion || !isProposalMotion(motion.method)) {
        // it means this motion hash is not a treasury proposal motion hash
        return;
    }

    let name;
    if ("approveProposal" === motion.method) {
        name = isApproved ? "Approved" : ProposalEvents.Proposed;
    } else if ("rejectProposal" === motion.method) {
        if (!isApproved) {
            name = ProposalEvents.Proposed;
        } else if (indexer.blockHeight >= 1164233) {
            // There is no Rejected event emitted before 1164233 for Kusama
            return;
        } else {
            name = ProposalEvents.Rejected;
        }
    }
    await updateProposalInDb(motion.treasuryProposalId,
        {
            $set: { state: { name, indexer } },
        }
    );
};