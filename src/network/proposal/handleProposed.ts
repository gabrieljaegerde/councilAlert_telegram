import { ProposalEvents, ProposalState, timelineItemTypes } from "../../../tools/constants.js";
import { botParams } from "../../../config.js";
import { getProposalCollection } from "../../mongo/db.js";

const getProposalMeta = async (blockHash, proposalIndex) => {
    const blockApi = await botParams.api.at(blockHash);
    const rawMeta = await blockApi.query.treasury.proposals(proposalIndex);
    return rawMeta.toJSON();
  }

export const handleProposed = async (event, normalizedExtrinsic) => {
    const eventData = event.data.toJSON();
    const [proposalIndex] = eventData;
  
    const extrinsicIndexer = normalizedExtrinsic.extrinsicIndexer;
    const metaJson = await getProposalMeta(
      extrinsicIndexer.blockHash,
      proposalIndex
    );
  
    let {
      signer: proposer,
      args: { value, beneficiary },
    } = normalizedExtrinsic;
  
    if (metaJson) {
      proposer = metaJson["proposer"];
      value = metaJson["value"];
      beneficiary = metaJson["beneficiary"];
    }
  
    const timelineItem = {
      type: timelineItemTypes.extrinsic,
      name: ProposalEvents.Proposed,
      args: {
        proposer,
        value,
        beneficiary,
      },
      eventData,
      extrinsicIndexer,
    };
  
    const proposalCol = await getProposalCollection();
  
    await proposalCol.insertOne({
      indexer: extrinsicIndexer,
      proposalIndex,
      proposer,
      value,
      beneficiary,
      meta: metaJson,
      state: {
        name: ProposalState.Proposed,
        extrinsicIndexer,
      },
      timeline: [timelineItem],
    });
  }