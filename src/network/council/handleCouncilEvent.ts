import { getMotionCollection } from "../../mongo/db.js";
import { CouncilEvents, Modules, MotionActions } from "../../../tools/constants.js";
import { getMotionVoting, getMotionVotingByHeight } from "../proposal/porposalHelpers.js";
import { updateProposalStateByProposeOrVote } from "./proposalMotion/updateProposalByProposalOrVote.js";
import { updateProposalStateByVoteResult } from "./proposalMotion/updatePropsalByVoteResult.js";
import { handleProposedForProposal } from "./proposalMotion/handleProposedForProposal.js";
import { handleProposedForBounty } from "./bountyMotion/handleProposedForBounty.js";
import { updateBountyByVoteResult } from "./bountyMotion/updateBountyByVoteResult.js";
import { handleProposedOther } from "./handleProposedOther.js";

export const handleCouncilEvent = async (event, normalizedExtrinsic, extrinsic) => {
    const { section, method } = event;
    if (Modules.Council !== section) {
        return;
    }
    if (method === CouncilEvents.Proposed) {
        const isProposal = await handleProposedForProposal(event, normalizedExtrinsic, extrinsic);
        const isBounty = await handleProposedForBounty(event, normalizedExtrinsic, extrinsic);
        if (!isProposal && !isBounty){
            await handleProposedOther(event, normalizedExtrinsic, extrinsic);
        }
    } else if (method === CouncilEvents.Voted) {
        await handleVoteEvent(event, normalizedExtrinsic);
    } else if (method === CouncilEvents.Approved) {
        await handleApprovedEvent(event, normalizedExtrinsic);
    } else if (method === CouncilEvents.Disapproved) {
        await handleDisapprovedEvent(event, normalizedExtrinsic);
    } else if (method === CouncilEvents.Executed) {
        await handleExecutedEvent(event);
    } else if (method === CouncilEvents.Closed) {
        await handleClosedEvent(event, normalizedExtrinsic);
    }
};

async function handleVoteEvent(event, normalizedExtrinsic) {
    const eventData = event.data.toJSON();
    const hash = eventData[1];
    const voting = await getMotionVoting(
        normalizedExtrinsic.extrinsicIndexer.blockHash,
        hash
    );

    const col = await getMotionCollection();
    await col.updateOne(
        { hash, isFinal: false },
        {
            $set: {
                voting,
                state: {
                    state: CouncilEvents.Voted,
                    eventData,
                    extrinsic: normalizedExtrinsic,
                },
            },
            $push: {
                timeline: {
                    action: MotionActions.Vote,
                    eventData,
                    extrinsic: normalizedExtrinsic,
                },
            },
        }
    );

    const indexer = normalizedExtrinsic.extrinsicIndexer;
    await updateProposalStateByProposeOrVote(hash, indexer);
}

async function handleClosedEvent(event, normalizedExtrinsic) {
    const eventData = event.data.toJSON();
    const hash = eventData[0];
    const voting = await getMotionVotingByHeight(
        normalizedExtrinsic.extrinsicIndexer.blockHeight - 1,
        hash
    );

    const col = await getMotionCollection();
    await col.updateOne(
        { hash, isFinal: false },
        {
            $set: {
                voting,
                state: {
                    state: CouncilEvents.Closed,
                    eventData,
                    extrinsic: normalizedExtrinsic,
                },
            },
            $push: {
                timeline: {
                    action: MotionActions.Close,
                    eventData,
                    extrinsic: normalizedExtrinsic,
                },
            },
        }
    );
}

async function handleApprovedEvent(event, normalizedExtrinsic) {
    const eventData = event.data.toJSON();
    const hash = eventData[0];
    const voting = await getMotionVotingByHeight(
        normalizedExtrinsic.extrinsicIndexer.blockHeight - 1,
        hash
    );

    const updateObj = {
        $set: { voting, result: CouncilEvents.Approved },
    };

    const col = await getMotionCollection();
    await col.updateOne({ hash, isFinal: false }, updateObj);

    await updateProposalStateByVoteResult(
        hash,
        true,
        normalizedExtrinsic.extrinsicIndexer
    );
    await updateBountyByVoteResult(
        hash,
        true,
        normalizedExtrinsic.extrinsicIndexer
    );
}

async function handleDisapprovedEvent(event, normalizedExtrinsic) {
    const eventData = event.data.toJSON();
    const hash = eventData[0];
    const voting = await getMotionVotingByHeight(
        normalizedExtrinsic.extrinsicIndexer.blockHeight - 1,
        hash
    );

    const updateObj = {
        $set: { voting, result: CouncilEvents.Disapproved },
    };

    const col = await getMotionCollection();
    await col.updateOne({ hash, isFinal: false }, updateObj);

    await updateProposalStateByVoteResult(
        hash,
        false,
        normalizedExtrinsic.extrinsicIndexer
    );
    await updateBountyByVoteResult(
        hash,
        true,
        normalizedExtrinsic.extrinsicIndexer
    );

    await col.updateOne(
        { hash, isFinal: false },
        {
            $set: {
                isFinal: true,
            },
        }
    );
}

async function handleExecutedEvent(event) {
    const eventData = event.data.toJSON();
    const [hash, result] = eventData;

    const col = await getMotionCollection();
    await col.updateOne(
        { hash, isFinal: false },
        {
            $set: {
                isFinal: true,
                executed: {
                    result,
                    eventData,
                },
            },
        }
    );
}