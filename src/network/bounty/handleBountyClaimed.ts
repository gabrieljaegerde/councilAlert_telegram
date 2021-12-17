import { timelineItemTypes } from "../../../tools/constants.js";
import { getBountyMetaByBlockHeight, updateBountyInDb } from "./bountyHelpers.js";

export const handleBountyClaimed = async (event, normalizedExtrinsic) => {
    const indexer = normalizedExtrinsic.extrinsicIndexer;
  
    const eventData = event.data.toJSON();
    const [bountyIndex, balance, beneficiary] = eventData;
    const meta = await getBountyMetaByBlockHeight(
      indexer.blockHeight - 1,
      bountyIndex
    );
  
    const timelineItem = {
      type: timelineItemTypes.extrinsic,
      name: event.method,
      args: {
        beneficiary,
        balance,
      },
      eventData,
      extrinsicIndexer: indexer,
    };
  
    await updateBountyInDb(bountyIndex, {
      $set: { meta, state: timelineItem },
      $push: { timeline: timelineItem },
    });
  }