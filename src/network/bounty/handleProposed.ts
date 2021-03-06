import { BountyMethods, BountyStatus, TimelineItemTypes } from "../../../tools/constants.js";
import { getBountyDescription, getBountyMeta } from "./bountyHelpers.js";
import { insertBounty } from "../../mongo/service/bounty.js";

export const handleProposed = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
  const bountyIndex = eventData[0];

  const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
  const description = await getBountyDescription(indexer.blockHash, bountyIndex);

  const proposer = meta.proposer;
  const args = {
    proposer,
    value: meta.value,
    description,
  }

  const timeline = [
    {
      type: TimelineItemTypes.extrinsic,
      name: BountyMethods.proposeBounty,
      args,
      indexer,
    },
  ];

  const state = {
    indexer,
    state: BountyStatus.Proposed,
    data: event.data.toJSON(),
  }

  const bountyObj = {
    indexer,
    bountyIndex,
    description,
    meta,
    state,
    timeline,
    motions: [],
  }

  await insertBounty(bountyObj);
}