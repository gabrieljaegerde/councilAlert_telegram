import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta } from "./bountyHelpers.js";

export const handleAwarded = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const [bountyIndex, beneficiary] = eventData;

  const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    name: event.method,
    args: {
      beneficiary,
    },
    eventData,
    indexer,
  };

  const state = {
    indexer,
    state: BountyStatus.PendingPayout,
  }

  await updateBounty(bountyIndex, { meta, state }, timelineItem);
}