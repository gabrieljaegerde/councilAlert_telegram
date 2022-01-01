import { escapeMarkdown, getRealSigner, send } from "../../../tools/utils.js";
import {
  TipEvents,
} from "../../../tools/constants.js";
import { getTipCollection, getUserCollection } from "../../mongo/db.js";
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

  const users = await userCol.find({}).toArray();
  for (const user of users) {
    if (user && !user.blocked && user.broadcast) {
      const escapedTipReason = escapeMarkdown(tip.reason);
      const message = "A new tip request has just been created\\.\n\n" +
      "*Tip Reason*: _" + escapedTipReason + "_";
      await send(user.chatId, message, "MarkdownV2", inlineKeyboard);
    }
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
  const query = { hash, isClosedOrRetracted: false };
  const update = {
    $set: {
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
    }
  };
  const options = { upsert: true };
  await tipCol.updateOne(query, update, options);
  const tipDb = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (!tipDb) {
    logger.error(`error fetching tip with hash: ${hash} in saveNewTip`);
    return;
  }
  sendNewMessages(tipDb);

};