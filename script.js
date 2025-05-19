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
            for (let j=1;j<=12;j++){
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

        const st={id:Date.now().toString(), name, grades:{}};
        projectNames.forEach(p=>{
            st.grades[p]={};
            criteriaNames.forEach(c=>st.grades[p][c.name]=0);
        });
        students.push(st);
        studentNameInput.value='';
        renderTable();
    });


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

    function renderTable(){
        if(!projectNames.length||!criteriaNames.length){updatePlaceholder();classStats();return;}
        if(!students.length){updatePlaceholder();classStats();return;}

        let html = '<table><thead><tr><th rowspan="2" class="student-name-col">Öğrenci</th>';
        projectNames.forEach(p=>html+=`<th colspan="${criteriaNames.length}" class="project-header">${p}</th>`);
        html+='<th rowspan="2" class="final-grade-col">Ortalama</th></tr><tr>';
        projectNames.forEach(()=>criteriaNames.forEach(cr=>html+=`<th>${cr.name}</th>`));
        html+='</tr></thead><tbody>';

        students.forEach(st=>{
            html+=`<tr><td class="student-name-col">${st.name}</td>`;
            projectNames.forEach(p=>criteriaNames.forEach(cr=>{
                html+=`<td><input type="number" min="0" max="100" value="${st.grades[p][cr.name]}"
                       oninput="updateGrade(this,'${st.id}','${p}','${cr.name}')"
                       onchange="updateGrade(this,'${st.id}','${p}','${cr.name}')"></td>`;
            }));
            html+=`<td id="final-${st.id}" class="final-grade-cell">${studentAverage(st).toFixed(2)}</td></tr>`;
        });
        html+='</tbody></table>';
        gradingTableContainer.innerHTML=html;
        classStats();
    }

    function updatePlaceholder(){
        gradingTableContainer.innerHTML=
          `<p class="placeholder-text">${
              (!projectNames.length||!criteriaNames.length)?
              'Önce yapılandırmayı uygulayın.' : 'Öğrenci ekleyin.'
          }</p>`;
    }


    /* === İstatistik (ortalama yüzde) === */
    function uniqueDCPC(){
        const set=new Set(),arr=[];
        criteriaNames.forEach(c=>{
            const k=`${c.dc}_${c.pc}`;
            if(!set.has(k)){set.add(k);arr.push({dc:c.dc,pc:c.pc});}
        });
        return arr;
    }

    function classStats(){
        let html='<h3>Ortalama Puan (DÇ / PÇ)</h3>';
        if(!students.length||!criteriaNames.length){
            classSuccessStatsDiv.innerHTML=html+'<p>İstatistik için veri yok.</p>';
            return;
        }
        html+='<ul>';
        uniqueDCPC().forEach(pr=>{
            let sum=0,count=0;
            const rel=criteriaNames.filter(c=>c.dc===pr.dc&&c.pc===pr.pc);
            students.forEach(st=>projectNames.forEach(p=>rel.forEach(c=>{
                sum+=st.grades[p][c.name]; count++;
            })));
            const avg = count? (sum/count).toFixed(2)+'%' : '—';
            html+=`<li>DÇ ${pr.dc} / PÇ ${pr.pc}: ${avg}</li>`;
        });
        html+='</ul>';
        classSuccessStatsDiv.innerHTML=html;
    }


    /* === Veri Yönetimi === */
    saveDataButton.addEventListener('click',()=>{
        if(!students.length&&!projectNames.length&&!criteriaNames.length
           &&!courseCodeInput.value&&!instructorNameInput.value){
            alert('Kaydedilecek veri yok.');return;
        }
        localStorage.setItem('gradingData', JSON.stringify({
            evaluationType:evaluationTypeInput.value,
            courseCode:courseCodeInput.value,
            instructorName:instructorNameInput.value,
            numProj:+numProjectsInput.value,
            numCrit:+numCriteriaInput.value,
            projectNames, criteriaNames, students
        }));
        alert('Kaydedildi.');
    });

    loadDataButton.addEventListener('click',()=>{
        const s=localStorage.getItem('gradingData');
        if(!s){alert('Kayıt yok.');return;}
        const d=JSON.parse(s);
        evaluationTypeInput.value=d.evaluationType||'Ara Değerlendirme Notu';
        courseCodeInput.value=d.courseCode||'';
        instructorNameInput.value=d.instructorName||'';
        updateDynamicTitle();

        numProjectsInput.value=d.numProj||3;
        numCriteriaInput.value=d.numCrit||3;
        projectNames=d.projectNames||[];
        criteriaNames=d.criteriaNames||[];
        students=d.students||[];

        setConfigButton.click();
        renderTable();
        alert('Yüklendi.');
    });

    clearDataButton.addEventListener('click',()=>{
        if(!confirm('Tüm veriler silinsin mi?'))return;
        localStorage.removeItem('gradingData');
        projectNames=[];criteriaNames=[];students=[];
        numProjectsInput.value=3;numCriteriaInput.value=3;
        namesConfigSection.style.display='none';
        projectNamesContainer.innerHTML='';
        criteriaNamesContainer.innerHTML='';
        renderTable();updateDynamicTitle();
        alert('Sıfırlandı.');
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

        /* 3) İstatistik (ortalama) */
        const statsAoa=[['DÇ','PÇ','Ortalama %']];
        uniqueDCPC().forEach(pr=>{
            let sum=0,count=0;
            const rel=criteriaNames.filter(c=>c.dc===pr.dc&&c.pc===pr.pc);
            students.forEach(st=>projectNames.forEach(p=>rel.forEach(c=>{
                sum+=st.grades[p][c.name]; count++;
            })));
            const avg=count? (sum/count).toFixed(2)+'%' : '—';
            statsAoa.push([pr.dc, pr.pc, avg]);
        });
        const wsStats = XLSX.utils.aoa_to_sheet(statsAoa);
        enableWrap(wsStats,3,20);

        /* 4) Kitap */
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsGrades, 'Degerlendirme');
        XLSX.utils.book_append_sheet(wb, wsCrit,   'Kriterler');
        XLSX.utils.book_append_sheet(wb, wsStats,  'İstatistik');
        XLSX.writeFile(wb,'degerlendirme.xlsx',{cellStyles:true});
    }

    /* Dinleyici */
    exportExcelButton.addEventListener('click', exportTableToExcel);


    /* === İlk açılış === */
    updateDynamicTitle();
    updatePlaceholder();
    classStats();
});
