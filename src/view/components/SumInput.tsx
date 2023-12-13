import React, { useState } from "react";
import { formatSum } from "../utils/formatSum";

const formatSunInput = (targetStr: string, num: number) => {
    if (
        (targetStr.endsWith('.') && (targetStr.indexOf('.') === targetStr.length - 1)) ||
        (targetStr.endsWith('.0') && (targetStr.indexOf('.') === targetStr.length - 2))
    ) {
        return targetStr
    } else {
        return formatSum(num, true, false)
    }
}
export const SumInput = React.memo(({ sum, onSumChange, autoFocus: autofocus, disabled, style }: { ref?: React.RefObject<HTMLInputElement>, sum: number, onSumChange: (sum: number) => void, autoFocus?: boolean, disabled?: boolean, style?: any }) => {
    const sumInputRef = React.useRef<HTMLInputElement>(null);
    const [sumStr, setSumStr] = React.useState(formatSunInput(formatSum(sum, true, false), sum))

    const onSumInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const targetStr = e.target.value.replace(',', '.')
        const num = Math.round(Number(targetStr) * 100);

        if (Number.isSafeInteger(num)) {
            setSumStr(formatSunInput(targetStr, num))
            onSumChange(num);
        }
    }, [onSumChange]);

    const onFocus = React.useCallback(() => {
        setTimeout(() => {
            sumInputRef?.current?.setSelectionRange(sumInputRef.current.value.length, sumInputRef.current.value.length);
        }, 1);
    }, []);

    return <input ref={sumInputRef} value={sumStr} onChange={onSumInputChange} autoFocus={autofocus} onFocus={onFocus} disabled={disabled} inputMode="decimal" style={style} placeholder="0.00" />
})