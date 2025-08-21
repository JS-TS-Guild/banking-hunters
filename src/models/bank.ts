import { v4 as uuidv4 } from "uuid";
import BankAccount from "./bank-account";
import { BankId, BankOptions, UserId } from "@/types/Common";
import globalRegistry from "../services/GlobalRegistry";

export default class Bank {
  id: string;
  options?: BankOptions;

  constructor(options?: BankOptions) {
    this.id = uuidv4();
    this.options = options;
  }

  static create(options?: BankOptions): Bank {
    const bank = new Bank(options);
    console.log(bank);
    globalRegistry.setBankByBankId(bank.id, bank);
    return bank;
  }

  getId() {
    return this.id;
  }

  checkIsNegativeAllowed(): boolean {
    return this.options?.isNegativeAllowed ?? false;
  }

  createAccount(amount: number): BankAccount {
    const account = BankAccount.create(amount);
    globalRegistry.setAccountByAcoountId(account.getId(), account);
    globalRegistry.setBankByAccountId(account.getId(), this);
    return account;
  }

  getAccount(accountId: string) {
    return globalRegistry.getAccountByAccountId(accountId);
  }

  send(fromUser: UserId, toUser: UserId, amount: number, toBankId?: BankId) {
    // Get sender's accounts that belong to THIS bank (using this.id)
    const allSenderAccountIds = globalRegistry.getAccountsByUserId(fromUser);
    const senderAccountsInThisBank = allSenderAccountIds.filter((accountId) => {
      const bank = globalRegistry.getBankByAccountId(accountId);
      return bank && bank.getId() === this.id;
    });

    if (senderAccountsInThisBank.length === 0) {
      throw new Error("Sender does not have an account in this bank.");
    }

    // Get receiver's accounts
    let receiverAccountIds = globalRegistry.getAccountsByUserId(toUser);
    let targetBankForReceiver: Bank | undefined;

    if (toBankId) {
      // Cross-bank transfer - filter receiver's accounts to target bank
      receiverAccountIds = receiverAccountIds.filter((accountId) => {
        const bank = globalRegistry.getBankByAccountId(accountId);
        return bank && bank.getId() === toBankId;
      });
      targetBankForReceiver = globalRegistry.getBankByBankId(toBankId);
    } else {
      // Same bank transfer - filter receiver's accounts to THIS bank
      receiverAccountIds = receiverAccountIds.filter((accountId) => {
        const bank = globalRegistry.getBankByAccountId(accountId);
        return bank && bank.getId() === this.id;
      });
      targetBankForReceiver = this;
    }

    if (receiverAccountIds.length === 0) {
      if (toBankId) {
        throw new Error(
          "Recipient does not have an account in the target bank."
        );
      } else {
        throw new Error("Recipient does not have an account in this bank.");
      }
    }

    // Prevent self-transfer within same bank
    if (fromUser === toUser && !toBankId) {
      throw new Error("Cannot transfer to the same user in the same bank.");
    }

    // Get sender accounts from THIS bank (maintaining priority order)
    const senderAccounts = senderAccountsInThisBank
      .map((accountId) => globalRegistry.getAccountByAccountId(accountId))
      .filter((account) => account !== undefined) as BankAccount[];

    // Check if THIS bank allows negative balance
    const allowsNegative = this.checkIsNegativeAllowed();

    // Calculate total available funds in sender's accounts in THIS bank
    const totalBalance = senderAccounts.reduce(
      (sum, account) => sum + account.getBalance(),
      0
    );

    if (totalBalance < amount && !allowsNegative) {
      throw new Error("Insufficient funds");
    }

    // Perform the debit using fallback logic within THIS bank
    let remainingAmount = amount;

    // First pass: debit available positive balances in priority order
    for (const account of senderAccounts) {
      if (remainingAmount <= 0) break;

      const availableBalance = Math.max(0, account.getBalance());
      const debitAmount = Math.min(remainingAmount, availableBalance);

      if (debitAmount > 0) {
        account.deductBalance(debitAmount);
        remainingAmount -= debitAmount;
      }
    }

    // Second pass: if THIS bank allows negative balance and still have remaining amount
    if (remainingAmount > 0 && allowsNegative && senderAccounts.length > 0) {
      // Deduct remaining from first account in THIS bank
      senderAccounts[0].deductBalance(remainingAmount);
      remainingAmount = 0;
    }

    if (remainingAmount > 0) {
      throw new Error("Insufficient funds");
    }

    // Credit the receiver's first account (in target bank or THIS bank)
    const receiverAccount = globalRegistry.getAccountByAccountId(
      receiverAccountIds[0]
    );
    if (!receiverAccount) {
      throw new Error("Receiver account not found");
    }

    receiverAccount.addBalance(amount);
  }
}
