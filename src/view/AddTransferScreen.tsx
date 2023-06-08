import React from "react";
import { useSearchParams } from "react-router-dom";
import { OperationTransfer } from "../../entity";
import { useVMvalue } from "../utils/vm/useVM";
import { useNav, UsersProvider, ModelContext, BackButtopnController, CardLight, ListItem, MainButtopnController, showAlert, UserContext, WebApp } from "./MainScreen";

export const AddTransferScreen = () => {
    const model = React.useContext(ModelContext);
    const userId = React.useContext(UserContext);
    const nav = useNav();
    const sumRef = React.useRef<HTMLInputElement>(null);

    let [searchParams] = useSearchParams();

    const usersModule = React.useContext(UsersProvider);

    const editOpId = searchParams.get("editPayment");
    const editOp: OperationTransfer | undefined = editOpId ? model?.logModule.getOperationOpt(editOpId) : undefined;

    const disable = !!editOp?.deleted || (!!editOp && editOp.uid !== userId);

    const dst = useVMvalue(usersModule.getUser(editOp?.dstUid ?? Number(searchParams.get('uid'))));
    const initialSum = React.useMemo(() => editOp?.sum ?? Number(searchParams.get('sum')), []);

    const [loading, setLoading] = React.useState(false);
    const onClick = React.useCallback(() => {
        const sum = Math.floor(Number(sumRef.current?.value.replace(',', '.')) * 100);
        if (sum === 0) {
            return;
        }
        if (!loading) {
            setLoading(true);
            model?.commitOperation({ type: editOp ? 'update' : 'create', operation: { type: 'transfer', sum, id: editOp?.id ?? model.nextId() + '', dstUid: dst.id } })
                .then(() => {
                    WebApp?.HapticFeedback.notificationOccurred("success");
                    nav(-1);
                })
                .catch(e => {
                    WebApp?.HapticFeedback.notificationOccurred("error");
                    if (e instanceof Error) {
                        showAlert(e.message);
                    } else {
                        console.error(e);
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [loading]);
    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0px' }}>
            <CardLight><ListItem titile={`You → ${dst.fullName}`} /></CardLight>
            <input ref={sumRef} defaultValue={initialSum / 100} disabled={disable} autoFocus={true} inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
        </div>
        <MainButtopnController onClick={onClick} text={(editOp ? "Edit" : "Add") + " payment"} progress={loading} isActive={!disable} />
    </>
}