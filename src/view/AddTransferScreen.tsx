import React from "react";
import { useSearchParams } from "react-router-dom";
import { OperationTransfer } from "../shared/entity";
import { useVMvalue } from "../utils/vm/useVM";
import { useNav, UsersProvider, ModelContext, BackButtopnController, CardLight, ListItem, MainButtopnController, showAlert, UserContext, WebApp, Card, showConfirm, Button } from "./MainScreen";
import { useHandleOperation } from "./useHandleOperation";

export const AddTransferScreen = () => {
    const model = React.useContext(ModelContext);
    const userId = React.useContext(UserContext);
    const sumRef = React.useRef<HTMLInputElement>(null);

    let [searchParams] = useSearchParams();

    const usersModule = React.useContext(UsersProvider);

    const editOpId = searchParams.get("editPayment");
    const editOp: OperationTransfer | undefined = editOpId ? model?.logModule.getOperationOpt(editOpId) : undefined;

    let disable = !!editOp?.deleted || (!!editOp && editOp.uid !== userId);

    const dst = useVMvalue(usersModule.getUser(editOp?.dstUid ?? Number(searchParams.get('uid'))));
    const initialSum = React.useMemo(() => editOp?.sum ?? Number(searchParams.get('sum')), []);

    const [handleOperation, loading] = useHandleOperation()

    disable = disable || loading

    const onClick = React.useCallback(() => {
        const sum = Math.floor(Number(sumRef.current?.value.replace(',', '.')) * 100);
        if (model) {
            handleOperation(
                model.commitOperation({
                    type: editOp ? 'update' : 'create',
                    operation: {
                        type: 'transfer',
                        sum,
                        id: editOp?.id ?? model.nextId() + '',
                        dstUid: dst.id
                    }
                }))
        }

    }, [model, editOp, dst, handleOperation]);

    const onDeleteClick = React.useCallback(() => {
        showConfirm("Delete payment? This can not be undone.", (confirmed) => {
            if (confirmed && model && editOpId) {
                handleOperation(
                    model.commitOperation({
                        type: 'delete',
                        id: editOpId
                    }))
            }
        })
    }, [model, editOpId, handleOperation])

    return <>
        <BackButtopnController />
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0px' }}>
            <CardLight><ListItem titile={`You → ${dst.fullName}`} /></CardLight>
            <input ref={sumRef} defaultValue={initialSum / 100} disabled={disable} autoFocus={true} inputMode="decimal" style={{ flexGrow: 1, padding: '8px 28px' }} placeholder="0,00" />
            {editOp && <Button disabled={disable} onClick={onDeleteClick}><ListItem titleStyle={{ color: "var(--text-destructive-color)", alignSelf: 'center' }} titile="DELETE PAYMENT" /></Button>}
        </div>
        <MainButtopnController onClick={onClick} text={(editOp ? "EDIT" : "ADD") + " PAYMENT"} progress={loading} isActive={!disable} />
    </>
}