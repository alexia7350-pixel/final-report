import { ReminderStatus } from './enums';
import { Task } from './Task';

export interface Reminder {
  id: string;
  taskId: string;
  remindAt: string | Date;
  status: ReminderStatus;
  createdAt: string | Date;
  task?: Task;
}
