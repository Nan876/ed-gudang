let MT_RULES = {
  MT: { minHari: 180, warningHari: 210, label: '6 bulan', labelFull: 'Modern Trade' },
  GT: { minHari: 120, warningHari: 150, label: '4 bulan', labelFull: 'General Trade' }
};

let produkList = JSON.parse(localStorage.getItem('edGudangV3')) || [];
let catatanList = JSON.parse(localStorage.getItem('edCatatan')) || [];
window.currentTotalBox = 0;
window.editingCatatanId = null;

function loadSettings() {
  const saved = localStorage.getItem('edSettings');
  if (saved) {
    MT_RULES = JSON.parse(saved);
    document.getElementById('mtBulan').value = Math.ceil(MT_RULES.MT.minHari / 30);
    document.getElementById('gtBulan').value = Math.ceil(MT_RULES.GT.minHari / 30);
    document.getElementById('mtWarningBulan').value = Math.ceil(MT_RULES.MT.warningHari / 30);
    document.getElementById('gtWarningBulan').value = Math.ceil(MT_RULES.GT.warningHari / 30);
  }
  updateDisplaySettings();
}

function simpanSetting() {
  const mtB = parseInt(document.getElementById('mtBulan').value) || 6;
  const gtB = parseInt(document.getElementById('gtBulan').value) || 4;
  const mtW = parseInt(document.getElementById('mtWarningBulan').value) || 7;
  const gtW = parseInt(document.getElementById('gtWarningBulan').value) || 5;
  
  MT_RULES = {
    MT: { minHari: mtB * 30, warningHari: mtW * 30, label: `${mtB} bulan`, labelFull: 'Modern Trade' },
    GT: { minHari: gtB * 30, warningHari: gtW * 30, label: `${gtB} bulan`, labelFull: 'General Trade' }
  };
  
  localStorage.setItem('edSettings', JSON.stringify(MT_RULES));
  updateDisplaySettings();
  render();
}

function updateDisplaySettings() {
  document.getElementById('mtMin').textContent = Math.ceil(MT_RULES.MT.minHari / 30);
  document.getElementById('gtMin').textContent = Math.ceil(MT_RULES.GT.minHari / 30);
}

function toggleSettings() {
  document.getElementById('settingsPanel').classList.toggle('show');
}

function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab' + tabName).classList.add('active');
  btn.classList.add('active');
  if (tabName === 'List') render();
  if (tabName === 'Catatan') renderRiwayat();
}

const hariIni = new Date();
document.getElementById('hariIni').textContent = hariIni.toLocaleDateString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});
document.getElementById('tglCatatan').textContent = hariIni.toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric'
});

loadSettings();
renderRiwayat();

function hitungTotal() {
  const palet = parseInt(document.getElementById('jumlahPalet').value) || 0;
  const boxPerPalet = parseInt(document.getElementById('boxPerPalet').value) || 279;
  const boxTambahan = parseInt(document.getElementById('boxTambahan').value) || 0;
  const total = (palet * boxPerPalet) + boxTambahan;
  document.getElementById('totalBox').value = total.toLocaleString('id-ID');
  window.currentTotalBox = total;
}

