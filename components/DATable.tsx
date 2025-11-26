'use client';

import { useState, useMemo } from 'react';

interface DAUser {
  name: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  contactnumber: string;
  reporting_manager_name: string;
  reporting_manager_mobile: string;
  language: string;
  total_collected_data: number;
  status: string;
}

interface DATableProps {
  daUsers: DAUser[];
  onUpdate: (contactnumber: string, field: 'total_collected_data' | 'status', value: any) => void;
  isEditable: boolean;
}

export default function DATable({ daUsers, onUpdate, isEditable }: DATableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'total_collected_data' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ contactnumber: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Advanced search filters
  const [advancedSearch, setAdvancedSearch] = useState({
    name: '',
    contactnumber: '',
    reporting_manager_name: '',
    reporting_manager_mobile: '',
    language: '',
    status: '',
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Cascade filters
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [selectedKebele, setSelectedKebele] = useState('');

  // Get unique values for cascade filters
  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(daUsers.map(u => u.region).filter(Boolean))).sort();
  }, [daUsers]);

  const uniqueZones = useMemo(() => {
    if (!selectedRegion) return [];
    return Array.from(new Set(
      daUsers
        .filter(u => u.region === selectedRegion)
        .map(u => u.zone)
        .filter(Boolean)
    )).sort();
  }, [daUsers, selectedRegion]);

  const uniqueWoredas = useMemo(() => {
    if (!selectedZone) return [];
    return Array.from(new Set(
      daUsers
        .filter(u => u.region === selectedRegion && u.zone === selectedZone)
        .map(u => u.woreda)
        .filter(Boolean)
    )).sort();
  }, [daUsers, selectedRegion, selectedZone]);

  const uniqueKebeles = useMemo(() => {
    if (!selectedWoreda) return [];
    return Array.from(new Set(
      daUsers
        .filter(u => u.region === selectedRegion && u.zone === selectedZone && u.woreda === selectedWoreda)
        .map(u => u.kebele)
        .filter(Boolean)
    )).sort();
  }, [daUsers, selectedRegion, selectedZone, selectedWoreda]);

  // Reset cascade filters when parent changes
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedZone('');
    setSelectedWoreda('');
    setSelectedKebele('');
    setCurrentPage(1);
  };

  const handleZoneChange = (zone: string) => {
    setSelectedZone(zone);
    setSelectedWoreda('');
    setSelectedKebele('');
    setCurrentPage(1);
  };

  const handleWoredaChange = (woreda: string) => {
    setSelectedWoreda(woreda);
    setSelectedKebele('');
    setCurrentPage(1);
  };

  const handleKebeleChange = (kebele: string) => {
    setSelectedKebele(kebele);
    setCurrentPage(1);
  };

  const handleSort = (field: 'total_collected_data' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter users based on all criteria
  const filteredUsers = useMemo(() => {
    let filtered = [...daUsers];

    // Cascade filtering
    if (selectedRegion) {
      filtered = filtered.filter(u => u.region === selectedRegion);
    }
    if (selectedZone) {
      filtered = filtered.filter(u => u.zone === selectedZone);
    }
    if (selectedWoreda) {
      filtered = filtered.filter(u => u.woreda === selectedWoreda);
    }
    if (selectedKebele) {
      filtered = filtered.filter(u => u.kebele === selectedKebele);
    }

    // Basic search
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.contactnumber.includes(searchTerm)
      );
    }

    // Advanced search
    if (advancedSearch.name) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(advancedSearch.name.toLowerCase())
      );
    }
    if (advancedSearch.contactnumber) {
      filtered = filtered.filter(u => 
        u.contactnumber.includes(advancedSearch.contactnumber)
      );
    }
    if (advancedSearch.reporting_manager_name) {
      filtered = filtered.filter(u => 
        u.reporting_manager_name?.toLowerCase().includes(advancedSearch.reporting_manager_name.toLowerCase())
      );
    }
    if (advancedSearch.reporting_manager_mobile) {
      filtered = filtered.filter(u => 
        u.reporting_manager_mobile?.includes(advancedSearch.reporting_manager_mobile)
      );
    }
    if (advancedSearch.language) {
      filtered = filtered.filter(u => 
        u.language?.toLowerCase().includes(advancedSearch.language.toLowerCase())
      );
    }
    if (advancedSearch.status) {
      filtered = filtered.filter(u => u.status === advancedSearch.status);
    }

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        if (sortField === 'total_collected_data') {
          const aVal = a.total_collected_data || 0;
          const bVal = b.total_collected_data || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        if (sortField === 'status') {
          const aStr = String(a.status || '').toLowerCase();
          const bStr = String(b.status || '').toLowerCase();
          return sortDirection === 'asc' 
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        }
        
        return 0;
      });
    }

    return filtered;
  }, [daUsers, selectedRegion, selectedZone, selectedWoreda, selectedKebele, searchTerm, advancedSearch, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleEditStart = (contactnumber: string, field: string, currentValue: any) => {
    if (!isEditable || (field !== 'total_collected_data' && field !== 'status')) {
      return;
    }
    setEditingCell({ contactnumber, field });
    setEditValue(String(currentValue || ''));
  };

  const handleEditSave = () => {
    if (editingCell) {
      const value = editingCell.field === 'total_collected_data' 
        ? parseInt(editValue) || 0
        : editValue;
      onUpdate(editingCell.contactnumber, editingCell.field as 'total_collected_data' | 'status', value);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const SortIcon = ({ field }: { field: 'total_collected_data' | 'status' }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-2 text-sm">↕</span>;
    return sortDirection === 'asc' ? <span className="ml-2 text-white text-sm">↑</span> : <span className="ml-2 text-white text-sm">↓</span>;
  };

  const toggleExpand = (contactnumber: string) => {
    setExpandedRow(expandedRow === contactnumber ? null : contactnumber);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAdvancedSearch({
      name: '',
      contactnumber: '',
      reporting_manager_name: '',
      reporting_manager_mobile: '',
      language: '',
      status: '',
    });
    setSelectedRegion('');
    setSelectedZone('');
    setSelectedWoreda('');
    setSelectedKebele('');
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-gray-200">
      <div className="mb-6 pb-5 border-b-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">All Development Agents</h3>
            <p className="text-sm font-semibold text-gray-600">Manage and monitor Development Agents</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-64">
              <input
                type="text"
                placeholder="Quick search by name or contact..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              {showAdvancedSearch ? 'Hide' : 'Advanced'} Search
            </button>
            {(searchTerm || Object.values(advancedSearch).some(v => v) || selectedRegion || selectedZone || selectedWoreda || selectedKebele) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Cascade Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => handleZoneChange(e.target.value)}
              disabled={!selectedRegion}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Zones</option>
              {uniqueZones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Woreda</label>
            <select
              value={selectedWoreda}
              onChange={(e) => handleWoredaChange(e.target.value)}
              disabled={!selectedZone}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Woredas</option>
              {uniqueWoredas.map(woreda => (
                <option key={woreda} value={woreda}>{woreda}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Kebele</label>
            <select
              value={selectedKebele}
              onChange={(e) => handleKebeleChange(e.target.value)}
              disabled={!selectedWoreda}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Kebeles</option>
              {uniqueKebeles.map(kebele => (
                <option key={kebele} value={kebele}>{kebele}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Search */}
        {showAdvancedSearch && (
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 mb-4">
            <h4 className="text-lg font-bold text-gray-900 mb-3">Advanced Search</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={advancedSearch.name}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, name: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  placeholder="Search by contact..."
                  value={advancedSearch.contactnumber}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, contactnumber: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reporting Manager</label>
                <input
                  type="text"
                  placeholder="Search by manager name..."
                  value={advancedSearch.reporting_manager_name}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, reporting_manager_name: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Manager Mobile</label>
                <input
                  type="text"
                  placeholder="Search by manager mobile..."
                  value={advancedSearch.reporting_manager_mobile}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, reporting_manager_mobile: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Language</label>
                <input
                  type="text"
                  placeholder="Search by language..."
                  value={advancedSearch.language}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, language: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={advancedSearch.status}
                  onChange={(e) => {
                    setAdvancedSearch({ ...advancedSearch, status: e.target.value });
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
              <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-widest border-r border-gray-600">DA Name</th>
              <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-widest border-r border-gray-600">Phone Number</th>
              <th 
                onClick={() => handleSort('total_collected_data')}
                className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-widest cursor-pointer hover:bg-gray-600 transition border-r border-gray-600"
              >
                <div className="flex items-center">
                  Total Data {isEditable && <span className="text-green-300 ml-2 text-[10px]">(Editable)</span>}
                  <SortIcon field="total_collected_data" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-widest cursor-pointer hover:bg-gray-600 transition border-r border-gray-600"
              >
                <div className="flex items-center">
                  Status {isEditable && <span className="text-green-300 ml-2 text-[10px]">(Editable)</span>}
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-6 py-5 text-left text-xs font-black text-white uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg font-semibold">No DA users found</p>
                  <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <>
                  <tr key={user.contactnumber} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 group border-b border-gray-200">
                    <td className="px-6 py-5 whitespace-nowrap bg-white">
                      <div className="text-base font-bold text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap bg-white">
                      <div className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-lg inline-block border border-gray-200">
                        {user.contactnumber || 'N/A'}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-5 whitespace-nowrap bg-white ${
                        isEditable ? 'cursor-pointer hover:bg-blue-50' : ''
                      }`}
                      onClick={() => handleEditStart(user.contactnumber, 'total_collected_data', user.total_collected_data)}
                    >
                      {editingCell?.contactnumber === user.contactnumber && editingCell?.field === 'total_collected_data' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="w-32 px-3 py-2 border-2 border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-900"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="text-lg font-black text-emerald-700 bg-gradient-to-br from-emerald-50 to-green-50 px-4 py-2 rounded-xl inline-block border-2 border-emerald-300 shadow-sm">
                          {user.total_collected_data || 0}
                        </div>
                      )}
                    </td>
                    <td
                      className={`px-6 py-5 whitespace-nowrap bg-white ${
                        isEditable ? 'cursor-pointer hover:bg-blue-50' : ''
                      }`}
                      onClick={() => handleEditStart(user.contactnumber, 'status', user.status)}
                    >
                      {editingCell?.contactnumber === user.contactnumber && editingCell?.field === 'status' ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="px-4 py-2 border-2 border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-900"
                            autoFocus
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                      ) : (
                        <span className={`inline-flex px-5 py-2.5 text-xs font-black rounded-xl shadow-lg ${
                          user.status === 'Active' ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white border-2 border-green-500' :
                          user.status === 'Inactive' ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-2 border-red-500' :
                          'bg-gradient-to-r from-yellow-600 to-amber-700 text-white border-2 border-yellow-500'
                        }`}>
                          {user.status || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap bg-white">
                      <button
                        onClick={() => toggleExpand(user.contactnumber)}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-sm transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {expandedRow === user.contactnumber ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                        <span>{expandedRow === user.contactnumber ? 'Hide' : 'Details'}</span>
                      </button>
                    </td>
                  </tr>
                  {expandedRow === user.contactnumber && (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 bg-gradient-to-br from-gray-50 to-white border-b-2 border-gray-300">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Region</p>
                            <p className="text-sm font-semibold text-gray-900">{user.region || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Zone</p>
                            <p className="text-sm font-semibold text-gray-900">{user.zone || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Woreda</p>
                            <p className="text-sm font-semibold text-gray-900">{user.woreda || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kebele</p>
                            <p className="text-sm font-semibold text-gray-900">{user.kebele || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Number</p>
                            <p className="text-sm font-semibold text-gray-900">{user.contactnumber || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reporting Manager</p>
                            <p className="text-sm font-semibold text-gray-900">{user.reporting_manager_name || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Manager Mobile</p>
                            <p className="text-sm font-semibold text-gray-900">{user.reporting_manager_mobile || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Language</p>
                            <p className="text-sm font-semibold text-gray-900">{user.language || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} DA users
            {filteredUsers.length !== daUsers.length && ` (filtered from ${daUsers.length} total)`}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
