import { Modules, TreasuryProposalEvents } from "../../../tools/constants.js";
import { handleAwarded } from "./handleAwarded.js";
import { saveNewTreasuryProposal } from "./saveNewTreasuryProposal.js";
import { handleRejected } from "./handleRejected.js";

const isTreasuryProposalEvent = (section, method) => {
    if (![Modules.Treasury].includes(section)) {
        return false;
    }

    return TreasuryProposalEvents.hasOwnProperty(method);
};

export const handleTreasuryProposalEvent = async (event, extrinsic, indexer) => {
    const { section, method } = event;
    if (!isTreasuryProposalEvent(section, method)) {
        return;
    }

    if (TreasuryProposalEvents.Proposed === method) {
        await saveNewTreasuryProposal(event, extrinsic, indexer);
    } else if (TreasuryProposalEvents.Rejected === method) {
        await handleRejected(event, indexer);
    }
};

export const handleTreasuryProposalEventWithoutExtrinsic = async (
    event,
    indexer // this indexer doesn't have extrinsic index
) => {
    const { section, method } = event;
    if (!isTreasuryProposalEvent(section, method)) {
        return;
    }

    if (TreasuryProposalEvents.Awarded === method) {
        await handleAwarded(event, indexer);
    }
};