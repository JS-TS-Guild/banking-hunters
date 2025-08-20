import { v4 as uuidv4 } from "uuid";
import globalRegistry from '../services/GlobalRegistry'
import { BankAccountId } from "@/types/Common";

export default class User{
    private id: string
    private name:string
    private accounts: BankAccountId[] 

    constructor(name:string,accounts:string[] = []){
        this.id = uuidv4();
        this.name = name;
        this.accounts = [...accounts];
    }


    static create(name:string,account:BankAccountId[]):User{    
        const user = new User(name,account)
        // console.log("setting data in user databae",user.id,user.accounts)
        globalRegistry.setAccountsByUserId(user.id,user.accounts)
        return user
    }

    getId(){
        return this.id  
    }

}


