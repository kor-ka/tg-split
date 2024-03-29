import { atom, Atom } from "./atom";
import { Condition, SharesCondition } from "./entity";

export const splitToAtoms = (srcUid: number, sum: number, conditions: Condition[], skipSrc = true) => {
    const shares: SharesCondition[] = [];
    const atoms: Atom[] = [];
    conditions.forEach((c) => {
        if (c.type === 'shares') {
            shares.push(c);
        }
        // add empty atoms to preserve conditions order
        atoms.push(atom(srcUid, c.uid, 0))
    })


    // extract extra from general sum, split the rest
    let sharesCount = 0;
    shares.forEach((c) => {
        sum -= c.extra;
        atoms.push(atom(srcUid, c.uid, c.extra));

        sharesCount += c.shares;
    })
    sharesCount = sharesCount || 1;


    let rem = sum % sharesCount;
    sum -= rem;
    sum /= sharesCount;
    shares.forEach(({ uid, shares }) => {
        // split reminder across users, multiplyed by shares count
        const sharesRem = Math.min(rem, shares);
        rem -= sharesRem;
        if ((uid !== srcUid) || !skipSrc) {
            atoms.push(atom(srcUid, uid, sum * shares + (rem >= 0 ? sharesRem : 0)));
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