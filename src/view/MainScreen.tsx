import React, { useCallback } from "react";
import { Balance, Log, OperationSplit, OperationTransfer } from "../../entity"
import { SessionModel } from "../model/SessionModel"
import { UsersModule } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM"
import {
    useLocation,
    useNavigate, useNavigation
} from "react-router-dom";

export let __DEV__ = false
if (typeof window !== "undefined") {
    __DEV__ = window.location.hostname.indexOf("localhost") >= 0
}

export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule());

export const MainScreen = () => {
    const model = React.useContext(ModelContext)
    return model ? <MainScreenWithModel model={model} /> : null
}

const MainScreenWithModel = ({ model }: { model: SessionModel }) => {
    const balance = useVMvalue(model.balance)
    const log = useVMvalue(model.log)
    return <MainScreenView balance={balance?.balance} log={log} />
}

export const MainScreenView = ({ balance, log }: { balance?: Balance, log?: Log }) => {
    const nav = useNavigate()
    return <div style={{ padding: "8px 0px" }}>
        <BackButtopnController />
        <BalanceView balance={balance} />
        <LogView log={log} />
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"Add expence"} />
    </div>
}

const Card = ({ children }: { children: any }) => {
    return <div style={{ margin: '8px 16px', padding: 4, backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16 }}>{children}</div>
}

const CardLight = ({ children }: { children: any }) => {
    return <div style={{ margin: '0px 24px', }}>{children}</div>
}

const ListItem = ({ titile: title, subtitle, left }: { titile: string, subtitle?: string, left?: string }) => {
    return <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'space-between', padding: 4, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: "column" }}>
            <div style={{ padding: 4 }}>{title}</div>
            <div style={{ padding: 4, fontSize: '0.8em', color: "var(--tg-theme-hint-color)" }}>{subtitle}</div>
        </div>
        <div style={{ padding: '4px 16px', fontSize: '1.4em', }}>{left}</div>
    </div>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    return <>{balance?.map(e =>
        <Card>
            <ListItem titile={"some one owes"} subtitle={e.pair.join('→')} left={e.sum.toString()} />
        </Card>
    )}</>
}

const SplitLogItem = ({ op }: { op: OperationSplit }) => {
    const usersModule = React.useContext(UsersProvider)
    const actor = useVMvalue(usersModule.getUser(op.uid))
    // extract as components? 
    // TODO: test many - should not affect summ
    const names = React.useMemo(() => op.uids.map((uid) => usersModule.getUser(uid).val.name).join(', '), [...op.uids])
    return <CardLight>
        <ListItem titile={`⚡️ ${[actor.name, actor.lastname].filter(Boolean).join(' ')} splitted`} subtitle={names} left={op.sum.toString()} />
    </CardLight>
}

const TransferLogItem = ({ op }: { op: OperationTransfer }) => {
    return <CardLight>
        <ListItem titile={`Name here ${op.uid} paid`} subtitle={`${op.dstUid}`} left={op.sum.toString()} />
    </CardLight>
}

const LogView = ({ log }: { log?: Log }) => {
    return <>{log?.map(op => op.type === 'split' ? <SplitLogItem op={op} /> : op.type === 'transfer' ? <TransferLogItem op={op} /> : null)}</>
}

export const AddExpenceScreen = () => {
    const nav = useNavigate()
    const model = React.useContext(ModelContext)
    const [loading, setLoading] = React.useState(false)
    const onClick = React.useCallback(() => {
        if (!loading) {
            setLoading(true)
            model?.commitOperation({ type: 'split', sum: 10, id: model.nextId() + '', uids: [102133736, 6065926905] })
                .catch(e => console.error(e))
                .then(() => nav(-1))
                .finally(() => setLoading(false))
        }
    }, [loading])
    return <>
        <BackButtopnController />
        <MainButtopnController onClick={onClick} text={"Add expence"} progress={loading} />
    </>
}

export const BackButtopnController = () => {
    const nav = useNavigate()
    const bb = React.useMemo(() => (window as any).Telegram.WebApp.BackButton, [])
    const goBack = useCallback(() => nav(-1), [])

    const location = useLocation();
    const canGoBack = React.useMemo(() => location.key !== 'default', [location.key])


    React.useEffect(() => {
        if (canGoBack) {
            bb.show()
        } else {
            bb.hide()
        }
    }, [canGoBack])

    React.useEffect(() => {
        console.log(bb)
        bb.onClick(goBack)
        return () => {
            bb.offClick(goBack)
        }
    }, [bb])

    return (canGoBack && __DEV__) ? <button onClick={goBack}>{"< back"}</button> : null
}

export const MainButtopnController = ({ onClick, text, color, textColor, isActive, isVisible, progress }: { onClick: () => void, text?: string, color?: string, textColor?: string, isActive?: boolean, isVisible?: boolean, progress?: boolean }) => {
    const mb = React.useMemo(() => (window as any).Telegram.WebApp.MainButton, [])
    React.useEffect(() => {
        mb.setParams({ text, color, text_color: textColor, is_active: isActive, is_visible: isVisible })
    }, [text, color, textColor, isActive, isVisible])
    React.useEffect(() => {
        mb.onClick(onClick)
        return () => {
            mb.offClick(onClick)
        }
    }, [onClick])
    React.useEffect(() => {
        if (progress) {
            mb.showProgress()
        } else {
            mb.hideProgress()
        }
    }, [progress])

    return (__DEV__ && isVisible !== false) ? <button disabled={isActive === false} onClick={onClick} >{text}{progress ? "⌛️" : ""}</button> : null
}