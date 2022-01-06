import { getMotionCollection } from "../index.js";

export const insertMotion = async (motion) => {
    const {
        indexer: { blockHeight },
        hash,
    } = motion;

    const motionCol = await getMotionCollection();
    const maybeInDb = await motionCol.findOne({
        "indexer.blockHeight": blockHeight,
        hash,
    });
    if (maybeInDb) {
        return false;
    }

    await motionCol.insertOne(motion);
    return true;
};

export const updateMotionByHash = async (hash, updates, timelineItem) => {
    const col = await getMotionCollection();

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

    await col.updateOne({ hash: hash, isFinal: false }, update);
};