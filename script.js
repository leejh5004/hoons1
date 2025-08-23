// Firebase 전역 변수
let firebaseApp = null;
let firebaseDb = null;
let firebaseStorage = null;
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
 // 다중 선택 모드 상태

// Firebase 초기화 확인
function initializeFirebase() {
    console.log('🔥 Firebase 초기화 시도 중...');
    console.log('window.firebaseApp:', window.firebaseApp);
    console.log('window.firebaseDb:', window.firebaseDb);
    console.log('window.firebaseStorage:', window.firebaseStorage);
    
    // Firebase가 로드되었는지 확인
    if (window.firebaseApp && window.firebaseDb && window.firebaseStorage) {
        firebaseApp = window.firebaseApp;
        firebaseDb = window.firebaseDb;
        firebaseStorage = window.firebaseStorage;
        isFirebaseEnabled = true;
        console.log('✅ Firebase 연결 성공!');
        return true;
    } else {
        console.log('❌ Firebase 설정이 없습니다. LocalStorage를 사용합니다.');
        isFirebaseEnabled = false;
        return false;
    }
}

// Firebase Storage 이미지 업로드 함수
async function uploadImageToStorage(file, imagePath) {
    if (!isFirebaseEnabled || !firebaseStorage) {
        throw new Error('Firebase Storage가 초기화되지 않았습니다.');
    }
    
    try {
        const storageRef = window.firebaseStorageRef(firebaseStorage, imagePath);
        const snapshot = await window.firebaseUploadBytes(storageRef, file);
        const downloadURL = await window.firebaseGetDownloadURL(snapshot.ref);
        console.log('이미지 업로드 성공:', downloadURL);
        return downloadURL;
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        throw error;
    }
}

// Firebase Storage 이미지 삭제 함수
async function deleteImageFromStorage(imagePath) {
    if (!isFirebaseEnabled || !firebaseStorage) {
        console.log('Firebase Storage가 비활성화되어 있습니다.');
        return;
    }
    
    try {
        const storageRef = window.firebaseStorageRef(firebaseStorage, imagePath);
        await window.firebaseDeleteObject(storageRef);
        console.log('이미지 삭제 성공:', imagePath);
    } catch (error) {
        console.error('이미지 삭제 실패:', error);
        // 이미지가 존재하지 않는 경우는 무시
        if (error.code !== 'storage/object-not-found') {
            throw error;
        }
    }
}

// 이미지 경로 생성 함수
function generateImagePath(brand, model) {
    const timestamp = Date.now();
    const sanitizedBrand = brand.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    const sanitizedModel = model.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    return `diagrams/${sanitizedBrand}/${sanitizedModel}_${timestamp}.jpg`;
}



