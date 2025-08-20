// Firebase 전역 변수
let firebaseApp = null;
let firebaseDb = null;
let isFirebaseEnabled = false;

// 전역 변수
let currentUser = null;
let brands = [];
let models = {};
let parts = {};
let selectedParts = [];
let shopInfo = {};
let customerInfo = {};
let modelImages = {}; // 모델별 이미지 저장
let laborRate = 55000; // 시간당 공임비 (기본값: 55,000원)

// Firebase 초기화 확인
function initializeFirebase() {
    console.log('🔥 Firebase 초기화 시도 중...');
    console.log('window.firebaseApp:', window.firebaseApp);
    console.log('window.firebaseDb:', window.firebaseDb);
    
    // Firebase가 로드되었는지 확인
    if (window.firebaseApp && window.firebaseDb) {
        firebaseApp = window.firebaseApp;
        firebaseDb = window.firebaseDb;
        isFirebaseEnabled = true;
        console.log('✅ Firebase 연결 성공!');
        
        // 실시간 동기화 설정
        setupRealtimeSync();
        console.log('🚀 실시간 동기화 활성화됨!');
        return true;
    } else {
        console.log('❌ Firebase 설정이 없습니다. LocalStorage를 사용합니다.');
        isFirebaseEnabled = false;
        return false;
    }
}

// 실시간 동기화 설정
function setupRealtimeSync() {
    if (!isFirebaseEnabled || !firebaseDb) return;
    
    const docRef = window.firebaseDoc(firebaseDb, 'motorcycleData', 'main');
    
    // 실시간 리스너 설정
    window.firebaseOnSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            console.log('🔄 실시간 데이터 업데이트 감지');
            
            // 데이터 업데이트
            brands = data.brands || brands;
            models = data.models || models;
            parts = data.parts || parts;
            shopInfo = data.shopInfo || shopInfo;
            customerInfo = data.customerInfo || customerInfo;
            modelImages = data.modelImages || modelImages;
            laborRate = data.laborRate || laborRate;
            
            // UI 업데이트
            updateAllInterfaces();
            console.log('✨ UI 업데이트 완료');
        }
    }, (error) => {
        console.error('실시간 동기화 오류:', error);
    });
}

// 모든 인터페이스 업데이트
function updateAllInterfaces() {
    // 브랜드 선택 업데이트
    updateBrandSelect();
    
    // 관리자 인터페이스 업데이트
    if (currentUser === 'admin') {
        updateAdminInterface();
        displayExistingParts();
        displayPartsAdminDiagram();
    }
    
    // 사용자 인터페이스 업데이트
    displayPartsDiagram();
    updateSelectedPartsList();
    
    // 공임비 입력 필드 업데이트
    const laborRateInput = document.getElementById('labor-rate');
    if (laborRateInput) {
        laborRateInput.value = laborRate;
    }
}

// 초기 데이터 설정
function initializeData() {
    // 기본 브랜드 데이터 (오토바이 브랜드)
    brands = ['혼다', '야마하', '가와사키', '스즈키', '할리데이비슨'];
    
    // 기본 모델 데이터
    models = {
        '혼다': ['CBR600RR', 'CBR1000RR', 'CB650R', 'PCX150', 'Forza300'],
        '야마하': ['YZF-R6', 'YZF-R1', 'MT-07', 'MT-09', 'XMAX300'],
        '가와사키': ['Ninja ZX-6R', 'Ninja ZX-10R', 'Z650', 'Z900', 'Versys-X300'],
        '스즈키': ['GSX-R600', 'GSX-R1000', 'SV650', 'V-Strom650', 'Address125'],
        '할리데이비슨': ['Sportster Iron 883', 'Street Glide', 'Road King', 'Fat Boy', 'Forty-Eight']
    };
    
    // 기본 부품 데이터 (오토바이 부품)
    parts = {
        '혼다-CBR600RR': [
            { name: '엔진오일', price: 35000, position: '15, 60' },
            { name: '브레이크패드', price: 80000, position: '35, 45' },
            { name: '에어필터', price: 45000, position: '55, 35' },
            { name: '타이어', price: 150000, position: '75, 50' },
            { name: '체인', price: 120000, position: '85, 70' }
        ],
        '야마하-YZF-R6': [
            { name: '엔진오일', price: 40000, position: '35, 25' },
            { name: '브레이크패드', price: 85000, position: '75, 85' },
            { name: '에어필터', price: 50000, position: '55, 35' },
            { name: '타이어', price: 160000, position: '25, 95' }
        ]
    };
    
    // 로컬 스토리지에서 데이터 로드
    loadFromStorage();
}

