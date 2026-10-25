import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Building2, 
  Sliders, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  Check, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  PenTool,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  MessageCircle,
  Activity,
  Send,
  Key,
  ExternalLink
} from 'lucide-react';
import { CompanySettings } from '../types/payroll';

interface CompanySettingsModalProps {
  isOpen: boolean;
  settings: CompanySettings;
  activeMonth?: string;
  periodLabel?: string;
  initialTab?: 'profile' | 'signature' | 'rules' | 'whatsapp';
  onClose: () => void;
  onSaveSettings: (newSettings: CompanySettings) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  settings,
  activeMonth,
  periodLabel,
  initialTab = 'profile',
  onClose,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ 
    ...settings,
    appTitle: settings.appTitle || 'PayMaster Pro',
    brandSubTitle: settings.brandSubTitle || 'Enterprise Payroll & HRMS',
    showDigitalSignature: settings.showDigitalSignature !== undefined ? settings.showDigitalSignature : true,
    signatureTimestamp: settings.signatureTimestamp !== undefined ? settings.signatureTimestamp : true,
    whatsappProvider: settings.whatsappProvider || 'meta',
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
    whatsappAccessToken: settings.whatsappAccessToken || '',
  });
  
  const [activeTab, setActiveTab] = useState<'profile' | 'signature' | 'rules' | 'whatsapp'>(initialTab);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        appTitle: settings.appTitle || 'PayMaster Pro',
        brandSubTitle: settings.brandSubTitle || 'Enterprise Payroll & HRMS',
        showDigitalSignature: settings.showDigitalSignature !== undefined ? settings.showDigitalSignature : true,
        signatureTimestamp: settings.signatureTimestamp !== undefined ? settings.signatureTimestamp : true,
        whatsappProvider: settings.whatsappProvider || 'meta',
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId || '',
        whatsappAccessToken: settings.whatsappAccessToken || '',
      });
      setActiveTab(initialTab);
      setSavedSuccess(false);
      setHasDrawn(false);
      setTestResult(null);
    }
  }, [isOpen, settings, initialTab]);

  const handleTestMetaConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: formData.whatsappPhoneNumberId,
          accessToken: formData.whatsappAccessToken,
        }),
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: rawText || `Server responded with status ${res.status}` };
      }

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected to Meta Cloud API! Verified Sender: ${data.phoneData?.verifiedName || data.phoneData?.displayPhoneNumber || 'Active'}`,
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Meta Authentication failed.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to communicate with Meta endpoint.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Initialize Canvas when signature tab opens
  useEffect(() => {
    if (activeTab === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a'; // navy ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Please choose a logo image under 2MB.');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, logoUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Please choose a signature image under 2MB.');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ 
            ...prev, 
            signatureUrl: event.target!.result as string,
            signatureType: 'upload' 
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setFormData(prev => ({ 
        ...prev, 
        signatureUrl: dataUrl,
        signatureType: 'draw'
      }));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      setFormData(prev => ({ ...prev, signatureUrl: '', signatureType: 'preset' }));
    }
  };

  const generatePresetSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = 'italic 32px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText(formData.companySignatoryName || 'Authorized Signatory', 15, 50);
      const dataUrl = canvas.toDataURL('image/png');
      setFormData(prev => ({
        ...prev,
        signatureUrl: dataUrl,
        signatureType: 'preset'
      }));
    }
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const presetLogos = [
    { name: 'iMatrix Official', url: '/imatrix-logo.svg' },
    { name: 'Modern Tech', url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=160&auto=format&fit=crop&q=80' },
    { name: 'Corporate Crest', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=160&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Custom Branding & Company Settings</h2>
              <p className="text-xs text-slate-500">Configure corporate identity, digital signatures, software branding & payroll rules</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 border-b border-slate-200 flex space-x-4 sm:space-x-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Company Profile & Branding
          </button>

          <button
            onClick={() => setActiveTab('signature')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'signature'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Digital Signature & Stamp</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Payroll & Statutory Rules
          </button>

          <button
            id="tab-btn-whatsapp-gateway"
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Gateway (Meta & Web)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
          
          {activeTab === 'profile' && (
            <div className="space-y-4">
              
              {/* App / Software White-Label Name */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-950">White-Label Software Identity</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                    Branded for Delivery
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Software Title (Header)</label>
                    <input
                      type="text"
                      value={formData.appTitle || ''}
                      onChange={(e) => setFormData({ ...formData, appTitle: e.target.value })}
                      placeholder="e.g. Apex HR & Payroll"
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Brand Tagline / Edition</label>
                    <input
                      type="text"
                      value={formData.brandSubTitle || ''}
                      onChange={(e) => setFormData({ ...formData, brandSubTitle: e.target.value })}
                      placeholder="e.g. Enterprise HRMS Edition"
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Customizer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Company Logo & Brand Icon</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Reflects in App Header, Payslips & PDFs</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    {formData.logoUrl ? (
                      <img 
                        src={formData.logoUrl} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain rounded-lg" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo (PNG/JPG)</span>
                      </button>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="px-2.5 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                      <span>Or select preset:</span>
                      {presetLogos.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: preset.url })}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium transition cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Company Legal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Registered Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tax ID / EIN / GST / PAN</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Payroll Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      const sym = cur === 'USD' ? '$' : cur === 'INR' ? '₹' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur === 'SGD' ? 'S$' : '$';
                      setFormData({ ...formData, currency: cur, currencySymbol: sym });
                    }}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">HR Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signature' && (
            <div className="space-y-4">
              
              {/* Signatory Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Authorized Signatory Name</label>
                  <input
                    type="text"
                    value={formData.companySignatoryName}
                    onChange={(e) => setFormData({ ...formData, companySignatoryName: e.target.value })}
                    placeholder="e.g. Authorized Signatory / HR Director"
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Signatory Title / Designation</label>
                  <input
                    type="text"
                    value={formData.companySignatoryTitle}
                    onChange={(e) => setFormData({ ...formData, companySignatoryTitle: e.target.value })}
                    placeholder="e.g. Head of Operations & Finance"
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Digital Signature Pad / Upload Section */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Sign Here or Upload Signature</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Renders onto PDF & Printable PaySlips</span>
                </div>

                {/* Interactive Signature Canvas */}
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-300 rounded bg-slate-50/70 relative flex flex-col items-center justify-center p-2">
                    <canvas
                      ref={canvasRef}
                      width={460}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="cursor-crosshair touch-none bg-white rounded border border-slate-200 shadow-2xs max-w-full"
                    />
                    {!hasDrawn && !formData.signatureUrl && (
                      <div className="absolute pointer-events-none text-xs text-slate-400 flex items-center space-x-1.5">
                        <PenTool className="w-3.5 h-3.5 text-slate-300" />
                        <span>Draw signature with mouse or touch above</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Signature */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center space-x-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear Pad</span>
                      </button>

                      <button
                        type="button"
                        onClick={generatePresetSignature}
                        className="px-2.5 py-1.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 text-xs font-medium flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>Generate Cursive Sign</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={sigFileInputRef}
                        accept="image/png,image/jpeg"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Signature File</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Signature Preview */}
                {formData.signatureUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active Signature Configured</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Will be stamped on all generated PDF payslips.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-1 max-w-[140px] h-10 flex items-center justify-center">
                      <img
                        src={formData.signatureUrl}
                        alt="Current Signature"
                        className="max-h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Signature Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showDigitalSignature !== false}
                      onChange={(e) => setFormData({ ...formData, showDigitalSignature: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      Print Digital Signature & Signatory Block on Payslips
                    </span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.signatureTimestamp !== false}
                      onChange={(e) => setFormData({ ...formData, signatureTimestamp: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-slate-800">
                      Include Digital Compliance & Verification Seal on PDF
                    </span>
                  </label>
                </div>

              </div>

            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Pay Cycle Standard Days
                    </label>
                    {activeMonth && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {periodLabel || activeMonth}: {(() => {
                          const [y, m] = activeMonth.split('-').map(Number);
                          return y && m ? new Date(y, m, 0).getDate() : 30;
                        })()} Days
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="20"
                      max="31"
                      value={formData.payCycleDayCount}
                      onChange={(e) => setFormData({ ...formData, payCycleDayCount: parseInt(e.target.value) || 30 })}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {activeMonth && (
                      <button
                        type="button"
                        onClick={() => {
                          const [y, m] = activeMonth.split('-').map(Number);
                          const days = y && m ? new Date(y, m, 0).getDate() : 30;
                          setFormData({ ...formData, payCycleDayCount: days });
                        }}
                        className="shrink-0 px-2.5 py-2 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center space-x-1 shadow-xs"
                        title="Auto-set to actual calendar days of the selected month"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-Set</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>Standard options:</span>
                    <div className="space-x-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, payCycleDayCount: 30 })}
                        className={`px-1.5 py-0.5 rounded border ${formData.payCycleDayCount === 30 ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        30 Days (Fixed)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, payCycleDayCount: 26 })}
                        className={`px-1.5 py-0.5 rounded border ${formData.payCycleDayCount === 26 ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        26 Working Days
                      </button>
                      {activeMonth && (() => {
                        const [y, m] = activeMonth.split('-').map(Number);
                        const actualDays = y && m ? new Date(y, m, 0).getDate() : 30;
                        if (actualDays !== 30 && actualDays !== 26) {
                          return (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, payCycleDayCount: actualDays })}
                              className={`px-1.5 py-0.5 rounded border ${formData.payCycleDayCount === actualDays ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                              {actualDays} Days (Current)
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Provident Fund (PF) Settings */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enablePF === true}
                        onChange={(e) => setFormData({ ...formData, enablePF: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Enable Provident Fund (PF) Deduction</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${formData.enablePF ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                      {formData.enablePF ? 'Active' : 'Disabled (₹0)'}
                    </span>
                  </div>

                  {formData.enablePF && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          PF Percentage (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="20"
                          value={formData.pfPercentage}
                          onChange={(e) => setFormData({ ...formData, pfPercentage: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Monthly Cap Limit ({formData.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={formData.pfCapLimit}
                          onChange={(e) => setFormData({ ...formData, pfCapLimit: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">
                    When disabled or set to 0%, PF deduction is ₹0 on all payslips. You can customize anytime.
                  </p>
                </div>

                {/* Professional Tax (PT) Settings */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enablePT === true}
                        onChange={(e) => setFormData({ ...formData, enablePT: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>Enable Professional Tax (PT) Deduction</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${formData.enablePT ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                      {formData.enablePT ? 'Active' : 'Disabled (₹0)'}
                    </span>
                  </div>

                  {formData.enablePT && (
                    <div className="pt-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Professional Tax Flat Slab ({formData.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formData.ptSlabAmount}
                        onChange={(e) => setFormData({ ...formData, ptSlabAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-medium bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">
                    When disabled or set to 0, PT deduction is ₹0 on all payslips. You can customize anytime.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: WHATSAPP GATEWAY (META CLOUD API & WEB ASSIST) */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Header Info */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md space-y-1.5">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs">WhatsApp Direct PDF Payslip Gateway</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send official <strong>.pdf document attachments</strong> straight into employees' WhatsApp chats in 1 click using Meta WhatsApp Cloud API or Web Assist.
                </p>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                  Select Active WhatsApp Dispatch Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsappProvider: 'meta' })}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      formData.whatsappProvider === 'meta'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <span>Meta WhatsApp Cloud API</span>
                      <span className="text-[9.5px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Recommended</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Official Meta Graph API • Background PDF delivery</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsappProvider: 'web_assist' })}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      formData.whatsappProvider === 'web_assist'
                        ? 'border-slate-700 bg-slate-100 text-slate-900 ring-1 ring-slate-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Web Assist (Direct)</div>
                    <div className="text-[11px] text-slate-500 mt-1">Direct browser WhatsApp Web • Zero setup required</div>
                  </button>
                </div>
              </div>

              {/* META CLOUD API CONFIGURATION */}
              {formData.whatsappProvider === 'meta' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-bold text-xs text-slate-800">Meta WhatsApp Cloud API Credentials</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">Graph v21.0</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      WhatsApp Phone Number ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 104829104820194"
                      value={formData.whatsappPhoneNumberId || ''}
                      onChange={(e) => setFormData({ ...formData, whatsappPhoneNumberId: e.target.value.trim() })}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Found in your Meta Developer App &gt; WhatsApp &gt; API Setup (&quot;Phone number ID&quot;)</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      WhatsApp Access Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. EAAG..."
                      value={formData.whatsappAccessToken || ''}
                      onChange={(e) => setFormData({ ...formData, whatsappAccessToken: e.target.value.trim() })}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Use your Permanent System User Token (starts with <code>EAAG...</code>). For quick testing, you can use the 24-hour Temporary Access Token.
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleTestMetaConnection}
                      disabled={testingConnection || !formData.whatsappPhoneNumberId || !formData.whatsappAccessToken}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      {testingConnection ? (
                        <span>Validating Meta API...</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Test Meta API Connection</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult && (
                    <div className={`p-2.5 rounded border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                      {testResult.success ? (
                        <div className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{testResult.message}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-bold">Connection Error:</span>
                          <p className="text-[11px] font-mono">{testResult.error}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-[11px] text-slate-700 space-y-1">
                    <div className="flex items-center space-x-1 font-bold text-emerald-900">
                      <Key className="w-3.5 h-3.5" />
                      <span>Meta Sandbox Allowed Phone Numbers</span>
                    </div>
                    <p>
                      In Meta test mode, you must add recipient phone numbers (e.g. <code>+91 91508 58901</code>) under <strong>API Setup &gt; Step 1: Select phone numbers &gt; Manage phone number list</strong>, or switch to <strong>Web Assist (Direct)</strong> to dispatch to any number instantly!
                    </p>
                  </div>
                </div>
              )}

              {/* WEB ASSIST EXPLANATION */}
              {formData.whatsappProvider === 'web_assist' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>Web Assist (Direct Dispatch) Features</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li><strong>Automatic PDF Payslip Download:</strong> Generates and downloads the official encrypted PDF directly.</li>
                    <li><strong>Pre-filled WhatsApp Advice:</strong> Automatically formats the earnings, deductions, and net pay message.</li>
                    <li><strong>Zero API Configuration:</strong> Works immediately with WhatsApp Web or WhatsApp Desktop without requiring tokens or sandbox joining.</li>
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={savedSuccess}
            className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:bg-emerald-600"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Branding & Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Branding & Rules</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
