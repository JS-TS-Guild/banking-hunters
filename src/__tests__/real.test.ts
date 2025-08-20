import { BankAccountId, BankId, UserId } from "@/types/Common";
import globalRegistry from '../services/GlobalRegistry'
import BankAccount from "@/models/bank-account";
import Bank from "@/models/bank";

export default class TransactionService {

    send(fromUser: UserId, toUser: UserId, amount: number, toBankId?: BankId) {
        // Get all sender and receiver accounts
        const senderAccountIds: BankAccountId[] = globalRegistry.getAccountsByUserId(fromUser)
        const receiverAccountIds: BankAccountId[] = globalRegistry.getAccountsByUserId(toUser)

        // Validate accounts exist
        if (!senderAccountIds || senderAccountIds.length === 0) {
            throw new Error("Sender does not have account")
        }
        if (!receiverAccountIds || receiverAccountIds.length === 0) {
            throw new Error("Receiver does not have account")
        }

        // Get actual account objects with null safety
        const senderAccounts: BankAccount[] = senderAccountIds
            .map(accountId => globalRegistry.getAccountByAccountId(accountId))
            .filter(account => account !== null) as BankAccount[]

        const receiverAccounts: BankAccount[] = receiverAccountIds
            .map(accountId => globalRegistry.getAccountByAccountId(accountId))
            .filter(account => account !== null) as BankAccount[]

        // Find receiver account and determine transfer type
        let receiverAccount: BankAccount;
        let receiverBankId: BankId;

        if (toBankId) {
            // Cross-bank transfer: find receiver's account in specific bank
            const targetAccount = receiverAccounts.find(acc => {
                const accBank = globalRegistry.getBankByAccountId(acc.getId())
                return accBank && accBank.getId() === toBankId
            })
            if (!targetAccount) {
                throw new Error('Receiver account not found in target bank')
            }
            receiverAccount = targetAccount
            receiverBankId = toBankId
        } else {
            // Same bank transfer: use first receiver account
            receiverAccount = receiverAccounts[0]
            const receiverBank = globalRegistry.getBankByAccountId(receiverAccount.getId())
            if (!receiverBank) {
                throw new Error('Receiver bank not found')
            }
            receiverBankId = receiverBank.getId()
        }

        // Prevent self-transfer to same account
        if (senderAccounts.some(acc => acc.getId() === receiverAccount.getId())) {
            throw new Error('Cannot transfer to the same account')
        }

        // Determine which sender accounts to use based on transfer type
        let eligibleSenderAccounts: BankAccount[];

        if (toBankId) {
            // Cross-bank transfer: use all sender accounts (in priority order)
            eligibleSenderAccounts = senderAccounts
        } else {
            // Same-bank transfer: only use accounts from receiver's bank
            eligibleSenderAccounts = senderAccounts.filter(acc => {
                const accBank = globalRegistry.getBankByAccountId(acc.getId())
                return accBank && accBank.getId() === receiverBankId
            })

            if (eligibleSenderAccounts.length === 0) {
                throw new Error('Sender has no accounts in the target bank')
            }
        }

        // DEBUG: Log the eligible accounts
        console.log('Eligible sender accounts:', eligibleSenderAccounts.map(acc => ({
            id: acc.getId(),
            balance: acc.getBalance(),
            bankId: globalRegistry.getBankByAccountId(acc.getId())?.getId()
        })))
        console.log('Transfer type:', toBankId ? 'Cross-bank' : 'Same-bank')
        console.log('Amount to transfer:', amount)

        // Apply the multi-account debit algorithm
        const success = this.processMultiAccountDebit(eligibleSenderAccounts, amount)

        console.log('Multi-account debit success:', success)

        if (!success) {
            throw new Error('Insufficient funds')
        }

        // Add the full amount to receiver account
        receiverAccount.addBalance(amount)
        
        console.log(`Transfer complete: ${amount} transferred to account ${receiverAccount.getId()}`)
    }

    private processMultiAccountDebit(accounts: BankAccount[], amount: number): boolean {
        // 1. Set remainingAmountToDebit = amount to transfer
        let remainingAmountToDebit = amount

        // 2. Already have accounts (fromUserAccounts) in priority order

        // 3. Calculate totalSenderBalance and check overdraft capability
        let totalSenderBalance = 0
        let overdraftsAllowed = false

        for (const account of accounts) {
            if (account) {
                totalSenderBalance += account.getBalance()
                
                // Check if any bank allows overdrafts
                const bank = globalRegistry.getBankByAccountId(account.getId())
                if (bank && bank.checkIsNegativeAllowed()) {
                    overdraftsAllowed = true
                }
            }
        }

        // 4. If totalSenderBalance < amount AND overdrafts are not allowed: Stop and return false
        console.log('Total sender balance:', totalSenderBalance)
        console.log('Amount needed:', amount)
        console.log('Overdrafts allowed:', overdraftsAllowed)
        
        if (totalSenderBalance < amount && !overdraftsAllowed) {
            console.log('Insufficient funds detected - returning false')
            return false // Insufficient funds
        }

        // 5. For each account in sender accounts: Distribute the debit
        for (const account of accounts) {
            // a. If nothing left to debit (remainingAmountToDebit <= 0), stop the loop
            if (remainingAmountToDebit <= 0) break

            // b. If the account does not exist, skip it
            if (!account) continue

            // c. Decide how much to take from this account
            const accountBalance = account.getBalance()
            const bank = globalRegistry.getBankByAccountId(account.getId())
            
            let debitAmount: number

            if (accountBalance >= remainingAmountToDebit) {
                // Account has sufficient funds for remaining amount
                debitAmount = remainingAmountToDebit
            } else if (bank && bank.checkIsNegativeAllowed()) {
                // Account has insufficient funds but allows negative balance
                // Take the full remaining amount (account will go negative)
                debitAmount = remainingAmountToDebit
            } else {
                // Account has insufficient funds and doesn't allow negative
                // Take only what's available (account balance or 0 if already negative)
                debitAmount = Math.max(0, accountBalance)
            }

            // d. If debitAmount > 0: Subtract from account and update remaining
            if (debitAmount > 0) {
                account.deductBalance(debitAmount)
                remainingAmountToDebit -= debitAmount
                
                console.log(`Debited ${debitAmount} from account ${account.getId()}, remaining: ${remainingAmountToDebit}`)
            }
        }

        // Return true if we successfully debited the full amount
        return remainingAmountToDebit <= 0
    }
}