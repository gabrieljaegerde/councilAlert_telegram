import { getMotionCollection, getUserCollection } from "../../../mongo/db.js";
import { CouncilEvents, Modules, MotionActions } from "../../../../tools/constants.js";
import { extractCallIndexAndArgs, getMotionVoting, isProposalMotion } from "../../proposal/porposalHelpers.js";
import { updateProposalStateByProposeOrVote } from "./updateProposalByProposalOrVote.js";
import { logger } from "../../../../tools/logger.js";
import { botParams } from "../../../../config.js";
import { InlineKeyboard } from "grammy";
import { send } from "../../../../tools/utils.js";

const sendNewMessages = async (motion) => {
  const userCol = await getUserCollection();
  const chain = botParams.settings.network.name.toLowerCase();
  const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
    `https://${chain}.polkassembly.io/treasury/${motion.treasuryProposalId}`);

  const users = await userCol.find({}).toArray();
  for (const user of users) {
    if (user && !user.blocked && user.broadcast) {
      const message = "A new motion is up for vote.\n\n" +
        `*${motion.method}*: _${motion.treasuryProposalId}_`;
      await send(user.chatId, message, inlineKeyboard);
    }
  }
};

export const handleProposedForProposal = async (
  event,
  normalizedExtrinsic,
  extrinsic
) => {
  const [section, method, args] = await extractCallIndexAndArgs(
    normalizedExtrinsic,
    extrinsic
  );

  if (section !== Modules.Treasury || !isProposalMotion(method)) {
    return;
  }

  const { proposal_id: treasuryProposalId } = args;
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
    treasuryProposalId,
    voting,
    isFinal: false,
    state: {
      state: CouncilEvents.Proposed,
      eventData,
      extrinsic: normalizedExtrinsic,
    },
    timeline,
  });

  await updateProposalStateByProposeOrVote(
    hash,
    normalizedExtrinsic.extrinsicIndexer
  );
  const motionDb = await motionCol.findOne({ hash, isFinal: false });
  if (!motionDb) {
    logger.error(`error fetching motion with hash: ${hash} in saveNewMotion`);
    return;
  }
  sendNewMessages(motionDb);
};
