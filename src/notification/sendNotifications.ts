import { getAccountName, getCouncilMembers, send } from "../../tools/utils.js";
import { botParams } from "../../config.js";
import { getAlertCollection, getUserCollection } from "../mongo/db.js";
import { getOutstandingMotions } from "../network/council/motionHelpers.js";
import { getOutstandingTips } from "../network/tip/tipHelpers.js";


export const sendNotifications = async (motionOrTip, frequency) => {
    if (botParams.blockListener.missingBlockEventsFetched === false)
        return;
    const currentBlock = await botParams.blockCountAdapter.get();
    const blockHash = await botParams.api.rpc.chain.getBlockHash(currentBlock);
    const councilAddresses = await getCouncilMembers(blockHash);
    for (const memberAddress of councilAddresses) {
        let outstandingMotionsString = "";
        let outstandingTipsString = "";
        if (motionOrTip === "motion") {
            const nonVotedMotions = await getOutstandingMotions(memberAddress);
            for (const motion of nonVotedMotions) {
                outstandingMotionsString += (`${motion["method"]}` +
                    (motion["method"] === "approveProposal" ? `: ${motion["treasuryProposalId"]}` : "") +
                    (motion["method"] === "approveBounty" ? `: ${motion["treasuryBountyId"]}` : "") +
                    (motion["method"] === "proposeCurator" ? `: ${motion["treasuryBountyId"]}` : "") +
                    "\n");
            }
        }
        else if (motionOrTip === "tip") {
            const nonVotedTips = await getOutstandingTips(memberAddress);
            for (const tip of nonVotedTips) {
                outstandingTipsString += `*Tip Reason*: _${tip.reason}_\n`;
            }
        }
        const alertCol = await getAlertCollection();
        const memberAlerts = await alertCol.find({ address: memberAddress }).toArray();
        for (const alert of memberAlerts) {
            if (alert[motionOrTip + "s"] === frequency) {
                const userCol = await getUserCollection();
                const user = await userCol.findOne({ chatId: alert.chatId });
                if (user && !user.blocked) {
                    if ((motionOrTip === "motion" && outstandingMotionsString != "") ||
                        (motionOrTip === "tip" && outstandingTipsString != "")) {
                        const message = `*Alert for ${await getAccountName(alert.address, true)}*\n\n` +
                            `The ${botParams.settings.network.name} community needs you!\n\n` +
                            `You have not voted on the following ${motionOrTip}(s) yet:\n\n` +
                            (motionOrTip === "motion" ? outstandingMotionsString : outstandingTipsString);
                        await send(user.chatId, message);
                    }
                }
            }
        }
    }
};