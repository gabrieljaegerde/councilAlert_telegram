import { getProposalCollection } from "../../mongo/db.js";
import { ProposalEvents, timelineItemTypes } from "../../../tools/constants.js";
import { updateProposalInDb } from "./porposalHelpers.js";

export const handleRejected = async (event, eventIndexer) => {
    const eventData = event.data.toJSON();
    const [proposalIndex, value] = eventData;

    const state = {
        name: ProposalEvents.Rejected,
        data: eventData,
        eventIndexer,
    };

    const timelineItem = {
        type: timelineItemTypes.event,
        name: ProposalEvents.Rejected,
        args: {
            proposalIndex: proposalIndex,
            value,
        },
        eventData,
        eventIndexer,
    };

    const updatesObj = {
        $set: { state },
        $push: { timeline: timelineItem },
    };
    await updateProposalInDb(proposalIndex, updatesObj);
};