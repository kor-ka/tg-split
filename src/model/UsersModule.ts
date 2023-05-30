import { User } from "../../entity";
import { VM } from "../utils/vm/VM";

export class UsersModule {
    private users = new Map<number, VM<Partial<User> & Pick<User, 'id'>>>

    readonly getUser = (id: number) => {
        let vm = this.users.get(id)
        if (!vm) {
            vm = new VM({ id })
            this.users.set(id, vm)
        }
        return vm
    }

    readonly updateUser = (user: User) => {
        this.getUser(user.id).next(user)
    }
}