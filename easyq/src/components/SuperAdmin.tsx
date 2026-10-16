import { useState } from 'react';
import { ref, set } from 'firebase/database';
import type { VendorData } from '../types';
import { Search } from 'lucide-react';

interface SuperAdminProps {
  db: any;
  vendors: Record<string, VendorData>;
  superPass: string;
  onBack: () => void;
}

export default function SuperAdmin({ db, vendors, superPass, onBack }: SuperAdminProps) {
  const [isSuperLoggedIn, setIsSuperLoggedIn] = useState(false);
  const [superPassInput, setSuperPassInput] = useState('');
  const [newVendorForm, setNewVendorForm] = useState({ id: '', name: '', pass: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSuperLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perbaikan: Ubah format password dari DB ke String dan hapus spasi (trim)
    const dbPassword = String(superPass).trim();
    const inputPassword = superPassInput.trim();

    if (inputPassword === dbPassword) {
      setIsSuperLoggedIn(true);
    } else {
      alert(`Password Salah!`); // Petunjuk sementara untuk debug
    }
  };  

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newVendorForm.id.toLowerCase().replace(/\s+/g, '_');
    if (!cleanId || !newVendorForm.name || !newVendorForm.pass) return alert('Lengkapi data vendor!');

    set(ref(db, `vendors/${cleanId}`), {
      id: cleanId,
      name: newVendorForm.name,
      pass: newVendorForm.pass,
      pin: '1234',
      currentQueue: 0,
      totalQueue: 0
    });

    alert(`Vendor "${newVendorForm.name}" Berhasil Dibuat!`);
    setNewVendorForm({ id: '', name: '', pass: '' });
  };

  if (!isSuperLoggedIn) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'sans-serif', maxWidth: '350px', margin: '0 auto' }}>
        <h2>Super Admin Platform</h2>
        <form onSubmit={handleSuperLogin}>
          <input 
            type="password" 
            placeholder="Password Master" 
            value={superPassInput} 
            onChange={(e) => setSuperPassInput(e.target.value)}
            style={{ width: '100%', padding: '12px', boxSizing: 'border-box', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Login Platform
          </button>
        </form>
        <br />
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>← Kembali ke Toko</button>
      </div>
    );
  }

  // Filter pencarian
  const filteredVendors = Object.values(vendors).filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Super Admin - Pemantauan Vendor</h2>
        <button onClick={() => setIsSuperLoggedIn(false)} style={{ padding: '6px 12px' }}>Logout</button>
      </div>
      <hr />

      <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h4>+ Buat Vendor Baru</h4>
        <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input type="text" placeholder="ID (cth: kopi_viral)" value={newVendorForm.id} onChange={(e) => setNewVendorForm({ ...newVendorForm, id: e.target.value })} style={{ flex: 1, minWidth: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="text" placeholder="Nama Toko" value={newVendorForm.name} onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })} style={{ flex: 1, minWidth: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="text" placeholder="Password Toko" value={newVendorForm.pass} onChange={(e) => setNewVendorForm({ ...newVendorForm, pass: e.target.value })} style={{ flex: 1, minWidth: '150px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Daftarkan</button>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '6px', padding: '5px 10px' }}>
        <Search size={18} color="#666" style={{ marginRight: '10px' }} />
        <input 
          type="text" 
          placeholder="Cari nama toko atau ID vendor..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', padding: '8px 0', fontSize: '16px' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#e2e8f0' }}>
            <th style={{ padding: '8px', border: '1px solid #ccc' }}>Vendor</th>
            <th style={{ padding: '8px', border: '1px solid #ccc' }}>Antrean Hari Ini</th>
            <th style={{ padding: '8px', border: '1px solid #ccc' }}>Riwayat (Total per Tgl)</th>
          </tr>
        </thead>
        <tbody>
          {filteredVendors.map((v) => (
            <tr key={v.id}>
              <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                <b>{v.name}</b><br/><small>{v.id} (PIN: {v.pin})</small>
              </td>
              <td style={{ padding: '8px', border: '1px solid #ccc' }}><b>{v.currentQueue}</b> dilayani / dr <b>{v.totalQueue}</b></td>
              <td style={{ padding: '8px', border: '1px solid #ccc', fontSize: '12px' }}>
                {v.history ? (
                  Object.entries(v.history).map(([tgl, total]) => (
                    <div key={tgl}><span style={{color: '#64748b'}}>{tgl}:</span> <b>{total} org</b></div>
                  ))
                ) : '-'}
              </td>
            </tr>
          ))}
          {filteredVendors.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center', padding: '15px'}}>Toko tidak ditemukan</td></tr>}
        </tbody>
      </table>
    </div>
  );
}