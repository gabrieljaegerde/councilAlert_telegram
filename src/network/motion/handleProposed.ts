import { CouncilEvents, TimelineItemTypes } from "../../../tools/constants.js";
import { getMotionCall, getMotionProposalCall, getMotionVoting, handleWrappedCall, isBountyMotion, isProposalMotion } from "./motionHelpers.js";
import { handleBusinessWhenMotionProposed } from "./handleMotionBusiness.js";
import { insertMotion } from "../../mongo/service/motion.js";
import { getUserCollection } from "../../mongo/index.js";
import { botParams } from "../../../config.js";
import { InlineKeyboard } from "grammy";
import { send } from "../../../tools/utils.js";

const sendNewMessages = async (motion) => {
    const userCol = await getUserCollection();
    const chain = botParams.settings.network.name.toLowerCase();
    const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
        `https://${chain}.polkassembly.io/motion/${motion.index}`);

    const users = await userCol.find({}).toArray();
    for (const user of users) {
        if (user && !user.blocked && user.broadcast) {
            const message = `A new motion is up for vote. (Index: ${motion.index})\n\n` +
                `*${motion.proposal.section}*: _${motion.proposal.method}_`;
            await send(user.chatId, message, "Markdown", inlineKeyboard);
        }
    }
};


export const handleProposed = async (event, extrinsic, indexer, blockEvents) => {
    const eventData = event.data.toJSON();
    const [proposer, motionIndex, hash, threshold] = eventData;

    const rawProposal = await getMotionCall(hash, indexer);
    const proposalCall = await getMotionProposalCall(hash, indexer);
    const voting = await getMotionVoting(indexer.blockHash, hash);

    const timelineItem = {
        type: TimelineItemTypes.event,
        method: CouncilEvents.Proposed,
        args: {
            proposer,
            index: motionIndex,
            hash,
            threshold,
        },
        indexer,
    };

    const state = {
        indexer,
        state: CouncilEvents.Proposed,
        data: eventData,
    };

    const treasuryProposals = [];
    const treasuryBounties = [];
    const others = [];
    await handleWrappedCall(
        rawProposal,
        proposer,
        indexer,
        blockEvents,
        (call) => {
            const { section, method, args } = call;
            if (isProposalMotion(section, method)) {
                const treasuryProposalIndex = args[0].toJSON();
                treasuryProposals.push({
                    index: treasuryProposalIndex,
                    method,
                });
            } else if (isBountyMotion(section, method)) {
                const treasuryBountyIndex = args[0].toJSON();
                treasuryBounties.push({
                    index: treasuryBountyIndex,
                    method,
                });
            }
            else {
                others.push({
                    method
                });
            }
        },
    );

    const obj = {
        indexer,
        hash,
        proposer,
        index: motionIndex,
        threshold,
        proposal: proposalCall,
        voting,
        isFinal: false,
        state,
        timeline: [timelineItem],
        treasuryProposals,
        treasuryBounties,
        others
    };
    //is new
    if (await insertMotion(obj)) {
        sendNewMessages(obj);
    }
    await handleBusinessWhenMotionProposed(obj, rawProposal, indexer, blockEvents);
};