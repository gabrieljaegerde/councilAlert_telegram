import { getTipCollection } from "../../mongo/index.js";
import { logger } from "../../../tools/logger.js";
import { Modules, TimelineItemTypes, TipMethods } from "../../../tools/constants.js";
import { updateTipByHash } from "../../mongo/service/tip.js";
import { getTipCommonUpdates } from "./tipHelpers.js";

export const handleTipCall = async (call, author, extrinsicIndexer) => {
    if (
        ![Modules.Treasury, Modules.Tips].includes(call.section) ||
        TipMethods.tip !== call.method
    ) {
        return;
    }

    const {
        args: { hash, tip_value: tipValue },
    } = call.toJSON();
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isFinal: false });
    if (!tip) {
        logger.info(`tip with hash: ${hash} tipped but doesnt exist in db.`);
        return;
    }
    const updates = await getTipCommonUpdates(hash, extrinsicIndexer);
    const timelineItem = {
        type: TimelineItemTypes.extrinsic,
        method: TipMethods.tip,
        args: {
            tipper: author,
            value: tipValue,
        },
        indexer: extrinsicIndexer,
    };

    await updateTipByHash(hash, updates, timelineItem);
};

