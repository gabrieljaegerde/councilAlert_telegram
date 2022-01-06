import { updateTipByHash } from "../../mongo/service/tip.js";
import { TimelineItemTypes, TipEvents } from "../../../tools/constants.js";
import { getBlockHash } from "../../../tools/utils.js";
import { getTipCommonUpdates } from "./tipHelpers.js";

export const updateTipWithTipRetracted = async (event, extrinsic, indexer) => {
    const eventData = event.data.toJSON();
    const [hash] = eventData;
  
    const blockHash = await getBlockHash(indexer.blockHeight - 1);
    let commonUpdates = await getTipCommonUpdates(hash, {
      blockHeight: indexer.blockHeight - 1,
      blockHash,
    });
    const state = {
      indexer,
      state: TipEvents.TipRetracted,
      data: eventData,
    };
    const updates = {
      ...commonUpdates,
      isFinal: true,
      state,
    };
  
    const timelineItem = {
      type: TimelineItemTypes.event,
      method: TipEvents.TipRetracted,
      args: {},
      indexer,
    };
    await updateTipByHash(hash, updates, timelineItem);
  }