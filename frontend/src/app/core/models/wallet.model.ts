/** Un virement dans l'historique du portefeuille. */
export interface Transfer {
  id: number;
  amount: number;
  date: string;
  /** 'out' = envoyé, 'in' = reçu. */
  direction: 'in' | 'out';
  /** Nom de l'autre partie (destinataire si envoyé, expéditeur si reçu). */
  counterpart: string;
}

/** Portefeuille e-Dinar : solde + historique. */
export interface Wallet {
  balance: number;
  history: Transfer[];
}

/** Données envoyées pour effectuer un virement. */
export interface TransferPayload {
  /** E-mail, téléphone ou code e-Dinar du destinataire. */
  recipient: string;
  amount: number;
}
