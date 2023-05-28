import { User } from "../../entity";
import { VM } from "../utils/vm/VM";

export class UsersModule {
    private users = new Map<string, VM<Partial<User> & Pick<User, 'id'>>>

    readonly getUser = (id: string) => {
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