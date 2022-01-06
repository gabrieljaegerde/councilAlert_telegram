import { GenericExtrinsic, Vec } from "@polkadot/types";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { u8aToHex } from "@polkadot/util";
import { logger } from "../../tools/logger.js";
import { handleBountyEventWithExtrinsic, handleBountyEventWithoutExtrinsic } from "./bounty/handleBountyEvent.js";
import { handleMotionEvent } from "./motion/handleMotionEvent.js";
import { handleTreasuryProposalEvent, handleTreasuryProposalEventWithoutExtrinsic } from "./proposal/handlePropsalEvent.js";
import { handleTipEvent } from "./tip/handleTipEvent.js";

async function handleEventWithExtrinsic(
  blockIndexer,
  event,
  eventSort,
  extrinsic,
  extrinsicIndex,
  blockEvents
) {
  const indexer = {
    ...blockIndexer,
    eventIndex: eventSort,
    extrinsicIndex,
  };

  await handleTipEvent(event, extrinsic, indexer);
  await handleTreasuryProposalEvent(event, extrinsic, indexer);
  await handleMotionEvent(event, extrinsic, indexer, blockEvents);
  await handleBountyEventWithExtrinsic(event, extrinsic, indexer);
}

async function handleEventWithoutExtrinsic(
  blockIndexer,
  event,
  eventSort,
  blockEvents
) {
  const indexer = {
    ...blockIndexer,
    eventIndex: eventSort,
  };

  await handleTreasuryProposalEventWithoutExtrinsic(event, indexer);
  await handleBountyEventWithoutExtrinsic(event, indexer);
}

export const handleEvents = async (events, extrinsics, blockIndexer) => {

  for (let sort = 0; sort < events.length; sort++) {
    const { event, phase } = events[sort];

    if (phase.isNull) {
      await handleEventWithoutExtrinsic(blockIndexer, event, sort, events);
      continue;
    }

    const extrinsicIndex = phase.value.toNumber();
    const extrinsic = extrinsics[extrinsicIndex];
    await handleEventWithExtrinsic(
      blockIndexer,
      event,
      sort,
      extrinsic,
      extrinsicIndex,
      events
    );
  }
};