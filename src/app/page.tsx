"use client";
import type { Task } from '@prisma/client';
import { FormEvent, useState, useEffect } from 'react';

export default function Home() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    fetchTasks();
  }, []);
  async function fetchTasks() {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }
  return (
    <div className="p-5">
      <AddTaskForm onTaskAdded={fetchTasks} />
      <TaskList tasks={tasks} onTaskUpdated={fetchTasks} onTaskDeleted={fetchTasks} />
    </div>
  );
};

function TaskList({
  tasks,
  onTaskUpdated,
  onTaskDeleted,
}: {
  tasks: Task[];
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}) {
  const handleUpdate = async (task: Task) => {
    const updatedTitle = prompt('Update task title', task.title);
    if (updatedTitle === null) return;
    try {
      // const response = await fetch('/api/tasks/update', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...task, title: updatedTitle }),
      // });
      const response = { ok: true };
      if (response.ok) {
        onTaskUpdated();
      } else {
        console.error('Failed to update task');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      // const response = await fetch('/api/tasks/delete', {
      //   method: 'DELETE',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ id }),
      // });
      const response = { ok: true };
      if (response.ok) {
        onTaskDeleted();
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  return (
    <div className="flex flex-col">
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="border rounded-lg shadow overflow-hidden dark:border-neutral-700 dark:shadow-gray-900">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium uppercase">Id</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium uppercase">Title</th>
                  <th scope="col" className="px-6 py-3 text-start text-xs font-medium uppercase">Description</th>
                  {/*
                  <th scope="col" className="px-6 py-3 text-end text-xs font-medium uppercase">Actions</th>
                  */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {tasks.map((task: Task) => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{task.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{task.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{task.description}</td>
                    {/*
                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                      <button
                        onClick={() => handleUpdate(task)}
                        className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:shadow-outline-blue active:bg-blue-600 transition duration-150 ease-in-out"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="ml-2 px-4 py-2 font-medium text-white bg-red-600 rounded-md hover:bg-red-500 focus:outline-none focus:shadow-outline-red active:bg-red-600 transition duration-150 ease-in-out"
                      >
                        Delete
                      </button>
                    </td>
                    */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddTaskForm({
  onTaskAdded,
}: {
  onTaskAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (response.ok) {
        setTitle('');
        setDescription('');
        onTaskAdded();
      } else {
        console.error('Failed to add task');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  return (
    <div className="flex flex-row justify-center px-10 pb-5">
      <div className="w-full max-w-3xl">
        <h1 className="font-bold text-2xl mb-4 text-center">Add New Task</h1>
        <div className="flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="flex flex-wrap justify-center gap-4">
            <div>
              <input
                type="text"
                placeholder="Task Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-black border border-black rounded-md flex-grow"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Task Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="text-black border border-black rounded-md flex-grow"
              />
            </div>
            <div>
              <button type="submit" className="border border-black rounded-md">
                Add Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
