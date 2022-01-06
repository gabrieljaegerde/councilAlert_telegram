import { updateProposal } from "../../mongo/service/treasuryProposal.js";
import { logger } from "../../../tools/logger.js";
import { ProposalEvents, TimelineItemTypes, TreasuryProposalEvents } from "../../../tools/constants.js";
import { getProposalCollection } from "../../mongo/index.js";

export const handleAwarded = async (event, eventIndexer) => {
    const eventData = event.data.toJSON();
    const [proposalIndex, award, beneficiary] = eventData;

    const state = {
        state: TreasuryProposalEvents.Awarded,
        data: eventData,
        indexer: eventIndexer,
    };

    const timelineItem = {
        type: TimelineItemTypes.event,
        name: TreasuryProposalEvents.Awarded,
        args: {
            award,
            beneficiary,
        },
        indexer: eventIndexer,
    };

    await updateProposal(proposalIndex, { state }, timelineItem);
    logger.info(`Treasury proposal ${proposalIndex} awarded at`, eventIndexer);
};