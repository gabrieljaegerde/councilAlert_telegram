import { updateBounty } from "../../mongo/service/bounty.js";
import { BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta } from "./bountyHelpers.js";

export const handleBountyBecameActiveEvent = async (event, indexer) => {
    const { method } = event;
  
    const eventData = event.data.toJSON();
    const bountyIndex = eventData[0];
  
    const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  
    const timelineItem = {
      type: TimelineItemTypes.event,
      name: method,
      args: {},
      eventData,
      indexer,
    };
  
    const state = {
      indexer,
      state: BountyStatus.Active,
    }
  
    await updateBounty(bountyIndex, { meta, state }, timelineItem);
  }