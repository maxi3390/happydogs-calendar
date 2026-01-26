'use client';

import { useState } from 'react';
import { Plus, PawPrint, CalendarDays, CalendarRange } from 'lucide-react';
import Calendar from '@/components/Calendar';
import PetForm from '@/components/PetForm';
import PetList from '@/components/PetList';
import ScheduleForm from '@/components/ScheduleForm';
import DaySchedule from '@/components/DaySchedule';
import WeekView from '@/components/WeekView';
import ThemeToggle from '@/components/ThemeToggle';
import { Pet, Schedule } from '@/lib/api';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPetForm, setShowPetForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [refreshPets, setRefreshPets] = useState(0);
  const [refreshSchedules, setRefreshSchedules] = useState(0);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  const handlePetSave = () => {
    setShowPetForm(false);
    setEditingPet(undefined);
    setRefreshPets(prev => prev + 1);
  };

  const handleScheduleSave = () => {
    setShowScheduleForm(false);
    setEditingSchedule(undefined);
    setRefreshSchedules(prev => prev + 1);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setShowPetForm(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-indigo-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl">
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Happy Pet Nursery</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => {
                  setEditingPet(undefined);
                  setShowPetForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Pet
              </button>
              <button
                onClick={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm"
              >
                <CalendarDays className="w-5 h-5" />
                New Schedule
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setCalendarView('month')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    calendarView === 'month'
                      ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Month
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    calendarView === 'week'
                      ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <CalendarRange className="w-4 h-4" />
                  Week
                </button>
              </div>
            </div>

            {calendarView === 'month' ? (
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            ) : (
              <WeekView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            )}

            <DaySchedule
              date={selectedDate}
              onEditSchedule={handleEditSchedule}
              refreshTrigger={refreshSchedules}
            />
          </div>
          <div>
            <PetList
              onEdit={handleEditPet}
              refreshTrigger={refreshPets}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            Happy Pet Nursery - Keeping your pets safe and happy
          </p>
        </div>
      </footer>

      {showPetForm && (
        <PetForm
          pet={editingPet}
          onClose={() => {
            setShowPetForm(false);
            setEditingPet(undefined);
          }}
          onSave={handlePetSave}
        />
      )}

      {showScheduleForm && (
        <ScheduleForm
          schedule={editingSchedule}
          selectedDate={selectedDate}
          onClose={() => {
            setShowScheduleForm(false);
            setEditingSchedule(undefined);
          }}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  );
}
