import React, { useState } from 'react';
import { useMasterData } from '../context/MasterDataContext';

const POSKO_KEYS = ['PADALARANG', 'BATUJAJAR', 'CIKALONG', 'CIPEUNDEUY', 'PASIRLANGU'];

export default function MasterDataGardu() {
  const { garduList, addGardu, updateGardu, deleteGardu, PENYULANG_ROW, getSegmenByPenyulang } = useMasterData();
  const [filterWilayah, setFilterWilayah] = useState(POSKO_KEYS[0]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // For editing: segmen options based on penyulang selected in form
  const editSegmenList = editForm.Penyulang
    ? getSegmenByPenyulang(editForm.Penyulang.toUpperCase())
    : [];

  const filteredData = garduList.filter(g => (g.WILAYAH_KERJA || '').toUpperCase() === filterWilayah);

  const handleAdd = () => {
    const defaultPenyulang = PENYULANG_ROW[0]?.id || '';
    const defaultSegmenList = getSegmenByPenyulang(defaultPenyulang);
    addGardu({
      WILAYAH_KERJA: filterWilayah,
      GARDU: 'GARDU BARU',
      Penyulang: defaultPenyulang,
      SEGMEN_AWAL: defaultSegmenList[0]?.id || '',
      KAPASITAS_TRAFO: '',
      URAIAN_NAMA: '',
      NO_GARDU: ''
    });
  };

  const handleEdit = (item) => {
    setEditId(item._uid);
    setEditForm(item);
  };

  // When penyulang changes in edit form, reset SEGMEN_AWAL to first of new penyulang
  const handleEditPenyulang = (val) => {
    const segs = getSegmenByPenyulang(val.toUpperCase());
    setEditForm({ ...editForm, Penyulang: val, SEGMEN_AWAL: segs[0]?.id || '' });
  };

  const handleSave = () => {
    updateGardu(editId, { ...editForm });
    setEditId(null);
  };

  // Resolve segmen name from id for display
  const getSegmenName = (penyulang, segmenId) => {
    if (!segmenId) return '—';
    const segs = getSegmenByPenyulang((penyulang || '').toUpperCase());
    const found = segs.find(s => s.id === segmenId);
    return found ? found.name : segmenId;
  };

  return (
    <div className="md-container">
      <div className="md-header">
        <h2 className="md-title">📂 Data Master: Gardu Distribusi</h2>
        <div className="md-actions">
          <select value={filterWilayah} onChange={e => setFilterWilayah(e.target.value)} className="sf-ctrl">
            {POSKO_KEYS.map(p => <option key={p} value={p}>Posko {p}</option>)}
          </select>
          <button onClick={handleAdd} className="sb-fill-btn md-add-btn">+ Tambah Gardu</button>
        </div>
      </div>
      
      <div className="tbl-wrap">
        <div className="tbl-scroll" style={{maxHeight: 'calc(100vh - 200px)'}}>
          <table className="data-tbl">
            <thead>
              <tr>
                <th className="th">Penyulang</th>
                <th className="th" style={{width: '20%'}}>Segmen Awal</th>
                <th className="th" style={{width: '15%'}}>Nama Gardu</th>
                <th className="th">No Gardu</th>
                <th className="th">Kapasitas</th>
                <th className="th" style={{width: '20%'}}>Uraian Nama</th>
                <th className="th" style={{width: 120, textAlign: 'center'}}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const isEditing = editId === item._uid;
                return (
                  <tr key={item._uid} className={`dr ${idx%2===0?'dr-even':'dr-odd'} dr-wd`}>

                    {/* Penyulang */}
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? (
                        <select className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.Penyulang} onChange={e => handleEditPenyulang(e.target.value)}>
                          {PENYULANG_ROW.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : item.Penyulang}
                    </td>

                    {/* Segmen Awal */}
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? (
                        <select className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.SEGMEN_AWAL || ''} onChange={e => setEditForm({...editForm, SEGMEN_AWAL: e.target.value})}>
                          <option value="">— Pilih Segmen —</option>
                          {editSegmenList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <span style={{fontSize:'0.75rem', color:'var(--n-600)'}}>
                          {getSegmenName(item.Penyulang, item.SEGMEN_AWAL)}
                        </span>
                      )}
                    </td>

                    {/* Nama Gardu */}
                    <td style={{padding: '0 8px', fontWeight: 600}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.GARDU} onChange={e=>setEditForm({...editForm, GARDU: e.target.value})} /> : item.GARDU}
                    </td>

                    {/* No Gardu */}
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.NO_GARDU} onChange={e=>setEditForm({...editForm, NO_GARDU: e.target.value})} /> : item.NO_GARDU}
                    </td>

                    {/* Kapasitas */}
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.KAPASITAS_TRAFO} onChange={e=>setEditForm({...editForm, KAPASITAS_TRAFO: e.target.value})} /> : item.KAPASITAS_TRAFO}
                    </td>

                    {/* Uraian Nama */}
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.URAIAN_NAMA} onChange={e=>setEditForm({...editForm, URAIAN_NAMA: e.target.value})} /> : item.URAIAN_NAMA}
                    </td>

                    {/* Aksi */}
                    <td style={{textAlign: 'center'}}>
                      {isEditing ? (
                        <div className="md-action-btns">
                          <button onClick={handleSave} className="md-btn md-btn-save">💾</button>
                          <button onClick={() => setEditId(null)} className="md-btn md-btn-cancel">✖</button>
                        </div>
                      ) : (
                        <div className="md-action-btns">
                          <button onClick={() => handleEdit(item)} className="md-btn md-btn-edit">✏️</button>
                          <button onClick={() => { if(confirm(`Yakin hapus gardu ${item.GARDU}?`)) deleteGardu(item._uid) }} className="md-btn md-btn-delete">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredData.length === 0 && <tr><td colSpan={7} className="td-empty">Tidak ada data gardu untuk posko ini</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
