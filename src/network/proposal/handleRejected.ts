import { TimelineItemTypes, TreasuryProposalEvents } from "../../../tools/constants.js";
import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { logger } from "../../../tools/logger.js";

export const handleRejected = async (event, eventIndexer) => {
    const eventData = event.data.toJSON();
    const [proposalId, value] = eventData;
  
    const state = {
      state: TreasuryProposalEvents.Rejected,
      data: eventData,
      indexer: eventIndexer,
    };
  
    const timelineItem = {
      type: TimelineItemTypes.event,
      name: TreasuryProposalEvents.Rejected,
      args: {
        proposalIndex: proposalId,
        value,
      },
      eventData,
      indexer: eventIndexer,
    };
  
    await updateProposal(proposalId, { state }, timelineItem);
    logger.info(`Treasury proposal ${ proposalId } rejected at`, eventIndexer);
  }