// 데이터 저장 관리 (Firebase + LocalStorage)
async function saveToStorage() {
    const data = {
        brands,
        models,
        parts,
        shopInfo,
        customerInfo,
        modelImages,
        laborRate
    };
    
    // Firebase 저장 시도
    if (isFirebaseEnabled && firebaseDb) {
        try {
            await window.firebaseSetDoc(window.firebaseDoc(firebaseDb, 'motorcycleData', 'main'), data);
            console.log('Firebase에 데이터 저장 완료');
        } catch (error) {
            console.error('Firebase 저장 실패:', error);
            // Firebase 실패 시 LocalStorage로 폴백
            localStorage.setItem('motorcyclePartsData', JSON.stringify(data));
        }
    } else {
        // LocalStorage 저장
        localStorage.setItem('motorcyclePartsData', JSON.stringify(data));
    }
}

async function loadFromStorage() {
    let data = null;
    
    // Firebase에서 데이터 로드 시도
    if (isFirebaseEnabled && firebaseDb) {
        try {
            const docRef = window.firebaseDoc(firebaseDb, 'motorcycleData', 'main');
            const docSnap = await window.firebaseGetDoc(docRef);
            
            if (docSnap.exists()) {
                data = docSnap.data();
                console.log('Firebase에서 데이터 로드 완료');
            } else {
                console.log('Firebase에 저장된 데이터가 없습니다.');
            }
        } catch (error) {
            console.error('Firebase 로드 실패:', error);
        }
    }
    
    // Firebase에서 데이터를 가져오지 못한 경우 LocalStorage 사용
    if (!data) {
        const saved = localStorage.getItem('motorcyclePartsData');
        if (saved) {
            data = JSON.parse(saved);
            console.log('LocalStorage에서 데이터 로드 완료');
        }
    }
    
    // 데이터 적용
    if (data) {
        brands = data.brands || brands;
        models = data.models || models;
        parts = data.parts || parts;
        shopInfo = data.shopInfo || {};
        customerInfo = data.customerInfo || {};
        modelImages = data.modelImages || {};
        laborRate = data.laborRate || 55000;
        
        // 공임비 입력 필드 업데이트
        const laborRateInput = document.getElementById('labor-rate');
        if (laborRateInput) {
            laborRateInput.value = laborRate;
        }
    }
}

// 페이지 전환 함수
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// 탭 전환 함수
function showTab(tabId) {
    // 메인 탭
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// 관리자 탭 전환 함수
function showAdminTab(tabId) {
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// 로그인 처리
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 간단한 로그인 검증 (실제 환경에서는 서버 인증 필요)
    if (!username || !password) {
        alert('사용자명과 비밀번호를 입력하세요.');
        return;
    }
    
    // 관리자 계정 확인
    if (username === 'admin' && password === 'admin') {
        currentUser = { username, role: 'admin' };
        showPage('admin-page');
        updateAdminInterface();
        loadSavedData();
    } else if (username === 'user' && password === 'user') {
        // 일반 사용자 계정
        currentUser = { username, role: 'user' };
        showPage('main-page');
        document.getElementById('current-user').textContent = username;
        document.getElementById('admin-btn').style.display = 'none';
        loadSavedData();
    } else {
        alert('잘못된 사용자명 또는 비밀번호입니다.');
    }
}

// 저장된 데이터 로드
function loadSavedData() {
    // 정비업체 정보 로드
    if (shopInfo.name) {
        document.getElementById('shop-name').value = shopInfo.name || '';
        document.getElementById('shop-phone').value = shopInfo.phone || '';
        document.getElementById('shop-address').value = shopInfo.address || '';
        document.getElementById('shop-owner').value = shopInfo.owner || '';
    }
    
    // 고객 정보 로드
    if (customerInfo.name) {
            document.getElementById('customer-name').value = customerInfo.name || '';
            document.getElementById('customer-phone').value = customerInfo.phone || '';
            document.getElementById('car-year').value = customerInfo.carYear || '';
    }
    
    updateBrandSelect();
}

// 브랜드 선택 업데이트
function updateBrandSelect() {
    const brandSelects = ['car-brand', 'brand-select', 'parts-brand-select'];
    
    brandSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">선택하세요</option>';
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                select.appendChild(option);
            });
        }
    });
}

