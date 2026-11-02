export type AppNotification = {
  id: string;
  userId: string | null;
  type: string;
  titre: string;
  message: string;
  montant: number | null;
  contribuable: string | null;
  agent: string | null;
  lu: boolean;
  readAt: Date | null;
  year: number;
  createdAt: Date;
  updatedAt: Date;
};

export interface NotificationRepository {
  /** Crée les notifications de démarrage d'une année si elle n'en a encore aucune. */
  ensureSeed(year: number): Promise<void>;
  list(year: number, limit: number): Promise<AppNotification[]>;
  markRead(id: string): Promise<boolean>;
  markAllRead(year: number): Promise<void>;
  listActiveYears(): Promise<number[]>;
}
