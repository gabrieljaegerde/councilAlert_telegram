import { MenuTemplate, createBackMainMenuButtons } from "grammy-inline-menu";
import { Context } from "grammy";
import { getAlertCollection } from "../mongo/db.js";
import { ObjectId } from "mongodb";

let alert;

const frequencyOptions = ["hourly", "daily"];

export const updateFrequency = new MenuTemplate(async (ctx: Context) => {
    const alertCol = await getAlertCollection();
    alert = await alertCol.findOne({ _id: new ObjectId(ctx.match[1]) });
    const text = `How often would you like to be reminded on outstanding ${ctx.match[2]} votes?`;
    return { text, parse_mode: "Markdown" };
});

updateFrequency.select(
    "s",
    frequencyOptions,
    {
        showFalseEmoji: true,
        isSet: (ctx, key) => alert[ctx.match[2]] === key,
        set: async (ctx, key, newState) => {
            const alertCol = await getAlertCollection();
            alert[ctx.match[2]] = key;
            await alertCol.updateOne({ address: alert.address }, { $set: alert });
            return true;
        },
    }
);

updateFrequency.manualRow(createBackMainMenuButtons());