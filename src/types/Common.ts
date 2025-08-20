import Bank from "@/models/bank"
import BankAccount from "@/models/bank-account"

export type BankOptions = {
    isNegativeAllowed?:boolean
}
export type UserId = string
export type BankId = string
export type BankAccountId = string

export type AccountIdToAccount = Map<BankAccountId,BankAccount>
export type UserIdToAccount = Map<UserId,BankAccountId[]>
export type AccountIdToBank = Map<BankAccountId,Bank>
export type BankIdToBank = Map<BankId,Bank>

