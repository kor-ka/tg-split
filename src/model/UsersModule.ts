import { User } from "../../entity";
import { VM } from "../utils/vm/VM";

export class UsersModule {
    private users = new Map<number, VM<Partial<User> & Pick<User, 'id'> & { fullName: string, name: string }>>;

    readonly getUser = (id: number) => {
        let vm = this.users.get(id)
        if (!vm) {
            vm = new VM({ id, fullName: "Loading user...", name: "Loading user..." })
            this.users.set(id, vm)
        }
        return vm
    }

    readonly updateUser = (user: User) => {
        user.name = user.name.replaceAll(" ", " ")
        user.lastname = user.lastname?.replaceAll(" ", " ")
        const fullName = [user.name, user.lastname].filter(Boolean).join(' ')
        this.getUser(user.id).next({ ...user, fullName })
    }
}