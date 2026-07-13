import React, { useState } from 'react';
import { useMasterData } from '../context/MasterDataContext';

export default function MasterDataRow() {
  const { rowList, PENYULANG_ROW, addSegmen, updateSegmen, deleteSegmen, reorderSegmen } = useMasterData();
  const [filterPenyulang, setFilterPenyulang] = useState(PENYULANG_ROW[0]?.id || '');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Drag & Drop state
  const [draggedUid, setDraggedUid] = useState(null);
  const [dragOverUid, setDragOverUid] = useState(null);

  const filteredData = rowList.filter(r => (r.PENYULANG || '').toUpperCase() === filterPenyulang).sort((a,b) => (a._seq || 0) - (b._seq || 0));

  const handleAdd = () => {
    const nextSeq = filteredData.length > 0 ? Math.max(...filteredData.map(d => parseInt(d._seq) || 0)) + 1 : 1;
    addSegmen({
      PENYULANG: filterPenyulang,
      SEGMEN: 'Segmen Baru',
      KMS: 1.0,
      POSKO: '',
      _seq: nextSeq
    });
  };

  const handleEdit = (item) => {
    setEditId(item._uid);
    setEditForm(item);
  };

  const handleSave = () => {
    updateSegmen(editId, {
      ...editForm,
      KMS: parseFloat(editForm.KMS) || 0,
      _seq: parseInt(editForm._seq) || 0
    });
    setEditId(null);
  };

  // ── Drag & Drop Handlers ──
  const handleDragStart = (e, uid) => {
    setDraggedUid(uid);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', uid);
    // Subtle timeout to allow drag image generation before modifying styles
    setTimeout(() => { if (e.target.style) e.target.style.opacity = '0.5' }, 0);
  };

  const handleDragEnter = (e, uid) => {
    e.preventDefault();
    if (uid !== draggedUid) {
      setDragOverUid(uid);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetUid) => {
    e.preventDefault();
    if (draggedUid && draggedUid !== targetUid) {
      reorderSegmen(filterPenyulang, draggedUid, targetUid);
    }
    setDragOverUid(null);
    setDraggedUid(null);
    if (e.target.style) e.target.style.opacity = '1';
  };

  const handleDragEnd = (e) => {
    setDragOverUid(null);
    setDraggedUid(null);
    if (e.target.style) e.target.style.opacity = '1';
  };

  return (
    <div className="md-container">
      <div className="md-header">
        <h2 className="md-title">📂 Data Master: Segmen HAR ROW</h2>
        <div className="md-actions">
          <select value={filterPenyulang} onChange={e => setFilterPenyulang(e.target.value)} className="sf-ctrl">
            {PENYULANG_ROW.map(p => <option key={p.id} value={p.id}>Penyulang {p.name}</option>)}
          </select>
          <button onClick={handleAdd} className="sb-fill-btn md-add-btn">+ Tambah Segmen</button>
        </div>
      </div>
      
      <div className="tbl-wrap">
        <div className="tbl-scroll" style={{maxHeight: 'calc(100vh - 200px)'}}>
          <table className="data-tbl">
            <thead>
              <tr>
                <th className="th" style={{width: 40}}></th>
                <th className="th th-no">Seq</th>
                <th className="th">Penyulang</th>
                <th className="th" style={{width: '35%'}}>Nama Segmen</th>
                <th className="th th-kms">KMS</th>
                <th className="th">Posko</th>
                <th className="th" style={{width: 120, textAlign: 'center'}}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const isEditing = editId === item._uid;
                const isDragOver = dragOverUid === item._uid;
                
                return (
                  <tr 
                    key={item._uid} 
                    className={`dr ${idx%2===0?'dr-even':'dr-odd'} dr-wd`}
                    style={{
                      borderTop: isDragOver ? '2px solid var(--brand)' : 'none',
                      opacity: draggedUid === item._uid ? 0.5 : 1
                    }}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, item._uid)}
                    onDragEnter={(e) => handleDragEnter(e, item._uid)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item._uid)}
                    onDragEnd={handleDragEnd}
                  >
                    <td style={{textAlign: 'center', cursor: isEditing ? 'default' : 'grab', color: 'var(--n-400)'}}>
                      {!isEditing && '☰'}
                    </td>
                    <td className="td-no">
                      {isEditing ? <input className="sf-ctrl" style={{width:40, textAlign:'center', padding:4}} type="number" value={editForm._seq} onChange={e=>setEditForm({...editForm, _seq: e.target.value})} /> : item._seq}
                    </td>
                    <td style={{padding: '0 8px'}}>{item.PENYULANG}</td>
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:'100%', padding:4}} value={editForm.SEGMEN} onChange={e=>setEditForm({...editForm, SEGMEN: e.target.value})} /> : item.SEGMEN}
                    </td>
                    <td className="td-kms">
                      {isEditing ? <input className="sf-ctrl" style={{width:60, textAlign:'right', padding:4}} type="number" step="0.1" value={editForm.KMS} onChange={e=>setEditForm({...editForm, KMS: e.target.value})} /> : parseFloat(item.KMS).toFixed(2)}
                    </td>
                    <td style={{padding: '0 8px'}}>
                      {isEditing ? <input className="sf-ctrl" style={{width:100, padding:4}} value={editForm.POSKO} onChange={e=>setEditForm({...editForm, POSKO: e.target.value})} /> : item.POSKO}
                    </td>
                    <td style={{textAlign: 'center'}}>
                      {isEditing ? (
                        <div className="md-action-btns">
                          <button onClick={handleSave} className="md-btn md-btn-save">💾</button>
                          <button onClick={() => setEditId(null)} className="md-btn md-btn-cancel">✖</button>
                        </div>
                      ) : (
                        <div className="md-action-btns">
                          <button onClick={() => handleEdit(item)} className="md-btn md-btn-edit">✏️</button>
                          <button onClick={() => { if(confirm(`Yakin hapus segmen ${item.SEGMEN}?`)) deleteSegmen(item._uid) }} className="md-btn md-btn-delete">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredData.length === 0 && <tr><td colSpan={7} className="td-empty">Tidak ada data untuk penyulang ini</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
