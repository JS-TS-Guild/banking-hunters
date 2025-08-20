import Bank from "@/models/bank";
import BankAccount from "@/models/bank-account";
import { BankAccountId, UserId, AccountIdToAccount, UserIdToAccount, AccountIdToBank, BankId, BankIdToBank } from "@/types/Common";


class GlobalRegistry {

    private static instance : GlobalRegistry

    private accountIdToAccount : AccountIdToAccount = new Map()
    private userIdToAccounts : UserIdToAccount = new Map()
    private accountIdToBank : AccountIdToBank = new Map()
    private bankIdToBank : BankIdToBank = new Map()


    static getInstance():GlobalRegistry{
        if(!GlobalRegistry.instance){
            GlobalRegistry.instance = new GlobalRegistry()
        }
        return GlobalRegistry.instance
    }


    // Get Set Account By Account Id
    getAccountByAccountId(accountId:UserId):BankAccount{
        return this.accountIdToAccount.get(accountId)
    }
    setAccountByAcoountId(accounId:BankAccountId,account:BankAccount){
        this.accountIdToAccount.set(accounId,account)
    }
    // By UserId
    getAccountsByUserId(userId:UserId):BankAccountId[]{
        // console.log("Get AccountbyUserId call in transaction service",userId,this.userIdToAccounts)
        
        const accounts = this.userIdToAccounts.get(userId) 
        if(!accounts) throw new Error("Accounts Not find")
        return accounts
    }
    setAccountsByUserId(userId:UserId,accounts:BankAccountId[]){
        // console.log("set AccountbyUserId call in transaction service",userId,accounts)

        const setAccount = this.userIdToAccounts.set(userId,accounts)
        // console.log("setedAcc",setAccount)
        return setAccount
    }
    // Get Set Bank By Account Id
    getBankByAccountId(accounId:BankAccountId):Bank{
        return this.accountIdToBank.get(accounId)
    }
    setBankByAccountId(accounId:BankAccountId,bank:Bank){
        console.log("Inside Global Repo",{accounId},{bank})
        this.accountIdToBank.set(accounId,bank);
    }
    // By Bank Id
    getBankByBankId(bankId:BankId){
        return this.bankIdToBank.get(bankId)
    }
    setBankByBankId(bankId:BankId,bank:Bank){
        this.bankIdToBank.set(bankId,bank)
    }

    
    clear(){
        const instance = GlobalRegistry.instance
        instance.accountIdToAccount.clear()
        instance.accountIdToBank.clear()
        instance.bankIdToBank.clear()
        instance.userIdToAccounts.clear()
    }

}

export default GlobalRegistry.getInstance()