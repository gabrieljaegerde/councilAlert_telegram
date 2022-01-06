import { BountyEvents, Modules } from "../../../tools/constants.js";
import { handleBountyRejected } from "./handleRejected.js";
import { handleAwarded } from "./handleAwarded.js";
import { handleBountyCanceled } from "./handleCanceled.js";
import { handleBountyClaimed } from "./handleClaimed.js";
import { handleBountyExtended } from "./handleExtended.js";
import { handleProposed } from "./handleProposed.js";
import { handleBountyBecameActiveEvent } from "./handleBecameActive.js";

const isBountyEvent = (section, method) => {
    return (
        [Modules.Treasury, Modules.Bounties].includes(section) &&
        BountyEvents.hasOwnProperty(method)
    );
};

export const handleBountyEventWithExtrinsic = async (
    event, extrinsic, indexer
) => {
    const { section, method } = event;
    if (!isBountyEvent(section, method)) {
        return;
    }

    if (method === BountyEvents.BountyProposed) {
        await handleProposed(event, extrinsic, indexer);
    } else if (method === BountyEvents.BountyExtended) {
        await handleBountyExtended(event, extrinsic, indexer);
    } else if (method === BountyEvents.BountyAwarded) {
        await handleAwarded(event, extrinsic, indexer);
    } else if (method === BountyEvents.BountyRejected) {
        await handleBountyRejected(event, extrinsic, indexer);
    } else if (method === BountyEvents.BountyClaimed) {
        await handleBountyClaimed(event, extrinsic, indexer);
    } else if (method === BountyEvents.BountyCanceled) {
        await handleBountyCanceled(event, extrinsic, indexer);
    }
};

export const handleBountyEventWithoutExtrinsic = async (event, indexer) => {
    const { section, method } = event;
    if (
      [Modules.Treasury, Modules.Bounties].includes(section) &&
      method === BountyEvents.BountyBecameActive
    ) {
      await handleBountyBecameActiveEvent(event, indexer);
    }
  }