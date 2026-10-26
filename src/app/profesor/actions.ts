"use server";

import { listAccounts, updateStudentAccount, type AccountsResult, type UpdateResult } from "@/lib/admin-accounts";

// Authorization happens inside each call of the data layer, not here.
export async function listAccountsAction(): Promise<AccountsResult> {
  return listAccounts();
}

export async function updateStudentAccountAction(userId: string, changes: { email?: string; password?: string }): Promise<UpdateResult> {
  return updateStudentAccount(userId, changes);
}
