import { Priority, TaskStatus } from './enums';
import { Reminder } from './Reminder';
import { User } from './User';

export interface Task {
  id: string;
  userId: string;
  title: string;
  courseName?: string | null;
  description?: string | null;
  dueDate: string | Date;
  status: TaskStatus;
  priority: Priority;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  user?: User;
  reminders?: Reminder[];
}
