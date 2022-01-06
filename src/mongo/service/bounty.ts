import { getBountyCollection } from "../index.js";

import _ from "lodash";

export const insertBounty = async (bountyObj) => {
    const col = await getBountyCollection();
    const { bountyIndex } = bountyObj;
    const maybeInDb = await col.findOne({ bountyIndex });
    if (maybeInDb) {
        return;
    }

    await col.insertOne(bountyObj);
};

export const updateBounty = async (bountyIndex, updates, timelineItem?, motionInfo?) => {
    const col = await getBountyCollection();
    let update = _.isEmpty(updates) ? null : { $set: updates, $push: {} };
    if (timelineItem) {
        update = {
            ...update,
            $push: { timeline: timelineItem },
        };
    }

    if (motionInfo) {
        update = {
            ...update,
            $push: { motions: motionInfo }
        };
    }
    await col.updateOne({ bountyIndex }, update);
};