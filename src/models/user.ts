import { v4 as uuidv4 } from "uuid";
import { ac } from "vitest/dist/chunks/reporters.D7Jzd9GS";

export default class User{
    private id: string
    private name:string
    private accounts: string[] = []

    constructor(name:string,accounts:string[]){
        this.id = uuidv4();
        this.name = name;
        this.accounts = accounts;
    }


    static create(name:string,account:string[]):User{    
        return new User(name,account)
    }

}