// 모델 선택 업데이트
function updateModelSelect(brandSelectId, modelSelectId) {
    const brandSelect = document.getElementById(brandSelectId);
    const modelSelect = document.getElementById(modelSelectId);
    const selectedBrand = brandSelect.value;
    
    modelSelect.innerHTML = '<option value="">모델 선택</option>';
    
    if (selectedBrand && models[selectedBrand]) {
        models[selectedBrand].forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    }
}

// 부품 도면 표시
function displayPartsDiagram() {
    const brand = document.getElementById('car-brand').value;
    const model = document.getElementById('car-model').value;
    const diagramContainer = document.getElementById('parts-diagram');
    
    if (!brand || !model) {
        diagramContainer.innerHTML = '<p>오토바이를 선택하면 부품 도면이 표시됩니다.</p>';
        return;
    }
    
    const key = `${brand}-${model}`;
    const carParts = parts[key];
    
    if (!carParts) {
        diagramContainer.innerHTML = '<p>해당 오토바이의 부품 정보가 없습니다.</p>';
        return;
    }
    
    // 업로드된 이미지가 있으면 사용, 없으면 기본 도면
    const imageKey = `${brand}-${model}`;
    const savedImage = modelImages[imageKey];
    
    if (savedImage) {
        diagramContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px; border: 2px solid #28a745;">
                <img src="${savedImage}" alt="${brand} ${model} 부품 도면" style="width: 100%; height: 100%; object-fit: fill;">
            </div>
        `;
    } else {
        diagramContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #666;">
                    <p>${brand} ${model} 부품 도면</p>
                    <small>부품을 클릭하여 선택하세요</small>
                </div>
            </div>
        `;
    }
    
    // 부품 마커 추가
    const diagramDiv = diagramContainer.firstElementChild;
    carParts.forEach((part, index) => {
        const marker = document.createElement('div');
        marker.className = 'part-marker';
        marker.textContent = index + 1;
        
        // 위치 데이터 처리 (문자열 또는 객체 형태 모두 지원)
        let x, y;
        if (typeof part.position === 'string') {
            const coords = part.position.split(', ');
            x = parseFloat(coords[0]);
            y = parseFloat(coords[1]);
        } else {
            x = part.position.x;
            y = part.position.y;
        }
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        
        marker.title = `${part.name} - ${part.price.toLocaleString()}원`;
        marker.onclick = () => selectPart(key, part);
        
        // 이미 선택된 부품인지 확인
        if (selectedParts.some(p => p.name === part.name && p.key === key)) {
            marker.classList.add('selected');
        }
        
        diagramDiv.appendChild(marker);
    });
}

// 부품 선택
function selectPart(key, part) {
    console.log(`부품 선택됨: ${part.name}`);
    const existingIndex = selectedParts.findIndex(p => p.name === part.name && p.key === key);
    
    if (existingIndex > -1) {
        // 이미 선택된 부품이면 제거
        selectedParts.splice(existingIndex, 1);
    } else {
        // 새로운 부품 추가
        selectedParts.push({ ...part, key });
    }
    
    updateSelectedPartsList();
    displayPartsDiagram(); // 마커 상태 업데이트
}

