import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMetaByBlockHeight } from "./bountyHelpers.js";

export const handleBountyClaimed = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const [bountyIndex, balance, beneficiary] = eventData;

  const meta = await getBountyMetaByBlockHeight(bountyIndex, indexer.blockHeight - 1);

  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    name: event.method,
    args: {
      beneficiary,
      balance,
    },
    eventData,
    indexer,
  };

  const state = {
    indexer,
    state: BountyStatus.Claimed,
  };

  await updateBounty(bountyIndex, { meta, state }, timelineItem);
};