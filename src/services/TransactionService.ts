import { BankAccountId, BankId, UserId } from "@/types/Common";
import globalRegistry from '../services/GlobalRegistry'
import BankAccount from "@/models/bank-account";
import Bank from "@/models/bank";

export default class TransactionService {

    send(fromUser: UserId, toUser: UserId, amount: number, toBankId?: BankId) {
        // 1. Set remainingAmountToDebit = amount to transfer
        let remainingAmountToDebit = amount;

        // 2. Get all sender accounts (fromUserAccounts)
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

        // 3. Calculate totalSenderBalance
        let totalSenderBalance = 0;
        let overdraftsAllowed = false;

        for (const account of senderAccounts) {
            if (account) {
                totalSenderBalance += account.getBalance();
                
                // Check if any bank allows overdrafts
                const bank = globalRegistry.getBankByAccountId(account.getId());
                if (bank && bank.checkIsNegativeAllowed()) {
                    overdraftsAllowed = true;
                }
            }
        }

        // 4. If totalSenderBalance < amount AND overdrafts are not allowed: Stop and throw "Insufficient funds"
        if (totalSenderBalance < amount && !overdraftsAllowed) {
            throw new Error('Insufficient funds');
        }

        // Find receiver account
        let receiverAccount: BankAccount;
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
        } else {
            // Same bank transfer
            receiverAccount = receiverAccounts[0]
        }

        // 5. For each account in sender accounts: Distribute the debit
        for (const account of senderAccounts) {
            // a. If nothing left to debit (remainingAmountToDebit <= 0), stop the loop
            if (remainingAmountToDebit <= 0) break;

            // b. If the account does not exist, skip it
            if (!account) continue;

            // Prevent self-transfer to same account
            if (account.getId() === receiverAccount.getId()) {
                continue;
            }

            // c. Decide how much to take from this account:
            // debitAmount = smaller of (remainingAmountToDebit, account balance)
            const accountBalance = account.getBalance();
            let debitAmount = Math.min(remainingAmountToDebit, accountBalance);

            // If account balance is insufficient but bank allows negative
            if (debitAmount < remainingAmountToDebit && accountBalance < remainingAmountToDebit) {
                const bank = globalRegistry.getBankByAccountId(account.getId());
                if (bank && bank.checkIsNegativeAllowed()) {
                    // Take the full remaining amount (will go negative)
                    debitAmount = remainingAmountToDebit;
                }
            }

            // d. If debitAmount > 0: Subtract from account and update remaining
            if (debitAmount > 0) {
                account.deductBalance(debitAmount);
                remainingAmountToDebit -= debitAmount;
                
                console.log(`Debited ${debitAmount} from account ${account.getId()}, remaining: ${remainingAmountToDebit}`);
            }
        }

        // Check if we successfully debited the full amount
        if (remainingAmountToDebit > 0) {
            throw new Error('Insufficient funds');
        }

        // Add the full amount to receiver account
        receiverAccount.addBalance(amount);
        
        console.log(`Transfer complete: ${amount} transferred to account ${receiverAccount.getId()}`);
    }
}