import { checkAddress } from "@polkadot/util-crypto";
import { Context } from "grammy";
import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "grammy-inline-menu";
import _ from "lodash";
import { getAlertCollection } from "../mongo/db.js";
import { StatelessQuestion } from '@grammyjs/stateless-question';
import { botParams, getKeyboard } from "../../config.js";
import { selectFrequency } from "./selectFrequency.js";

const alerts = [
    {
        name: "tips",
        frequency: "daily",
    },
    {
        name: "motions",
        frequency: "hourly",
    }
];

export let userAlerts = alerts;

export const addAlert = new MenuTemplate(async (ctx: Context) => {
    let info = `Please select the reminder frequency for the respective event. I will only send you ` +
        `reminders when the address is a coucil member and until it has voted.`;
    return { text: info, parse_mode: "Markdown" };
});

addAlert.chooseIntoSubmenu('sf',
    ctx => {
        return userAlerts.map(a => a.name);
    },
    selectFrequency,
    {
        buttonText: async (ctx: Context, key) => {
            if (key === "")
                return;
            const alert = userAlerts.filter(function (item) { return item.name === key; })[0];
            return (`${key} (⏰ ${alert.frequency})`);
        },
        columns: 1
    }
);

addAlert.interact(
    "Next step >",
    "ns",
    {
        do: async (ctx) => {
            await deleteMenuFromContext(ctx);
            var replyMsg = `You have selected the following reminder frequencies:
            `;
            userAlerts
                .forEach(
                    e =>
                    (replyMsg += `
    - ${e.name}: ${e.frequency} reminders`)
                );
            replyMsg += `

Please send me a public address of a ${botParams.settings.network.name} account ` +
                `that you want to link to this alert.`;
            enterAddress.replyWithMarkdown(ctx, replyMsg);
            return false;
        },
    }
);

export const enterAddress = new StatelessQuestion("adr", async (ctx) => {
    let isValid = true;
    try {
        isValid = checkAddress(
            ctx.message.text,
            parseInt(botParams.settings.network.prefix)
        )[0];
    } catch (error) {
        isValid = false;
    }

    if (!isValid) {
        const message = "Incorrect address. Please try again.";
        enterAddress.replyWithMarkdown(ctx, message);
        return;
    }
    const alertCol = await getAlertCollection();
    const userAlert = await alertCol.findOne({ chatId: ctx.chat.id, address: ctx.message.text });

    if (userAlert) {
        const message = "You already have an alert set for this address!";
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        });
    }
    else {
        await alertCol.insertOne({
            chatId: ctx.chat.id,
            address: ctx.message.text,
            tips: userAlerts.find(
                e => e.name === "tips"
            ).frequency,
            motions: userAlerts.find(
                e => e.name === "motions"
            ).frequency,
            createdAt: new Date()
        });
        const message = "Alert setup! ✅";
        await ctx.reply(message, {
            reply_markup: {
                keyboard: (await getKeyboard(ctx)).build(),
                resize_keyboard: true
            },
        });
    }
});

export const addAlertMiddleware = new MenuMiddleware('aa/', addAlert);