import { updateMotionByHash } from "../../mongo/service/motion.js";
import { BountyStatus, CouncilEvents, TimelineItemTypes, TreasuryProposalEvents } from "../../../tools/constants.js";
import { getMotionCollection } from "../../mongo/index.js";
import { updateBounty } from "../../mongo/service/bounty.js";
import { getBountyMeta } from "../bounty/bountyHelpers.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { isStateChangeBountyMotion } from "./motionHelpers.js";

async function handleBounty(bountyIndex, indexer) {
  const state = {
    indexer,
    // If a bounty proposal(close or approve) motion is not passed, we reset the treasury bounty state to `Proposed`
    state: BountyStatus.Proposed,
  };

  const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  if (meta) {
    await updateBounty(bountyIndex, { meta, state });
  }
}

async function handleProposal(treasuryProposalIndex, indexer) {
  const state = {
    indexer,
    // If a treasury proposal motion is not passed, we reset the treasury proposal state to `Proposed`
    state: TreasuryProposalEvents.Proposed,
  };

  await updateProposal(treasuryProposalIndex, { state });
}

async function handleBusinessWhenMotionDisapproved(motionHash, indexer) {
  const col = await getMotionCollection();
  const motion = await col.findOne({ hash: motionHash, isFinal: false });
  if (!motion) {
    return;
  }

  for (const { index } of motion.treasuryProposals || []) {
    await handleProposal(index, indexer);
  }

  for (const { index, method } of motion.treasuryBounties || []) {
    if (isStateChangeBountyMotion(method)) {
      await handleBounty(index, indexer);
    }
  }
}

export const handleDisapproved = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const [hash] = eventData;

  const state = {
    state: CouncilEvents.Disapproved,
    data: eventData,
    indexer,
  };

  const timelineItem = {
    type: TimelineItemTypes.event,
    method: CouncilEvents.Disapproved,
    args: {
      hash,
    },
    indexer,
  };

  await handleBusinessWhenMotionDisapproved(hash, indexer);
  const updates = { state, isFinal: true };
  await updateMotionByHash(hash, updates, timelineItem);
};