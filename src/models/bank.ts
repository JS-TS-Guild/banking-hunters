import { v4 as uuidv4 } from "uuid"
import  BankAccount  from "./bank-account";

export default class Bank {
    id:string

    constructor(){
        this.id = uuidv4()
    }

    static create():Bank{
        return new Bank();
    }

    getId(){
        return this.id
    }

    createAccount(amount:number):BankAccount{
        return BankAccount.create(amount)
    }


}