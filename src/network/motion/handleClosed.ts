import { updateMotionByHash } from "../../mongo/service/motion.js";
import { CouncilEvents, TimelineItemTypes } from "../../../tools/constants.js";
import { getMotionVotingFromStorageByHeight } from "./motionHelpers.js";

export const handleClosed = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [hash, yesVotes, noVotes] = eventData;
  
    const voting = await getMotionVotingFromStorageByHeight(
      hash,
      indexer.blockHeight - 1
    );
  
    const state = {
      state: CouncilEvents.Closed,
      data: eventData,
      indexer,
    };
  
    const timelineItem = {
      type: TimelineItemTypes.event,
      method: CouncilEvents.Closed,
      args: {
        hash,
        yesVotes,
        noVotes,
      },
      indexer,
    };
  
    const updates = { voting, state };
    await updateMotionByHash(hash, updates, timelineItem);
  }