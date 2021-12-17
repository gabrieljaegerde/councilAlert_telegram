import { isBountyMethod, updateBountyInDb } from "../../bounty/bountyHelpers.js";
import { botParams } from "../../../../config.js";
import { getBountyCollection, getMotionCollection } from "../../../mongo/db.js";

const getBountyMeta = async (blockHash, bountyIndex) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawMeta;
    if (blockApi.query.treasury?.bounties) {
        rawMeta = await blockApi.query.treasury?.bounties(bountyIndex);
    } else {
        rawMeta = await blockApi.query.bounties.bounties(bountyIndex);
    }

    return rawMeta.toJSON();
};

export const updateBountyByVoteResult = async (hash, isApproved, indexer) => {
    const motionCol = await getMotionCollection();
    const motion = await motionCol.findOne({ hash, isFinal: false });

    if (!motion || !isBountyMethod(motion.method)) {
        // motion hash is not a treasury bounty motion hash
        return;
    }

    const meta = await getBountyMeta(
        indexer.blockHash,
        motion.treasuryBountyId
    );

    await updateBountyInDb(motion.treasuryBountyId, {
        $set: { meta },
    });
};