// 초기 데이터 설정
function initializeData() {
    // 기본 브랜드 데이터 (오토바이 브랜드)
    brands = ['혼다', '야마하', '가와사키', '스즈키'];
    
    // 기본 모델 데이터
    models = {
        '혼다': ['CBR600RR', 'CBR1000RR', 'CB650R', 'PCX150', 'Forza300'],
        '야마하': ['YZF-R6', 'YZF-R1', 'MT-07', 'MT-09', 'XMAX300'],
        '가와사키': ['Ninja ZX-6R', 'Ninja ZX-10R', 'Z650', 'Z900', 'Versys-X300'],
        '스즈키': ['GSX-R600', 'GSX-R1000', 'SV650', 'V-Strom650', 'Address125']
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
    // 공급자 정보 로드
    if (shopInfo.name) {
        document.getElementById('shop-name').value = shopInfo.name || '';
        document.getElementById('shop-business-number').value = shopInfo.businessNumber || '';
        document.getElementById('shop-owner').value = shopInfo.owner || '';
        document.getElementById('shop-phone').value = shopInfo.phone || '';
        document.getElementById('shop-address').value = shopInfo.address || '';
        document.getElementById('shop-account').value = shopInfo.account || '';
        document.getElementById('shop-bank').value = shopInfo.bank || '';
        document.getElementById('shop-account-holder').value = shopInfo.accountHolder || '';
    }
    
    // 차량정보 로드
    if (customerInfo.vehicleNumber) {
        document.getElementById('vehicle-number').value = customerInfo.vehicleNumber || '';
        document.getElementById('vehicle-manufacturer').value = customerInfo.manufacturer || '';
        document.getElementById('vehicle-model').value = customerInfo.model || '';
        document.getElementById('vehicle-mileage').value = customerInfo.mileage || '';
        document.getElementById('vehicle-year').value = customerInfo.year || '';
        document.getElementById('vehicle-color').value = customerInfo.color || '';
        document.getElementById('vehicle-checkin').value = customerInfo.checkinDate || '';
        document.getElementById('vehicle-checkout').value = customerInfo.checkoutDate || '';
        document.getElementById('vehicle-memo').value = customerInfo.memo || '';
    }
    
    updateBrandSelect();
}

// 브랜드 선택 업데이트
function updateBrandSelect() {
    const brandSelects = ['vehicle-manufacturer', 'brand-select', 'parts-brand-select'];
    
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

// 도면 그리드 업데이트
function updateDiagramGrid() {
    const brand = document.getElementById('vehicle-manufacturer').value;
    const diagramGrid = document.getElementById('diagram-grid');
    
    // 디버깅: 현재 데이터 상태 확인
    console.log('=== updateDiagramGrid 디버깅 ===');
    console.log('선택된 브랜드:', brand);
    console.log('전체 models 객체:', models);
    console.log('전체 modelImages 객체:', modelImages);
    console.log('해당 브랜드의 모델들:', models[brand]);
    
    // LocalStorage 확인
    const localData = localStorage.getItem('motorcyclePartsData');
    if (localData) {
        const parsedData = JSON.parse(localData);
        console.log('LocalStorage의 modelImages:', parsedData.modelImages);
    } else {
        console.log('LocalStorage에 데이터가 없습니다.');
    }
    
    if (!brand || !models[brand]) {
        diagramGrid.innerHTML = '<p>오토바이를 선택하면 부품 도면이 표시됩니다.</p>';
        return;
    }
    
    // 해당 브랜드의 모든 모델 중 도면이 있는 것들만 표시
    const availableModels = models[brand].filter(model => {
        const key = `${brand}-${model}`;
        const hasImage = modelImages[key] && (Array.isArray(modelImages[key]) ? modelImages[key].length > 0 : modelImages[key]);
        console.log(`모델 ${model} (키: ${key}) - 이미지 있음:`, !!hasImage);
        return hasImage;
    });
    
    console.log('도면이 있는 모델들:', availableModels);
    
    // 도면 개수 정보 표시
    const totalModels = models[brand] ? models[brand].length : 0;
    const availableCount = availableModels.length;
    const diagramCountInfo = `<div class="diagram-count-info" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; text-align: center;">
        <strong>${brand}</strong> 브랜드: 전체 모델 ${totalModels}개 중 도면 있는 모델 <span style="color: #28a745; font-weight: bold;">${availableCount}개</span>
    </div>`;
    
    if (availableModels.length === 0) {
        diagramGrid.innerHTML = diagramCountInfo + '<p>해당 브랜드의 도면이 없습니다.</p>';
        return;
    }
    
    diagramGrid.innerHTML = diagramCountInfo;
    
    availableModels.forEach(model => {
        const key = `${brand}-${model}`;
        const partCount = parts[key] ? parts[key].length : 0;
        const imageData = modelImages[key];
        
        // 배열인 경우 각 이미지별로 아이템 생성, 아닌 경우 단일 아이템 생성
        if (Array.isArray(imageData)) {
            imageData.forEach((imageUrl, index) => {
                const diagramItem = document.createElement('div');
                diagramItem.className = 'diagram-item';
                diagramItem.onclick = () => selectDiagram(key, model, index);
                
                diagramItem.innerHTML = `
                    <img src="${imageUrl}" alt="${model} 도면">
                    <div class="diagram-label">${model} ${imageData.length > 1 ? `(${index + 1}/${imageData.length})` : ''}</div>
                    <div class="part-count">${partCount}개 부품</div>
                    <button class="delete-btn" onclick="deleteImage('${key}', ${index})" title="이미지 삭제">×</button>
                `;
                
                diagramGrid.appendChild(diagramItem);
            });
        } else {
            // 기존 단일 이미지 처리 (하위 호환성)
            const diagramItem = document.createElement('div');
            diagramItem.className = 'diagram-item';
            diagramItem.onclick = () => selectDiagram(key, model);
            
            diagramItem.innerHTML = `
                 <img src="${imageData}" alt="${model} 도면">
                 <div class="diagram-label">${model}</div>
                 <div class="part-count">${partCount}개 부품</div>
                 <button class="delete-btn" onclick="deleteImage('${key}', 0)" title="이미지 삭제">×</button>
             `;
            
            diagramGrid.appendChild(diagramItem);
        }
    });
}

// 도면 선택
function selectDiagram(key, modelName, imageIndex = 0) {
    // 기존 선택된 도면 아이템에서 selected 클래스 제거
    document.querySelectorAll('.diagram-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 클릭된 도면 아이템에 selected 클래스 추가
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    // 도면 표시 영역을 보이게 하고 그리드는 숨김
    const diagramGrid = document.getElementById('diagram-grid');
    const diagramContainer = document.getElementById('parts-diagram');
    
    diagramGrid.style.display = 'none';
    diagramContainer.style.display = 'block';
    
    const carParts = parts[key];
    const imageData = modelImages[key];
    
    if (!carParts) {
        diagramContainer.innerHTML = '<p>해당 모델의 부품 정보가 없습니다.</p><button onclick="backToGrid()">도면 목록으로 돌아가기</button>';
        return;
    }
    
    // 이미지 URL 결정 (배열인 경우 인덱스 사용, 아닌 경우 그대로 사용)
    let savedImage;
    if (Array.isArray(imageData)) {
        savedImage = imageData[imageIndex] || imageData[0];
    } else {
        savedImage = imageData;
    }
    
    if (savedImage) {
        const imageTitle = Array.isArray(imageData) && imageData.length > 1 ? 
            `${modelName} 부품 도면 (${imageIndex + 1}/${imageData.length})` : 
            `${modelName} 부품 도면`;
            
        diagramContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button onclick="backToGrid()" class="btn-secondary">← 도면 목록으로 돌아가기</button>
                <h4 style="display: inline-block; margin-left: 15px;">${imageTitle}</h4>
            </div>
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px; border: 2px solid #28a745;">
                <img src="${savedImage}" alt="${imageTitle}" style="width: 100%; height: 100%; object-fit: fill;">
            </div>
        `;
    } else {
        diagramContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button onclick="backToGrid()" class="btn-secondary">← 도면 목록으로 돌아가기</button>
                <h4 style="display: inline-block; margin-left: 15px;">${modelName} 부품 도면</h4>
            </div>
            <div style="position: relative; width: 100%; height: 400px; background: #e9ecef; border-radius: 5px;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #666;">
                    <p>${modelName} 부품 도면</p>
                    <small>부품을 클릭하여 선택하세요</small>
                </div>
            </div>
        `;
    }
    
    // 부품 마커 추가
    const diagramDiv = diagramContainer.lastElementChild;
    
    // 위치별로 부품 그룹화 (서브포지션 포함)
    const positionGroups = {};
    carParts.forEach((part, index) => {
        // 서브포지션이 있으면 포함하여 키 생성
        const posKey = part.position.sub ? 
            `${part.position.x},${part.position.y}-${part.position.sub}` : 
            `${part.position.x},${part.position.y}`;
        if (!positionGroups[posKey]) {
            positionGroups[posKey] = [];
        }
        positionGroups[posKey].push({ part, index });
    });
    
    // 기본 위치별로도 그룹화 (동일한 x,y 좌표의 서브포지션들을 찾기 위해)
    const basePositionGroups = {};
    carParts.forEach((part, index) => {
        const baseKey = `${part.position.x},${part.position.y}`;
        if (!basePositionGroups[baseKey]) {
            basePositionGroups[baseKey] = [];
        }
        basePositionGroups[baseKey].push({ part, index });
    });
    
    // 각 기본 위치별로 마커 생성
    Object.entries(basePositionGroups).forEach(([baseKey, partsAtBasePosition]) => {
        const [x, y] = baseKey.split(',').map(Number);
        
        if (partsAtBasePosition.length === 1) {
            // 해당 기본 위치에 부품이 하나만 있는 경우 (서브포지션 없음)
            const { part, index } = partsAtBasePosition[0];
            const marker = document.createElement('div');
            marker.className = 'part-marker';
            marker.textContent = part.number;
            marker.style.left = `${x}%`;
            marker.style.top = `${y}%`;
            
            const positionText = part.position.sub ? `${x}, ${y}-${part.position.sub}` : `${x}, ${y}`;
            marker.title = `${part.name} - ${part.price.toLocaleString()}원 (위치: ${positionText})`;
            marker.onclick = () => selectPart(key, part);
            
            // 이미 선택된 부품인지 확인
            if (selectedParts.some(p => p.name === part.name && p.key === key)) {
                marker.classList.add('selected');
            }
            
            diagramDiv.appendChild(marker);
        } else {
            // 동일한 기본 위치에 여러 부품이 있는 경우 (서브포지션들)
            const groupMarker = document.createElement('div');
            groupMarker.className = 'part-marker multi-part';
            groupMarker.textContent = partsAtBasePosition.length;
            groupMarker.style.left = `${x}%`;
            groupMarker.style.top = `${y}%`;
            groupMarker.style.backgroundColor = '#ff6b6b';
            groupMarker.style.border = '2px solid #e03131';
            
            const partNames = partsAtBasePosition.map(({part}) => {
                const subText = part.position.sub ? `-${part.position.sub}` : '';
                return `${part.name}${subText} (${part.price.toLocaleString()}원)`;
            }).join('\n');
            
            groupMarker.title = `위치 (${x}, ${y})의 부품들:\n${partNames}\n\n클릭하여 부품 선택`;
            
            // 그룹 마커 클릭 시 부품 선택 메뉴 표시
            groupMarker.onclick = (e) => {
                e.stopPropagation();
                showPartSelectionMenu(e, key, partsAtBasePosition, x, y);
            };
            
            diagramDiv.appendChild(groupMarker);
        }
    });
}

// 도면 그리드로 돌아가기
function backToGrid() {
    const diagramGrid = document.getElementById('diagram-grid');
    const diagramContainer = document.getElementById('parts-diagram');
    
    diagramGrid.style.display = 'grid';
    diagramContainer.style.display = 'none';
    diagramContainer.innerHTML = '';
}

// 현재 등록된 데이터 상태 확인 함수
function checkCurrentData() {
    console.log('=== 현재 등록된 데이터 현황 ===');
    
    // 브랜드 개수
    console.log('등록된 브랜드 개수:', brands.length);
    console.log('브랜드 목록:', brands);
    
    // 각 브랜드별 모델 개수
    let totalModels = 0;
    Object.keys(models).forEach(brand => {
        const modelCount = models[brand].length;
        totalModels += modelCount;
        console.log(`${brand} 브랜드 모델 개수: ${modelCount}개`);
        console.log(`${brand} 모델 목록:`, models[brand]);
    });
    console.log('전체 모델 개수:', totalModels);
    
    // 도면이 있는 모델 개수
    const diagramKeys = Object.keys(modelImages);
    console.log('도면이 있는 모델 개수:', diagramKeys.length);
    console.log('도면이 있는 모델 목록:', diagramKeys);
    
    // 각 브랜드별 도면 개수
    Object.keys(models).forEach(brand => {
        const brandDiagrams = diagramKeys.filter(key => key.startsWith(brand + '-'));
        console.log(`${brand} 브랜드 도면 개수: ${brandDiagrams.length}개`);
    });
    
    // 부품이 등록된 모델 개수
    const partsKeys = Object.keys(parts);
    console.log('부품이 등록된 모델 개수:', partsKeys.length);
    
    // 전체 부품 개수
    let totalParts = 0;
    Object.keys(parts).forEach(key => {
        totalParts += parts[key].length;
    });
    console.log('전체 부품 개수:', totalParts);
    
    return {
        brands: brands.length,
        totalModels: totalModels,
        diagramCount: diagramKeys.length,
        partsModels: partsKeys.length,
        totalParts: totalParts
    };
}

// 이미지 삭제 함수
async function deleteImage(key, imageIndex) {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const imageData = modelImages[key];
        
        if (Array.isArray(imageData)) {
            // 배열인 경우
            if (imageIndex >= 0 && imageIndex < imageData.length) {
                const imageUrl = imageData[imageIndex];
                
                // Firebase Storage에서 이미지 삭제
                if (isFirebaseEnabled && imageUrl.includes('firebasestorage.googleapis.com')) {
                    try {
                        const imagePath = extractImagePathFromUrl(imageUrl);
                        await deleteImageFromStorage(imagePath);
                    } catch (error) {
                        console.warn('Firebase Storage에서 이미지 삭제 실패:', error);
                    }
                }
                
                // 배열에서 해당 이미지 제거
                imageData.splice(imageIndex, 1);
                
                // 배열이 비어있으면 전체 키 삭제
                if (imageData.length === 0) {
                    delete modelImages[key];
                    // 관련 부품 데이터도 삭제
                    if (parts[key]) {
                        delete parts[key];
                    }
                }
            }
        } else {
            // 단일 이미지인 경우
            if (imageIndex === 0) {
                // Firebase Storage에서 이미지 삭제
                if (isFirebaseEnabled && imageData.includes('firebasestorage.googleapis.com')) {
                    try {
                        const imagePath = extractImagePathFromUrl(imageData);
                        await deleteImageFromStorage(imagePath);
                    } catch (error) {
                        console.warn('Firebase Storage에서 이미지 삭제 실패:', error);
                    }
                }
                
                // 전체 키 삭제
                delete modelImages[key];
                // 관련 부품 데이터도 삭제
                if (parts[key]) {
                    delete parts[key];
                }
            }
        }
        
        // 데이터 저장
        await saveToStorage();
        
        // UI 업데이트
        updateDiagramGrid();
        
        alert('이미지가 삭제되었습니다.');
        
    } catch (error) {
        console.error('이미지 삭제 중 오류 발생:', error);
        alert('이미지 삭제 중 오류가 발생했습니다.');
    }
}

// Firebase Storage URL에서 이미지 경로 추출
function extractImagePathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const encodedPath = pathParts[pathParts.length - 1];
        return decodeURIComponent(encodedPath);
    } catch (error) {
        console.error('URL에서 경로 추출 실패:', error);
        return null;
    }
}

