import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import { TipMethods } from "../../../tools/constants.js";
import { amountToHumanString, getAccountName, send } from "../../../tools/utils.js";
import { InlineKeyboard } from "grammy";
import { botParams } from "../../../config.js";
import { logger } from "../../../tools/logger.js";

export const updateTipByTip = async (
    hash: string,
    updates,
    tipper,
    value,
    extrinsicIndexer
) => {
    const tipCol = await getTipCollection();
    await tipCol.updateOne(
        { hash, isClosedOrRetracted: false },
        {
            $set: updates,
            $push: {
                timeline: {
                    type: "extrinsic",
                    method: TipMethods.tip,
                    args: {
                        tipper,
                        value,
                    },
                    extrinsicIndexer,
                },
            },
        }
    );
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (!tip) {
        logger.error(`error fetching tip with hash: ${hash} in updateTipByTip`);
        return;
    }
};