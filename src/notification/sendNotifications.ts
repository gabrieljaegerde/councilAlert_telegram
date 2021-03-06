import { escapeMarkdown, getAccountName, getCouncilMembers, send, sleep } from "../../tools/utils.js";
import { botParams } from "../../config.js";
import { getAlertCollection, getUserCollection } from "../mongo/index.js";
import { getOutstandingMotions } from "../network/motion/motionHelpers.js";
import { getOutstandingTips } from "../network/tip/tipHelpers.js";


export const sendNotifications = async (motionOrTip: string, frequency: string, start?: boolean) => {
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
            let motionCount = 1;
            for (const motion of nonVotedMotions) {
                outstandingMotionsString += (`*${motionCount++}\\.* ${motion.proposal.section} \\- ` +
                    `${motion.proposal.method} \\(Index: ${motion.index}\\)\n`);
            }
        }
        else if (motionOrTip === "tip") {
            const nonVotedTips = await getOutstandingTips(memberAddress);
            let tipCount = 1;
            for (const tip of nonVotedTips) {
                const escapedTipReason = escapeMarkdown(tip.reason);
                outstandingTipsString += `*${tipCount++}\\.* _` + escapedTipReason + `_\n`;
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
                        const message = (start ? "The bot was just restarted\\.\n\n" : "") +
                            `*Alert for ${escapeMarkdown(await getAccountName(alert.address, true))}*\n\n` +
                            `The ${botParams.settings.network.name} community needs you\\!\n\n` +
                            `You have not voted on the following ${motionOrTip}\\(s\\) yet:\n\n` +
                            (motionOrTip === "motion" ? outstandingMotionsString : outstandingTipsString);
                        await send(user.chatId, message, "MarkdownV2");
                        sleep(1000);
                    }
                }
            }
        }
    }
};