import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMetaByBlockHeight, getRealCaller } from "./bountyHelpers.js";

export const handleBountyRejected = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const [bountyIndex, slashed] = eventData;

  const meta = await getBountyMetaByBlockHeight(bountyIndex, indexer.blockHeight - 1);
  const caller = getRealCaller(extrinsic.method, extrinsic.signer.toString());
  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    name: event.method,
    args: {
      caller,
      slashed,
    },
    eventData,
    indexer,
  };

  const state = {
    indexer,
    state: BountyStatus.Rejected,
  };

  await updateBounty(bountyIndex, { meta, state }, timelineItem);
};