// 선택된 부품 목록 업데이트
function updateSelectedPartsList() {
    const partsList = document.getElementById('parts-list');
    const totalAmount = document.getElementById('total-amount');
    
    if (selectedParts.length === 0) {
        partsList.innerHTML = '<p>선택된 부품이 없습니다.</p>';
        totalAmount.textContent = '0';
        return;
    }
    
    let partsTotal = 0;
    let laborTotal = 0;
    partsList.innerHTML = '';
    
    selectedParts.forEach((part, index) => {
        // 부품별 작업시간 초기화 (없으면 1시간으로 설정)
        if (!part.laborHours) {
            part.laborHours = 1;
        }
        if (part.isIncluded === undefined) {
            part.isIncluded = false;
        }
        
        partsTotal += part.price;
        const partLaborCost = part.isIncluded ? 0 : (part.laborHours * laborRate);
        laborTotal += partLaborCost;
        
        const partItem = document.createElement('div');
        partItem.className = 'part-item';
        partItem.innerHTML = `
            <div class="part-info">
                <div class="part-header">
                    <span class="part-number">${index + 1}번</span>
                    <span class="part-name">${part.name}</span>
                    <span class="part-price-inline">부품: ${part.price.toLocaleString()}원</span>
                </div>
                <div class="part-labor-inline">
                    <span class="labor-time-display">
                        작업시간: 
                        <select class="labor-time-select" onchange="updateLaborTime(${index}, this.value)">
                            <option value="included" ${part.isIncluded ? 'selected' : ''}>포함</option>
                            <option value="0.5" ${!part.isIncluded && part.laborHours === 0.5 ? 'selected' : ''}>0.5시간</option>
                            <option value="1" ${!part.isIncluded && part.laborHours === 1 ? 'selected' : ''}>1시간</option>
                            <option value="1.5" ${!part.isIncluded && part.laborHours === 1.5 ? 'selected' : ''}>1.5시간</option>
                            <option value="2" ${!part.isIncluded && part.laborHours === 2 ? 'selected' : ''}>2시간</option>
                            <option value="2.5" ${!part.isIncluded && part.laborHours === 2.5 ? 'selected' : ''}>2.5시간</option>
                            <option value="3" ${!part.isIncluded && part.laborHours === 3 ? 'selected' : ''}>3시간</option>
                            <option value="custom" ${!part.isIncluded && ![0.5, 1, 1.5, 2, 2.5, 3].includes(part.laborHours) ? 'selected' : ''}>직접입력</option>
                        </select>
                        ${!part.isIncluded && ![0.5, 1, 1.5, 2, 2.5, 3].includes(part.laborHours) ? `<input type="number" 
                               class="labor-hours-input-inline" 
                               value="${part.laborHours}" 
                               min="0" 
                               step="0.5" 
                               onchange="updateLaborHours(${index}, this.value)">` : ''}
                    </span>
                </div>
            </div>
            <button class="remove-part" onclick="removePart(${index})">제거</button>
        `;
        
        partsList.appendChild(partItem);
    });
    
    const grandTotal = partsTotal + laborTotal;
    totalAmount.innerHTML = `
        <div>부품비: ${partsTotal.toLocaleString()}원</div>
        <div>공임비: ${laborTotal.toLocaleString()}원</div>
        <div style="border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; font-weight: bold;">
            총 금액: ${grandTotal.toLocaleString()}원
        </div>
    `;
}

// 부품 제거
function removePart(index) {
    selectedParts.splice(index, 1);
    updateSelectedPartsList();
    displayPartsDiagram();
}

// 작업시간 업데이트
function updateLaborHours(index, hours) {
    const laborHours = parseFloat(hours) || 0;
    selectedParts[index].laborHours = laborHours;
    updateSelectedPartsList();
}

// 작업시간 포함 여부 업데이트
function updateLaborTime(index, value) {
    if (value === 'included') {
        selectedParts[index].isIncluded = true;
        selectedParts[index].laborHours = 1; // 기본값 유지
    } else if (value === 'custom') {
        selectedParts[index].isIncluded = false;
        // 현재 값 유지하고 입력 필드 표시
    } else {
        selectedParts[index].isIncluded = false;
        selectedParts[index].laborHours = parseFloat(value);
    }
    updateSelectedPartsList();
}

function updateLaborInclusion(index, isIncluded) {
    selectedParts[index].isIncluded = isIncluded;
    updateSelectedPartsList();
}

