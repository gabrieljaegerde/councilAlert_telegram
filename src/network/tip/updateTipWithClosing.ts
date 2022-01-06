import {
  getTipCommonUpdates} from "./tipHelpers.js";
import { updateTipByHash } from "../../mongo/service/tip.js";

export const updateTipWithClosing = async (tipHash, indexer) => {
  const updates = await getTipCommonUpdates(tipHash, indexer);
  await updateTipByHash(tipHash, updates);
};