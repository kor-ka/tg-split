import React from "react";
import { Balance, Log } from "../../entity"
import { SessionModel } from "../model/SessionModel"
import { UsersModule } from "../model/UsersModule";
import { useVMvalue } from "../utils/vm/useVM"

export const ModelContext = React.createContext<SessionModel | undefined>(undefined);
export const UserContext = React.createContext<number | undefined>(undefined);
export const UsersProvider = React.createContext<UsersModule>(new UsersModule());

export const MainScreen = ({ model }: { model: SessionModel }) => {
    const balance = useVMvalue(model.balance)
    const log = useVMvalue(model.log)
    return <MainScreenView balance={balance?.balance} log={log} />
}

export const MainScreenView = ({ balance, log }: { balance?: Balance, log?: Log }) => {
    return <>
        <BalanceView balance={balance} />
        <LogView log={log} />
        <AddExpence />
    </>
}

const BalanceView = ({ balance }: { balance?: Balance }) => {
    return <>{JSON.stringify(balance)}</>
}

const LogView = ({ log }: { log?: Log }) => {
    return <>{JSON.stringify(log)}</>
}

const AddExpence = () => {
    const model = React.useContext(ModelContext)
    const onClick = () => {
        model?.commitOperation({ type: 'split', sum: 10, id: model.nextId() + '', uids: [102133736, 6065926905] })
            .catch(e => console.error(e))
    }
    return <button onClick={onClick} >AddExpence</button>
}