import { BountyEvents, Modules } from "../../../tools/constants.js";
import { handleBountyRejected } from "./handleBountryRejected.js";
import { handleBountyAwarded } from "./handleBountyAwarded.js";
import { handleBountyCanceled } from "./handleBountyCanceled.js";
import { handleBountyClaimed } from "./handleBountyClaimed.js";
import { handleBountyExtended } from "./handleBountyExtended.js";
import { handleProposed } from "./handleProposed.js";

const isBountyEvent = (section, method) => {
    return (
        [Modules.Treasury, Modules.Bounties].includes(section) &&
        BountyEvents.hasOwnProperty(method)
    );
};

export const handleBountyEventWithExtrinsic = async (
    event,
    normalizedExtrinsic,
    extrinsic
) => {
    const { section, method } = event;
    if (!isBountyEvent(section, method)) {
        return;
    }

    if (method === BountyEvents.BountyProposed) {
        await handleProposed(event, normalizedExtrinsic, extrinsic);
    } else if (method === BountyEvents.BountyExtended) {
        await handleBountyExtended(event, normalizedExtrinsic, extrinsic);
    } else if (method === BountyEvents.BountyAwarded) {
        await handleBountyAwarded(event, normalizedExtrinsic);
    } else if (method === BountyEvents.BountyRejected) {
        await handleBountyRejected(event, normalizedExtrinsic, extrinsic);
    } else if (method === BountyEvents.BountyClaimed) {
        await handleBountyClaimed(event, normalizedExtrinsic);
    } else if (method === BountyEvents.BountyCanceled) {
        await handleBountyCanceled(event, normalizedExtrinsic, extrinsic);
    }
};