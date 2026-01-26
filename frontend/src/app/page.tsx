'use client';

import { useState } from 'react';
import { Plus, PawPrint, CalendarDays } from 'lucide-react';
import Calendar from '@/components/Calendar';
import PetForm from '@/components/PetForm';
import PetList from '@/components/PetList';
import ScheduleForm from '@/components/ScheduleForm';
import DaySchedule from '@/components/DaySchedule';
import { Pet, Schedule } from '@/lib/api';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPetForm, setShowPetForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | undefined>();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [refreshPets, setRefreshPets] = useState(0);
  const [refreshSchedules, setRefreshSchedules] = useState(0);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Happy Pet Nursery</h1>
                <p className="text-sm text-gray-500">Schedule Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingPet(undefined);
                  setShowPetForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Pet
              </button>
              <button
                onClick={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
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
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
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

      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
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
