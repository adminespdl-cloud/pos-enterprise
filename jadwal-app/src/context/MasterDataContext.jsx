import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import rawGarduData from '../data/data_gardu.json';
import rawRowData from '../data/data_row.json';

const MasterDataContext = createContext();

export const useMasterData = () => useContext(MasterDataContext);

export const MasterDataProvider = ({ children }) => {
  const [garduList, setGarduList] = useState([]);
  const [rowList, setRowList] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage or fallback to JSON
  useEffect(() => {
    try {
      const storedGardu = localStorage.getItem('JADWAL_APP_GARDU');
      const storedRow = localStorage.getItem('JADWAL_APP_ROW');

      if (storedGardu && storedRow) {
        setGarduList(JSON.parse(storedGardu));
        setRowList(JSON.parse(storedRow));
      } else {
        // Init Gardu
        const initGardu = rawGarduData.data.map((item, idx) => ({
          ...item,
          _uid: item.NO_GARDU ? `G-${item.Penyulang}-${item.NO_GARDU}` : `G-TEMP-${idx}`,
        }));
        
        // Init ROW
        const rows = Array.isArray(rawRowData.dataRow) ? rawRowData.dataRow : rawRowData;
        const initRow = rows.map((item, idx) => ({
          _uid: item._uid || `${item.PENYULANG}-${item._seq || idx}`,
          ...item
        }));

        setGarduList(initGardu);
        setRowList(initRow);
      }
    } catch (e) {
      console.error('Failed to parse local data', e);
    }
    setIsLoaded(true);
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('JADWAL_APP_GARDU', JSON.stringify(garduList));
      localStorage.setItem('JADWAL_APP_ROW', JSON.stringify(rowList));
    }
  }, [garduList, rowList, isLoaded]);

  // ── Derived Data (Computed) ─────────────────────────────────

  const GARDU_BY_WILAYAH = useMemo(() => {
    const grouped = {};
    for (const item of garduList) {
      const wilayah = (item.WILAYAH_KERJA || '').trim().toUpperCase();
      if (!wilayah) continue;
      if (!grouped[wilayah]) grouped[wilayah] = [];
      grouped[wilayah].push(item); // Store full object instead of just name
    }
    return grouped;
  }, [garduList]);

  const GARDU_STATS = useMemo(() => {
    return {
      total: garduList.length,
      perWilayah: Object.fromEntries(
        Object.entries(GARDU_BY_WILAYAH).map(([k, v]) => [k, v.length])
      )
    };
  }, [garduList, GARDU_BY_WILAYAH]);

  const SEGMEN_BY_PENYULANG = useMemo(() => {
    const sorted = [...rowList].sort((a, b) => (a._seq || 0) - (b._seq || 0));
    const grouped = {};
    for (const item of sorted) {
      const peny = (item.PENYULANG || '').trim().toUpperCase();
      if (!peny) continue;
      if (!grouped[peny]) grouped[peny] = [];
      grouped[peny].push({
        id: item._uid,
        name: item.SEGMEN || '',
        kms: parseFloat(item.KMS) || 1.0,
        posko: (item.POSKO || '').trim().toUpperCase(),
        seq: item._seq || 0,
      });
    }
    return grouped;
  }, [rowList]);

  const ROW_BY_POSKO = useMemo(() => {
    const grouped = {};
    for (const item of rowList) {
      const posko = (item.POSKO || '').trim().toUpperCase();
      if (!posko) continue;
      if (!grouped[posko]) grouped[posko] = [];
      grouped[posko].push(item);
    }
    return grouped;
  }, [rowList]);

  const PENYULANG_ROW = useMemo(() => {
    return Object.keys(SEGMEN_BY_PENYULANG)
      .sort()
      .map(id => ({ id, name: id }));
  }, [SEGMEN_BY_PENYULANG]);

  const getSegmenByPenyulang = (penyulang) => {
    const segs = SEGMEN_BY_PENYULANG[(penyulang || '').toUpperCase()];
    if (segs && segs.length > 0) return segs;
    return [];
  };

  const ROW_STATS = useMemo(() => {
    return {
      total: rowList.length,
      perPenyulang: Object.fromEntries(
        Object.entries(SEGMEN_BY_PENYULANG).map(([k, v]) => [k, v.length])
      )
    };
  }, [rowList, SEGMEN_BY_PENYULANG]);

  const allGlobalSegmen = useMemo(() => {
    return PENYULANG_ROW.flatMap(p => getSegmenByPenyulang(p.id));
  }, [PENYULANG_ROW, SEGMEN_BY_PENYULANG]); // using dependencies carefully

  // ── CRUD ROW Segmen ───────────────────────────────────────

  const addSegmen = (newItem) => {
    setRowList(prev => [...prev, { ...newItem, _uid: `R-${Date.now()}` }]);
  };

  const updateSegmen = (uid, updatedItem) => {
    setRowList(prev => prev.map(item => item._uid === uid ? { ...item, ...updatedItem } : item));
  };

  const deleteSegmen = (uid) => {
    setRowList(prev => prev.filter(item => item._uid !== uid));
  };

  const reorderSegmen = (penyulang, draggedUid, targetUid) => {
    setRowList(prev => {
      const items = prev.filter(r => (r.PENYULANG || '').toUpperCase() === penyulang).sort((a,b) => (a._seq || 0) - (b._seq || 0));
      const draggedIdx = items.findIndex(r => r._uid === draggedUid);
      const targetIdx = items.findIndex(r => r._uid === targetUid);
      
      if (draggedIdx < 0 || targetIdx < 0 || draggedIdx === targetIdx) return prev;
      
      const newItems = [...items];
      const [draggedItem] = newItems.splice(draggedIdx, 1);
      newItems.splice(targetIdx, 0, draggedItem);
      
      const updatedUids = new Set(newItems.map(item => item._uid));
      
      return prev.map(item => {
        if (updatedUids.has(item._uid)) {
          const newIndex = newItems.findIndex(i => i._uid === item._uid);
          return { ...item, _seq: newIndex + 1 };
        }
        return item;
      });
    });
  };

  // ── CRUD Gardu ────────────────────────────────────────────

  const addGardu = (newItem) => {
    setGarduList(prev => [...prev, { ...newItem, _uid: `G-${Date.now()}` }]);
  };

  const updateGardu = (uid, updatedItem) => {
    setGarduList(prev => prev.map(item => item._uid === uid ? { ...item, ...updatedItem } : item));
  };

  const deleteGardu = (uid) => {
    setGarduList(prev => prev.filter(item => item._uid !== uid));
  };

  const value = {
    garduList,
    rowList,
    GARDU_BY_WILAYAH,
    GARDU_STATS,
    SEGMEN_BY_PENYULANG,
    ROW_BY_POSKO,
    PENYULANG_ROW,
    getSegmenByPenyulang,
    ROW_STATS,
    allGlobalSegmen,
    
    // Actions
    addSegmen,
    updateSegmen,
    deleteSegmen,
    reorderSegmen,
    addGardu,
    updateGardu,
    deleteGardu,
  };

  if (!isLoaded) return null; // Avoid render flash before localStorage load

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
};
