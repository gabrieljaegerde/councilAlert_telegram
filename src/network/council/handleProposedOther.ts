import { getMotionCollection, getUserCollection } from "../../mongo/db.js";
import { CouncilEvents, DemocracyMethods, Modules, MotionActions } from "../../../tools/constants.js";
import { extractCallIndexAndArgs, getMotionVoting } from "../proposal/porposalHelpers.js";
import { logger } from "../../../tools/logger.js";
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
      const message = "A new motion is up for vote.\n\n" +
        `*${motion.method}*`;
      await send(user.chatId, message, inlineKeyboard);
    }
  }
};

export const handleProposedOther = async (
  event,
  normalizedExtrinsic,
  extrinsic
) => {
  const [section, method, args] = await extractCallIndexAndArgs(
    normalizedExtrinsic,
    extrinsic
  );
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
