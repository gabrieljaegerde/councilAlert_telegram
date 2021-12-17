import { getMotionCollection, getUserCollection } from "../../../mongo/db.js";
import { CouncilEvents, Modules, MotionActions } from "../../../../tools/constants.js";
import { extractCallIndexAndArgs, getMotionVoting } from "../../proposal/porposalHelpers.js";
import { isBountyMethod } from "../../bounty/bountyHelpers.js";
import { logger } from "../../../../tools/logger.js";
import { botParams } from "../../../../config.js";
import { InlineKeyboard } from "grammy";
import { send } from "../../../../tools/utils.js";

export const isBountyMotion = (section, method) => {
    return (section === Modules.Bounties &&
        isBountyMethod(method));
};

const sendNewMessages = async (motion) => {
    const userCol = await getUserCollection();
    const chain = botParams.settings.network.name.toLowerCase();
    const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
        `https://${chain}.polkassembly.io/bounty/${motion.treasuryBountyId}`);

    const user = await userCol.find({});
    if (user && !user.blocked && user.broadcast) {
        const message = "A new motion is up for vote.\n\n" +
            `${motion.method}: ${motion.treasuryBountyId}`;
        await send(user.chatId, message, inlineKeyboard);
    }
};

export const handleProposedForBounty = async (event, normalizedExtrinsic, extrinsic) => {
    const [section, method, args] = await extractCallIndexAndArgs(
        normalizedExtrinsic,
        extrinsic
    );
    if (
        !isBountyMotion(
            section,
            method
        )
    ) {
        return;
    }

    const eventData = event.data.toJSON();
    const [proposer, index, hash] = eventData;
    const voting = await getMotionVoting(
        normalizedExtrinsic.extrinsicIndexer.blockHash,
        hash
    );

    const timeline = [
        {
            action: MotionActions.Propose,
            eventData,
            extrinsic: normalizedExtrinsic,
        },
    ];

    const { bounty_id: treasuryBountyId } = args;
    const motionCol = await getMotionCollection();
    const motion = await motionCol.findOne({ hash, isFinal: false });
    if (motion) {
        logger.info(`motion with hash: ${hash} exists already`);
        return;
    }
    await motionCol.insertOne({
        hash,
        index,
        proposer,
        method,
        treasuryBountyId,
        voting,
        isFinal: false,
        state: {
            state: CouncilEvents.Proposed,
            eventData,
            extrinsic: normalizedExtrinsic,
        },
        timeline,
    });
    const motionDb = await motionCol.findOne({ hash, isFinal: false });
    if (!motionDb) {
        logger.error(`error fetching motion with hash: ${hash} in saveNewMotion`);
        return;
    }
    sendNewMessages(motionDb);
};
