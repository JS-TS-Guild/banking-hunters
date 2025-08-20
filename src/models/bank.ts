import { v4 as uuidv4 } from "uuid"
import  BankAccount  from "./bank-account";
import { BankId, BankOptions, UserId } from "@/types/Common";
import globalRegistry from '../services/GlobalRegistry'
import TransactionService from "@/services/TransactionService";

const transactionService = new TransactionService()

export default class Bank {
    id:string
    options: BankOptions
    constructor(options?:BankOptions){
        this.id = uuidv4()
        this.options = options
    }

    static create(options?:BankOptions):Bank{
        const bank = new Bank(options)
        console.log(bank)
        globalRegistry.setBankByBankId(bank.id,bank)
        return bank
    }

    getId(){
        return this.id
    }

    checkIsNegativeAllowed():boolean{
        return this.options?.isNegativeAllowed 
    }

    createAccount(amount:number):BankAccount{
        const account = BankAccount.create(amount)
        globalRegistry.setAccountByAcoountId(account.getId(),account)
        globalRegistry.setBankByAccountId(account.getId(),this)
        return account
    }

    getAccount(accountId:UserId){
        return globalRegistry.getAccountByAccountId(accountId)
    }

    send(fromUser:UserId,toUser:UserId,amount:number,toBankId?:BankId){
        // console.log("send Call in BAnk",fromUser,toUser)
        transactionService.send(fromUser,toUser,amount,toBankId)
    }

}