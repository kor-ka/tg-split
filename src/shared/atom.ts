export type Atom = [string, number, readonly [number, number]];
export const atom = (src: number, dst: number, sum: number): Atom => {
    const flip = src > dst ? -1 : 1
    const pair = [flip === 1 ? src : dst, flip === 1 ? dst : src] as const
    const account = pair.join('-')
    return [account, sum * flip, pair]
}