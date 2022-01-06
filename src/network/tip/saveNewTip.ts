import { escapeMarkdown, getRealSigner, send } from "../../../tools/utils.js";
import {
  TimelineItemTypes,
  TipEvents, TipMethods,
} from "../../../tools/constants.js";
import { getTipCollection, getUserCollection } from "../../mongo/index.js";
import {
  computeTipValue,
  getFinderFromMeta,
  getNewTipCall,
  getReasonStorageReasonText,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTipMetaFromStorage,
  getTipMethodNameAndArgs,
  getTippersCountFromApi,
  getTipReason
} from "./tipHelpers.js";
import { botParams } from "../../../config.js";
import { GenericExtrinsic } from "@polkadot/types";
import { logger } from "../../../tools/logger.js";
import { InlineKeyboard } from "grammy";
import { insertTip } from "../../mongo/service/tip.js";
import { hexToU8a } from "@polkadot/util";

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

export const saveNewTip = async (event, extrinsic, indexer) => {
  const [rawHash] = event.data;
  const hash = rawHash.toString();
  const meta = await getTipMetaFromStorage(indexer.blockHash, hash);

  const finder = getFinderFromMeta(meta);
  const medianValue = computeTipValue(meta);

  const reasonHash = meta.reason;
  const registry = await botParams.api.getBlockRegistry(hexToU8a(indexer.blockHash));
  const newTipCall = await getNewTipCall(
    registry.registry,
    extrinsic.method,
    reasonHash
  );
  const method = newTipCall.method;

  const reason = await getTipReason(indexer.blockHash, reasonHash);
  meta.reason = reason;
  const beneficiary = newTipCall.args[1].toJSON();
  meta.findersFee = TipMethods.reportAwesome === method;
  const tippersCount = await getTippersCountFromApi(indexer.blockHash);
  const tipFindersFee = await getTipFindersFeeFromApi(indexer.blockHash);

  const timelineItem = {
    type: TimelineItemTypes.extrinsic,
    method,
    args: {
      reason,
      beneficiary,
      finder,
    },
    indexer,
  };

  const state = {
    indexer,
    state: TipEvents.NewTip,
    data: event.data.toJSON(),
  };

  const obj = {
    indexer,
    hash,
    reason,
    finder,
    medianValue,
    tippersCount,
    tipFindersFee,
    meta,
    isFinal: false,
    state,
    timeline: [timelineItem],
  };

  if (await insertTip(obj)) {
    sendNewMessages(obj);
  }
};