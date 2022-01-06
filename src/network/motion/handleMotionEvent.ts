import { getMotionCollection } from "../../mongo/index.js";
import { CouncilEvents, Modules, MotionActions } from "../../../tools/constants.js";
import { getMotionVoting, getMotionVotingByHeight } from "../proposal/porposalHelpers.js";
import { handleProposed } from "./handleProposed.js";
import { handleVoted } from "./handleVoted.js";
import { handleClosed } from "./handleClosed.js";
import { handleApproved } from "./handleApproved.js";
import { handleDisapproved } from "./handleDisapproved.js";
import { handleExecuted } from "./handleExecuted.js";

export const handleMotionEvent = async (event, extrinsic, indexer, blockEvents) => {
    const { section, method } = event;
    if (Modules.Council !== section) {
        return;
    }
    if (method === CouncilEvents.Proposed) {
        await handleProposed(event, extrinsic, indexer, blockEvents);
        // if (blockIndexer.blockHeight == 10815219) {
        //     console.log("hello");
        //     console.log("normalizedExtrinsic", normalizedExtrinsic)
        //     console.log("extrinsic", extrinsic)
        // }
        // const isProposal = await handleProposedForProposal(event, normalizedExtrinsic, extrinsic);
        // const isBounty = await handleProposedForBounty(event, normalizedExtrinsic, extrinsic);
        // if (blockIndexer.blockHeight == 10815219) {
        //     console.log("isProposal", isProposal)
        //     console.log("isBounty", isBounty)
        // }
        // if (!isProposal && !isBounty){
        //     await handleProposedOther(event, normalizedExtrinsic, extrinsic);
        // }
    } else if (method === CouncilEvents.Voted) {
        await handleVoted(event, extrinsic, indexer);
    } else if (method === CouncilEvents.Approved) {
        await handleApproved(event, extrinsic, indexer);
    } else if (method === CouncilEvents.Disapproved) {
        await handleDisapproved(event, extrinsic, indexer);
    } else if (method === CouncilEvents.Executed) {
        await handleExecuted(event, extrinsic, indexer);
    } else if (method === CouncilEvents.Closed) {
        await handleClosed(event, extrinsic, indexer);
    }
};
