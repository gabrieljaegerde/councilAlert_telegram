import { getTipCollection } from "../index.js";

export const insertTip = async (tip) => {
    const {
        indexer: { blockHeight },
        hash,
    } = tip;
    const tipCol = await getTipCollection();
    const maybeInDb = await tipCol.findOne({
        "indexer.blockHeight": blockHeight,
        hash,
    });
    if (maybeInDb) {
        return false;
    }

    await tipCol.insertOne(tip);
    return true;
};

export const getActiveTipByHash = async (hash) => {
    const tipCol = await getTipCollection();
    return await tipCol.findOne({ hash, isFinal: false });
};

export const updateTipByHash = async (hash, updates, timelineItem?) => {
    const tipCol = await getTipCollection();

    let update = {
        $set: updates,
        $push: {}
    };

    if (timelineItem) {
        update = {
            ...update,
            $push: { timeline: timelineItem },
        };
    }

    await tipCol.updateOne({ hash: hash, isFinal: false }, update);
};