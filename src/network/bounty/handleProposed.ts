import { hexToString } from "@polkadot/util";
import { getBountyCollection } from "../../mongo/db.js";
import { BountyMethods, Modules, timelineItemTypes } from "../../../tools/constants.js";
import { getBountyDescription, getBountyMeta, getRealCaller } from "./bountyHelpers.js";
import { findTargetCall } from "../../../tools/utils.js";

export const handleProposed = async (event, normalizedExtrinsic, extrinsic) => {
    const eventData = event.data.toJSON();
    const bountyIndex = eventData[0];

    const indexer = normalizedExtrinsic.extrinsicIndexer;
    const meta = await getBountyMeta(indexer.blockHash, bountyIndex);
    const description = await getBountyDescription(
        indexer.blockHash,
        bountyIndex
    );

    const proposer = getRealCaller(extrinsic.method, normalizedExtrinsic.signer);
    let proposeCall = findTargetCall(
        extrinsic.method,
        Modules.Treasury,
        BountyMethods.proposeBounty
    );
    if (!proposeCall) {
        proposeCall = findTargetCall(
            extrinsic.method,
            Modules.Bounties,
            BountyMethods.proposeBounty
        );
    }

    if (!proposeCall) {
        throw new Error("can not find the target proposeBounty extrinsic");
    }

    const { value, description: descriptionInArg } = proposeCall.toJSON().args;
    const args = {
        proposer,
        value,
        description: hexToString(descriptionInArg) || description,
    };

    const timeline = [
        {
            type: timelineItemTypes.extrinsic,
            name: BountyMethods.proposeBounty,
            args,
            eventData,
            extrinsicIndexer: indexer,
        },
    ];

    const bountyCol = await getBountyCollection();
    await bountyCol.insertOne({
        indexer,
        bountyIndex,
        description,
        meta,
        state: {
            name: event.method,
            indexer,
            normalizedExtrinsic,
        },
        timeline,
    });
}