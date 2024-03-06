import {
    ApiResponseCode,
    FlagModel,
    ApiResponseCodes,
    dateHelper,
    DayTimeOperator,
    NumericOperator,
} from "@switchfeat/core";
import { ConditionModel, StringOperator } from "@switchfeat/core";
import { v4 as uuidv4 } from "uuid";

export type EvaluateResponse = {
    match: boolean;
    meta: {
        segment: string | null;
        condition: string | null;
    };
    reason: ApiResponseCode;
    time: number;
    correlationId: string;
    responseId: string;
};

export const evaluateFlag = async (
    flag: FlagModel,
    context: Record<string, string>,
    correlationId: string,
    isV2?: boolean
): Promise<EvaluateResponse> => {
    const response: EvaluateResponse = {
        match: false,
        meta: {},
    } as EvaluateResponse;
    const startTime = dateHelper.utcNow();
    try {
        if (!flag.rules) {
            response.match = flag.status;
            response.reason = ApiResponseCodes.RuleNotFound;
            return response;
        }

        const firstContextKey = Object.keys(context)[0];
        const contextValue = context[firstContextKey];

        if (!flag.status) {
            response.reason = ApiResponseCodes.FlagDisabled;
            return response;
        }

        let foundMatchCondition = false;
        if (isV2) {
            const subEvaluate = (conditions, shouldEvaluateAll = false) => {
                if (conditions && conditions.length === 0) {
                    return { isMatch: true, key: null, reason: ApiResponseCodes.ConditionNotFound };
                }
                for (const cond of conditions) {
                    //condition.context is considering as key
                    const contextValue = (context[cond.context] ?? '') as string;
                    const hasMatch = getMatchByCondition(
                        cond,
                        contextValue,
                    );
                    if (cond.debug) {
                        console.info("___cond___", cond);
                        console.info("___hasMatch___", hasMatch);
                        console.info("___contextValue___", contextValue);
                    }
                    if (!shouldEvaluateAll && hasMatch) {
                        return { isMatch: true, key: cond.key, reason: ApiResponseCodes.FlagMatch };
                    }
                    if (shouldEvaluateAll && !hasMatch) {
                        return { isMatch: false, key: cond.key, reason: ApiResponseCodes.FlagMatch };
                    }
                }
                return { isMatch: true, key: conditions.map(x => x.key), reason: ApiResponseCodes.NoMatchingCondition };
            }
            const _evaluate = (rules): void => {
                for (const x of rules) {
                    const result = subEvaluate(x?.segment?.conditions, x?.segment?.matching === "all");
                    response.match = result.isMatch;
                    response.meta.segment = x.segment.key;
                    response.meta.condition = result.key;
                    response.reason = result.reason;
                    if (response.match == false) {
                        break;
                    }
                };
            }
            _evaluate(flag.rules);
            return response;
        } else {
            flag.rules.map((x) => {
                if (!foundMatchCondition) {
                    const conditions = x.segment.conditions;
                    const matchCondition = conditions?.filter(
                        (y) => y.context === firstContextKey,
                    )[0];
                    if (matchCondition) {
                        const hasMatch = getMatchByCondition(
                            matchCondition,
                            contextValue,
                        );
                        response.match = hasMatch;
                        response.meta.segment = x.segment.key;
                        response.meta.condition = matchCondition.key;
                        foundMatchCondition = true;
                        response.reason = ApiResponseCodes.FlagMatch;
                    }
                }
            });

            if (!foundMatchCondition) {
                response.reason = ApiResponseCodes.NoMatchingCondition;
                return response;
            }
        }
    } catch (ex) {
        response.reason = ApiResponseCodes.GenericError;
    } finally {
        response.time = dateHelper.diffInMs(startTime, dateHelper.utcNow())!;
        response.responseId = uuidv4();
        response.correlationId = correlationId;
    }

    return response;
};

const handleDateTimeMatcher = (
    condition: ConditionModel,
    contextValue: string,
): boolean => {
    switch (condition.operator as DayTimeOperator) {
        case "equals": return dateHelper.isSame(contextValue, condition.value);
        case "notEquals": return !dateHelper.isSame(contextValue, condition.value);
        case "before": return dateHelper.isBefore(contextValue, condition.value);
        case "beforeOrAt": return dateHelper.isBeforeOrAt(contextValue, condition.value);
        case "after": return dateHelper.isAfter(contextValue, condition.value);
        case "afterOrAt": return dateHelper.isAfterOrAt(contextValue, condition.value);
    }
    return false;
};

const handleNumberMatcher = (
    condition: ConditionModel,
    contextValue: string,
): boolean => {
    const parseContextValue = Number(contextValue);
    const evaluateValue = Number(condition.value);
    if (isNaN(parseContextValue) || isNaN(evaluateValue)) {
        return false;
    }
    switch (condition.operator as NumericOperator) {
        case "equals": return parseContextValue === evaluateValue;
        case "notEquals": return parseContextValue !== evaluateValue;
        case "gt": return parseContextValue > evaluateValue;
        case "lt": return parseContextValue < evaluateValue;
        case "lte": return parseContextValue <= evaluateValue;
        case "gte": return parseContextValue >= evaluateValue;
    }
    return false;
};

const getMatchByCondition = (
    condition: ConditionModel,
    contextValue: string | boolean,
): boolean => {
    switch (condition.conditionType) {
        case "string": {
            return stringConditionMatcher(condition, contextValue as string);
        }
        case 'datetime': return handleDateTimeMatcher(condition, contextValue as string);
        case 'number': return handleNumberMatcher(condition, contextValue as string);
        case 'boolean': return condition?.operator?.toString().toLowerCase() === contextValue?.toString().toLowerCase();
    }

    return false;
};

const stringConditionMatcher = (
    condition: ConditionModel,
    contextValue: string,
): boolean => {
    switch (condition.operator as StringOperator) {
        case "equals": {
            return contextValue === condition.value;
        }
        case "notEquals": return contextValue !== condition.value;
        case "startsWith": return contextValue?.startsWith(condition.value) ?? false;
        case "endsWith": return contextValue?.endsWith(condition.value) ?? false;
    }

    return false;
};
