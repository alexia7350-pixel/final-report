'use client';

import React, { useState } from 'react';
import TaskCard, { Task, TaskStatus } from '@/components/TaskCard';

// 模擬資料，後續可替換為實際 API 呼叫
const initialTasks: Task[] = [
  {
    id: '1',
    title: '演算法作業三',
    courseName: '進階演算法',
    description: '實作 Dijkstra 演算法並分析時間複雜度。',
    dueDate: '2026-06-15T23:59:00Z',
    status: 'PENDING',
    priority: 'HIGH',
  },
  {
    id: '2',
    title: '軟體工程期末報告',
    courseName: '軟體工程',
    description: '需包含 UML 圖與 API 規格，並上傳至 GitHub。',
    dueDate: '2026-06-18T12:00:00Z',
    status: 'PENDING',
    priority: 'MEDIUM',
  },
  {
    id: '3',
    title: '微積分習題 1-3 章',
    courseName: '微積分 (下)',
    dueDate: '2026-06-10T08:00:00Z',
    status: 'COMPLETED',
    priority: 'LOW',
  }
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const toggleTaskStatus = (id: string, currentStatus: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { ...task, status: currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING' }
        : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'ALL') return true;
    return task.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-gray-50/30">
      
      {/* 頂部導航 / Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">我的任務</h1>
          </div>
          
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新增任務
          </button>
        </div>
      </header>

      {/* 內容區塊 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* 狀態切換 Tabs */}
        <div className="flex space-x-1 bg-gray-100/70 p-1 rounded-xl w-fit mb-8 border border-gray-200/50">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab 
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              {tab === 'ALL' ? '全部' : tab === 'PENDING' ? '待完成' : '已完成'}
            </button>
          ))}
        </div>

        {/* 任務網格列表 */}
        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} onToggleStatus={toggleTaskStatus} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">沒有任何任務</h3>
            <p className="text-gray-500 text-sm">目前此分類下沒有任務，點擊上方按鈕新增一個吧！</p>
          </div>
        )}
      </main>

    </div>
  );
}
