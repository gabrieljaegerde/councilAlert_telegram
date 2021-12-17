import { encodeAddress } from "@polkadot/util-crypto";
import { amountToHumanString, getAccountName, send } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import {
  computeTipValue,
  getTipFindersFeeFromApi,
  getTipMeta,
  getTippersCountFromApi
} from "./tipHelpers.js";
import { InlineKeyboard } from "grammy";
import { logger } from "../../../tools/logger.js";

export const updateTipByClosingEvent = async (hash: string, state, data, extrinsic) => {
  const blockHash = extrinsic.extrinsicIndexer.blockHash;
  const meta = await getTipMeta(hash, extrinsic.extrinsicIndexer);
  const tippersCount = await getTippersCountFromApi(blockHash);
  const tipFindersFee = await getTipFindersFeeFromApi(blockHash);
  const updates = {
    tippersCount,
    tipFindersFee,
    meta,
    medianValue: computeTipValue(meta),
  };
  const tipCol = await getTipCollection();
  await tipCol.updateOne(
    { hash, isClosedOrRetracted: false },
    { $set: updates }
  );
  const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
  if (!tip) {
    logger.error(`error fetching tip with hash: ${hash} in updateTipByClosingEvent`);
    return;
  }
};