function hitungSelisihDetail(tglMulai, tglAkhir) {
  let start = new Date(tglMulai);
  let end = new Date(tglAkhir);
  if (end < start) { const t = start; start = end; end = t; }
  let tahun = end.getFullYear() - start.getFullYear();
  let bulan = end.getMonth() - start.getMonth();
  let hari = end.getDate() - start.getDate();
  if (hari < 0) {
    bulan--;
    hari += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (bulan < 0) { tahun--; bulan += 12; }
  const totalHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return { tahun, bulan, hari, totalHari };
}

function formatSisaWaktu(d) {
  const p = [];
  if (d.tahun > 0) p.push(`${d.tahun} tahun`);
  if (d.bulan > 0) p.push(`${d.bulan} bulan`);
  if (d.hari > 0) p.push(`${d.hari} hari`);
  return p.length ? p.join(' ') : '0 hari';
}

function hitungUmurProduk(tglProduksi) {
  if (!tglProduksi) return null;
  const produksi = new Date(tglProduksi);
  produksi.setHours(0,0,0,0);
  const sekarang = new Date();
  sekarang.setHours(0,0,0,0);
  const diffHari = Math.ceil((sekarang - produksi) / (1000 * 60 * 60 * 24));
  return diffHari;
}

function hitungStatus(tglED, channel) {
  const sekarang = new Date(); sekarang.setHours(0,0,0,0);
  const ed = new Date(tglED); ed.setHours(0,0,0,0);
  const detail = hitungSelisihDetail(sekarang, ed);
  const totalHari = detail.totalHari;
  const rule = MT_RULES[channel];
  let status, label;
  if (totalHari < 0) { status = 'reject'; label = '❌ EXPIRED'; }
  else if (totalHari < rule.minHari) { status = 'reject'; label = '❌ REJECT'; }
  else if (totalHari < rule.warningHari) { status = 'warning'; label = '⚠️ PERHATIAN'; }
  else { status = 'lolos'; label = '✅ LOLOS'; }
  return { status, label, detail, totalHari, rule };
}

// PREVIEW UMUR PRODUK (REAL-TIME DI FORM)
function previewUmur() {
  const tglProduksi = document.getElementById('tglProduksi').value;
  const preview = document.getElementById('previewUmur');
  
  if (!tglProduksi) {
    preview.classList.add('hidden');
    preview.classList.remove('umur-normal', 'umur-warning', 'umur-lama');
    return;
  }
  
  const umurHari = hitungUmurProduk(tglProduksi);
  
  if (umurHari === null) {
    preview.classList.add('hidden');
    return;
  }
  
  preview.classList.remove('hidden', 'umur-normal', 'umur-warning', 'umur-lama');
  
  let pesan = '';
  let kelas = '';
  
  if (umurHari === 0) {
    pesan = ' Diproduksi hari ini';
    kelas = 'umur-normal';
  } else if (umurHari === 1) {
    pesan = '📅 Lewat 1 hari sejak produksi';
    kelas = 'umur-normal';
  } else if (umurHari <= 7) {
    pesan = `📅 Lewat ${umurHari} hari sejak produksi`;
    kelas = 'umur-normal';
  } else if (umurHari <= 30) {
    pesan = `📅 Lewat ${umurHari} hari sejak produksi`;
    kelas = 'umur-warning';
  } else {
    pesan = ` Lewat ${umurHari} hari sejak produksi (Produk lama)`;
    kelas = 'umur-lama';
  }
  
  preview.textContent = pesan;
  preview.classList.add(kelas);
}

function previewStatus() {
  const tglED = document.getElementById('tglED').value;
  const channel = document.querySelector('input[name="channel"]:checked').value;
  const preview = document.getElementById('previewStatus');
  if (!tglED) { preview.classList.add('hidden'); return; }
  const info = hitungStatus(tglED, channel);
  const rule = info.rule;
  const sisa = formatSisaWaktu(info.detail);
  preview.classList.remove('hidden', 'lolos', 'warning', 'reject');
  preview.classList.add(info.status);
  let pesan = '';
  if (info.status === 'lolos') {
    pesan = `✅ LOLOS — ${channel} (Min ${rule.label})<br>Sisa ED: <strong>${sisa}</strong> (${info.totalHari} hari)`;
  } else if (info.status === 'warning') {
    pesan = `️ PERHATIAN — ${channel} (Min ${rule.label})<br>Sisa ED: <strong>${sisa}</strong> (${info.totalHari} hari)`;
  } else {
    if (info.totalHari < 0) {
      pesan = `❌ EXPIRED — ${channel}<br>Sudah lewat <strong>${Math.abs(info.totalHari)} hari</strong>!`;
    } else {
      pesan = `❌ REJECT — ${channel} (Min ${rule.label})<br>Sisa ED: <strong>${sisa}</strong> (${info.totalHari} hari)`;
    }
  }
  preview.innerHTML = pesan;
}

function tambahProduk() {
  const channel = document.querySelector('input[name="channel"]:checked').value;
  const nama = document.getElementById('nama').value.trim();
  const tglProduksi = document.getElementById('tglProduksi').value;
  const supplier = document.getElementById('supplier').value.trim();
  const jumlahPalet = parseInt(document.getElementById('jumlahPalet').value) || 0;
  const boxPerPalet = parseInt(document.getElementById('boxPerPalet').value) || 279;
  const boxTambahan = parseInt(document.getElementById('boxTambahan').value) || 0;
  const totalBox = window.currentTotalBox || 0;
  const tglED = document.getElementById('tglED').value;
  const keterangan = document.getElementById('keterangan').value.trim();

  if (!nama) {
    alert('⚠️ Nama produk wajib diisi!');
    return;
  }
  if (!tglED) {
    alert('⚠️ Tanggal ED wajib diisi!');
    return;
  }
  if (totalBox <= 0) {
    alert('⚠️ Quantity (Total Box) wajib diisi! Minimal 1 box.');
    return;
  }

  const info = hitungStatus(tglED, channel);

  if (info.status === 'reject') {
    if (!confirm(`❌ PRODUK DI BAWAH MINIMUM ED!\n\nED: ${formatTgl(tglED)}\nSisa: ${info.totalHari} hari\nMin: ${info.rule.minHari} hari\n\nTetap simpan sebagai REJECT?`)) return;
  }

  const umurHari = hitungUmurProduk(tglProduksi);

  produkList.push({
    id: Date.now(),
    channel, nama, tglProduksi: tglProduksi || '', supplier,
    jumlahPalet, boxPerPalet, boxTambahan, totalBox,
    tglED, keterangan,
    status: info.status,
    sisaHari: info.totalHari,
    sisaDetail: formatSisaWaktu(info.detail),
    umurHari: umurHari,
    tglInput: new Date().toISOString()
  });

  simpanData();
  render();

  document.getElementById('nama').value = '';
  document.getElementById('tglProduksi').value = '';
  document.getElementById('supplier').value = '';
  document.getElementById('jumlahPalet').value = '0';
  document.getElementById('boxTambahan').value = '0';
  document.getElementById('totalBox').value = '';
  document.getElementById('keterangan').value = '';
  document.getElementById('previewStatus').classList.add('hidden');
  document.getElementById('previewUmur').classList.add('hidden');
  window.currentTotalBox = 0;

  let umurInfo = umurHari !== null ? `\nUmur produk: Lewat ${umurHari} hari` : '';
  alert(`${info.label}\n\n${nama}\nED: ${formatTgl(tglED)}\nTotal: ${totalBox} Box${umurInfo}`);
}

function simpanCatatan() {
  const isi = document.getElementById('catatanLaporan').value.trim();
  const petugas = document.getElementById('namaPetugas').value.trim();
  if (!isi) { alert('⚠️ Catatan tidak boleh kosong!'); return; }
  const sekarang = new Date();
  const catatan = {
    id: window.editingCatatanId || Date.now(),
    tanggal: sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    waktu: sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    petugas: petugas || 'Tidak diketahui',
    isi: isi,
    jumlahProduk: produkList.length,
    timestamp: sekarang.toISOString()
  };
  if (window.editingCatatanId) {
    catatanList = catatanList.filter(c => c.id !== window.editingCatatanId);
    window.editingCatatanId = null;
  }
  catatanList.unshift(catatan);
  localStorage.setItem('edCatatan', JSON.stringify(catatanList));
  alert('✅ Catatan disimpan!');
  resetCatatan();
  renderRiwayat();
}

function resetCatatan() {
  document.getElementById('catatanLaporan').value = '';
  window.editingCatatanId = null;
}

function loadCatatan(id) {
  const c = catatanList.find(x => x.id === id);
  if (!c) return;
  document.getElementById('catatanLaporan').value = c.isi;
  document.getElementById('namaPetugas').value = c.petugas === 'Tidak diketahui' ? '' : c.petugas;
  window.editingCatatanId = c.id;
  alert('📥 Catatan ditarik. Klik "Simpan" untuk update.');
}

function editCatatan(id) { loadCatatan(id); }

function hapusCatatan(id) {
  if (!confirm('Hapus catatan ini?')) return;
  catatanList = catatanList.filter(c => c.id !== id);
  localStorage.setItem('edCatatan', JSON.stringify(catatanList));
  renderRiwayat();
}

function renderRiwayat() {
  const container = document.getElementById('daftarRiwayat');
  if (catatanList.length === 0) {
    container.innerHTML = '<div class="empty">📭 Belum ada catatan</div>';
    return;
  }
  container.innerHTML = catatanList.map(c => `
    <div class="catatan-card">
      <div class="catatan-card-header">
        <div class="catatan-tanggal"> ${c.tanggal} • ${c.waktu}</div>
        <div class="catatan-petugas">👤 ${c.petugas} | 📦 ${c.jumlahProduk} produk</div>
      </div>
      <div class="catatan-isi">${c.isi}</div>
      <div class="catatan-actions-card">
        <button class="btn-load" onclick="loadCatatan(${c.id})">📥 Tarik</button>
        <button class="btn-edit" onclick="editCatatan(${c.id})">✏️ Edit</button>
        <button class="btn-delete" onclick="hapusCatatan(${c.id})">️</button>
      </div>
    </div>
  `).join('');
}

function hapusProduk(id) {
  if (!confirm('Hapus produk ini?')) return;
  produkList = produkList.filter(p => p.id !== id);
  simpanData();
  render();
}

function hapusSemua() {
  if (!confirm('⚠️ Hapus SEMUA data produk & catatan?')) return;
  produkList = [];
  catatanList = [];
  simpanData();
  localStorage.setItem('edCatatan', JSON.stringify(catatanList));
  render();
  renderRiwayat();
}

function simpanData() {
  localStorage.setItem('edGudangV3', JSON.stringify(produkList));
}

function formatTgl(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exportExcel() {
  if (produkList.length === 0 && catatanList.length === 0) {
    alert('Belum ada data!');
    return;
  }
  const wb = XLSX.utils.book_new();
  const headers = ['No', 'Channel', 'Nama Produk', 'Tgl Produksi', 'Umur (Hari)', 'Supplier', 'Palet', 'Box/Palet', 'Box Sisa', 'Total Box', 'Tanggal ED', 'Sisa Waktu', 'Sisa Hari', 'Status', 'Keterangan'];
  const colW = [{wch: 5}, {wch: 8}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 18}, {wch: 6}, {wch: 10}, {wch: 9}, {wch: 10}, {wch: 13}, {wch: 18}, {wch: 9}, {wch: 10}, {wch: 25}];

  function buatBaris(list) {
    return list.map((p, i) => {
      const umur = hitungUmurProduk(p.tglProduksi);
      return [i + 1, p.channel, p.nama, formatTgl(p.tglProduksi), umur !== null ? umur : '-', p.supplier||'-', p.jumlahPalet||0, p.boxPerPalet||279, p.boxTambahan||0, p.totalBox||0, formatTgl(p.tglED), p.sisaDetail, p.sisaHari, p.status.toUpperCase(), p.keterangan||'-'];
    });
  }

  function buatSheet(data) {
    const allData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    ws['!cols'] = colW;
    ws['!rows'] = [{hpt: 22}];
    for (let i = 1; i < allData.length; i++) ws['!rows'].push({hpt: 18});
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({r: R, c: C});
        if (ws[addr]) {
          if (R === 0) {
            ws[addr].s = {
              font: {bold: true, color: {rgb: 'FFFFFF'}, sz: 11, name: 'Calibri'},
              fill: {fgColor: {rgb: '1E3C72'}},
              alignment: {horizontal: 'center', vertical: 'center'},
              border: {top: {style: 'thin', color: {rgb: '000000'}}, bottom: {style: 'thin', color: {rgb: '000000'}}, left: {style: 'thin', color: {rgb: '000000'}}, right: {style: 'thin', color: {rgb: '000000'}}}
            };
          } else {
            ws[addr].s = {
              font: {sz: 11, name: 'Calibri'},
              alignment: {horizontal: 'center', vertical: 'center'},
              border: {top: {style: 'thin', color: {rgb: 'CCCCCC'}}, bottom: {style: 'thin', color: {rgb: 'CCCCCC'}}, left: {style: 'thin', color: {rgb: 'CCCCCC'}}, right: {style: 'thin', color: {rgb: 'CCCCCC'}}}
            };
            if (C === 2 || C === 5 || C === 14) ws[addr].s.alignment.horizontal = 'left';
            if (C === 13) {
              const status = ws[addr].v;
              if (status === 'LOLOS') { ws[addr].s.fill = {fgColor: {rgb: 'D4EDDA'}}; ws[addr].s.font = {color: {rgb: '155724'}, sz: 11, name: 'Calibri', bold: true}; }
              else if (status === 'PERHATIAN' || status === 'WARNING') { ws[addr].s.fill = {fgColor: {rgb: 'FFF3CD'}}; ws[addr].s.font = {color: {rgb: '856404'}, sz: 11, name: 'Calibri', bold: true}; }
              else if (status === 'REJECT') { ws[addr].s.fill = {fgColor: {rgb: 'F8D7DA'}}; ws[addr].s.font = {color: {rgb: '721C24'}, sz: 11, name: 'Calibri', bold: true}; }
            }
          }
        }
      }
    }
    return ws;
  }

  if (produkList.length > 0) {
    const ws = buatSheet(buatBaris(produkList));
    XLSX.utils.book_append_sheet(wb, ws, ' DATA PRODUK');
  }

  if (catatanList.length > 0) {
    const catHeaders = ['No', 'Tanggal', 'Waktu', 'Petugas', 'Jml Produk', 'Catatan'];
    const catColW = [{wch: 5}, {wch: 22}, {wch: 9}, {wch: 20}, {wch: 12}, {wch: 50}];
    const catData = [catHeaders, ...catatanList.map((c, i) => [i + 1, c.tanggal, c.waktu, c.petugas, c.jumlahProduk, c.isi])];
    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    wsCat['!cols'] = catColW;
    wsCat['!rows'] = [{hpt: 22}];
    for (let i = 1; i < catData.length; i++) wsCat['!rows'].push({hpt: 18});
    const rangeC = XLSX.utils.decode_range(wsCat['!ref']);
    for (let R = rangeC.s.r; R <= rangeC.e.r; R++) {
      for (let C = rangeC.s.c; C <= rangeC.e.c; C++) {
        const addr = XLSX.utils.encode_cell({r: R, c: C});
        if (wsCat[addr]) {
          if (R === 0) {
            wsCat[addr].s = {
              font: {bold: true, color: {rgb: 'FFFFFF'}, sz: 11, name: 'Calibri'},
              fill: {fgColor: {rgb: '6A1B9A'}},
              alignment: {horizontal: 'center', vertical: 'center'},
              border: {top: {style: 'thin', color: {rgb: '000000'}}, bottom: {style: 'thin', color: {rgb: '000000'}}, left: {style: 'thin', color: {rgb: '000000'}}, right: {style: 'thin', color: {rgb: '000000'}}}
            };
          } else {
            wsCat[addr].s = {
              font: {sz: 11, name: 'Calibri'},
              alignment: {horizontal: 'center', vertical: 'top', wrapText: true},
              border: {top: {style: 'thin', color: {rgb: 'CCCCCC'}}, bottom: {style: 'thin', color: {rgb: 'CCCCCC'}}, left: {style: 'thin', color: {rgb: 'CCCCCC'}}, right: {style: 'thin', color: {rgb: 'CCCCCC'}}}
            };
            if (C === 3 || C === 5) wsCat[addr].s.alignment.horizontal = 'left';
          }
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, wsCat, '📝 CATATAN');
  }

  const ts = new Date().toISOString().split('T')[0];
  const jam = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  XLSX.writeFile(wb, `Laporan_ED_${ts}_${jam}.xlsx`);
  alert(`✅ Export berhasil!\n\n📦 DATA PRODUK: ${produkList.length} produk\n📝 CATATAN: ${catatanList.length} catatan`);
}

function tarikData() {
  if (catatanList.length === 0) { alert('Belum ada riwayat!'); return; }
  const pilihan = catatanList.map((c,i) => `${i+1}. ${c.tanggal} - ${c.petugas}`).join('\n');
  const nomor = prompt(`📚 RIWAYAT:\n\n${pilihan}\n\nMasukkan nomor (1-${catatanList.length}):`);
  if (!nomor) return;
  const idx = parseInt(nomor) - 1;
  if (idx < 0 || idx >= catatanList.length) { alert('❌ Nomor tidak valid!'); return; }
  loadCatatan(catatanList[idx].id);
}

function render() {
  const container = document.getElementById('daftarProduk');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filterStatus = document.getElementById('filterStatus').value;

  produkList.forEach(p => {
    const info = hitungStatus(p.tglED, p.channel);
    p.status = info.status;
    p.sisaHari = info.totalHari;
    p.sisaDetail = formatSisaWaktu(info.detail);
    p.umurHari = hitungUmurProduk(p.tglProduksi);
  });
  simpanData();

  let filtered = produkList.filter(p => {
    const matchSearch = !search || p.nama.toLowerCase().includes(search) || (p.tglProduksi && p.tglProduksi.includes(search));
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const order = { reject: 0, warning: 1, lolos: 2 };
  filtered.sort((a,b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return new Date(a.tglED) - new Date(b.tglED);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">📭 Belum ada produk</div>';
  } else {
    container.innerHTML = filtered.map(p => {
      const badgeClass = 'badge-' + p.status;
      const statusLabel = p.status === 'lolos' ? '✅ LOLOS' : p.status === 'warning' ? '⚠️ WARN' : '❌ REJECT';
      const rule = MT_RULES[p.channel];
      const paletInfo = (p.jumlahPalet > 0 || p.boxTambahan > 0) ? `<div class="palet-info">📦 ${p.totalBox} Box</div>` : '';
      
      let umurInfo = '';
      if (p.tglProduksi && p.umurHari !== null) {
        if (p.umurHari === 0) {
          umurInfo = `<div class="product-batch">Produksi: ${formatTgl(p.tglProduksi)} (Hari ini)</div>`;
        } else if (p.umurHari === 1) {
          umurInfo = `<div class="product-batch">Produksi: ${formatTgl(p.tglProduksi)} (Lewat 1 hari)</div>`;
        } else {
          umurInfo = `<div class="product-batch">Produksi: ${formatTgl(p.tglProduksi)} (Lewat ${p.umurHari} hari)</div>`;
        }
      }

      return `
        <div class="product-card ${p.status}">
          <button class="del-btn" onclick="hapusProduk(${p.id})">✕</button>
          <div class="product-header">
            <div>
              <div class="product-name">
                <span class="channel-tag ${p.channel.toLowerCase()}">${p.channel}</span>${p.nama}
              </div>
              ${umurInfo}
            </div>
            <span class="status-badge ${badgeClass}">${statusLabel}</span>
          </div>
          <div class="sisa-detail">
            <span class="big">📅 ${p.sisaDetail}</span>
            <span class="sub">${p.sisaHari} hari | Min ${rule.label}</span>
          </div>
          ${paletInfo}
          <div class="product-info">
            <div class="row"><strong>ED:</strong><span>${formatTgl(p.tglED)}</span></div>
            <div class="row"><strong>Supplier:</strong><span>${p.supplier||'-'}</span></div>
            <div class="row"><strong>Total:</strong><span>${p.totalBox} Box</span></div>
            <div class="row"><strong>Input:</strong><span>${formatTgl(p.tglInput)}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('statTotal').textContent = produkList.length;
  document.getElementById('statLolos').textContent = produkList.filter(p => p.status === 'lolos').length;
  document.getElementById('statWarning').textContent = produkList.filter(p => p.status === 'warning').length;
  document.getElementById('statReject').textContent = produkList.filter(p => p.status === 'reject').length;
}

render();
