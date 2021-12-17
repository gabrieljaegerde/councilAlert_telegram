import { ProposalMethods } from "../../../../tools/constants.js";
import { getMotionCollection, getProposalCollection } from "../../../mongo/db.js";
import { isProposalMotion, updateProposalInDb } from "../../proposal/porposalHelpers.js";

export const updateProposalStateByProposeOrVote = async (hash, indexer) => {
  const motionCol = await getMotionCollection();
  const motion = await motionCol.findOne({ hash, isFinal: false });
  if (!motion || !isProposalMotion(motion.method)) {
    return;
  }

  const motionState = motion.state;
  const motionVoting = motion.voting;
  const name =
    motion.method === ProposalMethods.approveProposal
      ? "ApproveVoting"
      : "RejectVoting";

  await updateProposalInDb(motion.treasuryProposalId, {
    $set: {
      state: {
        name,
        indexer,
        motionState,
        motionVoting,
      },
    },
  });
};