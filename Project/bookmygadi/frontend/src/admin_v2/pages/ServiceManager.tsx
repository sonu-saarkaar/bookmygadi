


import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Car, Truck, Bike, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

// --- Types ---
type BookingMode = 'Instant Ride' | 'reserve';

interface VehicleType {
  id: string;
  name: string;
  capacity: number;
}

interface Service {
  id: string;
  name: string;
  icon: string;
  description: string;
  bookingMode: BookingMode;
  attachedVehicles: string[]; // Array of vehicle IDs
}

// --- Mock Data ---
const MOCK_VEHICLES: VehicleType[] = [
  { id: 'v1', name: 'Hatchback', capacity: 4 },
  { id: 'v2', name: 'Sedan', capacity: 4 },
  { id: 'v3', name: 'SUV', capacity: 6 },
  { id: 'v4', name: 'Mini Truck', capacity: 2 },
  { id: 'v5', name: 'Motorcycle', capacity: 1 },
];

const INITIAL_SERVICES: Service[] = [
  {
    id: 's1',
    name: 'City Ride',
    icon: 'Car',
    description: 'Quick and affordable rides within the city.',
    bookingMode: 'Instant Ride',
    attachedVehicles: ['v1', 'v2'],
  },
  {
    id: 's2',
    name: 'Logistics / Delivery',
    icon: 'Truck',
    description: 'Transport goods safely and securely.',
    bookingMode: 'reserve',
    attachedVehicles: ['v4'],
  },
];

// --- Icons Map ---
const ICON_MAP: Record<string, React.ElementType> = {
  Car,
  Truck,
  Bike,
  ShieldCheck,
};

export default function ServiceManager() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [vehicles] = useState<VehicleType[]>(MOCK_VEHICLES);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Service, 'id' | 'attachedVehicles'>>({
    name: '',
    icon: 'Car',
    description: '',
    bookingMode: 'Instant Ride',
  });

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        icon: service.icon,
        description: service.description,
        bookingMode: service.bookingMode,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        icon: 'Car',
        description: '',
        bookingMode: 'Instant Ride',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, ...formData } : s))
      );
    } else {
      const newService: Service = {
        id: `s${Date.now()}`,
        ...formData,
        attachedVehicles: [],
      };
      setServices((prev) => [...prev, newService]);
    }
    handleCloseModal();
  };

  const handleDeleteService = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this service?')) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const toggleVehicleAttachment = (serviceId: string, vehicleId: string) => {
    setServices((prev) =>
      prev.map((service) => {
        if (service.id === serviceId) {
          const isAttached = service.attachedVehicles.includes(vehicleId);
          return {
            ...service,
            attachedVehicles: isAttached
              ? service.attachedVehicles.filter((id) => id !== vehicleId)
              : [...service.attachedVehicles, vehicleId],
          };
        }
        return service;
      })
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedServiceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Service Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage your platform's service offerings and vehicle categories.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      <div className="grid gap-4">
        {services.map((service) => {
          const ServiceIcon = ICON_MAP[service.icon] || Car;
          const isExpanded = expandedServiceId === service.id;

          return (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(service.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <ServiceIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-md text-xs font-medium">
                        {service.bookingMode} booking
                      </span>
                      <span>•</span>
                      <span>{service.description}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(service);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Service"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteService(service.id, e)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>
                  <button className="p-1 text-gray-500">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Vehicle Management Section */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Attached Vehicles</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {vehicles.map((vehicle) => {
                      const isAttached = service.attachedVehicles.includes(vehicle.id);
                      return (
                        <div
                          key={vehicle.id}
                          onClick={() => toggleVehicleAttachment(service.id, vehicle.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            isAttached 
                              ? 'bg-blue-50 border-blue-200 align-middle shadow-sm' 
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div>
                            <p className={`font-medium text-sm ${isAttached ? 'text-blue-900' : 'text-gray-700'}`}>
                              {vehicle.name}
                            </p>
                            <p className={`text-xs ${isAttached ? 'text-blue-600' : 'text-gray-500'}`}>
                              Capacity: {vehicle.capacity}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                            isAttached ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-gray-50'
                          }`}>
                            {isAttached && <ShieldCheck size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
            </div>
            
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  placeholder="e.g. Premium Ride"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                  placeholder="Brief description of the service..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {Object.keys(ICON_MAP).map((iconName) => (
                      <option key={iconName} value={iconName}>{iconName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Mode</label>
                  <select
                    value={formData.bookingMode}
                    onChange={(e) => setFormData({ ...formData, bookingMode: e.target.value as BookingMode })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Instant Ride">Instant Ride (On-demand)</option>
                    <option value="reserve">Reserve (Scheduled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


