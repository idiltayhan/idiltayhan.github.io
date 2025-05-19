document.addEventListener('DOMContentLoaded', () => {
    // Rapor Bilgileri DOM Elemanları
    const evaluationTypeInput = document.getElementById('evaluationType');
    const courseCodeInput = document.getElementById('courseCode');
    const instructorNameInput = document.getElementById('instructorName');
    const dynamicTableTitleDiv = document.getElementById('dynamicTableTitle');

    // Yapılandırma DOM Elemanları
    const numProjectsInput = document.getElementById('numProjects');
    const numCriteriaInput = document.getElementById('numCriteria');
    const setConfigButton = document.getElementById('setConfigButton');
    const namesConfigSection = document.getElementById('namesConfigSection');
    const projectNamesContainer = document.getElementById('projectNamesContainer');
    const criteriaNamesContainer = document.getElementById('criteriaNamesContainer');
    const saveNamesButton = document.getElementById('saveNamesButton');

    // Öğrenci Ekleme DOM Elemanları
    const studentNameInput = document.getElementById('studentNameInput');
    const addStudentButton = document.getElementById('addStudentButton');

    // Tablo ve İstatistik DOM Elemanları
    const gradingTableContainer = document.getElementById('gradingTableContainer');
    const classSuccessStatsContainer = document.getElementById('classSuccessStats');

    // Veri Yönetimi Butonları
    const saveDataButton = document.getElementById('saveDataButton');
    const loadDataButton = document.getElementById('loadDataButton');
    const clearDataButton = document.getElementById('clearDataButton');

    // Global Değişkenler
    let projectNames = [];
    let criteriaNames = []; // Array of objects: [{ name: 'Kriter Adı', dc: 1, pc: 1 }, ...]
    let students = [];
    const SUCCESS_THRESHOLD = 50; // Başarı eşiği (100 üzerinden)

    // --- Rapor Bilgileri Fonksiyonları ---
    function updateDynamicTableTitle() {
        if (!dynamicTableTitleDiv) return;

        const evalType = evaluationTypeInput.value;
        const course = courseCodeInput.value.trim();
        const instructor = instructorNameInput.value.trim();

        let titleParts = [];
        // Değerlendirme türü her zaman gösterilsin, boş olamaz (dropdown)
        titleParts.push(`Değerlendirme Türü: ${evalType}`);
        if (course) titleParts.push(`Ders: ${course}`);
        if (instructor) titleParts.push(`Öğr. Gör.: ${instructor}`);

        if (titleParts.length > 0) {
            dynamicTableTitleDiv.innerHTML = titleParts.join(' <span class="title-separator">|</span> ');
            dynamicTableTitleDiv.style.display = 'block';
        } else {
            // Bu durum normalde yaşanmaz çünkü Değerlendirme Türü hep seçili olacak.
            dynamicTableTitleDiv.innerHTML = '';
            dynamicTableTitleDiv.style.display = 'none';
        }
    }

    // Rapor Bilgileri Alanları için Event Listener'lar
    evaluationTypeInput.addEventListener('change', updateDynamicTableTitle);
    courseCodeInput.addEventListener('input', updateDynamicTableTitle);
    instructorNameInput.addEventListener('input', updateDynamicTableTitle);


    // --- Yapılandırma Fonksiyonları ---
    setConfigButton.addEventListener('click', () => {
        const pCount = parseInt(numProjectsInput.value);
        const cCount = parseInt(numCriteriaInput.value);

        if (pCount < 1 || cCount < 1) {
            alert("Proje ve kriter sayısı en az 1 olmalıdır.");
            return;
        }

        projectNamesContainer.innerHTML = '<h4>Proje İsimleri:</h4>';
        for (let i = 0; i < pCount; i++) {
            const currentName = (projectNames[i] && projectNames[i] !== `Proje ${i + 1}`) ? projectNames[i] : `Proje ${i + 1}`;
            projectNamesContainer.innerHTML += `
                <div>
                    <label for="projectName${i}">Proje ${i + 1}:</label>
                    <input type="text" id="projectName${i}" value="${currentName}">
                </div>
            `;
        }

        criteriaNamesContainer.innerHTML = '<h4>Kriter İsimleri:</h4>';
        for (let i = 0; i < cCount; i++) {
            const currentCriterion = criteriaNames[i] || {};
            const currentName = (currentCriterion.name && currentCriterion.name !== `Kriter ${i + 1}`) ? currentCriterion.name : `Kriter ${i + 1}`;
            const currentDC = (typeof currentCriterion.dc !== 'undefined') ? parseInt(currentCriterion.dc) : 1;
            const currentPC = (typeof currentCriterion.pc !== 'undefined') ? parseInt(currentCriterion.pc) : 1;

            let dcOptionsHTML = '';
            for (let j = 1; j <= 12; j++) {
                dcOptionsHTML += `<option value="${j}" ${j === currentDC ? 'selected' : ''}>${j}</option>`;
            }
            let pcOptionsHTML = '';
            for (let k = 1; k <= 12; k++) {
                pcOptionsHTML += `<option value="${k}" ${k === currentPC ? 'selected' : ''}>${k}</option>`;
            }

            criteriaNamesContainer.innerHTML += `
                <div class="criterion-config-item">
                    <label for="criteriaName${i}" class="criteria-item-label">Kriter ${i + 1}:</label>
                    <input type="text" id="criteriaName${i}" class="criteria-item-name-input" value="${currentName}">
                    <label for="criteriaDC${i}" class="criteria-item-dcpc-label">DÇ:</label>
                    <select id="criteriaDC${i}" class="criteria-item-select">${dcOptionsHTML}</select>
                    <label for="criteriaPC${i}" class="criteria-item-dcpc-label">PÇ:</label>
                    <select id="criteriaPC${i}" class="criteria-item-select">${pcOptionsHTML}</select>
                </div>
            `;
        }
        namesConfigSection.style.display = 'block';
        updatePlaceholderText();
        renderGradingTable();
    });

    saveNamesButton.addEventListener('click', () => {
        const newProjectNames = [];
        const pCount = parseInt(numProjectsInput.value);
        for (let i = 0; i < pCount; i++) {
            const nameInput = document.getElementById(`projectName${i}`);
            newProjectNames.push(nameInput ? nameInput.value.trim() || `Proje ${i + 1}` : `Proje ${i + 1}`);
        }

        const newCriteriaConfig = [];
        const cCount = parseInt(numCriteriaInput.value);
        for (let i = 0; i < cCount; i++) {
            const nameInput = document.getElementById(`criteriaName${i}`);
            const dcSelect = document.getElementById(`criteriaDC${i}`);
            const pcSelect = document.getElementById(`criteriaPC${i}`);
            newCriteriaConfig.push({
                name: nameInput ? nameInput.value.trim() || `Kriter ${i + 1}` : `Kriter ${i + 1}`,
                dc: dcSelect ? parseInt(dcSelect.value) : 1,
                pc: pcSelect ? parseInt(pcSelect.value) : 1
            });
        }

        students.forEach(student => {
            const updatedGrades = {};
            newProjectNames.forEach((newPName, pIdx) => {
                updatedGrades[newPName] = {};
                const oldPName = projectNames[pIdx];
                newCriteriaConfig.forEach((newCConfig, cIdx) => {
                    let score = 0;
                    if (oldPName && student.grades[oldPName]) {
                        const oldCriterion = criteriaNames[cIdx];
                        let oldCNameKey;
                        if (typeof oldCriterion === 'string') {
                            oldCNameKey = oldCriterion;
                        } else if (oldCriterion && typeof oldCriterion.name === 'string') {
                            oldCNameKey = oldCriterion.name;
                        }
                        if (oldCNameKey && typeof student.grades[oldPName][oldCNameKey] !== 'undefined') {
                            score = student.grades[oldPName][oldCNameKey];
                        }
                    }
                    updatedGrades[newPName][newCConfig.name] = score;
                });
            });
            student.grades = updatedGrades;
        });
        
        projectNames = newProjectNames;
        criteriaNames = newCriteriaConfig;

        alert("Proje ve kriter isimleri kaydedildi. Tablo güncellenecek.");
        renderGradingTable();
    });

    // --- Öğrenci ve Not İşlemleri ---
    addStudentButton.addEventListener('click', () => {
        if (projectNames.length === 0 || criteriaNames.length === 0) {
            alert("Lütfen önce proje ve kriter yapılandırmasını yapıp isimleri kaydedin.");
            return;
        }
        const studentName = studentNameInput.value.trim();
        if (studentName === "") {
            alert("Lütfen öğrenci adı giriniz.");
            return;
        }
        if (students.find(s => s.name === studentName)) {
            alert("Bu isimde bir öğrenci zaten mevcut.");
            return;
        }
        const studentId = Date.now().toString();
        const newStudent = { id: studentId, name: studentName, grades: {} };
        projectNames.forEach(pName => {
            newStudent.grades[pName] = {};
            criteriaNames.forEach(cConfig => {
                newStudent.grades[pName][cConfig.name] = 0;
            });
        });
        students.push(newStudent);
        studentNameInput.value = "";
        renderGradingTable();
    });

    function calculateStudentFinalGrade(student) {
        if (!student || !student.grades || projectNames.length === 0) return 0;
        let totalProjectAverages = 0;
        let validProjectsCount = 0;
        projectNames.forEach(pName => {
            if (student.grades[pName] && criteriaNames.length > 0) {
                let projectScoreSum = 0;
                let actualCriteriaInProject = 0;
                criteriaNames.forEach(cConfig => {
                    if (typeof student.grades[pName][cConfig.name] === 'number') {
                        projectScoreSum += student.grades[pName][cConfig.name];
                        actualCriteriaInProject++;
                    }
                });
                if (actualCriteriaInProject > 0) {
                    totalProjectAverages += (projectScoreSum / actualCriteriaInProject);
                    validProjectsCount++;
                }
            }
        });
        return validProjectsCount > 0 ? (totalProjectAverages / validProjectsCount) : 0;
    }

    function renderGradingTable() {
        // updateDynamicTableTitle(); // Tablo render edilmeden önce başlık güncellenebilir veya render sonrası. Zaten event listener ile anlık güncelleniyor.

        if (projectNames.length === 0 || criteriaNames.length === 0) {
            updatePlaceholderText();
            calculateAndDisplayClassSuccessStats();
            return;
        }
        if (students.length === 0 && (projectNames.length > 0 || criteriaNames.length > 0)) {
            gradingTableContainer.innerHTML = '<p class="placeholder-text">Yapılandırma tamam. Değerlendirme yapmak için öğrenci ekleyin.</p>';
            calculateAndDisplayClassSuccessStats();
            return;
        }
        if (students.length === 0){
            updatePlaceholderText();
            calculateAndDisplayClassSuccessStats();
            return;
        }

        let tableHTML = '<table><thead>';
        tableHTML += '<tr><th rowspan="2" class="student-name-col">Öğrenci Adı</th>';
        projectNames.forEach(pName => {
            tableHTML += `<th colspan="${criteriaNames.length}" class="project-header">${pName}</th>`;
        });
        tableHTML += '<th rowspan="2" class="final-grade-col">Son Not (Ort.)</th></tr>';
        tableHTML += '<tr class="criteria-header">';
        projectNames.forEach(() => {
            criteriaNames.forEach(cConfig => {
                tableHTML += `<th>${cConfig.name}</th>`;
            });
        });
        tableHTML += '</tr></thead><tbody>';
        students.forEach(student => {
            tableHTML += `<tr data-student-id="${student.id}"><td class="student-name-col">${student.name}</td>`;
            projectNames.forEach(pName => {
                criteriaNames.forEach(cConfig => {
                    const grade = student.grades[pName]?.[cConfig.name] !== undefined ? student.grades[pName][cConfig.name] : 0;
                    tableHTML += `<td><input type="number" min="0" max="100" value="${grade}" 
                                        data-project="${pName}" data-criteria="${cConfig.name}" 
                                        onchange="updateGrade(this, '${student.id}', '${pName}', '${cConfig.name}')"
                                        oninput="updateGrade(this, '${student.id}', '${pName}', '${cConfig.name}')"></td>`;
                });
            });
            const finalGrade = calculateStudentFinalGrade(student);
            tableHTML += `<td class="final-grade-cell" id="final-grade-${student.id}">${finalGrade.toFixed(2)}</td>`;
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        gradingTableContainer.innerHTML = tableHTML;
        calculateAndDisplayClassSuccessStats();
    }

    window.updateGrade = function(inputElement, studentId, projectName, criteriaName) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            let value = parseFloat(inputElement.value);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 100) value = 100;
            if (!student.grades[projectName]) student.grades[projectName] = {};
            student.grades[projectName][criteriaName] = value;
            const finalGradeCell = document.getElementById(`final-grade-${student.id}`);
            if (finalGradeCell) {
                const finalGrade = calculateStudentFinalGrade(student);
                finalGradeCell.textContent = finalGrade.toFixed(2);
            }
            calculateAndDisplayClassSuccessStats();
        }
    }
    
    function updatePlaceholderText() {
        if (projectNames.length === 0 || criteriaNames.length === 0) {
            gradingTableContainer.innerHTML = '<p class="placeholder-text">Lütfen önce yapılandırmayı uygulayın, proje/kriter isimlerini kaydedin ve öğrenci ekleyin.</p>';
        } else if (students.length === 0) {
            gradingTableContainer.innerHTML = '<p class="placeholder-text">Yapılandırma tamam. Değerlendirme yapmak için öğrenci ekleyin.</p>';
        }
    }

    // --- Veri Yönetimi Fonksiyonları ---
    saveDataButton.addEventListener('click', () => {
        if (students.length === 0 && projectNames.length === 0 && criteriaNames.length === 0 &&
            !courseCodeInput.value && !instructorNameInput.value) { // Rapor bilgileri de boşsa
            alert("Kaydedilecek veri bulunmuyor.");
            return;
        }
        const dataToSave = {
            // Rapor Bilgileri
            reportEvalType: evaluationTypeInput.value,
            reportCourseCode: courseCodeInput.value,
            reportInstructorName: instructorNameInput.value,
            // Yapılandırma ve Not Verileri
            numProjectsStored: parseInt(numProjectsInput.value),
            numCriteriaStored: parseInt(numCriteriaInput.value),
            projectNames: projectNames,
            criteriaNames: criteriaNames,
            students: students
        };
        localStorage.setItem('gradingSystemData', JSON.stringify(dataToSave));
        alert("Veriler başarıyla yerel depolamaya kaydedildi!");
    });

    loadDataButton.addEventListener('click', () => {
        const savedData = localStorage.getItem('gradingSystemData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Rapor Bilgilerini Yükle
            evaluationTypeInput.value = parsedData.reportEvalType || 'Ara Değerlendirme Notu';
            courseCodeInput.value = parsedData.reportCourseCode || '';
            instructorNameInput.value = parsedData.reportInstructorName || '';
            updateDynamicTableTitle(); // Başlığı güncelle

            // Yapılandırma ve Not Verilerini Yükle
            numProjectsInput.value = parsedData.numProjectsStored || 3;
            numCriteriaInput.value = parsedData.numCriteriaStored || 3;
            projectNames = parsedData.projectNames || [];
            criteriaNames = parsedData.criteriaNames || [];
            
            setConfigButton.click(); // Bu, inputları ve selectleri dolduracak
            
            students = parsedData.students || [];
            renderGradingTable(); // Öğrenciler ve yapılandırma yüklendikten sonra tabloyu ve istatistikleri yeniden oluştur
            alert("Veriler başarıyla yüklendi!");
        } else {
            alert("Kaydedilmiş veri bulunamadı.");
        }
    });

    clearDataButton.addEventListener('click', () => {
        if (confirm("Tüm verileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            localStorage.removeItem('gradingSystemData');

            // Rapor Bilgilerini Sıfırla
            evaluationTypeInput.value = 'Ara Değerlendirme Notu'; // Varsayılan
            courseCodeInput.value = '';
            instructorNameInput.value = '';
            updateDynamicTableTitle(); // Başlığı güncelle

            // Yapılandırma ve Not Verilerini Sıfırla
            projectNames = [];
            criteriaNames = [];
            students = [];
            numProjectsInput.value = 3;
            numCriteriaInput.value = 3;
            projectNamesContainer.innerHTML = '';
            criteriaNamesContainer.innerHTML = '';
            namesConfigSection.style.display = 'none';
            
            renderGradingTable(); 
            alert("Tüm veriler silindi.");
        }
    });

    // --- Sınıf Başarı İstatistikleri Fonksiyonları ---
    function getUniqueDCPCPairs() {
        const uniquePairs = [];
        const seenPairs = new Set();
        criteriaNames.forEach(criterion => {
            const pairKey = `${criterion.dc}_${criterion.pc}`;
            if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                uniquePairs.push({ dc: criterion.dc, pc: criterion.pc });
            }
        });
        return uniquePairs;
    }

    function calculateAndDisplayClassSuccessStats() {
        if (!classSuccessStatsContainer) return;

        let content = '<h3>Sınıf Başarı İstatistikleri (Kriter Bazlı)</h3>';

        if (students.length === 0 || criteriaNames.length === 0) {
            content += '<p>İstatistik hesaplamak için yeterli öğrenci veya tanımlı kriter bulunmamaktadır.</p>';
            classSuccessStatsContainer.innerHTML = content;
            return;
        }

        const uniquePairs = getUniqueDCPCPairs();
        if (uniquePairs.length === 0) {
            content += '<p>Değerlendirme için tanımlanmış DÇ/PÇ çifti bulunamadı.</p>';
            classSuccessStatsContainer.innerHTML = content;
            return;
        }

        let statsGenerated = false;
        let listHTML = '<ul>';

        uniquePairs.forEach(pair => {
            let totalScoresForPair = 0;
            let successfulScoresForPair = 0;
            const relevantCriteriaConfigs = criteriaNames.filter(c => c.dc === pair.dc && c.pc === pair.pc);

            if (relevantCriteriaConfigs.length > 0) {
                students.forEach(student => {
                    projectNames.forEach(pName => {
                        relevantCriteriaConfigs.forEach(criterionConfig => {
                            if (student.grades[pName] && typeof student.grades[pName][criterionConfig.name] === 'number') {
                                const score = student.grades[pName][criterionConfig.name];
                                totalScoresForPair++;
                                if (score >= SUCCESS_THRESHOLD) {
                                    successfulScoresForPair++;
                                }
                            }
                        });
                    });
                });
            }

            if (totalScoresForPair > 0) {
                statsGenerated = true;
                const successPercentage = (successfulScoresForPair / totalScoresForPair) * 100;
                listHTML += `<li>DÇ ${pair.dc} / PÇ ${pair.pc} için Sınıf Başarısı: ${successPercentage.toFixed(2)}% (${successfulScoresForPair} başarılı / ${totalScoresForPair} toplam değerlendirme puanı)</li>`;
            }
        });
        listHTML += '</ul>';

        if (statsGenerated) {
            content += listHTML;
        } else {
            content += '<p>Tanımlı DÇ/PÇ çiftleri için girilmiş herhangi bir değerlendirme puanı bulunamadı. (Not girilmemiş olabilir)</p>';
        }
        content += `<p><small>Not: Başarı eşiği ${SUCCESS_THRESHOLD}/100 olarak kabul edilmiştir.</small></p>`;
        classSuccessStatsContainer.innerHTML = content;
    }

    // --- Sayfa İlk Yüklendiğinde Çalışacaklar ---
    updateDynamicTableTitle(); // Rapor başlığını ilk değerleriyle ayarla
    updatePlaceholderText();   // Tablo için placeholder metnini ayarla
    calculateAndDisplayClassSuccessStats(); // İstatistik bölümünü ilk haliyle ayarla
});