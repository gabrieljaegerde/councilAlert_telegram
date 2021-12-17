import { MenuTemplate, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu";
import { Context } from "grammy";
import { getAlertCollection } from "../mongo/db.js";
import { listAlertsMiddleware } from "./listAlerts.js";
import { getAccountName, send } from "../../tools/utils.js";
import { updateFrequency } from "./updateFrequency.js";
import { ObjectId } from "mongodb";

let alert;

export const showAlert = new MenuTemplate(async (ctx: Context) => {
    const alertCol = await getAlertCollection();
    alert = await alertCol.findOne({ _id: new ObjectId(ctx.match[1]) });
    let info = `Alert for *${await getAccountName(alert.address)}*\n\n` +
        `You will be reminded of the following events regarding this address:\n\n` +
        `Outstanding motion votes: ${alert.motions}\n\n` +
        `Outstanding tip votes: ${alert.tips}\n\n`;
    return { text: info, parse_mode: "Markdown" };
});

showAlert.chooseIntoSubmenu('uf',
    ["motions", "tips"],
    updateFrequency,
    {
        buttonText: async (ctx: Context, key) => {
            if (key === "")
                return;
            return (`${key} (⏰ ${alert[key]})`);
        }
    }
);

// showAlert.select(
//     "s",
//     ["new", "tipped", "closing", "closed"],
//     {
//         showFalseEmoji: true,
//         isSet: (ctx, key) => alert[key],
//         set: async (ctx, key, newState) => {
//             const alertCol = await getAlertCollection();
//             alert[key] = newState;
//             await alertCol.updateOne({ address: alert.address }, { $set: alert });
//             return true;
//         },
//         columns: 1
//     }
// );

showAlert.interact("Delete Alert", "da", {
    do: async (ctx: Context) => {
        await deleteMenuFromContext(ctx);
        const alertCol = await getAlertCollection();
        await alertCol.deleteOne({ address: alert.address });
        const message = `Alert for ${alert.address} deleted.`;
        await send(ctx.chat.id, message);
        listAlertsMiddleware.replyToContext(ctx, `la/`);
        return false;
    },
    joinLastRow: false
});

showAlert.manualRow(createBackMainMenuButtons());
