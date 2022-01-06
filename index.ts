import { botParams, getDb, getLocalStorage } from "./config.js";
import { getSettings } from "./tools/settings.js";
import { BlockCountAdapter } from "./tools/blockCountAdapter.js";
import dotenv from "dotenv";
import * as bot from "./bot.js";
import { bigNumberArithmetic, send } from "./tools/utils.js";
import { getApi } from "./tools/substrateUtils.js";
import { ApiPromise } from "@polkadot/api";
import { Low } from "lowdb/lib";
import mongoose from "mongoose";
import { BlockListener } from "./src/network/blockListener.js";
import { getUserCollection } from "./src/mongo/index.js";
import { sendNotifications } from "./src/notification/sendNotifications.js";

dotenv.config();

class SubstrateBot {
  settings: any;
  api: ApiPromise;
  localStorage: Low;
  motionHourly: NodeJS.Timer;
  motionDaily: NodeJS.Timer;
  tipHourly: NodeJS.Timer;
  tipDaily: NodeJS.Timer;
  /**
   * Create SubstrateBot instance
   * @param config - SubstrateBot config
   * @param config.settings - main bot settings, should contain substrate network params (name, prefix, decimals, token),
   * telegram bot token, start & validators messages, links (governance, common), list of group alerts. See sample in examples
   * @param config.api - polkadot-api instance for connect to node
   * @param config.getNetworkStats - external function for getting substrate network stats
   */
  constructor({
    settings,
    api
  }) {
    this.settings = settings;
    this.api = api;
    this.localStorage = getLocalStorage();
  }

  async run() {
    await getDb();
    botParams.api = this.api;
    botParams.localStorage = this.localStorage;
    const networkProperties = await this.api.rpc.system.properties();
    if (!this.settings.network.prefix && networkProperties.ss58Format) {
      this.settings.network.prefix = networkProperties.ss58Format.toString();
    }
    if (!this.settings.network.decimals && networkProperties.tokenDecimals) {
      this.settings.network.decimals = networkProperties.tokenDecimals.toString();
    }
    if (
      this.settings.network.token === undefined &&
      networkProperties.tokenSymbol
    ) {
      this.settings.network.token = networkProperties.tokenSymbol.toString();
    }
    botParams.settings = this.settings;
    const { runnerHandle, tBot } = await bot.start();
    botParams.bot = tBot;
    botParams.runnerHandle = runnerHandle;
    botParams.blockCountAdapter = new BlockCountAdapter(botParams.localStorage, "headerBlock");
    botParams.blockListener = new BlockListener(botParams.api,
      botParams.blockCountAdapter);

    //hourly job motion
    this.motionHourly = setInterval(function () { sendNotifications("motion", "hourly"); }, 1000 * 60 * 60);
    //daily job motion
    this.motionDaily = setInterval(function () { sendNotifications("motion", "daily"); }, 1000 * 60 * 60 * 24);
    //hourly job tip
    this.tipHourly = setInterval(function () { sendNotifications("tip", "hourly"); }, 1000 * 60 * 60);
    //daily job tip
    this.tipDaily = setInterval(function () { sendNotifications("tip", "daily"); }, 1000 * 60 * 60 * 24);
  }

  async stop() {
    clearInterval(this.motionHourly);
    clearInterval(this.motionDaily);
    clearInterval(this.tipHourly);
    clearInterval(this.tipDaily);
    await botParams.runnerHandle.stop();
    console.log("bot stopped.");
    await mongoose.connection.close(false);
    console.log('MongoDb connection closed.');
    process.exit(0);
  }
}

let substrateBot;
async function main() {
  const settings = getSettings();
  const api = await getApi();
  substrateBot = new SubstrateBot({
    settings,
    api
  });
  await substrateBot.run();

  process.once('SIGINT', () => {
    substrateBot.stop();
  });
  process.once('SIGTERM', () => {
    substrateBot.stop();
  });
}

main();

