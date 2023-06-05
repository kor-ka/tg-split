import { Balance } from "../../entity";

// TODO: extract reusable
export const key = (src: number, dst: number): [string, number] => {
    const flip = src > dst ? -1 : 1
    const account = [flip === 1 ? src : dst, flip === 1 ? dst : src].join('-')
    return [account, flip]
}


export const optimiseBalance = (balance: Balance): Balance => {
    const userBalanceMap = new Map<number, number>()
    balance.forEach(({ pair: [src, dst], sum }) => {
        userBalanceMap.set(src, (userBalanceMap.get(src) ?? 0) + sum)
        userBalanceMap.set(dst, (userBalanceMap.get(dst) ?? 0) - sum)
    })

    const positiveArr: [number, number][] = []
    const negativeArr: [number, number][] = []
    for (let enrty of userBalanceMap.entries()) {
        if (enrty[1] > 0) {
            positiveArr.push(enrty)
        } else if (enrty[1] < 0) {
            negativeArr.push(enrty)
        }
    }

    console.log("userBalanceMap", userBalanceMap)
    console.log("stacks", positiveArr, negativeArr)

    let positive = positiveArr.pop()
    let negative = negativeArr.pop()

    const pairBalances: { [key: string]: { sum: number, pair: [number, number] } } = {}
    while (positive && negative) {
        console.log("collapsing", positive, negative)
        const result = positive[1] + negative[1]

        // build pair
        const [k, flip] = key(positive[0], negative[0])
        let pair = pairBalances[k]
        if (!pair) {
            pair = { pair: [flip > 0 ? positive[0] : negative[0], flip > 0 ? negative[0] : positive[0]], sum: 0 }
            pairBalances[k] = pair
        }
        // incr pair balance
        pair.sum += Math.min(positive[1], Math.abs(negative[1])) * flip

        // collapse stack
        positive[1] = result > 0 ? result : 0
        negative[1] = result < 0 ? result : 0
        if (positive[1] === 0) {
            positive = positiveArr.pop()
        }
        if (negative[1] === 0) {
            negative = negativeArr.pop()
        }
    }

    if (negativeArr[0] || positiveArr[0]) {
        console.error("Unable to optimise balance(", balance)
        return balance
    }

    console.log("optimised balance", pairBalances)

    return [...Object.entries(pairBalances)].map(([, e]) => e)

}