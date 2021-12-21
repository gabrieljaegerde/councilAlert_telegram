import { GenericExtrinsic, Vec } from "@polkadot/types";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { u8aToHex } from "@polkadot/util";
import { logger } from "../../tools/logger.js";
import { handleCouncilEvent } from "./council/handleCouncilEvent.js";
import { handleProposalEvent } from "./proposal/handlePropsalEvent.js";
import { handleTipEvent } from "./tip/handleTipEvent.js";

const getExtrinsicSigner = (extrinsic: GenericExtrinsic) => {
  let signer = extrinsic["_raw"]["signature"].get("signer").toString();
  return signer;
};

const isExtrinsicSuccess = (events: Vec<FrameSystemEventRecord>) => {
  return events.some((e) => e.event.method === "ExtrinsicSuccess");
};

export const normalizeExtrinsic = (extrinsic: GenericExtrinsic, events: Vec<FrameSystemEventRecord>) => {
  if (!extrinsic) {
    throw new Error("Invalid extrinsic object");
  }

  const hash = extrinsic.hash.toHex();
  const callIndex = u8aToHex(extrinsic.callIndex);
  const { args } = extrinsic.method.toJSON();
  const name = extrinsic.method.method;
  const section = extrinsic.method.section;
  const signer = getExtrinsicSigner(extrinsic);

  const isSuccess = isExtrinsicSuccess(events);

  const version = extrinsic.version;
  const data = u8aToHex(extrinsic.data);

  return {
    hash,
    signer,
    section,
    name,
    callIndex,
    version,
    args,
    data,
    isSuccess,
  };
};

export const handleEvents = async (events: Vec<FrameSystemEventRecord>, blockIndexer, extrinsics: Vec<GenericExtrinsic>) => {
  if (events.length <= 0) {
    return false;
  }

  const normalizedExtrinsics = extrinsics.map((extrinsic: GenericExtrinsic) =>
    normalizeExtrinsic(extrinsic, events)
  );

  for (let count = 0; count < events.length; count++) {
    const { event, phase } = events[count];
    
    let normalizedExtrinsic;
    if (!phase.isNone) {
      const phaseValue = parseInt(phase.value.toString());
      const extrinsic = extrinsics[phaseValue];
      const normalized = normalizedExtrinsics[phaseValue];
      normalizedExtrinsic = {
        extrinsicIndexer: { ...blockIndexer, index: phaseValue },
        ...normalized,
      };
      try {
        await handleTipEvent(event, normalizedExtrinsic, blockIndexer, extrinsic);
        await handleCouncilEvent(event, normalizedExtrinsic, extrinsic);
        // await handleBountyEventWithExtrinsic(
        //   event,
        //   normalizedExtrinsic,
        //   extrinsic
        // );
        // await handleTreasuryTransferOut(event, count, normalizedExtrinsic);
      } catch (e) {
        logger.error(`error handleTipEvent or handleCouncilEvent or handleBountyEventWithExtrinsic ` +
          `handleTreasuryTransferOut ${JSON.stringify(normalized)}: ${e}`);
        return;
      }
    }
    else {
      try {
        const eventIndexer = { ...blockIndexer, count };
        // await handleBountyBecameActiveEvent(event, eventIndexer);
        // await handleBurntEvent(event, eventIndexer);
      } catch (e) {
        logger.error(`error handleBountyBecameActiveEvent or handleBurntEvent ${JSON.stringify(event)}: ${e}`);
        return;
      }
    }
    try {
      await handleProposalEvent(event, blockIndexer, normalizedExtrinsic, count);
    } catch (e) {
      logger.error(`error handleProposalEvent ${JSON.stringify(normalizedExtrinsic)}: ${e}`);
      return;
    }
  }
};