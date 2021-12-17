import { InlineKeyboard } from "grammy";
import { amountToHumanString, getAccountName, getRealSigner, send } from "../../../tools/utils.js";
import { botParams } from "../../../config.js";
import { TipEvents } from "../../../tools/constants.js";
import { logger } from "../../../tools/logger.js";
import { getAlertCollection, getTipCollection, getUserCollection } from "../../mongo/db.js";
import {
    getTipMetaByBlockHeight,
    getTipMethodNameAndArgs
} from "./tipHelpers.js";

export const updateTipFinalState = async (
    hash: string,
    eventMethod,
    data,
    normalizedExtrinsic,
    extrinsic
) => {
    const indexer = normalizedExtrinsic.extrinsicIndexer;
    const meta = await getTipMetaByBlockHeight(indexer.blockHeight - 1, hash);
    const updates = {
        isClosedOrRetracted: true,
        meta,
        state: { indexer, state: eventMethod, data },
    };
    const [method, args] = await getTipMethodNameAndArgs(
        normalizedExtrinsic,
        extrinsic,
        null
    );
    const terminator = await getRealSigner(normalizedExtrinsic);
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    await tipCol.updateOne(
        { hash, isClosedOrRetracted: false },
        {
            $set: updates,
            $push: {
                timeline: {
                    type: "extrinsic",
                    method,
                    args: {
                        ...args,
                        terminator,
                    },
                    extrinsicIndexer: indexer,
                },
            },
        }
    );

    if (!tip) {
        logger.error(`error fetching tip with hash: ${hash} in updateTipFinalState`);
        return;
    }
};