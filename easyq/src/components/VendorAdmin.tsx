import { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { Lock, RefreshCw, QrCode, Printer, LogOut, Dices, Users, BarChart3, MonitorSmartphone, Search, AlertTriangle, Calendar, Eye, EyeOff } from 'lucide-react';
import type { VendorData } from '../types';

interface VendorAdminProps {
  db: any;
  vendors: Record<string, VendorData>;
}

export default function VendorAdmin({ db, vendors }: VendorAdminProps) {
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [vendorAuthInput, setVendorAuthInput] = useState({ id: '', pass: '' });
  const [isVendorLoggedIn, setIsVendorLoggedIn] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // State Icon Mata untuk Password Kasir & PIN Tutup Toko
  const [showVendorPass, setShowVendorPass] = useState(false);
  const [showClosePin, setShowClosePin] = useState(false);

  const [activeTab, setActiveTab] = useState<'live' | 'report' | 'customers'>('live');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const todayIso = new Date().toISOString().split('T')[0];
  const [reportDateFilter, setReportDateFilter] = useState(todayIso);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [confirmPassInput, setConfirmPassInput] = useState('');

  useEffect(() => {
    const savedVendorId = localStorage.getItem('easyq_vendor_session');
    if (savedVendorId && vendors[savedVendorId]) {
      setActiveVendorId(savedVendorId);
      setIsVendorLoggedIn(true);
    }
  }, [vendors]);

  const handleVendorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vendors[vendorAuthInput.id];
    if (v && String(v.pass).trim() === vendorAuthInput.pass.trim()) {
      setActiveVendorId(v.id);
      setIsVendorLoggedIn(true);
      localStorage.setItem('easyq_vendor_session', v.id);
    } else {
      alert('Vendor ID atau Password Salah!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('easyq_vendor_session');
    setIsVendorLoggedIn(false);
    setActiveVendorId(null);
  };

  const generateRandomPin = () => {
    if (!activeVendorId) return;
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    update(ref(db, `vendors/${activeVendorId}`), { pin: randomPin });
  };

  const handlePanggilBerikutnya = () => {
    if (!activeVendorId) return;
    const current = vendors[activeVendorId]?.currentQueue || 0;
    const total = vendors[activeVendorId]?.totalQueue || 0;
    
    if (current < total) {
      const nextNumber = current + 1;
      update(ref(db, `vendors/${activeVendorId}`), { currentQueue: nextNumber });

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const textToSpeak = `Nomor antrean, ${nextNumber}. Silakan ke konter.`;
        const speech = new SpeechSynthesisUtterance(textToSpeak);
        speech.lang = 'id-ID';
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
      }
    } else {
      alert('Belum ada antrean baru!');
    }
  };

  const initiateCloseStore = () => {
    if (!activeVendorId) return;
    const currentVendor = vendors[activeVendorId];
    const sisa = (currentVendor.totalQueue || 0) - (currentVendor.currentQueue || 0);

    if (sisa > 0) {
      setShowCloseModal(true);
    } else {
      if (confirm('Tutup toko hari ini dan simpan riwayat antrean?')) {
        executeCloseStore();
      }
    }
  };

  const executeCloseStore = () => {
    if (!activeVendorId) return;
    const vendor = vendors[activeVendorId];
    const newRandomPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    const updates: any = {
      currentQueue: 0,
      totalQueue: 0,
      // queueLogs DIHAPUS DARI SINI AGAR ARSIP REPORT TETAP AMAN TIDAK TER-RESET!
      pin: newRandomPin
    };
    
    // Simpan history total yang dilayani hari ini
    if (vendor.currentQueue > 0) {
      const historySebelumnya = vendor.history?.[todayIso] || 0;
      updates[`history/${todayIso}`] = historySebelumnya + vendor.currentQueue;
    }
    
    update(ref(db, `vendors/${activeVendorId}`), updates);
    setShowCloseModal(false);
    setConfirmPassInput(''); // Sesuai nama variabel baru Anda
  };

  // VALIDASI MENGGUNAKAN PASSWORD VENDOR (currentVendor.pass)
  const handleConfirmCloseWithPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVendorId) return;
    const currentVendor = vendors[activeVendorId];

    const dbPass = String(currentVendor.pass || '').trim();
    const inputPass = String(confirmPassInput || '').trim();

    // DEBUGGER DI CONSOLE BROWSER (F12)
    // console.log('--- DEBUGGER PASSWORD TUTUP TOKO ---');
    // console.log('Password dari DB:', JSON.stringify(dbPass));
    // console.log('Password dari Input:', JSON.stringify(inputPass));
    // console.log('Apakah Cocok?:', inputPass === dbPass);

    if (inputPass === dbPass) {
      executeCloseStore();
    } else {
      alert(`Password Toko Salah!`);
    }
  };

  if (!isVendorLoggedIn) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'sans-serif', maxWidth: '350px', margin: '0 auto' }}>
        <h1 style={{ color: '#2563eb', marginBottom: '5px' }}>EasyQ Toko</h1>
        <p style={{ color: '#64748b', marginTop: 0, marginBottom: '30px' }}>Masuk ke Dashboard Kasir</p>
        <form onSubmit={handleVendorLogin}>
          <input type="text" placeholder="Vendor ID (misal: kopi_viral)" value={vendorAuthInput.id} onChange={(e) => setVendorAuthInput({ ...vendorAuthInput, id: e.target.value })} style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          
          {/* Input Password Kasir dengan Ikon Mata */}
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <input 
              type={showVendorPass ? "text" : "password"} 
              placeholder="Password Toko" 
              value={vendorAuthInput.pass} 
              onChange={(e) => setVendorAuthInput({ ...vendorAuthInput, pass: e.target.value })} 
              style={{ width: '100%', padding: '12px', paddingRight: '40px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }} 
            />
            <button 
              type="button" 
              onClick={() => setShowVendorPass(!showVendorPass)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              {showVendorPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Masuk Dashboard</button>
        </form>
      </div>
    );
  }

  const currentVendor = activeVendorId ? vendors[activeVendorId] : null;
  const currentBaseUrl = window.location.origin + window.location.pathname;
  const vendorQrUrl = activeVendorId ? `${currentBaseUrl}?vendor=${activeVendorId}` : '';
  const qrImageApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(vendorQrUrl)}`;

  const queueLogsList = currentVendor?.queueLogs ? Object.values(currentVendor.queueLogs) : [];
  const filteredLogs = queueLogsList.filter(log => log.createdAt.startsWith(reportDateFilter));

  const customerList = currentVendor?.customers ? Object.values(currentVendor.customers) : [];
  const filteredCustomers = customerList.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  const sisaAntrean = (currentVendor?.totalQueue || 0) - (currentVendor?.currentQueue || 0);

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2 style={{ margin: 0 }}>{currentVendor?.name}</h2><small style={{ color: '#64748b' }}>ID: {currentVendor?.id}</small></div>
        <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}><LogOut size={14} /> Keluar</button>
      </div>
      <hr style={{ margin: '15px 0' }} />

      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
        <button onClick={() => setActiveTab('live')} style={{ flex: 1, padding: '10px', backgroundColor: activeTab === 'live' ? '#2563eb' : 'transparent', color: activeTab === 'live' ? 'white' : '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          <MonitorSmartphone size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Live Antrean
        </button>
        <button onClick={() => setActiveTab('report')} style={{ flex: 1, padding: '10px', backgroundColor: activeTab === 'report' ? '#2563eb' : 'transparent', color: activeTab === 'report' ? 'white' : '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          <BarChart3 size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Queue Report
        </button>
        <button onClick={() => setActiveTab('customers')} style={{ flex: 1, padding: '10px', backgroundColor: activeTab === 'customers' ? '#2563eb' : 'transparent', color: activeTab === 'customers' ? 'white' : '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          <Users size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Data Customer
        </button>
      </div>

      {activeTab === 'live' && (
        <div>
          <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Lock size={16} /> PIN Harian: <b style={{ fontSize: '20px', color: '#2563eb' }}>{currentVendor?.pin}</b></span>
              <button onClick={generateRandomPin} style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Dices size={14} /> Acak PIN</button>
            </div>
          </div>

          <button onClick={() => setShowQrModal(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            <QrCode style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Tampilkan & Cetak Poster QR Code
          </button>

          <div style={{ textAlign: 'center', backgroundColor: '#eff6ff', padding: '25px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: 0, color: '#1e40af' }}>Sedang Dilayani:</p>
            <h1 style={{ fontSize: '72px', margin: '10px 0', color: '#1e3a8a' }}>{currentVendor?.currentQueue || 0}</h1>
            <p style={{ color: '#475569' }}>Total Pendaftar Hari Ini: <b>{currentVendor?.totalQueue || 0}</b> | Sisa Menunggu: <b>{sisaAntrean}</b></p>
            <button onClick={handlePanggilBerikutnya} style={{ width: '100%', padding: '18px', fontSize: '20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Panggil Selanjutnya (+1)</button>
          </div>

          <br />
          <button onClick={initiateCloseStore} style={{ width: '100%', padding: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            <RefreshCw size={14} /> Tutup Toko & Reset Antrean
          </button>
        </div>
      )}

      {activeTab === 'report' && (
        <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Queue Report
            </h3>
            <input 
              type="date" 
              value={reportDateFilter} 
              onChange={(e) => setReportDateFilter(e.target.value)} 
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>
            Menampilkan riwayat transaksi antrean untuk tanggal: <b>{reportDateFilter}</b>
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>No</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Waktu Booking</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Nama Pelanggan</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>No WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}><b>#{log.queueNumber}</b></td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#64748b' }}>{formatDateTime(log.createdAt)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{log.name || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{log.phone || '-'}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Tidak ada rekap antrean pada tanggal ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Database Customer Toko ({customerList.length})
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 10px' }}>
            <Search size={16} color="#666" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan Nama atau No WhatsApp..." 
              value={customerSearch} 
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
            />
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto', fontSize: '13px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Nama Pelanggan</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Nomor WhatsApp</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Total Kunjungan</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>Terakhir Berkunjung</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}><b>{c.name}</b></td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{c.phone}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}><span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{c.totalVisits}x</span></td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#64748b' }}>{formatDateTime(c.lastVisited)}</td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Customer tidak ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showQrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', maxWidth: '320px', width: '90%' }}>
            <h2 style={{ margin: '0 0 5px 0' }}>{currentVendor?.name}</h2>
            <p style={{ margin: '0 0 15px 0', color: '#64748b' }}>Scan QR untuk Ambil Antrean</p>
            <img src={qrImageApi} alt="QR Code Antrean" style={{ width: '220px', height: '220px', border: '2px solid #ccc', padding: '5px' }} />
            <h3 style={{ margin: '15px 0 5px 0' }}>PIN HARIAN: <span style={{ color: '#2563eb' }}>{currentVendor?.pin}</span></h3>
            <button onClick={() => window.print()} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', margin: '5px', cursor: 'pointer' }}><Printer size={14} /> Cetak Poster</button>
            <button onClick={() => setShowQrModal(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', margin: '5px', cursor: 'pointer' }}>Tutup</button>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI PIN TUTUP TOKO DENGAN IKON MATA */}
      {showCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', textAlign: 'center', maxWidth: '340px', width: '90%' }}>
            <AlertTriangle size={48} color="#dc2626" style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>Masih Ada {sisaAntrean} Antrean!</h3>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '15px' }}>
              Penutupan toko akan mereset antrean pelanggan yang sedang menunggu. Masukkan <b>Password Toko</b> untuk mengonfirmasi:
            </p>
            <form onSubmit={handleConfirmCloseWithPass}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <input 
                  type={showClosePin ? "text" : "password"} 
                  placeholder="Masukkan Password Toko" 
                  value={confirmPassInput} 
                  onChange={(e) => setConfirmPassInput(e.target.value)} 
                  style={{ width: '100%', padding: '10px', paddingRight: '40px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowClosePin(!showClosePin)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showClosePin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' }}>
                Konfirmasi Tutup Toko
              </button>
              <button type="button" onClick={() => setShowCloseModal(false)} style={{ width: '100%', padding: '8px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Batal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}