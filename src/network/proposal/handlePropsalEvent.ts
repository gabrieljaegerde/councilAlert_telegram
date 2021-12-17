import { Modules, ProposalEvents } from "../../../tools/constants.js";
import { handleAwarded } from "./handleAwarded.js";
import { handleProposed } from "./handleProposed.js";
import { handleRejected } from "./handleRejected.js";

export const handleProposalEvent = async (
    event,
    blockIndexer,
    nullableNormalizedExtrinsic,
    eventSort
) => {
    const { section, method } = event;
    if (Modules.Treasury !== section || !ProposalEvents.hasOwnProperty(method)) {
        return;
    }
    const eventIndexer = { ...blockIndexer, sort: eventSort };

    if (method === ProposalEvents.Proposed) {
        await handleProposed(event, nullableNormalizedExtrinsic);
    } else if (method === ProposalEvents.Rejected) {
        await handleRejected(event, eventIndexer);
    } else if (method === ProposalEvents.Awarded) {
        await handleAwarded(event, eventIndexer);
    }
};