// 전체 도면 보기 함수
function showAllDiagrams() {
    console.log('showAllDiagrams 함수 호출됨');
    const diagramGrid = document.getElementById('diagram-grid');
    const showAllBtn = document.getElementById('show-all-diagrams');
    const showBrandBtn = document.getElementById('show-brand-diagrams');
    
    // 현재 선택된 브랜드 가져오기
    const selectedBrand = document.getElementById('vehicle-manufacturer').value;
    console.log('선택된 브랜드:', selectedBrand);
    
    if (!selectedBrand) {
        diagramGrid.innerHTML = '<p>먼저 브랜드를 선택해주세요.</p>';
        return;
    }
    
    console.log('modelImages:', modelImages);
    console.log('parts:', parts);
    
    // 버튼 상태 변경
    showAllBtn.style.display = 'none';
    showBrandBtn.style.display = 'inline-block';
    
    // 선택된 브랜드의 도면 이미지들만 수집
    const brandDiagrams = [];
    
    // modelImages에서 선택된 브랜드의 이미지들만 가져오기
    Object.keys(modelImages).forEach(key => {
        const [brand, model] = key.split('-');
        if (brand === selectedBrand && modelImages[key]) {
            brandDiagrams.push({
                key: key,
                brand: brand,
                model: model,
                imageUrl: modelImages[key],
                partCount: parts[key] ? parts[key].length : 0
            });
        }
    });
    
    console.log('brandDiagrams:', brandDiagrams);
    
    // 도면 개수 정보 표시
    const totalModels = models[selectedBrand] ? models[selectedBrand].length : 0;
    const availableCount = brandDiagrams.length;
    const diagramCountInfo = `<div class="diagram-count-info" style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 5px; text-align: center;">
        <strong>${selectedBrand}</strong> 브랜드 전체 도면: <span style="color: #1976d2; font-weight: bold;">${availableCount}개</span> (전체 모델 ${totalModels}개 중)
    </div>`;
    
    if (brandDiagrams.length === 0) {
        diagramGrid.innerHTML = diagramCountInfo + `<p>${selectedBrand} 브랜드의 업로드된 도면이 없습니다. 관리자 페이지에서 모델을 추가해주세요.</p>`;
        return;
    }
    
    // 도면 그리드 생성
    let gridHTML = diagramCountInfo;
    brandDiagrams.forEach(diagram => {
        gridHTML += `
            <div class="diagram-item" onclick="selectDiagram('${diagram.key}', '${diagram.brand} ${diagram.model}')">
                <img src="${diagram.imageUrl}" alt="${diagram.brand} ${diagram.model} 도면" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsnYw8L3RleHQ+PC9zdmc+'">
                <div class="diagram-label">${diagram.brand} ${diagram.model}</div>
                ${diagram.partCount > 0 ? `<div class="part-count">${diagram.partCount}</div>` : ''}
            </div>
        `;
    });
    
    diagramGrid.innerHTML = gridHTML;
}

