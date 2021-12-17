import { hexToString } from "@polkadot/util";
import { BountyMethods, Modules, timelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta, getRealCaller, updateBountyInDb } from "./bountyHelpers.js";
import { findCallInSections } from "../../../tools/utils.js";

export const handleBountyExtended = async (event, normalizedExtrinsic, extrinsic) => {
    const indexer = normalizedExtrinsic.extrinsicIndexer;
    const eventData = event.data.toJSON();
    const bountyIndex = eventData[0];
    const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  
    const caller = getRealCaller(extrinsic.method, normalizedExtrinsic.signer);
    const call = findCallInSections(
      extrinsic.method,
      [Modules.Treasury, Modules.Bounties],
      BountyMethods.extendBountyExpiry
    );
  
    if (!call) {
      throw new Error(
        `can not find target ${BountyMethods.extendBountyExpiry} call`
      );
    }
  
    const { _remark: remark } = call.toJSON().args;
    const timelineItem = {
      type: timelineItemTypes.extrinsic,
      name: event.method,
      args: {
        caller,
        remark: hexToString(remark),
      },
      eventData,
      extrinsicIndexer: indexer,
    };
  
    await updateBountyInDb(bountyIndex, {
      $set: { meta },
      $push: { timeline: timelineItem },
    });
  }