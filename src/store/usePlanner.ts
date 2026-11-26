import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import type { Note, PlannerEvent, Task } from "@/types";

type NewEvent = Omit<PlannerEvent, "id" | "createdAt">;
type NewTask = Pick<Task, "title"> & Partial<Pick<Task, "priority" | "type" | "dueDate">>;
type NewNote = Pick<Note, "text"> & Partial<Pick<Note, "type" | "pinned" | "title" | "color">>;

type PlannerState = {
  events: PlannerEvent[];
  tasks: Task[];
  notes: Note[];

  addEvent: (e: NewEvent) => string;
  updateEvent: (id: string, patch: Partial<NewEvent>) => void;
  removeEvent: (id: string) => void;

  addTask: (t: NewTask) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  clearDoneTasks: () => void;

  addNote: (n: NewNote) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  togglePin: (id: string) => void;
  removeNote: (id: string) => void;

  resetAll: () => void;
};

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
      events: [],
      tasks: [],
      notes: [],

      addEvent: (e) => {
        const id = uid();
        set((s) => ({ events: [...s.events, { ...e, id, createdAt: Date.now() }] }));
        return id;
      },
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addTask: (t) => {
        const id = uid();
        const task: Task = {
          id,
          title: t.title,
          priority: t.priority ?? "normal",
          type: t.type,
          dueDate: t.dueDate,
          done: false,
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() }
              : t,
          ),
        })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      clearDoneTasks: () => set((s) => ({ tasks: s.tasks.filter((t) => !t.done) })),

      addNote: (n) => {
        const id = uid();
        const now = Date.now();
        const note: Note = {
          id,
          title: n.title,
          color: n.color,
          text: n.text,
          type: n.type,
          pinned: n.pinned ?? false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ notes: [note, ...s.notes] }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        })),
      togglePin: (id) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      resetAll: () => set({ events: [], tasks: [], notes: [] }),
    }),
    {
      name: STORAGE_KEYS.planner,
      storage: secureStorage,
      partialize: (s) => ({ events: s.events, tasks: s.tasks, notes: s.notes }),
    },
  ),
);
