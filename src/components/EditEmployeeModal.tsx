import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserCheck, 
  Building2, 
  DollarSign, 
  Banknote, 
  Landmark, 
  Smartphone, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  Cake, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Upload,
  Camera,
  Trash2
} from 'lucide-react';
import { EmployeeProfile, CompanySettings, SalaryStructureType, PaymentMethod } from '../types/payroll';

interface EditEmployeeModalProps {
  isOpen: boolean;
  employee: EmployeeProfile | null;
  settings: CompanySettings;
  onClose: () => void;
  onSave: (updatedEmployee: EmployeeProfile) => void;
}

const DEPARTMENTS = [
  'XML',
  'ePub',
  'PPT',
  'Word',
];

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  employee,
  settings,
  onClose,
  onSave,
}) => {
  const sym = settings.currencySymbol || '$';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string>('');

  const [formData, setFormData] = useState<EmployeeProfile>(() => employee || {
    id: '',
    empId: '',
    name: '',
    email: '',
    department: 'XML',
    designation: '',
    structureType: 'fixed',
    baseSalary: 0,
    hourlyRate: 0,
    preferredPaymentMethod: 'bank_transfer',
    bankName: '',
    accountNumber: '',
    routingOrIfsc: '',
    panOrTaxNumber: '',
    joinDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        ...employee,
        department: DEPARTMENTS.includes(employee.department) ? employee.department : 'XML',
        mobileNumber: employee.mobileNumber || '',
        dob: employee.dob || '',
      });
      setErrors({});
      setPhotoError('');
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError('');
    if (!file) return;

    // Validate format (JPG, JPEG, PNG)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setPhotoError('Invalid image format. Please select a JPG or PNG file.');
      return;
    }

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Image size exceeds 3MB. Please upload a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatarUrl: undefined }));
    setPhotoError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = 'Full name is required';
    if (!formData.empId?.trim()) errs.empId = 'Employee ID is required';
    if (!formData.designation?.trim()) errs.designation = 'Designation is required';
    if (formData.baseSalary === undefined || formData.baseSalary < 0) {
      errs.baseSalary = 'Valid base salary is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updatedProfile: EmployeeProfile = {
      ...formData,
      name: formData.name.trim(),
      empId: formData.empId.trim(),
      email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@${(settings.name || 'company').toLowerCase().replace(/\s+/g, '')}.com`,
      mobileNumber: formData.mobileNumber?.trim() || '',
      dob: formData.dob?.trim() || '',
      department: DEPARTMENTS.includes(formData.department) ? formData.department : 'XML',
      designation: formData.designation.trim(),
      baseSalary: Number(formData.baseSalary) || 0,
      hourlyRate: Number(formData.hourlyRate) || 0,
      bankName: formData.bankName || (formData.preferredPaymentMethod === 'cash' ? 'Cash Handover / Treasury' : 'Corporate Bank'),
      accountNumber: formData.accountNumber || (formData.preferredPaymentMethod === 'cash' ? 'CASH-DISBURSAL' : 'ACC-1002'),
      routingOrIfsc: formData.routingOrIfsc || (formData.preferredPaymentMethod === 'cash' ? 'CASH' : 'CORP001'),
      panOrTaxNumber: formData.panOrTaxNumber || 'TX-00000',
      pfAccountNumber: formData.pfAccountNumber?.trim() || '',
    };

    onSave(updatedProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt={formData.name} className="w-full h-full object-cover" />
              ) : (
                formData.name.charAt(0) || employee.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Edit Employee Profile
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {formData.empId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Update personal info, profile photo, contact numbers, department, salary structure & banking details
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* Section 0: Profile Picture Upload */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-300 shadow-2xs flex items-center justify-center font-bold text-lg text-slate-700 overflow-hidden">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 font-bold">{formData.name ? formData.name.charAt(0).toUpperCase() : <Camera className="w-6 h-6 text-slate-400" />}</span>
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-center sm:justify-start space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Profile Picture</span>
                <span className="text-[10px] font-semibold text-slate-500">(JPG, PNG)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Upload official employee headshot in JPG or PNG format (maximum 3MB).
              </p>
              {photoError && (
                <p className="text-[11px] text-rose-500 font-medium">{photoError}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{formData.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {formData.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                  title="Remove Profile Picture"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Personal & Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Personal & Contact Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jessica Taylor"
                  className={`w-full font-medium bg-slate-50 border rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 ${
                    errors.name ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {errors.name && <p className="text-[10px] text-rose-500 mt-0.5">{errors.name}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mobile Number</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="e.g. +91 98401 23456"
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jessica.taylor@imatrix.tech"
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Cake className="w-3.5 h-3.5 text-rose-500" />
                  <span>Date of Birth (DOB)</span>
                </label>
                <input
                  type="date"
                  value={formData.dob || ''}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-md p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Organization & Department */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Organization & Role</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.empId}
                  onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                  placeholder="e.g. EMP-1001"
                  className={`w-full font-mono font-bold bg-slate-50 border rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 ${
                    errors.empId ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {errors.empId && <p className="text-[10px] text-rose-500 mt-0.5">{errors.empId}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full font-bold bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-900"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Designation / Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Principal XML Specialist"
                  className={`w-full font-medium bg-slate-50 border rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 ${
                    errors.designation ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {errors.designation && <p className="text-[10px] text-rose-500 mt-0.5">{errors.designation}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Date of Joining</span>
                </label>
                <input
                  type="date"
                  value={formData.joinDate || ''}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-probation"
                  checked={!!formData.isProbation}
                  onChange={(e) => setFormData({ ...formData, isProbation: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit-is-probation" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Currently on Probation Period (Displays probation indicator on payroll logs)
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Salary & Compensation */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-1.5 text-slate-900 font-bold border-b border-slate-100 pb-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Salary Structure & Base Compensation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Structure Type</label>
                <select
                  value={formData.structureType}
                  onChange={(e) => setFormData({ ...formData, structureType: e.target.value as SalaryStructureType })}
                  className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="fixed">Fixed Monthly Salary</option>
                  <option value="hourly">Hourly Contract</option>
                  <option value="contract">Fixed Retainer / Contractor</option>
                  <option value="piece_rate">Piece-Rate Output</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Monthly Base Salary ({sym}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.baseSalary === 0 ? '' : formData.baseSalary}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setFormData({ ...formData, baseSalary: isNaN(val) ? 0 : val });
                  }}
                  placeholder="e.g. 15000"
                  className={`w-full font-bold text-slate-900 bg-slate-50 border rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 ${
                    errors.baseSalary ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
                {errors.baseSalary && <p className="text-[10px] text-rose-500 mt-0.5">{errors.baseSalary}</p>}
              </div>

              {formData.structureType === 'hourly' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hourly Rate ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.hourlyRate || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, hourlyRate: isNaN(val) ? 0 : val });
                    }}
                    placeholder="e.g. 35"
                    className="w-full font-medium bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>



          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Employee Profile</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