// 견적서 생성
function generateQuote() {
    // 정보 수집
    shopInfo = {
        name: document.getElementById('shop-name').value,
        phone: document.getElementById('shop-phone').value,
        address: document.getElementById('shop-address').value,
        owner: document.getElementById('shop-owner').value
    };
    
    customerInfo = {
        name: document.getElementById('customer-name').value,
        phone: document.getElementById('customer-phone').value,
        brand: document.getElementById('car-brand').value,
        model: document.getElementById('car-model').value,
        year: document.getElementById('car-year').value
    };
    
    // 유효성 검사
    if (!shopInfo.name || !customerInfo.name || selectedParts.length === 0) {
        alert('모든 필수 정보를 입력하고 부품을 선택해주세요.');
        return;
    }
    
    // 견적서 HTML 생성
    const quoteDate = new Date().toLocaleDateString('ko-KR');
    let partsTotal = selectedParts.reduce((sum, part) => sum + part.price, 0);
    let laborTotal = selectedParts.reduce((sum, part) => {
        if (part.isIncluded) return sum; // 포함된 부품은 공임비 0
        const laborHours = part.laborHours || 1;
        return sum + (laborHours * laborRate);
    }, 0);
    let total = partsTotal + laborTotal;
    
    const quoteHTML = `
        <div class="quote-header">
            <h2>자동차 부품 견적서</h2>
            <p>견적일: ${quoteDate}</p>
        </div>
        
        <div class="quote-info">
            <div class="quote-section">
                <h4>정비업체 정보</h4>
                <p><strong>업체명:</strong> ${shopInfo.name}</p>
                <p><strong>대표자:</strong> ${shopInfo.owner}</p>
                <p><strong>전화번호:</strong> ${shopInfo.phone}</p>
                <p><strong>주소:</strong> ${shopInfo.address}</p>
            </div>
            
            <div class="quote-section">
                <h4>고객 정보</h4>
                <p><strong>고객명:</strong> ${customerInfo.name}</p>
                <p><strong>전화번호:</strong> ${customerInfo.phone}</p>
                <p><strong>오토바이:</strong> ${customerInfo.brand} ${customerInfo.model} (${customerInfo.year}년)</p>
            </div>
        </div>
        
        <table class="quote-table">
            <thead>
                <tr>
                    <th>부품명</th>
                    <th>부품단가</th>
                    <th>작업시간</th>
                    <th>공임비</th>
                    <th>합계</th>
                </tr>
            </thead>
            <tbody>
                ${selectedParts.map(part => {
                    const laborHours = part.laborHours || 1;
                    const laborCost = part.isIncluded ? 0 : (laborHours * laborRate);
                    const itemTotal = part.price + laborCost;
                    const timeDisplay = part.isIncluded ? '포함' : `${laborHours}시간`;
                    return `
                        <tr>
                            <td>${part.name}</td>
                            <td>${part.price.toLocaleString()}원</td>
                            <td>${timeDisplay}</td>
                            <td>${laborCost.toLocaleString()}원</td>
                            <td>${itemTotal.toLocaleString()}원</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>부품비 합계</strong></td>
                    <td colspan="3"><strong>${partsTotal.toLocaleString()}원</strong></td>
                </tr>
                <tr>
                    <td colspan="2"><strong>공임비 합계</strong></td>
                    <td colspan="3"><strong>${laborTotal.toLocaleString()}원</strong></td>
                </tr>
                <tr style="border-top: 2px solid #333;">
                    <td colspan="2"><strong>총 금액</strong></td>
                    <td colspan="3"><strong>${total.toLocaleString()}원</strong></td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin-top: 2rem; text-align: center; color: #666;">
            <p>본 견적서는 ${quoteDate}에 작성되었으며, 부품 가격은 변동될 수 있습니다.</p>
        </div>
    `;
    
    document.getElementById('quote-content').innerHTML = quoteHTML;
    saveToStorage();
}

// 견적서 인쇄
function printQuote() {
    window.print();
}

// 관리자 인터페이스 업데이트
function updateAdminInterface() {
    updateBrandSelect();
}

// 브랜드 추가
function addBrand(event) {
    event.preventDefault();
    const brandName = document.getElementById('new-brand').value.trim();
    
    if (!brandName) {
        alert('브랜드명을 입력하세요.');
        return;
    }
    
    if (brands.includes(brandName)) {
        alert('이미 존재하는 브랜드입니다.');
        return;
    }
    
    brands.push(brandName);
    models[brandName] = [];
    updateBrandSelect();
    document.getElementById('new-brand').value = '';
    saveToStorage();
    alert('브랜드가 추가되었습니다.');
}

// 모델 추가
function addModel(event) {
    event.preventDefault();
    const brand = document.getElementById('brand-select').value;
    const modelName = document.getElementById('new-model').value.trim();
    const diagramFile = document.getElementById('diagram-upload').files[0];
    
    if (!brand || !modelName) {
        alert('브랜드와 모델명을 입력하세요.');
        return;
    }
    
    if (models[brand] && models[brand].includes(modelName)) {
        alert('이미 존재하는 모델입니다.');
        return;
    }
    
    if (!models[brand]) {
        models[brand] = [];
    }
    
    models[brand].push(modelName);
    
    // 부품 배열 초기화
    const key = `${brand}-${modelName}`;
    if (!parts[key]) {
        parts[key] = [];
    }
    
    // 이미지 파일 처리
    if (diagramFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            modelImages[key] = e.target.result;
            saveToStorage();
        };
        reader.readAsDataURL(diagramFile);
    }
    
    updateBrandSelect();
    document.getElementById('new-model').value = '';
    document.getElementById('diagram-upload').value = '';
    saveToStorage();
    alert('모델이 추가되었습니다.');
}

// 부품 추가
function addPart(event) {
    event.preventDefault();
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    const partName = document.getElementById('part-name').value.trim();
    const partPrice = parseInt(document.getElementById('part-price').value);
    const partPosition = document.getElementById('part-position').value.trim();
    
    if (!brand || !model || !partName || !partPrice || !partPosition) {
        alert('모든 필드를 입력하세요.');
        return;
    }
    
    // 위치 파싱 (x,y 형태 - 공백 허용)
    const positionMatch = partPosition.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!positionMatch) {
        alert('위치는 "x,y" 형태로 입력하세요. (예: 30, 50)');
        return;
    }
    
    const position = {
        x: parseInt(positionMatch[1]),
        y: parseInt(positionMatch[2])
    };
    
    const key = `${brand}-${model}`;
    if (!parts[key]) {
        parts[key] = [];
    }
    
    // 부품 번호 자동 생성 (기존 부품 수 + 1)
    const partNumber = parts[key].length + 1;
    
    parts[key].push({
        name: partName,
        price: partPrice,
        position: position,
        number: partNumber
    });
    
    // 폼 초기화
    document.getElementById('part-name').value = '';
    document.getElementById('part-price').value = '';
    document.getElementById('part-position').value = '';
    
    saveToStorage();
    displayExistingParts(); // 부품 목록 새로고침
    alert('부품이 추가되었습니다.');
}

// 기존 부품 목록 표시
function displayExistingParts() {
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    const partsList = document.getElementById('existing-parts-list');
    
    if (!brand || !model) {
        partsList.innerHTML = '<p>브랜드와 모델을 선택하면 부품 목록이 표시됩니다.</p>';
        return;
    }
    
    const key = `${brand}-${model}`;
    const carParts = parts[key] || [];
    
    if (carParts.length === 0) {
        partsList.innerHTML = '<p>등록된 부품이 없습니다.</p>';
        return;
    }
    
    partsList.innerHTML = '';
    carParts.forEach((part, index) => {
        const partItem = document.createElement('div');
        partItem.className = 'existing-part-item';
        // 위치 데이터 처리
        let x, y;
        if (typeof part.position === 'string') {
            const coords = part.position.split(', ');
            x = parseFloat(coords[0]);
            y = parseFloat(coords[1]);
        } else {
            x = part.position.x;
            y = part.position.y;
        }
        
        partItem.innerHTML = `
            <div class="existing-part-info">
                <div class="existing-part-name">${part.name}</div>
                <div class="existing-part-details">
                    가격: ${part.price.toLocaleString()}원 | 위치: (${x}, ${y})
                </div>
            </div>
            <div class="existing-part-actions">
                <button class="edit-part-btn" onclick="editPart('${key}', ${index})">수정</button>
                <button class="delete-part-btn" onclick="deletePart('${key}', ${index})">삭제</button>
            </div>
        `;
        partsList.appendChild(partItem);
    });
}

// 부품 삭제
function deletePart(key, index) {
    if (confirm('이 부품을 삭제하시겠습니까?')) {
        parts[key].splice(index, 1);
        saveToStorage();
        displayExistingParts();
        displayPartsAdminDiagram(); // 도면 새로고침
        alert('부품이 삭제되었습니다.');
    }
}

// 부품 수정
function editPart(key, index) {
    const part = parts[key][index];
    const newName = prompt('부품명을 입력하세요:', part.name);
    if (newName === null) return;
    
    const newPrice = prompt('가격을 입력하세요:', part.price);
    if (newPrice === null) return;
    
    // 현재 위치 데이터 처리
    let currentX, currentY;
    if (typeof part.position === 'string') {
        const coords = part.position.split(', ');
        currentX = parseFloat(coords[0]);
        currentY = parseFloat(coords[1]);
    } else {
        currentX = part.position.x;
        currentY = part.position.y;
    }
    
    const newPosition = prompt('위치를 입력하세요 (x,y):', `${currentX},${currentY}`);
    if (newPosition === null) return;
    
    // 위치 파싱
    const positionMatch = newPosition.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!positionMatch) {
        alert('위치는 "x,y" 형태로 입력하세요. (예: 30, 50)');
        return;
    }
    
    // 부품 정보 업데이트
    parts[key][index] = {
        name: newName.trim(),
        price: parseInt(newPrice),
        position: {
            x: parseInt(positionMatch[1]),
            y: parseInt(positionMatch[2])
        },
        number: part.number
    };
    
    saveToStorage();
    displayExistingParts();
    displayPartsAdminDiagram(); // 도면 새로고침
    alert('부품이 수정되었습니다.');
}

// 부품 관리에서 이미지 표시
function displayPartsAdminDiagram() {
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    const diagramContainer = document.getElementById('parts-admin-diagram');
    const changeImageBtn = document.getElementById('change-image-btn');
    
    if (!brand || !model) {
        diagramContainer.innerHTML = '<p>브랜드와 모델을 선택하면 도면이 표시됩니다.</p>';
        changeImageBtn.style.display = 'none';
        displayExistingParts(); // 부품 목록도 업데이트
        return;
    }
    
    displayExistingParts(); // 부품 목록 표시
    
    const key = `${brand}-${model}`;
    const savedImage = modelImages[key];
    
    if (savedImage) {
        diagramContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px; border: 2px solid #007bff;">
                <img id="parts-diagram-img" src="${savedImage}" alt="${brand} ${model} 도면" style="width: 100%; height: 100%; object-fit: fill; cursor: crosshair;">
            </div>
        `;
        diagramContainer.classList.add('has-image');
        changeImageBtn.style.display = 'block';
        
        // 이미지 클릭 이벤트 추가
        setTimeout(() => {
            const img = document.getElementById('parts-diagram-img');
            if (img) {
                // 기존 이벤트 리스너 제거 후 새로 추가
                img.removeEventListener('click', handleDiagramClick);
                img.addEventListener('click', handleDiagramClick);
                console.log('도면 클릭 이벤트가 연결되었습니다.');
            }
        }, 100);
    } else {
        diagramContainer.innerHTML = `
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px; border: 2px solid #007bff;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #666;">
                    <p>${brand} ${model}</p>
                    <small>업로드된 도면이 없습니다</small>
                </div>
            </div>
        `;
        diagramContainer.classList.remove('has-image');
        changeImageBtn.style.display = 'block';
    }
}

