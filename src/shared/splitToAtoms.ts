import { atom, Atom } from "./atom";
import { Condition, FixedCondition, SharesCondition } from "./entity";

export const splitToAtoms = (srcUid: number, sum: number, conditions: Condition[], skipSrc = true) => {
    const fixed: FixedCondition[] = [];
    const shares: SharesCondition[] = [];
    const atoms: Atom[] = [];
    conditions.forEach((c) => {
        if (c.type === 'fixed') {
            fixed.push(c);
        } else if (c.type === 'shares') {
            shares.push(c);
        } else {
            atoms.push(atom(srcUid, c.uid, 0))
        }
    })


    // extract fixed and extra from general sum, split the rest
    fixed.forEach((c) => {
        sum -= c.sum;
        atoms.push(atom(srcUid, c.uid, c.sum));
    })

    let sharesCount = 0;
    shares.forEach((c) => {
        sum -= c.extra;
        atoms.push(atom(srcUid, c.uid, c.extra));

        sharesCount += c.shares;
    })


    let rem = sum % sharesCount;
    sum -= rem;
    sum /= sharesCount;
    shares.forEach(({ uid, shares }) => {
        // split reminder across users, multiplyed by shares count
        rem -= shares;
        if ((uid !== srcUid) || !skipSrc) {
            atoms.push(atom(srcUid, uid, sum * shares + (rem >= 0 ? shares : 0)));
        }
    });

    return sumAtoms(atoms);
}

const sumAtoms = (atoms: Atom[]) => {
    const byAccount = new Map<string, Atom>();
    atoms.forEach(([account, sum, pair]) => {
        let atom = byAccount.get(account);
        if (!atom) {
            atom = [account, 0, pair];
            byAccount.set(account, atom);
        }
        atom[1] += sum;
    })
    return [...byAccount.values()];
}