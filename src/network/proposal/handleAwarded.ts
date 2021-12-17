import { ProposalEvents, timelineItemTypes } from "../../../tools/constants.js";
import { getProposalCollection } from "../../mongo/db.js";
import { updateProposalInDb } from "./porposalHelpers.js";

export const handleAwarded = async (event, eventIndexer) => {
    const eventData = event.data.toJSON();
    const [proposalIndex, value, beneficiary] = eventData;

    const state = {
        name: ProposalEvents.Awarded,
        data: eventData,
        eventIndexer,
    };

    const timelineItem = {
        type: timelineItemTypes.event,
        name: ProposalEvents.Awarded,
        args: {
            proposalIndex,
            value,
            beneficiary,
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