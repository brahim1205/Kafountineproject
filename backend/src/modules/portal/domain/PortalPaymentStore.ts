export type PendingPortalPayment = {
  paymentId: string;
  contribuableId: string;
  taxIds: string[];
  amount: number;
  phone: string;
  method: string;
  createdAt: string;
};

export interface PortalPaymentStore {
  save(payment: PendingPortalPayment): Promise<void>;
  find(paymentId: string): Promise<PendingPortalPayment | null>;
  delete(paymentId: string): Promise<void>;
}
