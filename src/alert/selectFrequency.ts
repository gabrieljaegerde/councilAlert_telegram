import { MenuTemplate, createBackMainMenuButtons } from "grammy-inline-menu";
import { Context } from "grammy";
import { userAlerts } from "./addAlert.js";

let alert;

const frequencyOptions = ["hourly", "daily"];

export const selectFrequency = new MenuTemplate(async (ctx: Context) => {
    alert = userAlerts.filter(function (item) { return item.name === ctx.match[1]; })[0];
    const text = `How often would you like to be reminded of uncompleted ${ctx.match[1]} votes?`;
    return { text, parse_mode: "Markdown" };
});

selectFrequency.select(
    "s",
    frequencyOptions,
    {
        showFalseEmoji: true,
        isSet: (ctx, key) => alert["frequency"] === key,
        set: async (ctx, key, newState) => {
            alert.frequency = key;
            return true;
        }
    }
);

selectFrequency.manualRow(createBackMainMenuButtons());