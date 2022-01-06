import { getTipCollection } from "../../mongo/index.js";
import {
  TipEvents,
  Modules,
} from "../../../tools/constants.js";
import { saveNewTip } from "./saveNewTip.js";
import { updateTipWithClosing } from "./updateTipWithClosing.js";
import { logger } from "../../../tools/logger.js";
import { updateTipWithTipClosed } from "./updateTipWithTipClosed.js";
import { updateTipWithTipRetracted } from "./updateTipWithTipRetracted.js";
import { updateTipWithTipSlashed } from "./updateTipWithTipSlashed.js";

const isTipEvent = (section, method) => {
  if (![Modules.Treasury, Modules.Tips].includes(section)) {
    return false;
  }

  return TipEvents.hasOwnProperty(method);
}

export const handleTipEvent = async (event, extrinsic, indexer) => {
  const { section, method, data } = event;
  if (!isTipEvent(section, method)) {
    return;
  }
  const [hash] = data;
  // const eventData = data.toJSON();
  // const hash = eventData[0];
  if (TipEvents.NewTip === method) {
    await saveNewTip(event, extrinsic, indexer);
  } else if (TipEvents.TipClosing === method) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isFinal: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipClosing but doesnt exist in db.`);
      return;
    }
    await updateTipWithClosing(hash.toString(), indexer);
  } else if (TipEvents.TipClosed === method) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isFinal: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipClosed but doesnt exist in db.`);
      return;
    }
    await updateTipWithTipClosed(event, extrinsic, indexer);
  } else if (TipEvents.TipRetracted === method) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isFinal: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipRetracted but doesnt exist in db.`);
      return;
    }
    await updateTipWithTipRetracted(event, extrinsic, indexer);
  } else if (TipEvents.TipSlashed === method) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isFinal: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipSlashed but doesnt exist in db.`);
      return;
    }
    await updateTipWithTipSlashed(event, extrinsic, indexer);
  }
}