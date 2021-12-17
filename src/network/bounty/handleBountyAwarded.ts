import { timelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta, updateBountyInDb } from "./bountyHelpers.js";

export const handleBountyAwarded = async (event, normalizedExtrinsic) => {
    const indexer = normalizedExtrinsic.extrinsicIndexer;
  
    const eventData = event.data.toJSON();
    const [bountyIndex, beneficiary] = eventData;
  
    const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  
    const timelineItem = {
      type: timelineItemTypes.extrinsic,
      name: event.method,
      args: {
        beneficiary,
      },
      eventData,
      extrinsicIndexer: indexer,
    };
  
    await updateBountyInDb(bountyIndex, {
      $set: { meta, state: timelineItem },
      $push: { timeline: timelineItem },
    });
  }