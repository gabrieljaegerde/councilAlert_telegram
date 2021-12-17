import { getMotionCollection } from "../../../mongo/db.js";
import { CouncilEvents, Modules, MotionActions } from "../../../../tools/constants.js";
import { extractCallIndexAndArgs, getMotionVoting, isProposalMotion } from "../../proposal/porposalHelpers.js";
import { updateProposalStateByProposeOrVote } from "./updateProposalByProposalOrVote.js";
import { getCouncilMembers } from "../../../../tools/utils.js";
import { logger } from "../../../../tools/logger.js";

export const handleProposedForProposal = async (
    event,
    normalizedExtrinsic,
    extrinsic
  ) => {
    const [section, method, args] = await extractCallIndexAndArgs(
      normalizedExtrinsic,
      extrinsic
    );
  
    if (section !== Modules.Treasury || !isProposalMotion(method)) {
      return;
    }
  
    const { proposal_id: treasuryProposalId } = args;
    const eventData = event.data.toJSON();
    const [proposer, index, hash] = eventData;
    const voting = await getMotionVoting(
      normalizedExtrinsic.extrinsicIndexer.blockHash,
      hash
    );
  
    const timeline = [
      {
        action: MotionActions.Propose,
        eventData,
        extrinsic: normalizedExtrinsic,
      },
    ];
  
    const motionCol = await getMotionCollection();
    const motion = await motionCol.findOne({ hash, isFinal: false });
    if (motion) {
        logger.info(`motion with hash: ${hash} exists already`);
        return;
    }

    await motionCol.insertOne({
      hash,
      index,
      proposer,
      method,
      treasuryProposalId,
      voting,
      isFinal: false,
      state: {
        state: CouncilEvents.Proposed,
        eventData,
        extrinsic: normalizedExtrinsic,
      },
      timeline,
    });
  
    await updateProposalStateByProposeOrVote(
      hash,
      normalizedExtrinsic.extrinsicIndexer
    );
    //send notification to all users
  }
  