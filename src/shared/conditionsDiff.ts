import { Condition } from "./entity";

const eq = (a: Condition, b: Condition) => {
    if ((a.type === b.type) && (a.uid === b.uid)) {
        if (a.type === 'disabled') {
            return true
        } else if (b.type === 'shares') {
            return (a.extra === b.extra) && (a.shares === b.shares)
        }
    }
    return false
}

export const conditionsDiff = (origConditions: Condition[], newConditions: Condition[]) => {
    const diff: Condition[] = []
    const origMap = new Map<number, Condition>()
    origConditions.forEach(c => origMap.set(c.uid, c))
    newConditions.forEach(newCond => {
        const origCond = origMap.get(newCond.uid)
        if (
            // ignore new if it is disabled
            !(!origCond && (newCond.type === 'disabled')) &&
            // add missing or changed
            (!origCond || !eq(origCond, newCond))
        ) {
            diff.push(newCond)
        }
    })
    return diff
}