// 이미지 변경 처리
function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    
    if (!brand || !model) {
        alert('브랜드와 모델을 먼저 선택하세요.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const key = `${brand}-${model}`;
        modelImages[key] = e.target.result;
        saveToStorage();
        displayPartsAdminDiagram();
        alert('이미지가 업데이트되었습니다.');
    };
    reader.readAsDataURL(file);
}

// 도면 이미지 클릭 처리
function handleDiagramClick(event) {
    console.log('도면 이미지가 클릭되었습니다!');
    const img = event.target;
    const rect = img.getBoundingClientRect();
    
    // 이미지 내에서의 상대적 좌표 계산 (0-1 범위)
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    // 백분율로 변환 (정수)
    const xPercent = Math.round(x * 100);
    const yPercent = Math.round(y * 100);
    
    // 위치 입력 필드에 자동 입력
    const positionInput = document.getElementById('part-position');
    if (positionInput) {
        positionInput.value = `${xPercent}, ${yPercent}`;
        
        // 시각적 피드백
        positionInput.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
            positionInput.style.backgroundColor = '';
        }, 1000);
        
        console.log(`클릭 위치: ${xPercent}%, ${yPercent}%`);
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', async function() {
    // Firebase 초기화 시도
    initializeFirebase();
    
    // 데이터 초기화
    initializeData();
    
    // Firebase 또는 LocalStorage에서 데이터 로드
    await loadFromStorage();
    
    // 로그인 폼
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // 로그아웃
    document.getElementById('logout-btn').addEventListener('click', function() {
        currentUser = null;
        selectedParts = [];
        showPage('login-page');
        document.getElementById('login-form').reset();
    });
    
    // 관리자 페이지 이동
    document.getElementById('admin-btn').addEventListener('click', function() {
        showPage('admin-page');
        updateAdminInterface();
    });
    
    // 메인으로 돌아가기
    document.getElementById('back-to-main').addEventListener('click', function() {
        showPage('main-page');
        if (currentUser && currentUser.role === 'admin') {
            document.getElementById('current-user').textContent = currentUser.username;
            document.getElementById('admin-btn').style.display = 'inline-block';
        }
    });
    
    // 관리자 로그아웃
    document.getElementById('admin-logout-btn').addEventListener('click', function() {
        currentUser = null;
        selectedParts = [];
        showPage('login-page');
        document.getElementById('login-form').reset();
    });
    
    // 탭 네비게이션
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showTab(this.dataset.tab);
        });
    });
    
    // 단계별 네비게이션 이벤트
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', function() {
            const nextTab = this.dataset.next;
            if (validateCurrentStep(getCurrentActiveTab())) {
                showTab(nextTab);
            }
        });
    });
    
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', function() {
            const prevTab = this.dataset.prev;
            showTab(prevTab);
        });
    });
    
    // 관리자 탭 네비게이션
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showAdminTab(this.dataset.tab);
        });
    });
    
    // 브랜드 선택 변경
    document.getElementById('car-brand').addEventListener('change', function() {
        updateModelSelect('car-brand', 'car-model');
        selectedParts = []; // 브랜드 변경시 선택된 부품 초기화
        updateSelectedPartsList();
    });
    
    // 모델 선택 변경
    document.getElementById('car-model').addEventListener('change', function() {
        selectedParts = []; // 모델 변경시 선택된 부품 초기화
        updateSelectedPartsList();
        displayPartsDiagram();
    });
    
    // 견적서 생성
    document.getElementById('generate-quote').addEventListener('click', generateQuote);
    
    // 견적서 인쇄
    document.getElementById('print-quote').addEventListener('click', printQuote);
    
    // 관리자 페이지 이벤트
    document.getElementById('back-to-main').addEventListener('click', function() {
        showPage('main-page');
    });
    
    // 관리자 폼 이벤트
    document.getElementById('brand-form').addEventListener('submit', addBrand);
    document.getElementById('model-form').addEventListener('submit', addModel);
    document.getElementById('parts-form').addEventListener('submit', addPart);
    
    // 관리자 페이지 브랜드 선택
    document.getElementById('brand-select').addEventListener('change', function() {
        updateModelSelect('brand-select', 'parts-model-select');
    });
    
    document.getElementById('parts-brand-select').addEventListener('change', function() {
        updateModelSelect('parts-brand-select', 'parts-model-select');
        displayPartsAdminDiagram();
    });
    
    document.getElementById('parts-model-select').addEventListener('change', function() {
        displayPartsAdminDiagram();
    });
    
    // 이미지 변경 버튼
    document.getElementById('change-image-btn').addEventListener('click', function() {
        document.getElementById('update-diagram').click();
    });
    
    // 이미지 파일 선택
    document.getElementById('update-diagram').addEventListener('change', handleImageChange);
    
    // 공임비 변경
    document.getElementById('labor-rate').addEventListener('change', function() {
        laborRate = parseInt(this.value) || 55000;
        updateSelectedPartsList();
        saveToStorage();
    });
});

