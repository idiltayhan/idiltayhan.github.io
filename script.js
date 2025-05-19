// --------------------------------------------------------
// Proje Değerlendirme Sistemi - Tam Sürüm
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    /* === DOM ELEMANLARI === */
    // Rapor
    const evaluationTypeInput   = document.getElementById('evaluationType');
    const courseCodeInput       = document.getElementById('courseCode');
    const instructorNameInput   = document.getElementById('instructorName');
    const dynamicTableTitleDiv  = document.getElementById('dynamicTableTitle');

    // Yapılandırma
    const numProjectsInput      = document.getElementById('numProjects');
    const numCriteriaInput      = document.getElementById('numCriteria');
    const setConfigButton       = document.getElementById('setConfigButton');
    const namesConfigSection    = document.getElementById('namesConfigSection');
    const projectNamesContainer = document.getElementById('projectNamesContainer');
    const criteriaNamesContainer= document.getElementById('criteriaNamesContainer');
    const saveNamesButton       = document.getElementById('saveNamesButton');

    // Öğrenci
    const studentNameInput      = document.getElementById('studentNameInput');
    const addStudentButton      = document.getElementById('addStudentButton');

    // Tablo + istatistik
    const gradingTableContainer = document.getElementById('gradingTableContainer');
    const classSuccessStatsDiv  = document.getElementById('classSuccessStats');

    // Veri yönetimi
    const saveDataButton        = document.getElementById('saveDataButton');
    const loadDataButton        = document.getElementById('loadDataButton');
    const clearDataButton       = document.getElementById('clearDataButton');

    // EXCEL butonu
    const exportExcelButton     = document.getElementById('exportExcelButton');


    /* === GLOBAL DEĞİŞKENLER === */
    let projectNames  = [];                // ["Proje 1", ...]
    let criteriaNames = [];                // [{ name:"Kriter 1", dc:1, pc:1 }, ...]
    let students      = [];                // [{ id, name, grades:{} }, ...]
    const SUCCESS_THRESHOLD = 50;


    /* === DİNAMİK BAŞLIK === */
    function updateDynamicTitle() {
        const parts = [
            `Değerlendirme: ${evaluationTypeInput.value}`
        ];
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
    courseCodeInput.addEventListener('input', updateDynamicTitle);
    instructorNameInput.addEventListener('input', updateDynamicTitle);


    /* === YAPILANDIRMA === */
    setConfigButton.addEventListener('click', () => {
        const pCount = +numProjectsInput.value;
        const cCount = +numCriteriaInput.value;
        if (pCount < 1 || cCount < 1) {
            alert('Proje ve kriter sayısı en az 1 olmalı.');
            return;
        }

        // Proje adları inputları
        projectNamesContainer.innerHTML = '<h4>Proje İsimleri</h4>';
        for (let i = 0; i < pCount; i++) {
            const val = projectNames[i] ?? `Proje ${i + 1}`;
            projectNamesContainer.innerHTML += `
                <div>
                    <label for="projectName${i}">Proje ${i + 1}:</label>
                    <input id="projectName${i}" type="text" value="${val}" />
                </div>`;
        }

        // Kriter inputları
        criteriaNamesContainer.innerHTML = '<h4>Kriter İsimleri</h4>';
        for (let i = 0; i < cCount; i++) {
            const saved = criteriaNames[i] ?? { name:`Kriter ${i+1}`, dc:1, pc:1 };
            let dcOpts = '', pcOpts = '';
            for (let j = 1; j <= 12; j++) {
                dcOpts += `<option value="${j}" ${j===saved.dc?'selected':''}>${j}</option>`;
                pcOpts += `<option value="${j}" ${j===saved.pc?'selected':''}>${j}</option>`;
            }
            criteriaNamesContainer.innerHTML += `
                <div class="criterion-config-item">
                    <label class="criteria-item-label">Kriter ${i+1}:</label>
                    <input id="criteriaName${i}" type="text"
                           class="criteria-item-name-input" value="${saved.name}"/>
                    <label class="criteria-item-dcpc-label">DÇ:</label>
                    <select id="criteriaDC${i}" class="criteria-item-select">${dcOpts}</select>
                    <label class="criteria-item-dcpc-label">PÇ:</label>
                    <select id="criteriaPC${i}" class="criteria-item-select">${pcOpts}</select>
                </div>`;
        }

        namesConfigSection.style.display = 'block';
        updatePlaceholder();
        renderTable();
    });

    saveNamesButton.addEventListener('click', () => {
        const pCount = +numProjectsInput.value;
        const cCount = +numCriteriaInput.value;

        // Proje adlarını kaydet
        projectNames = [];
        for (let i = 0; i < pCount; i++) {
            const v = document.getElementById(`projectName${i}`).value.trim()
                     || `Proje ${i+1}`;
            projectNames.push(v);
        }

        // Kriter adları + DÇ/PÇ
        criteriaNames = [];
        for (let i = 0; i < cCount; i++) {
            criteriaNames.push({
                name : document.getElementById(`criteriaName${i}`).value.trim()
                       || `Kriter ${i+1}`,
                dc   : +document.getElementById(`criteriaDC${i}`).value,
                pc   : +document.getElementById(`criteriaPC${i}`).value
            });
        }

        // Mevcut öğrenci notlarını yeni yapıya uyarlama
        students.forEach(st => {
            const newGrades = {};
            projectNames.forEach(p => {
                newGrades[p] = {};
                criteriaNames.forEach(c => newGrades[p][c.name] = 0);
            });
            for (const oldP in st.grades) {
                for (const oldC in st.grades[oldP]) {
                    if (newGrades[oldP]?.[oldC] !== undefined) {
                        newGrades[oldP][oldC] = st.grades[oldP][oldC];
                    }
                }
            }
            st.grades = newGrades;
        });

        alert('İsimler güncellendi.');
        renderTable();
    });


    /* === ÖĞRENCİ EKLE === */
    addStudentButton.addEventListener('click', () => {
        if (!projectNames.length || !criteriaNames.length) {
            alert('Önce proje/kriter yapılandırmasını tamamlayın.');
            return;
        }
        const name = studentNameInput.value.trim();
        if (!name) { alert('İsim boş olamaz.'); return; }
        if (students.some(s => s.name === name)) {
            alert('Bu öğrenci zaten ekli.');
            return;
        }
        const st = { id: Date.now().toString(), name, grades:{} };
        projectNames.forEach(p => {
            st.grades[p] = {};
            criteriaNames.forEach(c => st.grades[p][c.name] = 0);
        });
        students.push(st);
        studentNameInput.value = '';
        renderTable();
    });


    /* === NOT HESABI === */
    function studentAverage(st) {
        let total = 0, proj = 0;
        projectNames.forEach(p => {
            let sum = 0, crit = 0;
            criteriaNames.forEach(c => {
                sum += st.grades[p][c.name];
                crit++;
            });
            if (crit) { total += sum / crit; proj++; }
        });
        return proj ? total / proj : 0;
    }


    /* === TABLO === */
    window.updateGrade = (inp, id, p, c) => {
        const st = students.find(s => s.id === id);
        if (!st) return;
        let v = +inp.value;
        if (isNaN(v) || v < 0) v = 0;
        if (v > 100) v = 100;
        inp.value = v;
        st.grades[p][c] = v;
        document.getElementById(`final-${id}`).textContent =
            studentAverage(st).toFixed(2);
        classStats();
    };

    function renderTable() {
        if (!projectNames.length || !criteriaNames.length) {
            updatePlaceholder();
            classStats();
            return;
        }
        if (!students.length) {
            updatePlaceholder();
            classStats();
            return;
        }

        let html = '<table><thead><tr>';
        html += '<th rowspan="2" class="student-name-col">Öğrenci</th>';
        projectNames.forEach(p =>
            html += `<th colspan="${criteriaNames.length}" class="project-header">${p}</th>`
        );
        html += '<th rowspan="2" class="final-grade-col">Ortalama</th></tr><tr>';
        projectNames.forEach(() =>
            criteriaNames.forEach(c => html += `<th>${c.name}</th>`)
        );
        html += '</tr></thead><tbody>';

        students.forEach(st => {
            html += `<tr><td class="student-name-col">${st.name}</td>`;
            projectNames.forEach(p => criteriaNames.forEach(c => {
                html += `<td><input type="number" min="0" max="100"
                        value="${st.grades[p][c.name]}"
                        oninput="updateGrade(this,'${st.id}','${p}','${c.name}')"
                        onchange="updateGrade(this,'${st.id}','${p}','${c.name}')"></td>`;
            }));
            html += `<td id="final-${st.id}" class="final-grade-cell">${studentAverage(st).toFixed(2)}</td></tr>`;
        });

        html += '</tbody></table>';
        gradingTableContainer.innerHTML = html;
        classStats();
    }

    function updatePlaceholder() {
        gradingTableContainer.innerHTML =
            `<p class="placeholder-text">
                ${ (!projectNames.length || !criteriaNames.length)
                    ? 'Önce yapılandırmayı uygulayın.'
                    : 'Öğrenci ekleyin.' }
             </p>`;
    }


    /* === SINIF İSTATİSTİKLERİ === */
    function uniqueDCPC() {
        const set = new Set(), arr = [];
        criteriaNames.forEach(c => {
            const key = `${c.dc}_${c.pc}`;
            if (!set.has(key)) { set.add(key); arr.push({ dc:c.dc, pc:c.pc }); }
        });
        return arr;
    }

    function classStats() {
        let html = '<h3>Sınıf Başarı İstatistikleri</h3>';
        if (!students.length || !criteriaNames.length) {
            classSuccessStatsDiv.innerHTML =
                html + '<p>İstatistik için yeterli veri yok.</p>';
            return;
        }
        const pairs = uniqueDCPC();
        html += '<ul>';
        pairs.forEach(pr => {
            let t = 0, s = 0;
            const related = criteriaNames.filter(
                c => c.dc === pr.dc && c.pc === pr.pc
            );
            students.forEach(st => {
                projectNames.forEach(p => {
                    related.forEach(c => {
                        const sc = st.grades[p][c.name];
                        t++; if (sc >= SUCCESS_THRESHOLD) s++;
                    });
                });
            });
            const perc = t ? (s / t * 100).toFixed(2) : '0.00';
            html += `<li>DÇ ${pr.dc} / PÇ ${pr.pc}: ${perc}% (${s}/${t})</li>`;
        });
        html += '</ul>';
        classSuccessStatsDiv.innerHTML = html;
    }


    /* === VERİ YÖNETİMİ === */
    saveDataButton.addEventListener('click', () => {
        if (!students.length && !projectNames.length &&
            !criteriaNames.length && !courseCodeInput.value &&
            !instructorNameInput.value) {
            alert('Kaydedilecek veri yok.');
            return;
        }
        localStorage.setItem('gradingData', JSON.stringify({
            evaluationType : evaluationTypeInput.value,
            courseCode     : courseCodeInput.value,
            instructorName : instructorNameInput.value,
            numProj        : +numProjectsInput.value,
            numCrit        : +numCriteriaInput.value,
            projectNames, criteriaNames, students
        }));
        alert('Veriler kaydedildi.');
    });

    loadDataButton.addEventListener('click', () => {
        const str = localStorage.getItem('gradingData');
        if (!str) { alert('Kayıt bulunamadı.'); return; }
        const d = JSON.parse(str);

        evaluationTypeInput.value = d.evaluationType || 'Ara Değerlendirme Notu';
        courseCodeInput.value     = d.courseCode     || '';
        instructorNameInput.value = d.instructorName || '';
        updateDynamicTitle();

        numProjectsInput.value = d.numProj || 3;
        numCriteriaInput.value = d.numCrit || 3;
        projectNames  = d.projectNames || [];
        criteriaNames = d.criteriaNames || [];
        students      = d.students      || [];

        setConfigButton.click();   // input-ları yeniden üret
        renderTable();
        alert('Veriler yüklendi.');
    });

    clearDataButton.addEventListener('click', () => {
        if (!confirm('Tüm veriler silinsin mi?')) return;
        localStorage.removeItem('gradingData');
        projectNames = []; criteriaNames = []; students = [];
        numProjectsInput.value = 3; numCriteriaInput.value = 3;
        namesConfigSection.style.display = 'none';
        projectNamesContainer.innerHTML = '';
        criteriaNamesContainer.innerHTML = '';
        renderTable();
        updateDynamicTitle();
        alert('Veriler sıfırlandı.');
    });


    /* === EXCEL’e AKTAR === */
    function exportTableToExcel() {
        const tbl = gradingTableContainer.querySelector('table');
        if (!tbl) { alert('Önce tabloyu oluşturun.'); return; }
        if (typeof XLSX === 'undefined') {
            alert('XLSX kütüphanesi yüklenemedi; interneti kontrol et.');
            return;
        }
        const ws = XLSX.utils.table_to_sheet(tbl, { raw:true });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Degerlendirme');
        XLSX.writeFile(wb, 'degerlendirme.xlsx');
    }
    exportExcelButton.addEventListener('click', exportTableToExcel);


    /* === İLK AÇILIŞ === */
    updateDynamicTitle();
    updatePlaceholder();
    classStats();
});
