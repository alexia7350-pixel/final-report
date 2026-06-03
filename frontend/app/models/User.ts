export interface User {
  id: string;
  email: string;
  name?: string | null;
  lineId?: string | null;
  createdAt: string | Date;
}
