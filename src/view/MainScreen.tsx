import React, { useCallback } from "react";
import { Balance, Log } from "../../entity"
import { SessionModel, __DEV__ } from "../model/SessionModel"
import { UsersModule } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM"
import {
    useLocation,
    useNavigate, useNavigation
} from "react-router-dom";
import { text } from "stream/consumers";


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
    return <>
        <BackButtopnController />
        <BalanceView balance={balance} />
        <LogView log={log} />
        <MainButtopnController onClick={() => nav("/tg/addExpence")} text={"Add expence"} />
    </>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    return <>{JSON.stringify(balance)}</>
}

const LogView = ({ log }: { log?: Log }) => {
    return <>{JSON.stringify(log)}</>
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