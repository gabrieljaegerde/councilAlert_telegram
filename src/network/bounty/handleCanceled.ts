import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMetaByBlockHeight, getRealCaller } from "./bountyHelpers.js";

export const handleBountyCanceled = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const [bountyIndex] = eventData;

  const meta = await getBountyMetaByBlockHeight(bountyIndex, indexer.blockHeight - 1);
  const caller = getRealCaller(extrinsic.method, extrinsic.signer.toString());

  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    name: event.method,
    args: {
      caller,
    },
    eventData,
    indexer,
  };

  const state = {
    indexer,
    state: BountyStatus.Canceled,
  };

  await updateBounty(bountyIndex, { meta, state }, timelineItem);
};