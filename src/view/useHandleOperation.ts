import React from "react";
import { WebApp, showAlert, useNav } from "./MainScreen";
export const useHandleOperation = () => {
    const nav = useNav();

    const [loading, setLoading] = React.useState(false);

    const callback = React.useCallback(<T,>(promise: Promise<T>) => {
        if (loading) {
            return Promise.reject(new Error("operation already in progress"))
        }
        setLoading(true);
        return promise.then((res: T) => {
            WebApp?.HapticFeedback.notificationOccurred("success");
            nav(-1);
            return res
        })
            .catch(e => {
                WebApp?.HapticFeedback.notificationOccurred("error");
                if (e instanceof Error) {
                    showAlert(e.message);
                } else {
                    console.error(e)
                }
            })
            .finally(() => setLoading(false));
    }, [loading])

    return [callback, loading] as const
}