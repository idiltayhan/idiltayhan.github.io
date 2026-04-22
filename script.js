/* --------------------------------------------------------
   Proje Değerlendirme Sistemi – Tam Sürüm (wrapText + %)
   -------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

    /* === DOM === */
    const evaluationTypeInput   = document.getElementById('evaluationType');
    const courseCodeInput       = document.getElementById('courseCode');
    const instructorNameInput   = document.getElementById('instructorName');
    const dynamicTableTitleDiv  = document.getElementById('dynamicTableTitle');

    const numProjectsInput      = document.getElementById('numProjects');
    const numCriteriaInput      = document.getElementById('numCriteria');
    const setConfigButton       = document.getElementById('setConfigButton');
    const namesConfigSection    = document.getElementById('namesConfigSection');
    const projectNamesContainer = document.getElementById('projectNamesContainer');
    const criteriaNamesContainer= document.getElementById('criteriaNamesContainer');
    const saveNamesButton       = document.getElementById('saveNamesButton');

    const studentNameInput      = document.getElementById('studentNameInput');
    const addStudentButton      = document.getElementById('addStudentButton');

    const gradingTableContainer = document.getElementById('gradingTableContainer');
    const classSuccessStatsDiv  = document.getElementById('classSuccessStats');

    const saveDataButton        = document.getElementById('saveDataButton');
    const loadDataButton        = document.getElementById('loadDataButton');
    const clearDataButton       = document.getElementById('clearDataButton');

    const exportExcelButton     = document.getElementById('exportExcelButton');

    const masterFillSection     = document.getElementById('masterFillSection');
    const masterFillButton      = document.getElementById('masterFillButton');

    const NOISE = 10;  // sabit gürültü aralığı ±10


    /* === GLOBAL === */
    let projectNames = [];
    let criteriaNames = [];   // { name, dc, pc }
    let students = [];


    /* === Yardımcı: tablo başlığı === */
    function updateDynamicTitle () {
        const parts = [`Değerlendirme: ${evaluationTypeInput.value}`];
        if (courseCodeInput.value.trim())
            parts.push(`Ders: ${courseCodeInput.value.trim()}`);
        if (instructorNameInput.value.trim())
            parts.push(`Öğr. Gör.: ${instructorNameInput.value.trim()}`);

        dynamicTableTitleDiv.innerHTML = parts.join(
            ' <span class="title-separator">|</span> '
        );
        dynamicTableTitleDiv.style.display = parts.length ? 'block' : 'none';
    }
    evaluationTypeInput.addEventListener('change', updateDynamicTitle);
    courseCodeInput     .addEventListener('input', updateDynamicTitle);
    instructorNameInput .addEventListener('input', updateDynamicTitle);


    /* === Yapılandırma === */
    setConfigButton.addEventListener('click', () => {
        const p = +numProjectsInput.value, c = +numCriteriaInput.value;
        if (p < 1 || c < 1) { alert('Proje/kriter sayısı min 1.'); return; }

        // Proje inputları
        projectNamesContainer.innerHTML = '<h4>Proje İsimleri</h4>';
        for (let i = 0; i < p; i++) {
            const val = projectNames[i] ?? `Proje ${i+1}`;
            projectNamesContainer.innerHTML +=
                `<div><label>Proje ${i+1}:</label>
                  <input id="projectName${i}" type="text" value="${val}"></div>`;
        }

        // Kriter inputları
        criteriaNamesContainer.innerHTML = '<h4>Kriter İsimleri</h4>';
        for (let i = 0; i < c; i++) {
            const saved = criteriaNames[i] ?? {name:`Kriter ${i+1}`, dc:1, pc:1};
            let dc='', pc='';
            for (let j=1;j<=14;j++){
                dc += `<option ${j===saved.dc?'selected':''}>${j}</option>`;
                pc += `<option ${j===saved.pc?'selected':''}>${j}</option>`;
            }
            criteriaNamesContainer.innerHTML +=
              `<div class="criterion-config-item">
                 <label class="criteria-item-label">Kriter ${i+1}:</label>
                 <input id="criteriaName${i}" class="criteria-item-name-input" value="${saved.name}">
                 <label class="criteria-item-dcpc-label">DÇ:</label>
                 <select id="criteriaDC${i}" class="criteria-item-select">${dc}</select>
                 <label class="criteria-item-dcpc-label">PÇ:</label>
                 <select id="criteriaPC${i}" class="criteria-item-select">${pc}</select>
               </div>`;
        }

        namesConfigSection.style.display = 'block';
        updatePlaceholder();
        renderTable();
    });

    saveNamesButton.addEventListener('click', () => {
        const p = +numProjectsInput.value, c = +numCriteriaInput.value;

        projectNames = [];
        for (let i=0;i<p;i++)
            projectNames.push(
                document.getElementById(`projectName${i}`).value.trim() || `Proje ${i+1}`);

        criteriaNames = [];
        for (let i=0;i<c;i++)
            criteriaNames.push({
                name: document.getElementById(`criteriaName${i}`).value.trim() || `Kriter ${i+1}`,
                dc  : +document.getElementById(`criteriaDC${i}`).value,
                pc  : +document.getElementById(`criteriaPC${i}`).value
            });

        // Öğrenci notlarını yeni yapıya uyarlama
        students.forEach(st=>{
            const newG={};
            projectNames.forEach(p=>{
                newG[p]={}; criteriaNames.forEach(cr=>newG[p][cr.name]=0);
            });
            for(const op in st.grades)
              for(const oc in st.grades[op])
                if(newG[op]?.[oc]!==undefined) newG[op][oc]=st.grades[op][oc];
            st.grades=newG;
        });

        alert('İsimler güncellendi.');
        renderTable();
    });


    /* === Öğrenci === */
    addStudentButton.addEventListener('click', ()=>{
        if(!projectNames.length||!criteriaNames.length){
            alert('Önce yapılandırmayı tamamlayın.'); return;
        }
        const name = studentNameInput.value.trim();
        if(!name){alert('İsim boş.');return;}
        if(students.some(s=>s.name===name)){alert('Öğrenci ekli.');return;}

        const st={id:Date.now().toString(), name, no:'', grades:{}};
        projectNames.forEach(p=>{
            st.grades[p]={};
            criteriaNames.forEach(c=>st.grades[p][c.name]=0);
        });
        students.push(st);
        studentNameInput.value='';
        renderTable();
    });

    /* === Alfabetik Sıralama === */
    document.getElementById('sortStudentsButton').addEventListener('click', () => {
        if (!students.length) return;
        students.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        renderTable();
    });

    /* === CSV'den Öğrenci Yükle === */
    const csvFileInput    = document.getElementById('csvFileInput');
    const csvImportButton = document.getElementById('csvImportButton');

    csvImportButton.addEventListener('click', () => {
        if (!projectNames.length || !criteriaNames.length) {
            alert('Önce yapılandırmayı tamamlayın.'); return;
        }
        csvFileInput.click();
    });

    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { alert('CSV boş veya geçersiz.'); return; }

            // Başlık satırını parse et
            const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
            const adIdx    = headers.findIndex(h => h === 'ad');
            const soyadIdx = headers.findIndex(h => h === 'soyad');
            const noIdx    = headers.findIndex(h => h === 'numara');

            if (adIdx === -1 || soyadIdx === -1) {
                alert('"Ad" ve "Soyad" sütunları bulunamadı.'); return;
            }

            let added = 0, skipped = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                const ad    = (cols[adIdx]    || '').trim();
                const soyad = (cols[soyadIdx] || '').trim();
                const no    = noIdx !== -1 ? (cols[noIdx] || '').trim() : '';

                if (!ad && !soyad) continue;

                const fullName = `${ad} ${soyad}`.trim();
                if (students.some(s => s.name === fullName)) { skipped++; continue; }

                const st = { id: Date.now().toString() + '_' + i, name: fullName, no, grades: {} };
                projectNames.forEach(p => {
                    st.grades[p] = {};
                    criteriaNames.forEach(c => st.grades[p][c.name] = 0);
                });
                students.push(st);
                added++;
            }

            renderTable();
            alert(`${added} öğrenci eklendi` + (skipped ? `, ${skipped} tanesi zaten kayıtlı.` : '.'));
        };
        reader.readAsText(file, 'UTF-8');
        csvFileInput.value = '';  // aynı dosya tekrar seçilebilsin
    });

    // CSV satırını parse et (tırnak içi virgülleri doğru işle)
    function parseCSVLine(line) {
        const result = [];
        let current = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (line[i + 1] === '"') { current += '"'; i++; }
                    else inQuotes = false;
                } else current += ch;
            } else {
                if (ch === '"') inQuotes = true;
                else if (ch === ',') { result.push(current); current = ''; }
                else current += ch;
            }
        }
        result.push(current);
        return result;
    }


    /* === Ders Bilgi Paketinden Kriter Yükle (gömülü veri) === */
    const COURSES_DB = [{"code": "GİT 101", "name": "Temel Tasarım I", "criteria": [{"name": "Kompozisyon", "dc": 1, "pc": 1}, {"name": "İşçilik", "dc": 2, "pc": 4}, {"name": "Özgünlük", "dc": 3, "pc": 5}, {"name": "Estetik", "dc": 4, "pc": 7}]}, {"code": "GİT 106", "name": "Görsel İletişim Tasarımına Giriş", "criteria": [{"name": "Kavrama", "dc": 1, "pc": 1}, {"name": "Bağlam", "dc": 2, "pc": 2}, {"name": "Analiz", "dc": 3, "pc": 9}, {"name": "Yorumlama", "dc": 4, "pc": 10}]}, {"code": "GİT 410", "name": "Portfolyo Tasarımı ve Sunu Teknikleri", "criteria": [{"name": "Üretim Kalitesi", "dc": 1, "pc": 4}, {"name": "Strateji", "dc": 2, "pc": 8}, {"name": "Kürasyon", "dc": 3, "pc": 11}, {"name": "Sunum Kalitesi", "dc": 4, "pc": 12}]}, {"code": "GRT 418", "name": "İletişim ve Etik", "criteria": [{"name": "Kavrama", "dc": 1, "pc": 3}, {"name": "İlişkilendirme", "dc": 2, "pc": 10}, {"name": "İnceleme", "dc": 3, "pc": 11}, {"name": "Dijital Farkındalık", "dc": 4, "pc": 14}]}, {"code": "GRT 422", "name": "Tasarım Stüdyosu VI", "criteria": [{"name": "Konsept Özgünlüğü", "dc": 1, "pc": 5}, {"name": "Üretim Kalitesi", "dc": 2, "pc": 6}, {"name": "Süreç Yönetimi", "dc": 3, "pc": 8}, {"name": "Eleştirel Yaklaşım", "dc": 4, "pc": 11}, {"name": "Sunum Kalitesi", "dc": 5, "pc": 12}]}, {"code": "GRT 407", "name": "Hareketli Grafik Tasarımı", "criteria": [{"name": "Format Hakimiyeti", "dc": 1, "pc": 2}, {"name": "Yazılım Becerisi", "dc": 2, "pc": 4}, {"name": "Canlandırma", "dc": 3, "pc": 6}, {"name": "Kurgusal Estetik", "dc": 4, "pc": 7}]}, {"code": "GİT 423", "name": "Web Tasarımı", "criteria": [{"name": "Teknik Uyum", "dc": 1, "pc": 2}, {"name": "Araç Hakimiyeti", "dc": 2, "pc": 4}, {"name": "Arayüz Estetiği", "dc": 3, "pc": 7}, {"name": "Planlama", "dc": 4, "pc": 8}]}, {"code": "GRT 405", "name": "Reklam Tasarımı", "criteria": [{"name": "Etik Uygunluk", "dc": 2, "pc": 3}, {"name": "Konsept", "dc": 3, "pc": 5}, {"name": "Tasarım Becerisi", "dc": 4, "pc": 6}, {"name": "Strateji", "dc": 5, "pc": 8}, {"name": "Analiz", "dc": 6, "pc": 11}]}, {"code": "GRT 421", "name": "Tasarım Stüdyosu V", "criteria": [{"name": "Konsept", "dc": 1, "pc": 5}, {"name": "Üretim", "dc": 2, "pc": 6}, {"name": "Süreç Yönetimi", "dc": 3, "pc": 8}, {"name": "Kritik", "dc": 4, "pc": 11}, {"name": "Sunum", "dc": 5, "pc": 12}]}, {"code": "GİT 317", "name": "Yapay Zeka Destekli Sayısal Video Kurgu", "criteria": [{"name": "Teknik Hakimiyet", "dc": 1, "pc": 2}, {"name": "Yazılım Kullanımı", "dc": 2, "pc": 4}, {"name": "Ritim ve Akış", "dc": 3, "pc": 6}, {"name": "YZ Entegrasyonu", "dc": 4, "pc": 13}, {"name": "Etik", "dc": 5, "pc": 14}]}, {"code": "GRT 304", "name": "Ambalaj Tasarımı", "criteria": [{"name": "Teknik", "dc": 1, "pc": 4}, {"name": "Görselleştirme", "dc": 2, "pc": 6}, {"name": "Form ve İşlev", "dc": 3, "pc": 7}, {"name": "Proje Yönetimi", "dc": 4, "pc": 8}]}, {"code": "GRT 322", "name": "Tasarım Stüdyosu IV", "criteria": [{"name": "Uygulama Becerisi", "dc": 1, "pc": 4}, {"name": "Konsept", "dc": 2, "pc": 5}, {"name": "Uygulanabilirlik", "dc": 3, "pc": 6}, {"name": "Süreç Yönetimi", "dc": 4, "pc": 8}, {"name": "Stil Tutarlılığı", "dc": 5, "pc": 11}]}, {"code": "GİT 309", "name": "3D Modelleme", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Modelleme", "dc": 2, "pc": 4}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "Render Estetiği", "dc": 4, "pc": 7}]}, {"code": "GRT 313", "name": "Grafik Tarihi", "criteria": [{"name": "Tarihsel Bilgi", "dc": 1, "pc": 1}, {"name": "Estetik Bağlam", "dc": 2, "pc": 9}, {"name": "Kültürel Okuma", "dc": 3, "pc": 10}, {"name": "Analiz", "dc": 4, "pc": 11}]}, {"code": "GRT 303", "name": "Masaüstü Yayıncılık", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Mizanpaj", "dc": 2, "pc": 4}, {"name": "Hiyerarşi", "dc": 3, "pc": 6}, {"name": "Editoryal Estetik", "dc": 4, "pc": 7}]}, {"code": "GRT 321", "name": "Tasarım Stüdyosu III", "criteria": [{"name": "Uygulama", "dc": 1, "pc": 4}, {"name": "Konsept", "dc": 2, "pc": 5}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "Süreç Yönetimi", "dc": 4, "pc": 8}, {"name": "Bağlam", "dc": 5, "pc": 11}]}, {"code": "GİT 204", "name": "Tipografi", "criteria": [{"name": "Kuram", "dc": 1, "pc": 1}, {"name": "Teknik Uygulama", "dc": 2, "pc": 4}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "Hiyerarşi", "dc": 4, "pc": 7}]}, {"code": "GİT 212", "name": "Tasarımda Algı", "criteria": [{"name": "Kuram", "dc": 1, "pc": 1}, {"name": "Bağlam", "dc": 2, "pc": 9}, {"name": "İlişkilendirme", "dc": 3, "pc": 10}, {"name": "Analiz", "dc": 4, "pc": 11}]}, {"code": "GİT 222", "name": "Tasarım Stüdyosu II", "criteria": [{"name": "Uygulama", "dc": 1, "pc": 4}, {"name": "Konsept", "dc": 2, "pc": 5}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "İşlev ve Estetik", "dc": 4, "pc": 7}, {"name": "Süreç Yönetimi", "dc": 5, "pc": 8}]}, {"code": "GİT 205", "name": "Temel Fotoğrafçılık", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Araç Hakimiyeti", "dc": 2, "pc": 4}, {"name": "Kompozisyon", "dc": 3, "pc": 6}, {"name": "Fotografik Estetik", "dc": 4, "pc": 7}]}, {"code": "GİT 203", "name": "İllüstrasyon", "criteria": [{"name": "Teknik", "dc": 1, "pc": 4}, {"name": "Konsept", "dc": 2, "pc": 5}, {"name": "Üslup", "dc": 3, "pc": 6}, {"name": "Kompozisyon", "dc": 4, "pc": 7}]}, {"code": "GİT 217", "name": "Bilgisayar Destekli Tasarım I", "criteria": [{"name": "Format Hakimiyeti", "dc": 1, "pc": 2}, {"name": "Yazılım", "dc": 2, "pc": 4}, {"name": "Vektörel Çizim", "dc": 3, "pc": 6}, {"name": "Kompozisyon", "dc": 4, "pc": 7}]}, {"code": "GİT 221", "name": "Tasarım Stüdyosu I", "criteria": [{"name": "Uygulama", "dc": 1, "pc": 4}, {"name": "Konsept", "dc": 2, "pc": 5}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "İşlev ve Estetik", "dc": 4, "pc": 7}, {"name": "Süreç Yönetimi", "dc": 5, "pc": 8}]}, {"code": "GİT 102", "name": "Temel Tasarım II", "criteria": [{"name": "Kuram", "dc": 1, "pc": 1}, {"name": "Uygulama", "dc": 2, "pc": 4}, {"name": "Soyutlama", "dc": 3, "pc": 5}, {"name": "Görselleştirme", "dc": 4, "pc": 6}, {"name": "Kompozisyon", "dc": 5, "pc": 7}]}, {"code": "GİT 119", "name": "Dijital Tasarım ve Yapay Zekaya Giriş", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Yazılım Becerisi", "dc": 2, "pc": 4}, {"name": "YZ Entegrasyonu", "dc": 3, "pc": 13}, {"name": "Etik ve Özgünlük", "dc": 4, "pc": 14}]}, {"code": "GİT 218", "name": "Bilgisayar Destekli Tasarım II", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Yazılım Becerisi", "dc": 2, "pc": 4}, {"name": "Doku Tasarımı", "dc": 3, "pc": 6}, {"name": "Render Estetiği", "dc": 4, "pc": 7}]}, {"code": "BLT 406", "name": "Görsel Efekt Tasarımı", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Yazılım", "dc": 2, "pc": 4}, {"name": "Efekt Tasarımı", "dc": 3, "pc": 6}, {"name": "Kompozisyon", "dc": 4, "pc": 7}]}, {"code": "GİT 313", "name": "İleri Tipografi", "criteria": [{"name": "Teknik Hakimiyet", "dc": 1, "pc": 4}, {"name": "Kavramsal Yaklaşım", "dc": 2, "pc": 5}, {"name": "Görselleştirme", "dc": 3, "pc": 6}, {"name": "Estetik ve İşlev", "dc": 4, "pc": 7}, {"name": "Kültürel Bağlam", "dc": 5, "pc": 10}]}, {"code": "GİT 414", "name": "Bilgilendirme Tasarımı", "criteria": [{"name": "Uygulama", "dc": 1, "pc": 4}, {"name": "Görselleştirme", "dc": 2, "pc": 6}, {"name": "İşlev ve Estetik", "dc": 3, "pc": 7}, {"name": "Süreç Yönetimi", "dc": 4, "pc": 8}]}, {"code": "GİT 424", "name": "3D Animasyon", "criteria": [{"name": "Teknik Altyapı", "dc": 1, "pc": 2}, {"name": "Yazılım Becerisi", "dc": 2, "pc": 4}, {"name": "Canlandırma", "dc": 3, "pc": 6}, {"name": "Sinematik Estetik", "dc": 4, "pc": 7}]}];

    const courseSelect = document.getElementById('courseSelect');

    // Dropdown'u doldur
    COURSES_DB.forEach((c, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = c.code + ' \u2014 ' + c.name + ' (' + c.criteria.length + ' kriter)';
        courseSelect.appendChild(opt);
    });

    courseSelect.addEventListener('change', () => {
        const idx = courseSelect.value;
        if (idx === '') return;

        const course = COURSES_DB[+idx];

        // Kriter sayısını ayarla
        numCriteriaInput.value = course.criteria.length;
        criteriaNames = course.criteria.map(c => ({ name: c.name, dc: c.dc, pc: c.pc }));

        // Yapılandırmayı uygula
        setConfigButton.click();

        // Input alanlarına değerleri yaz
        course.criteria.forEach((c, i) => {
            const nameInput = document.getElementById('criteriaName' + i);
            const dcSelect  = document.getElementById('criteriaDC' + i);
            const pcSelect  = document.getElementById('criteriaPC' + i);
            if (nameInput) nameInput.value = c.name;
            if (dcSelect)  dcSelect.value  = c.dc;
            if (pcSelect)  pcSelect.value  = c.pc;
        });

        alert('"' + course.code + ' — ' + course.name + '" kriterleri yüklendi.\n' + course.criteria.length + ' kriter otomatik dolduruldu.');
    });


    /* === ÖĞRENCİ SİLME FONKSİYONU === */
    window.deleteStudent = (id) => {
        // Kullanıcıdan onay al
        if (!confirm('Bu öğrenciyi ve tüm notlarını kalıcı olarak silmek istediğinize emin misiniz?')) {
            return; // Eğer "İptal" derse, işlemi durdur
        }
        
        // Öğrenciyi 'students' dizisinden filtreleyerek kaldır
        students = students.filter(s => s.id !== id);
        
        // Tabloyu ve istatistikleri güncelle
        renderTable();
    };

    /* === Not Hesabı === */
    function studentAverage(st){
        let total=0, proj=0;
        projectNames.forEach(p=>{
            let s=0, c=0;
            criteriaNames.forEach(cr=>{s+=st.grades[p][cr.name]; c++;});
            if(c){total+=s/c; proj++;}
        });
        return proj? total/proj : 0;
    }


    /* === Tablo === */
    window.updateGrade = (inp,id,p,c)=>{
        const st=students.find(s=>s.id===id); if(!st)return;
        let v=+inp.value; if(isNaN(v)||v<0)v=0; if(v>100)v=100;
        inp.value=v; st.grades[p][c]=v;
        document.getElementById(`final-${id}`).textContent = studentAverage(st).toFixed(2);
        classStats();
    };


    /* === TERS HESAPLAMA (Otomatik Doldur) === */
    function fillStudentGrades(st, target) {
        const P = projectNames.length;
        const C = criteriaNames.length;
        const total = P * C;

        // 1) Rastgele değerler üret: target ± NOISE
        let vals = [];
        for (let i = 0; i < total; i++) {
            const offset = (Math.random() * 2 - 1) * NOISE;
            vals.push(target + offset);
        }

        // 2) Ortalamayı hedefe çek
        let currentAvg = vals.reduce((a, b) => a + b, 0) / total;
        let diff = target - currentAvg;
        vals = vals.map(v => v + diff);

        // 3) Clamp [0, 100] ve yuvarlama
        vals = vals.map(v => Math.round(Math.max(0, Math.min(100, v))));

        // 4) Yuvarlama sonrası ortalama düzeltme
        let attempts = 0;
        while (attempts < 50) {
            let avg = vals.reduce((a, b) => a + b, 0) / total;
            let err = Math.round((target - avg) * total);
            if (err === 0) break;
            let step = err > 0 ? 1 : -1;
            let count = Math.abs(err);
            let indices = [...Array(total).keys()].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(count, total); i++) {
                let nv = vals[indices[i]] + step;
                if (nv >= 0 && nv <= 100) vals[indices[i]] = nv;
            }
            attempts++;
        }

        // 5) Notları öğrenciye yaz
        let idx = 0;
        projectNames.forEach(p => {
            criteriaNames.forEach(cr => {
                st.grades[p][cr.name] = vals[idx++];
            });
        });
    }

    /* Ana DOLDUR butonu: hedef girilmiş herkesi doldur */
    masterFillButton.addEventListener('click', () => {
        const targets = {};  // id → {student, target}
        let filled = 0;

        students.forEach(st => {
            const inp = document.getElementById(`target-${st.id}`);
            if (!inp) return;
            const val = parseFloat(inp.value);
            if (isNaN(val) || val < 0 || val > 100) return;
            targets[st.id] = { st, target: val };
        });

        if (Object.keys(targets).length === 0) {
            alert('Hiçbir öğrenciye hedef not girilmemiş.'); return;
        }

        // Hedef değerlerini sakla
        const savedTargets = {};
        for (const id in targets) {
            savedTargets[id] = targets[id].target;
            fillStudentGrades(targets[id].st, targets[id].target);
            filled++;
        }

        renderTable();

        // Hedef inputları geri yükle
        for (const id in savedTargets) {
            const inp = document.getElementById(`target-${id}`);
            if (inp) inp.value = savedTargets[id];
        }

        alert(`${filled} öğrencinin notları dağıtıldı.`);
    });

    function renderTable(){
        if(!projectNames.length||!criteriaNames.length){updatePlaceholder();classStats();return;}
        if(!students.length){updatePlaceholder();classStats();return;}

        // ---- YENİ BAŞLIK YAPISI ----
        let html = '<table><thead><tr><th rowspan="2" class="student-no-col">No</th><th rowspan="2" class="student-name-col">Öğrenci</th>';
        projectNames.forEach(p=>html+=`<th colspan="${criteriaNames.length}" class="project-header">${p}</th>`);
        html+='<th rowspan="2" class="final-grade-col">Ortalama</th><th rowspan="2" class="target-header cheat-col">Hedef Not</th><th rowspan="2">İşlem</th></tr><tr>';
        projectNames.forEach(()=>criteriaNames.forEach(cr=>html+=`<th>${cr.name}</th>`));
        html+='</tr></thead><tbody>';

        students.forEach(st=>{
            html+=`<tr><td class="student-no-col">${st.no||''}</td><td class="student-name-col">${st.name}</td>`;
            projectNames.forEach(p=>criteriaNames.forEach(cr=>{
                html+=`<td><input type="number" min="0" max="100" value="${st.grades[p][cr.name]}"
                        oninput="updateGrade(this,'${st.id}','${p}','${cr.name}')"
                        onchange="updateGrade(this,'${st.id}','${p}','${cr.name}')"></td>`;
            }));
            html+=`<td id="final-${st.id}" class="final-grade-cell">${studentAverage(st).toFixed(2)}</td>`;
            
            // ---- HEDEF NOT INPUT ----
            html+=`<td class="target-grade-cell cheat-col">
                     <input id="target-${st.id}" type="number" min="0" max="100" class="target-grade-input" placeholder="Not">
                   </td>`;

            // ---- SİL BUTONU ----
            html+=`<td><button class="delete-student-btn" onclick="deleteStudent('${st.id}')">Sil</button></td></tr>`;
        });

        html+='</tbody></table>';
        gradingTableContainer.innerHTML=html;
        masterFillSection.classList.add('has-data');
        classStats();
    }
    function updatePlaceholder(){
        gradingTableContainer.innerHTML=
          `<p class="placeholder-text">${
              (!projectNames.length||!criteriaNames.length)?
              'Önce yapılandırmayı uygulayın.' : 'Öğrenci ekleyin.'
          }</p>`;
        masterFillSection.classList.remove('has-data');
    }


    /* === İstatistik (ortalama yüzde + başarı oranı) === */
    const SUCCESS_THRESHOLD = 60;

    function uniqueDCPC(){
        const set=new Set(),arr=[];
        criteriaNames.forEach(c=>{
            const k=`${c.dc}_${c.pc}`;
            if(!set.has(k)){set.add(k);arr.push({dc:c.dc,pc:c.pc});}
        });
        return arr;
    }

    // Her DÇ/PÇ çifti için detaylı istatistik hesapla
    function calcDCPCStats(){
        return uniqueDCPC().map(pr => {
            const rel = criteriaNames.filter(c => c.dc === pr.dc && c.pc === pr.pc);
            let totalSum = 0, totalCount = 0;
            let passCount = 0;

            students.forEach(st => {
                let stSum = 0, stCount = 0;
                projectNames.forEach(p => rel.forEach(c => {
                    stSum += st.grades[p][c.name];
                    stCount++;
                }));
                const stAvg = stCount ? stSum / stCount : 0;
                totalSum += stSum;
                totalCount += stCount;
                if (stAvg >= SUCCESS_THRESHOLD) passCount++;
            });

            const classAvg = totalCount ? totalSum / totalCount : 0;
            const passRate = students.length ? (passCount / students.length) * 100 : 0;

            return {
                dc: pr.dc,
                pc: pr.pc,
                classAvg: classAvg,
                passCount: passCount,
                totalStudents: students.length,
                passRate: passRate
            };
        });
    }

    function classStats(){
        if(!students.length||!criteriaNames.length){
            classSuccessStatsDiv.innerHTML='<h3>Sınıf İstatistikleri</h3><p>İstatistik için veri yok.</p>';
            return;
        }

        const stats = calcDCPCStats();

        let html = '<h3>Sınıf İstatistikleri (DÇ / PÇ)</h3>';
        html += `<p class="stats-threshold-note">Başarı eşiği: <strong>%${SUCCESS_THRESHOLD}</strong> · Toplam öğrenci: <strong>${students.length}</strong></p>`;
        html += '<div class="stats-grid">';

        stats.forEach(s => {
            const barColor = s.passRate >= 70 ? '#28a745' : s.passRate >= 50 ? '#ffc107' : '#dc3545';
            html += `
            <div class="stat-card">
                <div class="stat-card-header">DÇ ${s.dc} / PÇ ${s.pc}</div>
                <div class="stat-row">
                    <span class="stat-label">Sınıf Ortalaması</span>
                    <span class="stat-value">${s.classAvg.toFixed(1)}%</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Başarılı Öğrenci</span>
                    <span class="stat-value">${s.passCount} / ${s.totalStudents}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Başarı Oranı</span>
                    <span class="stat-value" style="color:${barColor};font-weight:700;">%${s.passRate.toFixed(1)}</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width:${Math.min(s.passRate,100)}%;background:${barColor};"></div>
                </div>
            </div>`;
        });

        html += '</div>';
        classSuccessStatsDiv.innerHTML = html;
    }


    /* === Slot Overlay Sistemi (5 kayıt slotu) === */
    const SLOT_COUNT = 5;
    const slotOverlay   = document.getElementById('slotOverlay');
    const slotModalTitle= document.getElementById('slotModalTitle');
    const slotNameRow   = document.getElementById('slotNameRow');
    const slotNameInput = document.getElementById('slotNameInput');
    const slotButtonsDiv= document.getElementById('slotButtons');
    const slotModalClose= document.getElementById('slotModalClose');

    let slotMode = '';  // 'save' veya 'load'

    function getSlot(i){
        try { return JSON.parse(localStorage.getItem(`gradingSlot_${i}`)); }
        catch(e){ return null; }
    }

    function formatDate(ts){
        if(!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    }

    function buildCurrentData(){
        return {
            evaluationType: evaluationTypeInput.value,
            courseCode: courseCodeInput.value,
            instructorName: instructorNameInput.value,
            numProj: +numProjectsInput.value,
            numCrit: +numCriteriaInput.value,
            projectNames, criteriaNames, students
        };
    }

    function openSlotOverlay(mode){
        slotMode = mode;
        slotModalTitle.textContent = mode === 'save' ? 'Kayıt Slotu Seçin' : 'Yüklenecek Slotu Seçin';
        slotNameRow.style.display = mode === 'save' ? 'flex' : 'none';
        slotNameInput.value = '';

        let html = '';
        for(let i = 0; i < SLOT_COUNT; i++){
            const slot = getSlot(i);
            if(slot){
                html += `<div class="slot-btn" data-slot="${i}">
                    <span class="slot-num">${i+1}</span>
                    <div class="slot-info">
                        <div class="slot-label">${slot.label || 'İsimsiz Kayıt'}</div>
                        <div class="slot-date">${formatDate(slot.savedAt)}</div>
                    </div>
                </div>`;
            } else {
                html += `<div class="slot-btn empty-slot" data-slot="${i}" ${mode==='load'?'style="opacity:0.4;pointer-events:none;"':''}>
                    <span class="slot-num">${i+1}</span>
                    <div class="slot-info"><span class="slot-empty-text">Boş Slot</span></div>
                </div>`;
            }
        }
        slotButtonsDiv.innerHTML = html;

        // Slot buton tıklama
        slotButtonsDiv.querySelectorAll('.slot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = +btn.dataset.slot;
                if(slotMode === 'save') doSave(idx);
                else doLoad(idx);
            });
        });

        slotOverlay.classList.add('active');
    }

    function closeSlotOverlay(){
        slotOverlay.classList.remove('active');
    }

    slotModalClose.addEventListener('click', closeSlotOverlay);
    slotOverlay.addEventListener('click', (e) => {
        if(e.target === slotOverlay) closeSlotOverlay();
    });

    function doSave(idx){
        if(!students.length&&!projectNames.length&&!criteriaNames.length
           &&!courseCodeInput.value&&!instructorNameInput.value){
            alert('Kaydedilecek veri yok.'); return;
        }
        const existing = getSlot(idx);
        if(existing && !confirm(`Slot ${idx+1} ("${existing.label||'İsimsiz'}") üzerine yazılsın mı?`)) return;

        const label = slotNameInput.value.trim() || (existing?.label) || `Kayıt ${idx+1}`;
        localStorage.setItem(`gradingSlot_${idx}`, JSON.stringify({
            label,
            savedAt: Date.now(),
            data: buildCurrentData()
        }));
        closeSlotOverlay();
        alert(`Slot ${idx+1}'e kaydedildi: "${label}"`);
    }

    function doLoad(idx){
        const slot = getSlot(idx);
        if(!slot){ alert('Bu slot boş.'); return; }
        const d = slot.data;

        evaluationTypeInput.value = d.evaluationType || evaluationTypeInput.options[0].value;
        courseCodeInput.value = d.courseCode || '';
        instructorNameInput.value = d.instructorName || '';
        updateDynamicTitle();

        numProjectsInput.value = d.numProj || 3;
        numCriteriaInput.value = d.numCrit || 3;
        projectNames  = d.projectNames  || [];
        criteriaNames = d.criteriaNames || [];
        students      = d.students      || [];

        setConfigButton.click();
        renderTable();
        closeSlotOverlay();
        alert(`"${slot.label}" yüklendi.`);
    }

    // Buton dinleyicileri
    saveDataButton.addEventListener('click', () => openSlotOverlay('save'));
    loadDataButton.addEventListener('click', () => openSlotOverlay('load'));

    clearDataButton.addEventListener('click',()=>{
        if(!confirm('Ekrandaki tüm veriler sıfırlansın mı?\n(Kayıtlı slotlar silinmez)'))return;
        projectNames=[];criteriaNames=[];students=[];
        numProjectsInput.value=3;numCriteriaInput.value=3;
        namesConfigSection.style.display='none';
        projectNamesContainer.innerHTML='';
        criteriaNamesContainer.innerHTML='';
        renderTable();updateDynamicTitle();
        alert('Sıfırlandı.');
    });

    document.getElementById('nukeAllSlotsButton').addEventListener('click', () => {
        if (!confirm('Bu işlem 5 kayıt slotunun TAMAMINI kalıcı olarak silecektir.\n\nEmin misiniz?')) return;
        if (!confirm('Gerçekten emin misiniz? Bu işlem geri alınamaz.')) return;
        for (let i = 0; i < SLOT_COUNT; i++) localStorage.removeItem(`gradingSlot_${i}`);
        alert('Tüm kayıt slotları silindi.');
    });


    /* === wrapText yardımcı === */
    function enableWrap(ws, colCount, width=20){
        ws['!cols']=Array.from({length:colCount},()=>({wch:width}));
        Object.keys(ws).forEach(addr=>{
            if(addr[0]==='!')return;
            const cell=ws[addr];
            cell.s=cell.s||{};
            cell.s.alignment=cell.s.alignment||{};
            cell.s.alignment.wrapText=true;
        });
    }


    /* === Excel’e Aktar – wrapText + 3 sekme === */
    function exportTableToExcel(){
        const srcTbl = gradingTableContainer.querySelector('table');
        if(!srcTbl){alert('Tablo yok.');return;}
        if(typeof XLSX==='undefined'){alert('XLSX yüklenemedi.');return;}

        /* 1) Not tablosu */
        const tbl = srcTbl.cloneNode(true);

        // Hedef Not ve İşlem sütunlarını Excel'den çıkar.
        // DİKKAT: Kör körüne "son 2 hücreyi sil" YAPMA — kriter başlığı
        // satırında bu sütunlar olmadığı için son 2 kriter başlığı uçuyor.
        // Onun yerine class/içerik ile tespit et.
        tbl.querySelectorAll('tr').forEach(row => {
            // Önce son hücre: "İşlem" başlığı veya Sil butonu içeren hücre mi?
            let cells = row.querySelectorAll('th, td');
            const last = cells[cells.length - 1];
            if (last && (
                last.textContent.trim() === 'İşlem' ||
                last.querySelector('.delete-student-btn')
            )) {
                last.remove();
            }

            // Sonra yeni son hücre: Hedef Not sütunu mu?
            cells = row.querySelectorAll('th, td');
            const newLast = cells[cells.length - 1];
            if (newLast && (
                newLast.classList.contains('target-header') ||
                newLast.classList.contains('target-grade-cell') ||
                (newLast.classList.contains('cheat-col') &&
                 newLast.textContent.trim() === 'Hedef Not')
            )) {
                newLast.remove();
            }
        });

        tbl.querySelectorAll('input').forEach(inp=>{
            const td=inp.parentNode; td.textContent=inp.value||'';
        });
        const wsGrades = XLSX.utils.table_to_sheet(tbl,{raw:true});
        const gradeCols = XLSX.utils.decode_range(wsGrades['!ref']).e.c + 1;
        enableWrap(wsGrades, gradeCols);

        /* 2) Kriterler + meta */
        const critAoa=[
            ['Değerlendirme Türü', evaluationTypeInput.value||''],
            ['Ders Kodu / Şube',   courseCodeInput.value||''],
            ['Öğr. Gör.',          instructorNameInput.value||''],
            [],
            ['Kriter Adı','DÇ','PÇ']
        ];
        criteriaNames.forEach(c=>critAoa.push([c.name,c.dc,c.pc]));
        const wsCrit = XLSX.utils.aoa_to_sheet(critAoa);
        enableWrap(wsCrit, 3, 25);

        /* 3) İstatistik (ortalama + başarı oranı) */
        const stats = calcDCPCStats();
        const statsAoa=[
            ['Başarı Eşiği', `%${SUCCESS_THRESHOLD}`],
            ['Toplam Öğrenci', students.length],
            [],
            ['DÇ','PÇ','Sınıf Ortalaması (%)','Başarılı Öğrenci','Toplam Öğrenci','Başarı Oranı (%)']
        ];
        stats.forEach(s => {
            statsAoa.push([
                s.dc,
                s.pc,
                s.classAvg.toFixed(2),
                s.passCount,
                s.totalStudents,
                s.passRate.toFixed(2)
            ]);
        });
        const wsStats = XLSX.utils.aoa_to_sheet(statsAoa);
        enableWrap(wsStats, 6, 20);

        /* 4) Kitap */
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsGrades, 'Degerlendirme');
        XLSX.utils.book_append_sheet(wb, wsCrit,   'Kriterler');
        XLSX.utils.book_append_sheet(wb, wsStats,  'İstatistik');
        XLSX.writeFile(wb,'degerlendirme.xlsx',{cellStyles:true});
    }

    /* Dinleyici */
    exportExcelButton.addEventListener('click', exportTableToExcel);


    /* === Gizli mod: "git" şifresi === */
    let keyBuffer = '';
    document.addEventListener('keydown', (e) => {
        // Input/select içindeyken dinleme
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        keyBuffer += e.key.toLowerCase();
        // Son 3 karakteri tut
        if (keyBuffer.length > 10) keyBuffer = keyBuffer.slice(-10);

        if (keyBuffer.endsWith('git')) {
            document.body.classList.toggle('cheat-mode');
            keyBuffer = '';
        }
    });


    /* === İlk açılış === */
    updateDynamicTitle();
    updatePlaceholder();
    classStats();
});
