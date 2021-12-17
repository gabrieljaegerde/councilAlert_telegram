import { getMotionCollection } from "../../mongo/db.js";


export const getOutstandingMotions = async (address) => {
    const motionCol = await getMotionCollection();
    let outstandingMotions = [];
    const openMotions = await motionCol.find({ isFinal: false }).toArray();
    for (const motion of openMotions) {
        const voted = address in motion.voting.ayes || address in motion.voting.nays;
        if (!voted) {
            outstandingMotions.push(motion);
        }
    }
    return outstandingMotions;
};