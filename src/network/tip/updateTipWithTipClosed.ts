import { TimelineItemTypes, TipEvents } from "../../../tools/constants.js";
import {
    getTipCommonUpdates} from "./tipHelpers.js";
import { updateTipByHash } from "../../mongo/service/tip.js";
import { getBlockHash } from "../../../tools/utils.js";

export const updateTipWithTipClosed = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [hash, beneficiary, payout] = eventData;
  
    const blockHash = await getBlockHash(indexer.blockHeight - 1);
    let commonUpdates = await getTipCommonUpdates(hash, {
      blockHeight: indexer.blockHeight - 1,
      blockHash,
    });
    const state = {
      indexer,
      state: TipEvents.TipClosed,
      data: eventData,
    };
    const updates = {
      ...commonUpdates,
      isFinal: true,
      state,
    };
  
    const timelineItem = {
      type: TimelineItemTypes.event,
      method: TipEvents.TipClosed,
      args: {
        beneficiary,
        payout,
      },
      indexer,
    };
    await updateTipByHash(hash, updates, timelineItem);
  }