// 브랜드별 도면 보기로 돌아가기
function showBrandDiagrams() {
    const showAllBtn = document.getElementById('show-all-diagrams');
    const showBrandBtn = document.getElementById('show-brand-diagrams');
    
    // 버튼 상태 변경
    showAllBtn.style.display = 'inline-block';
    showBrandBtn.style.display = 'none';
    
    // 기존 브랜드별 도면 표시 로직 실행
    updateDiagramGrid();
}

// 부품 도면 표시 (기존 함수 - 호환성 유지)
function displayPartsDiagram() {
    const brand = document.getElementById('vehicle-manufacturer').value;
    const model = document.getElementById('vehicle-model').value;
    const diagramContainer = document.getElementById('parts-diagram');
    
    // 도면 그리드 업데이트
    updateDiagramGrid();
    
    // 도면 컨테이너 숨기고 그리드 표시
    diagramContainer.style.display = 'none';
    const diagramGrid = document.getElementById('diagram-grid');
    diagramGrid.style.display = 'grid';
    
    if (!brand || !model) {
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
    
    // 위치별로 부품 그룹화 (서브포지션 포함)
    const positionGroups = {};
    carParts.forEach((part, index) => {
        // 서브포지션이 있으면 포함하여 키 생성
        const posKey = part.position.sub ? 
            `${part.position.x},${part.position.y}-${part.position.sub}` : 
            `${part.position.x},${part.position.y}`;
        if (!positionGroups[posKey]) {
            positionGroups[posKey] = [];
        }
        positionGroups[posKey].push({ part, index });
    });
    
    // 기본 위치별로도 그룹화 (동일한 x,y 좌표의 서브포지션들을 찾기 위해)
    const basePositionGroups = {};
    carParts.forEach((part, index) => {
        const baseKey = `${part.position.x},${part.position.y}`;
        if (!basePositionGroups[baseKey]) {
            basePositionGroups[baseKey] = [];
        }
        basePositionGroups[baseKey].push({ part, index });
    });
    
    // 각 기본 위치별로 마커 생성
    Object.entries(basePositionGroups).forEach(([baseKey, partsAtBasePosition]) => {
        const [x, y] = baseKey.split(',').map(Number);
        
        if (partsAtBasePosition.length === 1) {
            // 해당 기본 위치에 부품이 하나만 있는 경우 (서브포지션 없음)
            const { part, index } = partsAtBasePosition[0];
            const marker = document.createElement('div');
            marker.className = 'part-marker';
            marker.textContent = part.number;
            marker.style.left = `${x}%`;
            marker.style.top = `${y}%`;
            
            const positionText = part.position.sub ? `${x}, ${y}-${part.position.sub}` : `${x}, ${y}`;
            marker.title = `${part.name} - ${part.price.toLocaleString()}원 (위치: ${positionText})`;
            marker.onclick = () => selectPart(key, part);
            
            // 이미 선택된 부품인지 확인
            if (selectedParts.some(p => p.name === part.name && p.key === key)) {
                marker.classList.add('selected');
            }
            
            diagramDiv.appendChild(marker);
        } else {
            // 동일한 기본 위치에 여러 부품이 있는 경우 (서브포지션들)
            const groupMarker = document.createElement('div');
            groupMarker.className = 'part-marker multi-part';
            groupMarker.textContent = partsAtBasePosition.length;
            groupMarker.style.left = `${x}%`;
            groupMarker.style.top = `${y}%`;
            groupMarker.style.backgroundColor = '#ff6b6b';
            groupMarker.style.border = '2px solid #e03131';
            
            const partNames = partsAtBasePosition.map(({part}) => {
                const subText = part.position.sub ? `-${part.position.sub}` : '';
                return `${part.name}${subText} (${part.price.toLocaleString()}원)`;
            }).join('\n');
            
            groupMarker.title = `위치 (${x}, ${y})의 부품들:\n${partNames}\n\n클릭하여 부품 선택`;
            
            // 그룹 마커 클릭 시 부품 선택 메뉴 표시
            groupMarker.onclick = (e) => {
                e.stopPropagation();
                showPartSelectionMenu(e, key, partsAtBasePosition, x, y);
            };
            
            diagramDiv.appendChild(groupMarker);
        }
    });
}

// 동일 위치 부품 선택 메뉴 표시
function showPartSelectionMenu(event, key, partsAtPosition, x, y) {
    // 기존 메뉴가 있으면 제거
    const existingMenu = document.querySelector('.part-selection-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'part-selection-menu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border: 2px solid #007bff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 200px;
        max-width: 300px;
        padding: 8px 0;
    `;
    
    // 메뉴 제목
    const title = document.createElement('div');
    title.style.cssText = `
        padding: 8px 12px;
        font-weight: bold;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        font-size: 14px;
    `;
    title.textContent = `위치 (${x}, ${y}) 부품 선택`;
    menu.appendChild(title);
    
    // 각 부품에 대한 메뉴 항목 생성
    partsAtPosition.forEach(({part, index}) => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f1f3f4;
            transition: background-color 0.2s;
        `;
        
        const subText = part.position.sub ? ` (서브: ${part.position.sub})` : '';
        const isSelected = selectedParts.some(p => p.name === part.name && p.key === key);
        
        item.innerHTML = `
            <div style="font-weight: 500; color: ${isSelected ? '#28a745' : '#333'};">\n                ${isSelected ? '✓ ' : ''}${part.name}${subText}\n            </div>\n            <div style="font-size: 12px; color: #666; margin-top: 2px;">\n                ${part.price.toLocaleString()}원\n            </div>
        `;
        
        item.onmouseover = () => {
            item.style.backgroundColor = '#f8f9fa';
        };
        
        item.onmouseout = () => {
            item.style.backgroundColor = '';
        };
        
        item.onclick = (e) => {
            e.stopPropagation();
            selectPart(key, part);
            menu.remove();
        };
        
        menu.appendChild(item);
    });
    
    // 메뉴 위치 설정
    document.body.appendChild(menu);
    
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = event.clientX + 10;
    let top = event.clientY + 10;
    
    // 화면 경계를 벗어나지 않도록 조정
    if (left + rect.width > viewportWidth) {
        left = event.clientX - rect.width - 10;
    }
    if (top + rect.height > viewportHeight) {
        top = event.clientY - rect.height - 10;
    }
    
    menu.style.left = `${Math.max(10, left)}px`;
    menu.style.top = `${Math.max(10, top)}px`;
    
    // 메뉴 외부 클릭 시 닫기
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// 부품 선택
function selectPart(key, part) {
    console.log(`부품 선택됨: ${part.name}`);
    const existingIndex = selectedParts.findIndex(p => p.name === part.name && p.key === key);
    
    if (existingIndex > -1) {
        // 이미 선택된 부품이면 제거
        selectedParts.splice(existingIndex, 1);
        clearPartHighlights(key);
    } else {
        // 새로운 부품 추가
        selectedParts.push({ ...part, key });
        highlightSameParts(key, part.name);
    }
    
    updateSelectedPartsList();
    updatePartMarkers(key); // 현재 도면의 마커만 업데이트
}

// 부품 마커 상태 업데이트 (현재 도면만)
function updatePartMarkers(key) {
    const markers = document.querySelectorAll('.part-marker');
    const carParts = parts[key] || [];
    
    markers.forEach(marker => {
        // 마커에서 부품 정보 찾기
        const markerNumber = parseInt(marker.textContent);
        const part = carParts.find(p => p.number === markerNumber);
        
        if (part) {
            // 선택된 부품인지 확인
            const isSelected = selectedParts.some(p => p.name === part.name && p.key === key);
            
            if (isSelected) {
                marker.classList.add('selected');
            } else {
                marker.classList.remove('selected');
            }
        }
    });
}

// 같은 부품 하이라이트
function highlightSameParts(key, partName) {
    clearPartHighlights(key);
    
    const carParts = parts[key];
    if (!carParts) return;
    
    // 같은 이름의 부품들 찾기
    const sameNameParts = carParts.filter(part => part.name === partName);
    
    if (sameNameParts.length > 1) {
        // 같은 부품이 여러 개 있으면 하이라이트 및 연결선 표시
        const markers = document.querySelectorAll('.part-marker');
        const highlightedMarkers = [];
        
        markers.forEach(marker => {
            const markerNumber = parseInt(marker.textContent);
            const part = carParts.find(p => p.number === markerNumber);
            
            if (part && part.name === partName) {
                marker.classList.add('same-part', 'highlighted');
                highlightedMarkers.push(marker);
            }
        });
        
        // 연결선 그리기
        drawConnectionLines(highlightedMarkers);
        
        // 색상 코딩 적용
        applyColorCoding(key, partName);
    }
}

// 부품 하이라이트 제거
function clearPartHighlights(key) {
    const markers = document.querySelectorAll('.part-marker');
    markers.forEach(marker => {
        marker.classList.remove('same-part', 'highlighted', 'grouped');
        // 원래 색상으로 복원
        marker.style.backgroundColor = '';
    });
    
    // 연결선 제거
    const connectionLines = document.querySelectorAll('.connection-line');
    connectionLines.forEach(line => line.remove());
}

// 연결선 그리기
function drawConnectionLines(markers) {
    if (markers.length < 2) return;
    
    const diagramContainer = document.querySelector('#parts-diagram > div');
    if (!diagramContainer) return;
    
    // 모든 마커 쌍에 대해 연결선 그리기
    for (let i = 0; i < markers.length - 1; i++) {
        for (let j = i + 1; j < markers.length; j++) {
            const marker1 = markers[i];
            const marker2 = markers[j];
            
            const rect1 = marker1.getBoundingClientRect();
            const rect2 = marker2.getBoundingClientRect();
            const containerRect = diagramContainer.getBoundingClientRect();
            
            const x1 = rect1.left + rect1.width / 2 - containerRect.left;
            const y1 = rect1.top + rect1.height / 2 - containerRect.top;
            const x2 = rect2.left + rect2.width / 2 - containerRect.left;
            const y2 = rect2.top + rect2.height / 2 - containerRect.top;
            
            const line = document.createElement('div');
            line.className = 'connection-line highlighted';
            
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            
            line.style.width = `${length}px`;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.transformOrigin = '0 50%';
            
            diagramContainer.appendChild(line);
        }
    }
}

// 색상 코딩 적용
function applyColorCoding(key, partName) {
    const carParts = parts[key];
    if (!carParts) return;
    
    // 부품 번호별 색상 매핑
    const colorMap = {
        '1': '#ff4757', // 빨강
        '2': '#2ed573', // 초록
        '3': '#3742fa', // 파랑
        '4': '#ffa502', // 주황
        '5': '#ff6b6b', // 연빨강
        '6': '#5f27cd', // 보라
        '7': '#00d2d3', // 청록
        '8': '#ff9ff3', // 분홍
        '9': '#54a0ff', // 하늘
        '10': '#5f27cd' // 자주
    };
    
    const markers = document.querySelectorAll('.part-marker');
    markers.forEach(marker => {
        const markerNumber = parseInt(marker.textContent);
        const part = carParts.find(p => p.number === markerNumber);
        
        if (part && part.name === partName) {
            const color = colorMap[markerNumber.toString()] || '#ffa502';
            marker.style.backgroundColor = color;
        }
    });
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
            part.isIncluded = true;
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
        businessNumber: document.getElementById('shop-business-number').value,
        owner: document.getElementById('shop-owner').value,
        phone: document.getElementById('shop-phone').value,
        address: document.getElementById('shop-address').value,
        account: document.getElementById('shop-account').value,
        bank: document.getElementById('shop-bank').value,
        accountHolder: document.getElementById('shop-account-holder').value
    };
    
    customerInfo = {
        vehicleNumber: document.getElementById('vehicle-number').value,
        manufacturer: document.getElementById('vehicle-manufacturer').value,
        model: document.getElementById('vehicle-model').value,
        mileage: document.getElementById('vehicle-mileage').value,
        year: document.getElementById('vehicle-year').value,
        color: document.getElementById('vehicle-color').value,
        checkinDate: document.getElementById('vehicle-checkin').value,
        checkoutDate: document.getElementById('vehicle-checkout').value,
        memo: document.getElementById('vehicle-memo').value
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
    let subtotal = partsTotal + laborTotal;
    let vat = Math.round(subtotal * 0.1); // 부가세 10%
    let total = subtotal + vat;
    
    const quoteHTML = `
        <div class="quote-header">
            <h2>자동차 부품 견적서</h2>
            <p>견적일: ${quoteDate}</p>
        </div>
        
        <div class="quote-info">
            <div class="quote-section">
                <h4>공급자 정보</h4>
                <p><strong>업체명:</strong> ${shopInfo.name}</p>
                <p><strong>사업자등록번호:</strong> ${shopInfo.businessNumber}</p>
                <p><strong>대표자:</strong> ${shopInfo.owner}</p>
                <p><strong>연락처:</strong> ${shopInfo.phone}</p>
                <p><strong>주소:</strong> ${shopInfo.address}</p>
                <p><strong>계좌정보:</strong> ${shopInfo.account}</p>
                <p><strong>은행:</strong> ${shopInfo.bank}</p>
                <p><strong>예금주:</strong> ${shopInfo.accountHolder}</p>
            </div>
            
            <div class="quote-section">
                <h4>차량정보</h4>
                <p><strong>차량번호:</strong> ${customerInfo.vehicleNumber}</p>
                <p><strong>제조사:</strong> ${customerInfo.manufacturer}</p>
                <p><strong>모델명:</strong> ${customerInfo.model}</p>
                <p><strong>주행거리:</strong> ${customerInfo.mileage}</p>
                <p><strong>연식:</strong> ${customerInfo.year}</p>
                <p><strong>색상:</strong> ${customerInfo.color}</p>
                <p><strong>입고일:</strong> ${customerInfo.checkinDate}</p>
                <p><strong>출고일:</strong> ${customerInfo.checkoutDate}</p>
                <p><strong>메모:</strong> ${customerInfo.memo}</p>
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
                <tr>
                    <td colspan="2"><strong>소계</strong></td>
                    <td colspan="3"><strong>${subtotal.toLocaleString()}원</strong></td>
                </tr>
                <tr>
                    <td colspan="2"><strong>부가세 (10%)</strong></td>
                    <td colspan="3"><strong>${vat.toLocaleString()}원</strong></td>
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
async function addModel(event) {
    event.preventDefault();
    const brand = document.getElementById('brand-select').value;
    const modelName = document.getElementById('new-model').value.trim();
    const diagramFile = document.getElementById('diagram-upload').files[0];
    
    if (!brand || !modelName) {
        alert('브랜드와 모델명을 입력하세요.');
        return;
    }
    
    const key = `${brand}-${modelName}`;
    
    try {
        if (models[brand] && models[brand].includes(modelName)) {
            // 기존 모델에 도면 추가
            if (!diagramFile) {
                alert('기존 모델에 도면을 추가하려면 이미지 파일을 선택하세요.');
                return;
            }
            
            // modelImages를 배열로 초기화 (기존 단일 이미지가 있는 경우)
            if (modelImages[key] && !Array.isArray(modelImages[key])) {
                modelImages[key] = [modelImages[key]];
            } else if (!modelImages[key]) {
                modelImages[key] = [];
            }
            
            // Firebase Storage에 새 이미지 업로드
            if (isFirebaseEnabled && firebaseStorage) {
                const timestamp = Date.now();
                const imagePath = `diagrams/${brand}/${modelName}_${timestamp}.jpg`;
                const downloadURL = await uploadImageToStorage(diagramFile, imagePath);
                modelImages[key].push(downloadURL);
            } else {
                // Firebase Storage가 비활성화된 경우 Base64 사용
                const reader = new FileReader();
                reader.onload = function(e) {
                    modelImages[key].push(e.target.result);
                    saveToStorage();
                    updateUI();
                };
                reader.readAsDataURL(diagramFile);
                return;
            }
            
            await saveToStorage();
            updateUI();
            alert(`${modelName} 모델에 도면이 추가되었습니다. (총 ${modelImages[key].length}개)`);
        } else {
            // 새 모델 추가
            if (!models[brand]) {
                models[brand] = [];
            }
            
            models[brand].push(modelName);
            
            // 부품 배열 초기화
            if (!parts[key]) {
                parts[key] = [];
            }
            
            // 이미지 파일 처리
            if (diagramFile) {
                // modelImages를 배열로 초기화
                modelImages[key] = [];
                
                if (isFirebaseEnabled && firebaseStorage) {
                    // Firebase Storage에 이미지 업로드
                    const timestamp = Date.now();
                    const imagePath = `diagrams/${brand}/${modelName}_${timestamp}.jpg`;
                    const downloadURL = await uploadImageToStorage(diagramFile, imagePath);
                    modelImages[key].push(downloadURL);
                } else {
                    // Firebase Storage가 비활성화된 경우 Base64 사용
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        modelImages[key].push(e.target.result);
                        saveToStorage();
                        updateUI();
                    };
                    reader.readAsDataURL(diagramFile);
                    return;
                }
            }
            
            await saveToStorage();
            updateBrandSelect();
            updateUI();
            
            if (diagramFile) {
                alert('모델이 추가되었습니다.');
            } else {
                alert('모델이 추가되었습니다. (도면 없음)');
            }
        }
    } catch (error) {
        console.error('모델 추가 중 오류:', error);
        alert('모델 추가 중 오류가 발생했습니다: ' + error.message);
        return;
    }
    
    function updateUI() {
        // 현재 선택된 브랜드와 일치하면 도면 그리드 업데이트
        const currentSelectedBrand = document.getElementById('vehicle-manufacturer').value;
        if (currentSelectedBrand === brand) {
            updateDiagramGrid();
        }
    }
    
    document.getElementById('new-model').value = '';
    document.getElementById('diagram-upload').value = '';
}

// 부품 추가
function addPart(event) {
    event.preventDefault();
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    const partName = document.getElementById('part-name').value.trim();
    const partPrice = parseInt(document.getElementById('part-price').value);
    
    // 모든 위치 입력 필드에서 값 가져오기
    const positionInputs = document.querySelectorAll('.part-position');
    const positions = [];
    
    positionInputs.forEach(input => {
        const positionValue = input.value.trim();
        if (positionValue) {
            positions.push(positionValue);
        }
    });
    
    if (!brand || !model || !partName || !partPrice || positions.length === 0) {
        alert('모든 필드를 입력하세요.');
        return;
    }
    
    const key = `${brand}-${model}`;
    if (!parts[key]) {
        parts[key] = [];
    }
    
    let addedPositions = [];
    
    // 부품 번호를 미리 결정 (같은 부품명이면 같은 번호 사용)
    let partNumber;
    const existingPart = parts[key].find(part => part.name === partName);
    if (existingPart) {
        partNumber = existingPart.number;
    } else {
        // 새로운 부품이면 현재 사용 중인 번호들 중 가장 큰 번호 + 1
        const usedNumbers = parts[key].map(part => part.number);
        const maxNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
        partNumber = maxNumber + 1;
    }
    
    // 각 위치에 대해 부품 추가
    positions.forEach(partPosition => {
        // 위치 파싱 (x,y 또는 x,y-서브위치 형태 - 공백 허용)
        const positionMatch = partPosition.match(/^(\d+)\s*,\s*(\d+)(?:\s*-\s*(\w+))?$/);
        if (!positionMatch) {
            alert(`위치 "${partPosition}"는 "x,y" 또는 "x,y-서브위치" 형태로 입력하세요.\n예: "30, 50" 또는 "30, 50-a"`);
            return;
        }
        
        const position = {
            x: parseInt(positionMatch[1]),
            y: parseInt(positionMatch[2]),
            sub: positionMatch[3] || null // 서브 위치 (a, b, c 등)
        };
        
        // 동일한 위치에 부품이 있는지 확인
        const existingPartsAtPosition = parts[key].filter(part => 
            part.position.x === position.x && part.position.y === position.y
        );
        
        if (existingPartsAtPosition.length > 0 && !position.sub) {
            const existingNames = existingPartsAtPosition.map(p => p.name).join(', ');
            const userChoice = confirm(
                `위치 (${position.x}, ${position.y})에 이미 다음 부품이 있습니다:\n${existingNames}\n\n` +
                '동일한 위치에 여러 부품을 추가하려면 서브위치를 사용하세요.\n' +
                '예: "30, 50-a", "30, 50-b"\n\n' +
                '그래도 추가하시겠습니까?'
            );
            if (!userChoice) {
                return;
            }
        }
        
        // 서브위치 중복 체크
        if (position.sub) {
            const duplicateSubPosition = parts[key].find(part => 
                part.position.x === position.x && 
                part.position.y === position.y && 
                part.position.sub === position.sub
            );
            
            if (duplicateSubPosition) {
                alert(`위치 (${position.x}, ${position.y}-${position.sub})에 이미 "${duplicateSubPosition.name}" 부품이 있습니다.\n다른 서브위치를 사용하세요. (예: -b, -c)`);
                return;
            }
        }
        
        parts[key].push({
            name: partName,
            price: partPrice,
            position: position,
            number: partNumber
        });
        
        const positionText = position.sub ? `${position.x}, ${position.y}-${position.sub}` : `${position.x}, ${position.y}`;
        addedPositions.push(positionText);
    });
    
    // 폼 초기화
    document.getElementById('part-name').value = '';
    document.getElementById('part-price').value = '';
    
    // 모든 위치 입력 필드 초기화 (첫 번째 제외)
    const allPositionInputs = document.querySelectorAll('.part-position');
    allPositionInputs.forEach((input, index) => {
        if (index === 0) {
            input.value = ''; // 첫 번째 입력 필드만 비우기
        } else {
            input.closest('.position-input-group').remove(); // 나머지는 삭제
        }
    });
    
    // 첫 번째 위치 입력 그룹의 삭제 버튼 숨기기
    const firstRemoveBtn = document.querySelector('.remove-position');
    if (firstRemoveBtn) {
        firstRemoveBtn.style.display = 'none';
    }

    
    saveToStorage();
    displayExistingParts(); // 부품 목록 새로고침
    
    if (addedPositions.length > 0) {
        const positionsText = addedPositions.join(', ');
        alert(`부품이 다음 위치에 추가되었습니다: ${positionsText}`);
    }
}

// 위치 입력 필드 추가
function addPositionInput() {
    const positionInputsContainer = document.getElementById('position-inputs');
    const newInputGroup = document.createElement('div');
    newInputGroup.className = 'position-input-group';
    
    newInputGroup.innerHTML = `
        <input type="text" class="part-position" placeholder="위치 입력 (예: 10, 20)" required>
        <button type="button" class="remove-position">삭제</button>
    `;
    
    positionInputsContainer.appendChild(newInputGroup);
    
    // 첫 번째 입력 그룹이 아닌 경우 삭제 버튼 표시
    updateRemoveButtonsVisibility();
}

// 위치 입력 필드 삭제
function removePositionInput(removeButton) {
    const inputGroup = removeButton.closest('.position-input-group');
    const positionInputsContainer = document.getElementById('position-inputs');
    
    // 최소 하나의 입력 필드는 유지
    if (positionInputsContainer.children.length > 1) {
        inputGroup.remove();
        updateRemoveButtonsVisibility();
    } else {
        alert('최소 하나의 위치는 입력해야 합니다.');
    }
}

// 삭제 버튼 표시/숨김 업데이트
function updateRemoveButtonsVisibility() {
    const positionInputsContainer = document.getElementById('position-inputs');
    const removeButtons = positionInputsContainer.querySelectorAll('.remove-position');
    
    removeButtons.forEach((button, index) => {
        if (positionInputsContainer.children.length === 1) {
            // 입력 필드가 하나만 있으면 삭제 버튼 숨김
            button.style.display = 'none';
        } else {
            // 여러 개 있으면 모든 삭제 버튼 표시
            button.style.display = 'inline-block';
        }
    });
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
    
    // 같은 부품명과 번호를 가진 부품들을 그룹화
    const groupedParts = {};
    carParts.forEach((part, index) => {
        const groupKey = `${part.name}-${part.number}`;
        if (!groupedParts[groupKey]) {
            groupedParts[groupKey] = {
                name: part.name,
                number: part.number,
                price: part.price,
                positions: [],
                indices: []
            };
        }
        
        // 위치 데이터 처리
        let x, y, sub;
        if (typeof part.position === 'string') {
            const coords = part.position.split(', ');
            x = parseFloat(coords[0]);
            y = parseFloat(coords[1]);
            sub = null;
        } else {
            x = part.position.x;
            y = part.position.y;
            sub = part.position.sub;
        }
        
        const positionText = sub ? `(${x}, ${y}-${sub})` : `(${x}, ${y})`;
        groupedParts[groupKey].positions.push(positionText);
        groupedParts[groupKey].indices.push(index);
    });
    
    partsList.innerHTML = '';
    Object.values(groupedParts).forEach(group => {
        const partItem = document.createElement('div');
        partItem.className = 'existing-part-item';
        
        const positionsText = group.positions.join(', ');
        
        partItem.innerHTML = `
            <div class="existing-part-info">
                <div class="existing-part-name">${group.name} ${group.number}번</div>
                <div class="existing-part-details">
                    가격: ${group.price.toLocaleString()}원 | 위치: ${positionsText}
                </div>
            </div>
            <div class="existing-part-actions">
                <button class="edit-part-btn" onclick="editPartGroup('${key}', [${group.indices.join(',')}])">수정</button>
                <button class="delete-part-btn" onclick="deletePartGroup('${key}', [${group.indices.join(',')}])">삭제</button>
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

// 그룹화된 부품 삭제
function deletePartGroup(key, indices) {
    const partName = parts[key][indices[0]].name;
    const partNumber = parts[key][indices[0]].number;
    if (confirm(`${partName} ${partNumber}번 부품을 모든 위치에서 삭제하시겠습니까?`)) {
        // 인덱스를 내림차순으로 정렬하여 뒤에서부터 삭제
        indices.sort((a, b) => b - a);
        indices.forEach(index => {
            parts[key].splice(index, 1);
        });
        saveToStorage();
        displayExistingParts();
        displayPartsAdminDiagram();
        alert('부품이 삭제되었습니다.');
    }
}

// 그룹화된 부품 수정
function editPartGroup(key, indices) {
    const part = parts[key][indices[0]];
    const newName = prompt('부품명을 입력하세요:', part.name);
    if (newName === null) return;
    
    const newPrice = prompt('가격을 입력하세요:', part.price);
    if (newPrice === null) return;
    
    // 모든 인스턴스 업데이트
    indices.forEach(index => {
        parts[key][index].name = newName.trim();
        parts[key][index].price = parseInt(newPrice);
    });
    
    saveToStorage();
    displayExistingParts();
    displayPartsAdminDiagram();
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
async function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const brand = document.getElementById('parts-brand-select').value;
    const model = document.getElementById('parts-model-select').value;
    
    if (!brand || !model) {
        alert('브랜드와 모델을 먼저 선택하세요.');
        return;
    }
    
    const key = `${brand}-${model}`;
    
    try {
        // 기존 이미지가 있다면 삭제
        if (modelImages[key] && modelImages[key].startsWith('https://')) {
            try {
                const oldImagePath = modelImages[key].split('/').pop().split('?')[0];
                await deleteImageFromStorage(`diagrams/${brand}/${oldImagePath}`);
            } catch (error) {
                console.log('기존 이미지 삭제 중 오류 (무시):', error);
            }
        }
        
        if (isFirebaseEnabled && firebaseStorage) {
            // Firebase Storage에 이미지 업로드
            const imagePath = generateImagePath(brand, model);
            const downloadURL = await uploadImageToStorage(file, imagePath);
            modelImages[key] = downloadURL;
        } else {
            // Firebase Storage가 비활성화된 경우 Base64 사용
            const reader = new FileReader();
            reader.onload = function(e) {
                modelImages[key] = e.target.result;
                saveToStorage();
                displayPartsAdminDiagram();
                alert('이미지가 업데이트되었습니다.');
            };
            reader.readAsDataURL(file);
            return;
        }
        
        await saveToStorage();
        displayPartsAdminDiagram();
        alert('이미지가 업데이트되었습니다.');
    } catch (error) {
        console.error('이미지 업데이트 중 오류:', error);
        alert('이미지 업데이트 중 오류가 발생했습니다: ' + error.message);
    }
}

// 도면 이미지 클릭 처리
// 클릭된 위치 기록을 위한 변수
let lastClickedPosition = null;
let clickCount = 0;
let clickTimeout = null;

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
    const currentPosition = `${xPercent}, ${yPercent}`;
    
    // 첫 번째 빈 위치 입력 필드 찾기
    const positionInputs = document.querySelectorAll('.part-position');
    let targetInput = null;
    
    // 빈 입력 필드 찾기
    for (let input of positionInputs) {
        if (!input.value.trim()) {
            targetInput = input;
            break;
        }
    }
    
    // 모든 필드가 채워져 있으면 새 입력 필드 추가
    if (!targetInput) {
        addPositionInput();
        const newInputs = document.querySelectorAll('.part-position');
        targetInput = newInputs[newInputs.length - 1];
    }
    
    const helpText = document.querySelector('.position-help');
    
    if (targetInput) {
        // 같은 위치를 연속으로 클릭했는지 확인
        if (lastClickedPosition === currentPosition) {
            clickCount++;
            
            // 타임아웃 초기화
            if (clickTimeout) {
                clearTimeout(clickTimeout);
            }
            
            // 서브포지션 문자 생성 (a, b, c, ...)
            const subPosition = String.fromCharCode(97 + clickCount - 1); // a=97
            const positionWithSub = `${xPercent}, ${yPercent}-${subPosition}`;
            targetInput.value = positionWithSub;
            
            // 도움말 텍스트 업데이트
            if (helpText) {
                const originalText = helpText.textContent;
                helpText.textContent = `같은 위치의 ${clickCount}번째 부품: ${positionWithSub}`;
                helpText.style.color = '#007bff';
                helpText.style.fontWeight = 'bold';
                
                setTimeout(() => {
                    helpText.textContent = originalText;
                    helpText.style.color = '#6c757d';
                    helpText.style.fontWeight = 'normal';
                }, 3000);
            }
        } else {
            // 새로운 위치 클릭
            clickCount = 1;
            lastClickedPosition = currentPosition;
            targetInput.value = currentPosition;
            
            // 도움말 텍스트 업데이트
            if (helpText) {
                const originalText = helpText.textContent;
                helpText.textContent = `위치가 설정되었습니다: ${currentPosition} (같은 위치를 다시 클릭하면 서브포지션 생성)`;
                helpText.style.color = '#28a745';
                helpText.style.fontWeight = 'bold';
                
                setTimeout(() => {
                    helpText.textContent = originalText;
                    helpText.style.color = '#6c757d';
                    helpText.style.fontWeight = 'normal';
                }, 3000);
            }
        }
        
        // 시각적 피드백
        targetInput.style.backgroundColor = '#e8f5e8';
        targetInput.style.border = '2px solid #28a745';
        
        // 3초 후 클릭 카운트 초기화
        clickTimeout = setTimeout(() => {
            clickCount = 0;
            lastClickedPosition = null;
        }, 3000);
        
        setTimeout(() => {
            targetInput.style.backgroundColor = '';
            targetInput.style.border = '';
        }, 1000);
        
        console.log(`클릭 위치: ${currentPosition}, 클릭 횟수: ${clickCount}`);
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
    
    // 현재 등록된 데이터 상태 확인
    checkCurrentData();
    
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
    document.getElementById('vehicle-manufacturer').addEventListener('change', function() {
        updateModelSelect('vehicle-manufacturer', 'vehicle-model');
        selectedParts = []; // 브랜드 변경시 선택된 부품 초기화
        updateSelectedPartsList();
    });
    
    // 모델 선택 변경
    document.getElementById('vehicle-model').addEventListener('change', function() {
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
    
    // 관리자 페이지 이벤트 리스너
    document.getElementById('brand-form').addEventListener('submit', addBrand);
    document.getElementById('model-form').addEventListener('submit', addModel);
    document.getElementById('parts-form').addEventListener('submit', addPart);
    
    // 위치 추가 버튼 이벤트
    document.getElementById('add-position-btn').addEventListener('click', addPositionInput);
    
    // 위치 삭제 버튼 이벤트 (이벤트 위임 사용)
    document.getElementById('position-inputs').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-position')) {
            removePositionInput(e.target);
        }
    });
    
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
    
    // 전체 도면 보기 버튼
    document.getElementById('show-all-diagrams').addEventListener('click', showAllDiagrams);
    
    // 브랜드별 도면 보기 버튼
    document.getElementById('show-brand-diagrams').addEventListener('click', showBrandDiagrams);
    

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
            const shopBusinessNumber = document.getElementById('shop-business-number').value.trim();
            const shopOwner = document.getElementById('shop-owner').value.trim();
            const shopPhone = document.getElementById('shop-phone').value.trim();
            const shopAddress = document.getElementById('shop-address').value.trim();
            const shopAccount = document.getElementById('shop-account').value.trim();
            const shopBank = document.getElementById('shop-bank').value.trim();
            const shopAccountHolder = document.getElementById('shop-account-holder').value.trim();
            
            if (!shopName || !shopBusinessNumber || !shopOwner || !shopPhone || !shopAddress || !shopAccount || !shopBank || !shopAccountHolder) {
                alert('공급자 정보를 모두 입력해주세요.');
                return false;
            }
            return true;
            
        case 'customer-info':
            const vehicleNumber = document.getElementById('vehicle-number').value.trim();
            const vehicleManufacturer = document.getElementById('vehicle-manufacturer').value.trim();
            const vehicleModel = document.getElementById('vehicle-model').value.trim();
            const vehicleMileage = document.getElementById('vehicle-mileage').value.trim();
            const vehicleYear = document.getElementById('vehicle-year').value.trim();
            const vehicleColor = document.getElementById('vehicle-color').value.trim();
            const vehicleCheckin = document.getElementById('vehicle-checkin').value.trim();
            
            if (!vehicleNumber || !vehicleManufacturer || !vehicleModel || !vehicleMileage || !vehicleYear || !vehicleColor || !vehicleCheckin) {
                alert('차량정보를 모두 입력해주세요.');
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
window.selectDiagram = selectDiagram;
window.backToGrid = backToGrid;
window.showAllDiagrams = showAllDiagrams;
window.showBrandDiagrams = showBrandDiagrams;
window.checkCurrentData = checkCurrentData;
window.deleteImage = deleteImage;