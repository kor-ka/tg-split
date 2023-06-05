import { Operation, User } from "../../entity";
import { VM } from "../utils/vm/VM";

export class LogModule {
    readonly log = new VM(new Map<string, VM<Operation>>())

    readonly getOperationVm = (operation: Operation) => {
        let vm = this.log.val.get(operation.id)
        if (!vm) {
            vm = new VM(operation)
            const nextMap = new Map([[operation.id, vm], ...this.log.val])
            this.log.next(nextMap)
        }
        return vm
    }

    readonly getOperationOpt = <T = Operation>(id: string): T | undefined => {
        return this.log.val.get(id)?.val as T
    }

}