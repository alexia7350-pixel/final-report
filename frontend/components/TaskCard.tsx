import React from 'react';

export type TaskStatus = 'PENDING' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  courseName?: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
  priority: Priority;
}

interface TaskCardProps {
  task: Task;
  onToggleStatus?: (id: string, currentStatus: TaskStatus) => void;
}

export default function TaskCard({ task, onToggleStatus }: TaskCardProps) {
  const isCompleted = task.status === 'COMPLETED';
  
  // 根據優先級決定標籤顏色
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'LOW':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 格式化日期
  const formattedDate = new Date(task.dueDate).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`relative overflow-hidden group rounded-2xl border ${isCompleted ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200 bg-white shadow-sm hover:shadow-md'} transition-all duration-300 p-5 flex flex-col gap-3`}>
      
      {/* 頂部：狀態與優先級標籤 */}
      <div className="flex justify-between items-start w-full">
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => onToggleStatus && onToggleStatus(task.id, task.status)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCompleted 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'border-gray-300 hover:border-blue-400 bg-transparent text-transparent'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
            {task.priority === 'HIGH' ? '高' : task.priority === 'MEDIUM' ? '中' : '低'}優先級
          </span>
        </div>
        
        <div className="text-right">
          <p className={`text-xs font-medium ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
            {task.courseName || '未指定課程'}
          </p>
        </div>
      </div>

      {/* 標題與描述 */}
      <div className="mt-1">
        <h3 className={`text-lg font-bold tracking-tight ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className={`text-sm mt-1.5 line-clamp-2 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
            {task.description}
          </p>
        )}
      </div>

      {/* 底部：截止時間 */}
      <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm border-t border-gray-100">
        <svg className={`w-4 h-4 ${isCompleted ? 'text-gray-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`font-medium ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>
          截止於 {formattedDate}
        </span>
      </div>
      
    </div>
  );
}
