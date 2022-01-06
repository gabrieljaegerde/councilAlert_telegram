import { TimelineItemTypes, TreasuryProposalEvents } from "../../../tools/constants.js";
import { getTreasuryProposalMeta } from "./porposalHelpers.js";
import { insertProposal } from "../../mongo/service/treasuryProposal.js";
import { logger } from "../../../tools/logger.js";

export const saveNewTreasuryProposal = async (event, extrinsic, eventIndexer) => {
  const [proposalIndex] = event.data.toJSON();

  const meta = await getTreasuryProposalMeta(eventIndexer.blockHash, proposalIndex);
  const proposer = meta["proposer"];
  const value = meta["value"];
  const beneficiary = meta["beneficiary"];

  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    method: TreasuryProposalEvents.Proposed,
    args: {
      index: proposalIndex,
    },
    indexer: eventIndexer,
  };

  const state = {
    indexer: eventIndexer,
    state: TreasuryProposalEvents.Proposed,
    data: event.data.toJSON(),
  };

  const obj = {
    indexer: eventIndexer,
    proposalIndex,
    proposer,
    value,
    beneficiary,
    meta,
    state,
    timeline: [timelineItem],
    motions: [],
  };

  await insertProposal(obj);
  logger.info(`Treasury proposal ${proposalIndex} saved`);
};