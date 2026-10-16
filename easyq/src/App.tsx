import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, push } from 'firebase/database';
import { Bell, RefreshCw, Eye, EyeOff } from 'lucide-react';
import type { VendorData } from './types';
import SuperAdmin from './components/SuperAdmin';
import VendorAdmin from './components/VendorAdmin';

const firebaseConfig = {
  apiKey: "AIzaSyC80W5z5YHn6LeaNRjKeoV4VkVEz9XqV0w",
  authDomain: "easyq-de160.firebaseapp.com",
  projectId: "easyq-de160",
  storageBucket: "easyq-de160.firebasestorage.app",
  messagingSenderId: "207426475052",
  appId: "1:207426475052:web:f19d3ed84832e3db0e6d89",
  databaseURL: "https://easyq-de160-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);

export default function App() {
  const [mode, setMode] = useState<'vendor_admin' | 'super_admin' | 'pelanggan'>('vendor_admin');
  const [vendors, setVendors] = useState<Record<string, VendorData>>({});
  const [vendorUrlParam, setVendorUrlParam] = useState<string | null>(null);
  
  const [superPass, setSuperPass] = useState(''); 
  
  const [inputPinUser, setInputPinUser] = useState('');
  const [showUserPin, setShowUserPin] = useState(false); // State ikon mata pelanggan
  const [nomorSaya, setNomorSaya] = useState<number | null>(null);

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [currentLogKey, setCurrentLogKey] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vParam = params.get('vendor');
    const isSuperParam = params.get('mode') === 'superadmin';

    if (vParam) {
      setVendorUrlParam(vParam);
      setMode('pelanggan');
      
      const savedNumber = localStorage.getItem(`easyq_num_${vParam}`);
      if (savedNumber) setNomorSaya(parseInt(savedNumber, 10));

      const savedName = localStorage.getItem(`easyq_name_${vParam}`);
      if (savedName) {
        setUserName(savedName);
        setIsDataSaved(true);
      }

      const savedLogKey = localStorage.getItem(`easyq_logkey_${vParam}`);
      if (savedLogKey) setCurrentLogKey(savedLogKey);
    } else if (isSuperParam) {
      setMode('super_admin');
    }

    const vendorsRef = ref(db, 'vendors');
    const unsubVendors = onValue(vendorsRef, (snapshot) => {
      if (snapshot.val()) setVendors(snapshot.val());
    });

    const settingsRef = ref(db, 'settings/super_pass');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.val()) setSuperPass(snapshot.val());
    });

    return () => { unsubVendors(); unsubSettings(); };
  }, []);

  const activePelangganVendor = vendorUrlParam ? vendors[vendorUrlParam] : null;
  const currentQueue = activePelangganVendor?.currentQueue || 0;
  const sisaAntrean = nomorSaya !== null ? nomorSaya - currentQueue : 0;
  const prevQueueRef = useRef(currentQueue);

  useEffect(() => {
    if (mode === 'pelanggan' && activePelangganVendor) {
      if (activePelangganVendor.totalQueue === 0 && nomorSaya !== null) {
        setNomorSaya(null);
        setUserName('');
        setUserPhone('');
        setIsDataSaved(false);
        setCurrentLogKey(null);
        if (vendorUrlParam) {
          localStorage.removeItem(`easyq_num_${vendorUrlParam}`);
          localStorage.removeItem(`easyq_name_${vendorUrlParam}`);
          localStorage.removeItem(`easyq_logkey_${vendorUrlParam}`);
        }
      }
    }
  }, [activePelangganVendor?.totalQueue, mode, nomorSaya, vendorUrlParam]);

  useEffect(() => {
    if (mode === 'pelanggan' && nomorSaya !== null && currentQueue > prevQueueRef.current) {
      if (sisaAntrean === 0) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg');
        audio.play().catch(e => console.log('Audio diblokir browser', e));
      } else if (sisaAntrean === 2) {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/ding.ogg');
        audio.play().catch(e => console.log('Audio diblokir browser', e));
      }
    }
    prevQueueRef.current = currentQueue;
  }, [currentQueue, sisaAntrean, mode, nomorSaya]);

  const handleVerifyUserPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePelangganVendor || !vendorUrlParam) return alert('Toko tidak ditemukan!');
    
    // Perbaikan pembanding dengan trim dan string agar presisi
    const dbPin = String(activePelangganVendor.pin || '').trim();
    const inputPin = String(inputPinUser || '').trim();

    if (inputPin === dbPin) {
      const nomorBaru = (activePelangganVendor.totalQueue || 0) + 1;
      const nowIso = new Date().toISOString();

      const updates: any = {};
      updates[`vendors/${vendorUrlParam}/totalQueue`] = nomorBaru;
      
      const newLogRef = push(ref(db, `vendors/${vendorUrlParam}/queueLogs`));
      const logKey = newLogRef.key as string;

      updates[`vendors/${vendorUrlParam}/queueLogs/${logKey}`] = {
        id: logKey,
        queueNumber: nomorBaru,
        name: 'Tamu',
        phone: '-',
        createdAt: nowIso
      };

      update(ref(db), updates);

      setNomorSaya(nomorBaru);
      setCurrentLogKey(logKey);
      localStorage.setItem(`easyq_num_${vendorUrlParam}`, nomorBaru.toString());
      localStorage.setItem(`easyq_logkey_${vendorUrlParam}`, logKey);
    } else {
      alert('PIN Harian Salah!');
    }
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userPhone.trim() || !vendorUrlParam) return alert('Lengkapi Nama & WhatsApp!');

    const cleanPhone = userPhone.trim().replace(/[^0-9]/g, '');
    const existingCustomers = activePelangganVendor?.customers || {};
    
    let existingKey = '';
    let currentVisits = 0;

    for (const [key, cust] of Object.entries(existingCustomers)) {
      if (cust.phone.replace(/[^0-9]/g, '') === cleanPhone) {
        existingKey = key;
        currentVisits = cust.totalVisits || 1;
        break;
      }
    }

    const nowIso = new Date().toISOString();
    const updates: any = {};

    if (existingKey) {
      updates[`vendors/${vendorUrlParam}/customers/${existingKey}`] = {
        id: existingKey,
        name: userName.trim(),
        phone: userPhone.trim(),
        lastVisited: nowIso,
        totalVisits: currentVisits + 1
      };
    } else {
      const newCustRef = push(ref(db, `vendors/${vendorUrlParam}/customers`));
      updates[`vendors/${vendorUrlParam}/customers/${newCustRef.key}`] = {
        id: newCustRef.key,
        name: userName.trim(),
        phone: userPhone.trim(),
        lastVisited: nowIso,
        totalVisits: 1
      };
    }

    if (currentLogKey) {
      updates[`vendors/${vendorUrlParam}/queueLogs/${currentLogKey}/name`] = userName.trim();
      updates[`vendors/${vendorUrlParam}/queueLogs/${currentLogKey}/phone`] = userPhone.trim();
    }

    update(ref(db), updates);
    setIsDataSaved(true);
    localStorage.setItem(`easyq_name_${vendorUrlParam}`, userName.trim());
    alert('Kontak berhasil disimpan!');
  };

  const handleAmbilAntreanLagi = () => {
    if (!activePelangganVendor || !vendorUrlParam) return;
    
    const nomorBaru = (activePelangganVendor.totalQueue || 0) + 1;
    const nowIso = new Date().toISOString();
    const currentName = userName || 'Tamu';
    const currentPhone = userPhone || '-';

    const updates: any = {};
    updates[`vendors/${vendorUrlParam}/totalQueue`] = nomorBaru;
    
    const newLogRef = push(ref(db, `vendors/${vendorUrlParam}/queueLogs`));
    const logKey = newLogRef.key as string;

    updates[`vendors/${vendorUrlParam}/queueLogs/${logKey}`] = {
      id: logKey,
      queueNumber: nomorBaru,
      name: currentName,
      phone: currentPhone,
      createdAt: nowIso
    };

    update(ref(db), updates);

    setNomorSaya(nomorBaru);
    setCurrentLogKey(logKey);
    localStorage.setItem(`easyq_num_${vendorUrlParam}`, nomorBaru.toString());
    localStorage.setItem(`easyq_logkey_${vendorUrlParam}`, logKey);
  };

  if (mode === 'super_admin') {
    return <SuperAdmin db={db} vendors={vendors} superPass={superPass} onBack={() => window.location.href = window.location.pathname} />;
  }

  if (mode === 'pelanggan') {
    if (!activePelangganVendor) {
      return <div style={{ textAlign: 'center', padding: '50px 20px', fontFamily: 'sans-serif' }}><h2>Toko Tidak Ditemukan!</h2></div>;
    }
    
    if (nomorSaya === null) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '350px', margin: '0 auto' }}>
          <h1 style={{ color: '#2563eb' }}>{activePelangganVendor.name}</h1>
          <p>Masukkan PIN Harian kasir untuk langsung mengambil antrean.</p>
          <form onSubmit={handleVerifyUserPin}>
            {/* Input PIN Pelanggan dengan Ikon Mata */}
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <input 
                type={showUserPin ? "text" : "password"} 
                placeholder="Masukkan 4 Digit PIN" 
                value={inputPinUser} 
                onChange={(e) => setInputPinUser(e.target.value)} 
                style={{ width: '100%', padding: '12px', paddingRight: '40px', fontSize: '18px', textAlign: 'center', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc' }} 
              />
              <button 
                type="button" 
                onClick={() => setShowUserPin(!showUserPin)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                {showUserPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              Masuk & Ambil Nomor
            </button>
          </form>
        </div>
      );
    }

    const isSudahSelesai = sisaAntrean < 0; 
    const isGiliranTiba = sisaAntrean === 0; 
    const isGiliranHampirTiba = sisaAntrean > 0 && sisaAntrean <= 3;

    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '30px 20px', 
        fontFamily: 'sans-serif', 
        minHeight: '100vh', 
        boxSizing: 'border-box', 
        backgroundColor: isSudahSelesai ? '#f8fafc' : isGiliranTiba ? '#16a34a' : isGiliranHampirTiba ? '#facc15' : '#ffffff', 
        color: isSudahSelesai ? '#334155' : isGiliranTiba ? 'white' : 'black', 
        transition: 'background-color 0.5s ease' 
      }}>
        <h3 style={{ margin: '0 0 5px 0', opacity: 0.8 }}>{activePelangganVendor.name}</h3>
        
        <p style={{ margin: 0, fontSize: '16px' }}>Nomor Antrean Kamu:</p>
        <h1 style={{ fontSize: '96px', margin: '5px 0', textDecoration: isSudahSelesai ? 'line-through' : 'none' }}>{nomorSaya}</h1>
        
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: isGiliranTiba ? 'rgba(255,255,255,0.2)' : isSudahSelesai ? '#e2e8f0' : '#f1f5f9', display: 'inline-block', minWidth: '180px' }}>
          <p style={{ margin: 0, fontSize: '13px' }}>Sedang Dilayani Kasir:</p>
          <h2 style={{ margin: '3px 0', fontSize: '32px' }}>{currentQueue}</h2>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          {isSudahSelesai ? (
             <div>
               <h1 style={{ fontSize: '24px', color: '#475569' }}>✅ Selesai / Terlewat</h1>
               <button onClick={handleAmbilAntreanLagi} style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginTop: '10px' }}>
                 <RefreshCw size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                 Ambil Antrean Baru
               </button>
             </div>
          ) : isGiliranTiba ? (
            <div>
              <h1 style={{ fontSize: '26px' }}>🎉 GILIRAN KAMU TIBA!</h1>
              <p style={{ marginBottom: '15px' }}>Silakan menuju ke area kasir sekarang.</p>
              <button onClick={handleAmbilAntreanLagi} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: 'white', border: '2px solid white', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                 <RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                 Ambil Antrean Baru
              </button>
            </div>
          ) : isGiliranHampirTiba ? (
            <div style={{ padding: '12px', border: '2px solid #ca8a04', borderRadius: '8px', backgroundColor: '#fef08a' }}><h3 style={{ margin: '0 0 5px 0', color: '#854d0e' }}><Bell size={16} style={{ verticalAlign: 'middle' }} /> Bersiap-siap!</h3><p style={{ margin: 0, color: '#854d0e', fontSize: '14px' }}>Sisa {sisaAntrean} orang lagi di depan kamu.</p></div>
          ) : (
            <p style={{ color: '#64748b' }}>Masih ada {sisaAntrean} orang di depan kamu. Berikan tab ini tetap terbuka.</p>
          )}
        </div>

        {!isSudahSelesai && (
          <div style={{ marginTop: '35px', padding: '15px', backgroundColor: isGiliranTiba ? 'rgba(0,0,0,0.1)' : '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', maxWidth: '320px', marginInline: 'auto' }}>
            {isDataSaved ? (
              <p style={{ margin: 0, fontSize: '13px', textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>
                ✓ Kontak tercatat atas nama <b>{userName}</b>
              </p>
            ) : (
              <form onSubmit={handleSaveContact}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Simpan Kontak (Opsional):</p>
                <input 
                  type="text" 
                  placeholder="Nama Panggilan" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  style={{ width: '100%', padding: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
                <input 
                  type="tel" 
                  placeholder="Nomor WhatsApp" 
                  value={userPhone} 
                  onChange={(e) => setUserPhone(e.target.value)} 
                  style={{ width: '100%', padding: '10px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
                <button type="submit" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Simpan Kontak
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return <VendorAdmin db={db} vendors={vendors} />;
}