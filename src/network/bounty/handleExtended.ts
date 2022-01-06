import { hexToString } from "@polkadot/util";
import { BountyMethods, Modules, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyMeta, getRealCaller } from "./bountyHelpers.js";
import { findCallInSections } from "../../../tools/utils.js";
import { updateBounty } from "../../mongo/service/bounty.js";

export const handleBountyExtended = async (event, extrinsic, indexer) => {
  const eventData = event.data.toJSON();
  const bountyIndex = eventData[0];

  const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  const caller = getRealCaller(extrinsic.method, extrinsic.signer.toString());

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
    type: TimelineItemTypes.extrinsic,
    name: event.method,
    args: {
      caller,
      remark: hexToString(remark),
    },
    eventData,
    indexer,
  };

  await updateBounty(bountyIndex, { meta, }, timelineItem);
};