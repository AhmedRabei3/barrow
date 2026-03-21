export interface SafeUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  rating?: number;
  activateUntil?: Date | undefined;
  
}
