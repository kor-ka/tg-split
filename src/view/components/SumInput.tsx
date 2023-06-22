import React, { useState } from "react";
import { formatSum } from "../utils/formatSum";

export const SumInput = React.memo(({ ref, sum, onSumChange, autoFocus: autofocus, disabled, style }: { ref?: React.RefObject<HTMLInputElement>, sum: number, onSumChange: (sum: number) => void, autoFocus?: boolean, disabled?: boolean, style?: any }) => {
    const [sumStr, setSumStr] = React.useState(formatSum(sum, true, false))

    const onSumInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const targetStr = e.target.value.replace(',', '.')
        const num = Math.floor(Number(targetStr) * 100);

        if (!Number.isNaN(num)) {
            if (targetStr.length === 0) {
                setSumStr('')
            } else if (targetStr.endsWith('.') && (targetStr.indexOf('.') === targetStr.length - 1)) {
                setSumStr(targetStr);
            } else {
                setSumStr(formatSum(num));
            }
            onSumChange(num);
        }
    }, []);

    return <input ref={ref} value={sumStr} onChange={onSumInputChange} autoFocus={autofocus} disabled={disabled} inputMode="decimal" style={style} placeholder="0,00" />
})