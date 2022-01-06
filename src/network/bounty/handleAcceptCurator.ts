import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyMethods, Modules, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta } from "./bountyHelpers.js";

export const handleAcceptCurator = async (call, caller, extrinsicIndexer) => {
    if (
      ![Modules.Treasury, Modules.Bounties].includes(call.section) ||
      BountyMethods.acceptCurator !== call.method
    ) {
      return;
    }
  
    const { bounty_id: bountyIndex } = call.toJSON().args;
    const meta = await getBountyMeta(extrinsicIndexer.blockHash, bountyIndex);
  
    const timelineItem = {
      type: TimelineItemTypes.extrinsic,
      name: call.method,
      args: {
        caller,
      },
      indexer: extrinsicIndexer,
    };
  
    await updateBounty(bountyIndex, { meta, }, timelineItem);
  }