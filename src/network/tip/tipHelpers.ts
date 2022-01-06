import { botParams } from "../../../config.js";
import { hexToString, isHex } from "@polkadot/util";
import {
    ProxyMethods,
    TipMethods,
    Modules,
    MultisigMethods,
    UtilityMethods,
} from "../../../tools/constants.js";
import { getCall } from "../../../tools/utils.js";
import { getTipCollection } from "../../mongo/index.js";
import { GenericCall } from "@polkadot/types";
import { blake2AsHex } from "@polkadot/util-crypto";
import { getActiveTipByHash } from "../../mongo/service/tip.js";

export const getTipMeta = async (tipHash, { blockHeight, blockHash }) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawMeta;
    if (blockApi.query.treasury?.tips) {
        rawMeta = await blockApi.query.treasury?.tips(tipHash);
    } else {
        rawMeta = await blockApi.query.tips.tips(tipHash);
    }

    return rawMeta.toJSON();
};

export const getTipMetaByBlockHeight = async (height, tipHash) => {
    const blockHash = await botParams.api.rpc.chain.getBlockHash(height);
    return await getTipMeta(tipHash, { blockHeight: height, blockHash });
};

export const getReasonStorageReasonText = async (reasonHash, blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawReasonText;
    if (blockApi.query.tips?.reasons) {
        rawReasonText = await blockApi.query.tips.reasons(reasonHash);
    } else if (blockApi.query.treasury?.reasons) {
        rawReasonText = await blockApi.query.treasury.reasons(reasonHash);
    } else {
        return null;
    }
    return rawReasonText.toHuman();
};

export const getTippersCountFromApi = async (blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    if (blockApi.consts.electionsPhragmen?.desiredMembers) {
        return parseInt(blockApi.consts.electionsPhragmen?.desiredMembers.toString());
        //.toNumber();
    } else if (blockApi.consts.phragmenElection?.desiredMembers) {
        return parseInt(blockApi.consts.phragmenElection?.desiredMembers.toString());
        //.toNumber();
    }

    throw new Error("cannot get elections desired members");
};

export const getTipFindersFeeFromApi = async (blockHash) => {
    const blockApi = await botParams.api.at(blockHash);
    if (blockApi.consts.tips?.tipFindersFee) {
        return blockApi.consts.tips?.tipFindersFee.toNumber();
    } else if (blockApi.consts.treasury?.tipFindersFee) {
        return parseInt(blockApi.consts.treasury?.tipFindersFee.toString());
        //.toNumber();
    }

    return null;
};

export const median = (values) => {
    if (!Array.isArray(values)) {
        return null;
    }

    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};

export const computeTipValue = (tipMeta) => {
    const tipValues = (tipMeta?.tips ?? []).map((tip) => tip[1]);
    return median(tipValues);
};

export const getTipReason = async (blockHash, reasonHash) => {
    const blockApi = await botParams.api.at(blockHash);

    let rawMeta;
    if (blockApi.query.treasury?.reasons) {
        rawMeta = await blockApi.query.treasury?.reasons(reasonHash);
    } else {
        rawMeta = await blockApi.query.tips.reasons(reasonHash);
    }

    const maybeTxt = rawMeta.toHuman();
    if (isHex(maybeTxt)) {
        return hexToString(maybeTxt);
    } else {
        return maybeTxt;
    }
};