// 현재 활성 탭 가져오기
function getCurrentActiveTab() {
    const activeTab = document.querySelector('.tab-content.active');
    return activeTab ? activeTab.id : null;
}

// 현재 단계 유효성 검사
function validateCurrentStep(tabId) {
    switch(tabId) {
        case 'shop-info':
            const shopName = document.getElementById('shop-name').value.trim();
            const shopPhone = document.getElementById('shop-phone').value.trim();
            const shopAddress = document.getElementById('shop-address').value.trim();
            const shopOwner = document.getElementById('shop-owner').value.trim();
            
            if (!shopName || !shopPhone || !shopAddress || !shopOwner) {
                alert('정비업체 정보를 모두 입력해주세요.');
                return false;
            }
            return true;
            
        case 'customer-info':
            const customerName = document.getElementById('customer-name').value.trim();
            const customerPhone = document.getElementById('customer-phone').value.trim();
            const carBrand = document.getElementById('car-brand').value;
            const carModel = document.getElementById('car-model').value;
            const carYear = document.getElementById('car-year').value;
            
            if (!customerName || !customerPhone || !carBrand || !carModel || !carYear) {
                alert('고객 정보를 모두 입력해주세요.');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

// 전역 함수로 노출 (HTML에서 직접 호출용)
window.selectPart = selectPart;
window.removePart = removePart;
window.updateLaborHours = updateLaborHours;
window.updateLaborTime = updateLaborTime;
window.updateLaborInclusion = updateLaborInclusion;