import { Balance, Log } from "../../entity"
import { SessionModel } from "../model/SessionModel"
import { useVMvalue } from "../utils/vm/useVM"

export const MainScreen = ({ model }: { model: SessionModel }) => {
    const balance = useVMvalue(model.balance)
    const log = useVMvalue(model.log)
    return <MainScreenView balance={balance?.balance} log={log} />
}

export const MainScreenView = ({ balance, log }: { balance?: Balance, log?: Log }) => {
    return <>
        <BalanceView balance={balance} />
        <LogView log={log} />
    </>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    return <>{JSON.stringify(balance)}</>
}

const LogView = ({ log }: { log?: Log }) => {
    return <>{JSON.stringify(log)}</>
}