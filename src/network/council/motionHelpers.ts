import { getMotionCollection } from "../../mongo/db.js";


export const getOutstandingMotions = async (address) => {
    const motionCol = await getMotionCollection();
    let outstandingMotions = [];
    const openMotions = await motionCol.find({ isFinal: false }).toArray();
    for (const motion of openMotions) {
        const voted = motion.voting.ayes.includes(address) || motion.voting.nays.includes(address);
        if (!voted) {
            outstandingMotions.push(motion);
        }
    }
    return outstandingMotions;
};