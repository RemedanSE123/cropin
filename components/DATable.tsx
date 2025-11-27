'use client';

import { useState, useMemo, useEffect } from 'react';

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
  // Check if user is admin (Admin@123 only, not phone number)
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const woredaRepPhone = localStorage.getItem('woredaRepPhone');
    const isAdminFlag = localStorage.getItem('isAdmin') === 'true';
    
    // Only Admin@123 is considered admin, not phone numbers
    setIsAdmin(woredaRepPhone === 'Admin@123' && isAdminFlag === true);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'total_collected_data' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ contactnumber: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [localUserData, setLocalUserData] = useState<DAUser[]>(daUsers);
  const [originalUserData, setOriginalUserData] = useState<DAUser[]>(daUsers);
  
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
    return Array.from(new Set(localUserData.map(u => u.region).filter(Boolean))).sort();
  }, [localUserData]);

  const uniqueZones = useMemo(() => {
    if (!selectedRegion) return [];
    return Array.from(new Set(
      localUserData
        .filter(u => u.region === selectedRegion)
        .map(u => u.zone)
        .filter(Boolean)
    )).sort();
  }, [localUserData, selectedRegion]);

  const uniqueWoredas = useMemo(() => {
    if (!selectedZone) return [];
    return Array.from(new Set(
      localUserData
        .filter(u => u.region === selectedRegion && u.zone === selectedZone)
        .map(u => u.woreda)
        .filter(Boolean)
    )).sort();
  }, [localUserData, selectedRegion, selectedZone]);

  const uniqueKebeles = useMemo(() => {
    if (!selectedWoreda) return [];
    return Array.from(new Set(
      localUserData
        .filter(u => u.region === selectedRegion && u.zone === selectedZone && u.woreda === selectedWoreda)
        .map(u => u.kebele)
        .filter(Boolean)
    )).sort();
  }, [localUserData, selectedRegion, selectedZone, selectedWoreda]);

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
    let filtered = [...localUserData];

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
  }, [localUserData, selectedRegion, selectedZone, selectedWoreda, selectedKebele, searchTerm, advancedSearch, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Update local data when daUsers prop changes
  useEffect(() => {
    setLocalUserData(daUsers);
    setOriginalUserData(daUsers);
  }, [daUsers]);

  const handleEditStart = (contactnumber: string, field: string, currentValue: any) => {
    if (!isEditable || (field !== 'total_collected_data' && field !== 'status')) {
      return;
    }
    // For total_collected_data, only allow editing if status is Active
    if (field === 'total_collected_data') {
      const user = localUserData.find(u => u.contactnumber === contactnumber);
      if (user?.status !== 'Active') {
        return;
      }
    }
    setEditingCell({ contactnumber, field });
    setEditValue(String(currentValue || ''));
  };

  const handleEditSave = async () => {
    if (editingCell) {
      const value = editingCell.field === 'total_collected_data' 
        ? parseInt(editValue) || 0
        : editValue;
      
      // Optimistic update - update local state immediately
      setLocalUserData(prevUsers => 
        prevUsers.map(user => 
          user.contactnumber === editingCell.contactnumber
            ? { ...user, [editingCell.field]: value }
            : user
        )
      );
      
      // Mark as updating
      setUpdatingUsers(prev => new Set(prev).add(editingCell.contactnumber));
      
      // Clear editing state immediately for better UX
      setEditingCell(null);
      setEditValue('');
      
      // Call the update function
      try {
        await onUpdate(editingCell.contactnumber, editingCell.field as 'total_collected_data' | 'status', value);
      } catch (error) {
        // Revert on error - restore original value
        const originalUser = originalUserData.find(u => u.contactnumber === editingCell.contactnumber);
        if (originalUser) {
          setLocalUserData(prevUsers => 
            prevUsers.map(user => 
              user.contactnumber === editingCell.contactnumber
                ? { ...user, [editingCell.field]: editingCell.field === 'total_collected_data' 
                    ? originalUser.total_collected_data
                    : originalUser.status }
                : user
            )
          );
        }
      } finally {
        // Remove from updating set
        setUpdatingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(editingCell.contactnumber);
          return newSet;
        });
      }
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
    <div className="bg-white rounded-xl shadow-xl p-3 sm:p-6 md:p-8 border-2 border-gray-200">
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-5 border-b-2 border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
          <div className="w-full sm:w-auto">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-1">All Development Agents</h3>
            <p className="text-xs sm:text-sm font-semibold text-gray-600">Manage and monitor Development Agents</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <div className="w-full sm:w-48 md:w-64">
            <input
              type="text"
                placeholder="Quick search..."
              value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold whitespace-nowrap shadow-md hover:shadow-lg"
            >
              {showAdvancedSearch ? 'Hide' : 'Advanced'} Search
            </button>
            {(searchTerm || Object.values(advancedSearch).some(v => v) || selectedRegion || selectedZone || selectedWoreda || selectedKebele) && (
              <button
                onClick={clearFilters}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold whitespace-nowrap shadow-md hover:shadow-lg"
              >
                Clear Filters
              </button>
            )}
        </div>
      </div>

        {/* Cascade Filters - Only for Admin@123 */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Regions</option>
                {uniqueRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => handleZoneChange(e.target.value)}
                disabled={!selectedRegion}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
              >
                <option value="">All Zones</option>
                {uniqueZones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Woreda</label>
              <select
                value={selectedWoreda}
                onChange={(e) => handleWoredaChange(e.target.value)}
                disabled={!selectedZone}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
              >
                <option value="">All Woredas</option>
                {uniqueWoredas.map(woreda => (
                  <option key={woreda} value={woreda}>{woreda}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Kebele</label>
              <select
                value={selectedKebele}
                onChange={(e) => handleKebeleChange(e.target.value)}
                disabled={!selectedWoreda}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
              >
                <option value="">All Kebeles</option>
                {uniqueKebeles.map(kebele => (
                  <option key={kebele} value={kebele}>{kebele}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Advanced Search */}
        {showAdvancedSearch && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border-2 border-gray-200 mb-4">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Advanced Search</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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

      <div className="overflow-x-auto -mx-3 sm:mx-0 shadow-lg rounded-lg border border-gray-200">
        <table className="w-full min-w-[800px] bg-white">
          <thead>
            <tr className="bg-slate-800 border-b-2 border-slate-700">
              <th className="px-4 sm:px-5 md:px-6 py-4 text-center text-xs font-semibold text-slate-100 uppercase tracking-wide border-r border-slate-700 w-16 sm:w-20">
                #
              </th>
              <th className="px-4 sm:px-5 md:px-6 py-4 text-left text-xs font-semibold text-slate-100 uppercase tracking-wide border-r border-slate-700">
                Development Agent Name
              </th>
              <th className="px-4 sm:px-5 md:px-6 py-4 text-left text-xs font-semibold text-slate-100 uppercase tracking-wide border-r border-slate-700">
                Contact Number
              </th>
              <th 
                onClick={() => handleSort('total_collected_data')}
                className="px-4 sm:px-5 md:px-6 py-4 text-left text-xs font-semibold text-slate-100 uppercase tracking-wide cursor-pointer hover:bg-slate-700 transition-colors border-r border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span>Total Data Collected</span>
                  {isEditable && <span className="text-xs text-slate-400 font-normal normal-case">(Editable)</span>}
                  <SortIcon field="total_collected_data" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-4 sm:px-5 md:px-6 py-4 text-left text-xs font-semibold text-slate-100 uppercase tracking-wide cursor-pointer hover:bg-slate-700 transition-colors border-r border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span>Status</span>
                  {isEditable && <span className="text-xs text-slate-400 font-normal normal-case">(Editable)</span>}
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-4 sm:px-5 md:px-6 py-4 text-left text-xs font-semibold text-slate-100 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg font-semibold">No DA users found</p>
                  <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user, index) => (
                <>
                  <tr key={user.contactnumber} className="hover:bg-slate-50 transition-colors duration-150 border-b border-gray-100">
                    <td className="px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {startIndex + index + 1}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white">
                      <div className="text-sm font-medium text-slate-900">{user.name || 'N/A'}</div>
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white">
                      <div className="text-sm text-slate-600 font-mono">{user.contactnumber || 'N/A'}</div>
                    </td>
                    <td
                      className={`px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white ${
                        isEditable && user.status === 'Active' ? 'cursor-pointer hover:bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (isEditable && user.status === 'Active') {
                          handleEditStart(user.contactnumber, 'total_collected_data', user.total_collected_data);
                        }
                      }}
                    >
                      {editingCell?.contactnumber === user.contactnumber && editingCell?.field === 'total_collected_data' ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="w-28 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className={`text-sm font-semibold px-3 py-1.5 rounded-md inline-block border relative ${
                          isEditable && user.status === 'Active'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-600 bg-slate-50 border-slate-200'
                        } ${updatingUsers.has(user.contactnumber) ? 'opacity-60' : ''}`}>
                          {(user.total_collected_data || 0).toLocaleString()}
                          {updatingUsers.has(user.contactnumber) && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white">
                      {isEditable ? (
                          <select
                          value={user.status || 'Pending'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            // Optimistic update
                            setLocalUserData(prevUsers => 
                              prevUsers.map(u => 
                                u.contactnumber === user.contactnumber
                                  ? { ...u, status: newStatus }
                                  : u
                              )
                            );
                            setUpdatingUsers(prev => new Set(prev).add(user.contactnumber));
                            try {
                              await onUpdate(user.contactnumber, 'status', newStatus);
                            } catch (error) {
                              // Revert on error
                              const originalUser = originalUserData.find(u => u.contactnumber === user.contactnumber);
                              if (originalUser) {
                                setLocalUserData(prevUsers => 
                                  prevUsers.map(u => 
                                    u.contactnumber === user.contactnumber
                                      ? { ...u, status: originalUser.status || 'Pending' }
                                      : u
                                  )
                                );
                              }
                            } finally {
                              setUpdatingUsers(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(user.contactnumber);
                                return newSet;
                              });
                            }
                          }}
                          disabled={updatingUsers.has(user.contactnumber)}
                          className={`px-3 py-1.5 text-xs font-medium rounded border focus:outline-none focus:ring-2 transition-colors ${
                            user.status === 'Active'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500'
                              : user.status === 'Inactive'
                              ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 focus:ring-red-500'
                              : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 focus:ring-amber-500'
                          } ${updatingUsers.has(user.contactnumber) ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                        >
                          <option value="Active" className="bg-white text-emerald-700">Active</option>
                          <option value="Inactive" className="bg-white text-red-700">Inactive</option>
                          <option value="Pending" className="bg-white text-amber-700">Pending</option>
                          </select>
                      ) : (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium ${
                          user.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : user.status === 'Inactive' 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {user.status || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 md:px-6 py-4 whitespace-nowrap bg-white">
                      <button
                        onClick={() => toggleExpand(user.contactnumber)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {expandedRow === user.contactnumber ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                        <span>{expandedRow === user.contactnumber ? 'Hide' : 'View'}</span>
                      </button>
                    </td>
                  </tr>
                  {expandedRow === user.contactnumber && (
                    <tr>
                      <td colSpan={6} className="px-4 sm:px-6 md:px-8 py-5 bg-slate-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Region</p>
                            <p className="text-sm font-semibold text-slate-900">{user.region || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Zone</p>
                            <p className="text-sm font-semibold text-slate-900">{user.zone || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Woreda</p>
                            <p className="text-sm font-semibold text-slate-900">{user.woreda || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Kebele</p>
                            <p className="text-sm font-semibold text-slate-900">{user.kebele || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Contact Number</p>
                            <p className="text-sm font-mono font-semibold text-slate-900">{user.contactnumber || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Reporting Manager</p>
                            <p className="text-sm font-semibold text-slate-900">{user.reporting_manager_name || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Manager Mobile</p>
                            <p className="text-sm font-mono font-semibold text-slate-900">{user.reporting_manager_mobile || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-4 rounded-md border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Language</p>
                            <p className="text-sm font-semibold text-slate-900">{user.language || 'N/A'}</p>
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
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t-2 border-gray-200 bg-gray-50 rounded-b-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} DA users
            {filteredUsers.length !== localUserData.length && <span className="hidden sm:inline"> (filtered from {localUserData.length} total)</span>}
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Previous
            </button>
            <span className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