export const getTipMethodNameAndArgs = async (
    normalizedExtrinsic,
    extrinsic,
    reasonText
) => {
    const {
        section,
        name,
        args,
        extrinsicIndexer: indexer,
    } = normalizedExtrinsic;
    const blockHash = normalizedExtrinsic.extrinsicIndexer.blockHash;
    if (name === ProxyMethods.proxy) {
        const call = await getCall(blockHash, extrinsic.args[2].toHex());
        return [call.method, call.toJSON().args];
    }
    if (Modules.Multisig === section || MultisigMethods.asMulti === name) {
        const call = await getCall(
            blockHash,
            extrinsic.method.args[3].toHex()
        );
        return [call.method, call.toJSON().args];
    }
    if (Modules.Utility === section && UtilityMethods.batch === name) {
        const blockHash = normalizedExtrinsic.extrinsicIndexer.blockHash;
        const batchCalls = extrinsic.method.args[0];

        for (const callInBatch of batchCalls) {
            const rawCall = callInBatch.toHex();
            const call = await getCall(blockHash, rawCall);
            if (
                Modules.Treasury === call.section &&
                [TipMethods.tipNew, TipMethods.reportAwesome].includes(call.method)
            ) {
                const { args } = call.toJSON();
                const reason = args["reason"];
                if (reasonText === hexToString(reason)) {
                    return [call.method, call.toJSON().args];
                }
            }
        }
    }

    // TODO: handle other extrinsics that wrap the tip methods

    return [name, args];
};

export const getOutstandingTips = async (address) => {
    const tipCol = await getTipCollection();
    let outstandingTips = [];
    const openTips = await tipCol.find({ isFinal: false }).toArray();
    for (const tip of openTips) {
        const voted = tip.meta.tips.filter((item) => {
            return (item[0] === address);
        });
        if (voted.length === 0) {
            outstandingTips.push(tip);
        }
    }
    return outstandingTips;
};

export const getTipMetaFromStorage = async (blockHash, tipHash) => {
    const blockApi = await botParams.api.at(blockHash);
    let rawMeta;
    if (blockApi.query.treasury?.tips) {
        rawMeta = await blockApi.query.treasury?.tips(tipHash);
    } else {
        rawMeta = await blockApi.query.tips.tips(tipHash);
    }

    return rawMeta.toJSON();
};

export const getFinderFromMeta = (meta) => {
    if (meta.finder && typeof meta.finder === 'string') {
        return meta.finder;
    }

    if (meta.finder && Array.isArray(meta.finder)) {
        return meta.finder[0];
    }

    return meta.tips[0][0];
};

const findNewTipCallFromProxy = (registry, proxyCall, reasonHash) => {
    const [, , innerCall] = proxyCall.args;
    return getNewTipCall(registry, innerCall, reasonHash);
};

const findNewTipCallFromMulti = (registry, call, reasonHash) => {
    const callHex = call.args[3];
    const innerCall = new GenericCall(registry, callHex);
    return getNewTipCall(registry, innerCall, reasonHash);
};

const findNewTipCallFromBatch = (registry, call, reasonHash) => {
    for (const innerCall of call.args[0]) {
        const call = getNewTipCall(registry, innerCall, reasonHash);
        if (call) {
            return call;
        }
    }

    return null;
};

export const getNewTipCall = (registry, call, reasonHash) => {
    const { section, method, args } = call;
    if (Modules.Proxy === section && ProxyMethods.proxy === method) {
        return findNewTipCallFromProxy(registry, call, reasonHash);
    }

    if (Modules.Multisig === section || MultisigMethods.asMulti === method) {
        return findNewTipCallFromMulti(registry, call, reasonHash);
    }

    if (Modules.Utility === section && UtilityMethods.batch === method) {
        return findNewTipCallFromBatch(registry, call, reasonHash);
    }

    if (
        [Modules.Treasury, Modules.Tips].includes(section) &&
        [TipMethods.tipNew, TipMethods.reportAwesome].includes(method)
    ) {
        const hash = blake2AsHex(args[0]);
        if (hash === reasonHash) {
            return call;
        }
    }

    return null;
};

export const getTipCommonUpdates = async (hash, { blockHeight, blockHash }) => {
    const tipInDb = await getActiveTipByHash(hash);
    if (!tipInDb) {
        throw new Error(`can not find tip in db. hash: ${hash}`);
    }

    const newMeta = await getTipMetaFromStorage(blockHash, hash);
    const meta = {
        ...tipInDb.meta,
        tips: newMeta.tips,
        closes: newMeta.closes,
    };
    const medianValue = computeTipValue(newMeta);
    const tippersCount = await getTippersCountFromApi(blockHash);
    const tipFindersFee = await getTipFindersFeeFromApi(blockHash);

    return { medianValue, meta, tippersCount, tipFindersFee };
};