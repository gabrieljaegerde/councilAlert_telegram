import { getAccountName, getRealSigner, send } from "../../../tools/utils.js";
import {
  TipEvents,
} from "../../../tools/constants.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import {
  computeTipValue,
  getReasonStorageReasonText,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTipMethodNameAndArgs,
  getTippersCountFromApi,
  getTipReason
} from "./tipHelpers.js";
import { botParams } from "../../../config.js";
import { GenericExtrinsic } from "@polkadot/types";
import { logger } from "../../../tools/logger.js";
import { InlineKeyboard } from "grammy";

const sendNewMessages = async (tip) => {
  const userCol = await getUserCollection();
  const chain = botParams.settings.network.name.toLowerCase();
  const inlineKeyboard = new InlineKeyboard().url("PolkAssembly",
    `https://${chain}.polkassembly.io/tip/${tip.hash}`);

  const user = await userCol.find({});
  if (user && !user.blocked && user.broadcast) {
    const message = "A new tip request has just been created.\n\n" +
      `*Tip Reason*: _${tip.reason}_`;
    await send(user.chatId, message, inlineKeyboard);
  }
};

export const saveNewTip = async (hash: string, normalizedExtrinsic, extrinsic: GenericExtrinsic) => {
  const indexer = normalizedExtrinsic.extrinsicIndexer;
  const finder = await getRealSigner(normalizedExtrinsic);
  const meta = await getTipMeta(hash, indexer);
  const reason =
    (await getTipReason(normalizedExtrinsic, extrinsic)) ||
    (await getReasonStorageReasonText(meta?.reason, indexer.blockHash));

  const medianValue = computeTipValue(meta);
  const tippersCount = await getTippersCountFromApi(indexer.blockHash);
  const tipFindersFee = await getTipFindersFeeFromApi(indexer.blockHash);

  const [method, args] = await getTipMethodNameAndArgs(
    normalizedExtrinsic,
    extrinsic,
    reason
  );

  const tipCol = await getTipCollection();
  const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (tip) {
    logger.info(`tip with hash: ${hash} exists already`);
    return;
  }
  await tipCol.insertOne({
    indexer,
    hash,
    reason,
    finder,
    medianValue,
    meta,
    tippersCount,
    tipFindersFee,
    isClosedOrRetracted: false,
    state: {
      indexer: normalizedExtrinsic.extrinsicIndexer,
      state: TipEvents.NewTip,
      data: [hash],
    },
    timeline: [
      {
        type: "extrinsic",
        method,
        args: {
          ...args,
          finder,
        },
        extrinsicIndexer: indexer,
      },
    ],
  });
  const tipDb = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (!tipDb) {
    logger.error(`error fetching tip with hash: ${hash} in saveNewTip`);
    return;
  }
  sendNewMessages(tipDb);

};