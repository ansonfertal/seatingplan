import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { ClassroomFormModal } from './ClassroomFormModal';
import { SeatGrid } from './SeatGrid';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Classroom } from '../../models/classroom';
import { Copy, Edit2, LayoutGrid, Plus, Trash2, Users } from 'lucide-react';
import { calculateUsableCapacity } from '../../utils/capacityCalculator';

export const ClassroomList: React.FC = () => {
  const { classrooms, addClassroom, updateClassroom, deleteClassroom } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | undefined>(undefined);
  
  const [gridModalRoom, setGridModalRoom] = useState<Classroom | null>(null);

  const totalCapacity = classrooms.reduce((sum, room) => sum + (room.usableCapacity || 0), 0);

  const handleAddClick = () => {
    setEditingClassroom(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (room: Classroom) => {
    setEditingClassroom(room);
    setIsFormOpen(true);
  };

  const handleSaveRoom = (room: Classroom) => {
    if (editingClassroom) {
      updateClassroom(room.id, room);
    } else {
      addClassroom(room);
    }
  };

  const handleDuplicate = (room: Classroom) => {
    const duplicatedRoom: Classroom = {
      ...room,
      id: crypto.randomUUID(),
      name: `${room.name} (Copy)`,
    };
    addClassroom(duplicatedRoom);
  };

  const handleLoadPresets = () => {
    const presets = ['B301', 'B306', 'B307', 'B407', 'A220', 'A305'].map(name => ({
      id: crypto.randomUUID(),
      name,
      rows: 6,
      columns: 6,
      studentsPerBench: 1,
      disabledSeats: [],
      usableCapacity: calculateUsableCapacity(6, 6, 1, []),
    }));
    
    presets.forEach(p => addClassroom(p));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Classrooms ({classrooms.length})</h2>
          <p className="text-sm text-gray-500 mt-1">Configure physical seating layouts and seat capacities.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 mr-2">
            <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">Total Capacity</span>
            <span className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {totalCapacity}
            </span>
          </div>
          
          <Button onClick={handleAddClick} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Room
          </Button>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <LayoutGrid className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classrooms Configured</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Get started by adding a classroom manually or load the default preset classrooms.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleAddClick}>Add Classroom</Button>
            <Button variant="secondary" onClick={handleLoadPresets}>Load Presets</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:border-indigo-300 transition-colors">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {room.usableCapacity} seats
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Layout</span>
                    {room.rows} rows × {room.columns} cols
                  </div>
                  <div>
                    <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Bench Size</span>
                    {room.studentsPerBench} student(s)
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Obstructions</span>
                    {room.disabledSeats.length > 0 
                      ? <span className="text-orange-600">{room.disabledSeats.length} seats disabled</span> 
                      : 'None'}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1 flex items-center justify-center gap-1.5"
                  onClick={() => setGridModalRoom(room)}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Grid
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="px-2 text-gray-500 hover:text-indigo-600" onClick={() => handleEditClick(room)} title="Edit Settings">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="px-2 text-gray-500 hover:text-indigo-600" onClick={() => handleDuplicate(room)} title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="px-2 text-gray-500 hover:text-red-600" onClick={() => deleteClassroom(room.id)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassroomFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingClassroom}
        onSave={handleSaveRoom}
      />

      {gridModalRoom && (
        <Modal
          isOpen={!!gridModalRoom}
          onClose={() => setGridModalRoom(null)}
          title={`Edit Seat Availability: ${gridModalRoom.name}`}
          maxWidth="4xl"
          footer={
            <Button onClick={() => setGridModalRoom(null)}>Done</Button>
          }
        >
          <div className="mb-4 text-sm text-gray-600">
            Click on individual seats to mark them as unavailable (e.g. obstructions, broken benches). 
            Disabled seats will not be assigned to students.
          </div>
          <SeatGrid 
            classroom={gridModalRoom} 
            onUpdate={(updatedRoom) => {
              updateClassroom(updatedRoom.id, updatedRoom);
              setGridModalRoom(updatedRoom);
            }} 
          />
        </Modal>
      )}
    </div>
  );
};
