// 主應用程式控制器
class HouseRecommendationApp {
    constructor() {
        this.currentRecommendations = [];
        this.currentSearchCriteria = null;
        this.isLoading = false;
        
        // DOM 元素
        this.searchForm = null;
        this.loadingSpinner = null;
        this.searchStats = null;
        this.recommendationsList = null;
        this.mapSection = null;
        this.recommendationsSection = null;
        
        // 初始化
        this.init();
    }

    // 初始化應用程式
    async init() {
        try {
            console.log('初始化房屋推薦系統...');
            
            // 等待 DOM 載入完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupApp());
            } else {
                this.setupApp();
            }

        } catch (error) {
            console.error('應用程式初始化失敗:', error);
            this.showError('系統初始化失敗，請重新整理頁面');
        }
    }

    // 設定應用程式
    async setupApp() {
        try {
            // 獲取 DOM 元素
            this.getDOMElements();
            
            // 設定事件監聽器
            this.setupEventListeners();
            
            // 等待資料載入
            await this.waitForDataLoad();
            
            // 初始化地圖
            this.initializeMap();
            
            console.log('應用程式設定完成');

        } catch (error) {
            console.error('應用程式設定失敗:', error);
            this.showError('應用程式設定失敗');
        }
    }

    // 獲取 DOM 元素
    getDOMElements() {
        this.searchForm = document.getElementById('searchForm');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.searchStats = document.getElementById('searchStats');
        this.statsText = document.getElementById('statsText');
        this.recommendationsList = document.getElementById('recommendationsList');
        this.mapSection = document.getElementById('map-section');
        this.recommendationsSection = document.getElementById('recommendations-section');
    }

    // 設定事件監聽器
    setupEventListeners() {
        // 搜尋表單提交
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // 房屋選中事件
        document.addEventListener('houseSelected', (e) => {
            this.handleHouseSelection(e.detail);
        });

        // 平滑滾動導航
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // 回到頂部按鈕（如果需要）
        this.setupScrollToTop();

        // 監聽視窗大小變化，重新調整地圖
        window.addEventListener('resize', () => {
            if (mapUtils.map) {
                setTimeout(() => {
                    mapUtils.map.invalidateSize();
                }, 100);
            }
        });

        // 監聽地圖區域的顯示狀態變化
        if (this.mapSection) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.style.display !== 'none' && mapUtils.map) {
                            setTimeout(() => {
                                mapUtils.map.invalidateSize();
                            }, 200);
                        }
                    }
                });
            });
            
            observer.observe(this.mapSection, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    }

    // 等待資料載入
    async waitForDataLoad() {
        const maxWait = 10000; // 最多等待 10 秒
        const startTime = Date.now();
        
        while (!housingDataLoader.isLoaded && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!housingDataLoader.isLoaded) {
            throw new Error('資料載入超時');
        }
    }

    // 初始化地圖
    initializeMap() {
        try {
            // 延遲初始化地圖，確保 DOM 元素已經準備好
            setTimeout(() => {
                mapUtils.initMap('map');
                console.log('地圖初始化完成');
                
                // 再次確保地圖大小正確
                setTimeout(() => {
                    if (mapUtils.map) {
                        mapUtils.map.invalidateSize();
                    }
                }, 500);
            }, 100);
        } catch (error) {
            console.error('地圖初始化失敗:', error);
        }
    }

    // 處理搜尋
    async handleSearch() {
        try {
            if (this.isLoading) return;
            
            // 顯示載入狀態
            this.showLoading(true);
            
            // 獲取搜尋條件
            const criteria = this.getSearchCriteria();
            this.currentSearchCriteria = criteria;
            
            // 驗證搜尋條件
            if (!this.validateSearchCriteria(criteria)) {
                this.showLoading(false);
                return;
            }
            
            // 執行推薦搜尋
            const recommendations = recommendationEngine.getRecommendations(criteria, 20);
            this.currentRecommendations = recommendations;
            
            // 更新 UI
            this.updateSearchResults(recommendations);
            this.updateMap(recommendations, criteria);
            this.updateStats(recommendations);
            
            // 顯示結果區域
            this.showResultSections();
            
            this.showLoading(false);
            
            console.log(`搜尋完成，找到 ${recommendations.length} 個推薦結果`);

        } catch (error) {
            console.error('搜尋處理失敗:', error);
            this.showError('搜尋失敗，請檢查條件後重試');
            this.showLoading(false);
        }
    }

    // 獲取搜尋條件
    getSearchCriteria() {
        const formData = new FormData(this.searchForm);
        const criteria = {};
        
        // 獲取所有表單欄位
        ['district', 'searchRadius', 'minRent', 'maxRent', 'rooms', 'halls', 
         'bathrooms', 'buildingType', 'area'].forEach(field => {
            const value = document.getElementById(field)?.value;
            if (value && value !== '') {
                criteria[field] = field.includes('Rent') ? parseInt(value) : value;
            }
        });
        
        return criteria;
    }

    // 驗證搜尋條件
    validateSearchCriteria(criteria) {
        if (!criteria.district) {
            this.showError('請選擇搜尋區域');
            return false;
        }
        
        if (criteria.minRent && criteria.maxRent && criteria.minRent > criteria.maxRent) {
            this.showError('最低租金不能高於最高租金');
            return false;
        }
        
        return true;
    }

    // 更新搜尋結果
    updateSearchResults(recommendations) {
        if (!this.recommendationsList) return;
        
        this.recommendationsList.innerHTML = '';
        
        if (recommendations.length === 0) {
            this.showEmptyState();
            return;
        }
        
        recommendations.forEach((house, index) => {
            const listItem = this.createHouseListItem(house, index);
            this.recommendationsList.appendChild(listItem);
        });
        
        // 添加動畫效果
        setTimeout(() => {
            this.recommendationsList.querySelectorAll('.house-item').forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('slide-in');
                }, index * 100);
            });
        }, 100);
    }

    // 創建房屋清單項目
    createHouseListItem(house, index) {
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item house-item position-relative';
        listItem.setAttribute('data-house-id', house.id);
        
        if (house.recommendationScore >= 80) {
            listItem.classList.add('recommended');
        }
        
        const distance = house.distance ? `${house.distance.toFixed(2)} 公里` : '';
        const score = house.recommendationScore || 0;
        
        listItem.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="house-image me-3">
                    <i class="fas fa-home"></i>
                </div>
                <div class="house-details flex-grow-1">
                    <h5>${house.district} • ${house.buildingType}</h5>
                    <div class="price">NT$ ${house.rent.toLocaleString()} / 月</div>
                    <div class="house-features">
                        <span class="feature-tag">${house.rooms}房${house.halls}廳${house.bathrooms}衛</span>
                        <span class="feature-tag">${house.area} 坪</span>
                        <span class="feature-tag">屋齡 ${house.age} 年</span>
                        <span class="feature-tag">每坪 NT$ ${house.pricePerPing}</span>
                    </div>
                    ${distance ? `<span class="distance-badge">${distance}</span>` : ''}
                </div>
                <div class="recommendation-score text-center">
                    <div class="score-circle ${this.getScoreClass(score)}">
                        ${score}
                    </div>
                    <small class="text-muted">推薦度</small>
                </div>
                <div class="action-buttons ms-3">
                    <button class="btn btn-outline-primary btn-sm me-2" onclick="app.viewOnMap('${house.id}')">
                        <i class="fas fa-map-marker-alt me-1"></i>地圖
                    </button>
                    <button class="btn btn-outline-info btn-sm" onclick="app.showHouseDetails('${house.id}')">
                        <i class="fas fa-info-circle me-1"></i>詳情
                    </button>
                </div>
            </div>
        `;
        
        // 添加點擊事件
        listItem.addEventListener('click', (e) => {
            if (!e.target.closest('.action-buttons')) {
                this.selectHouse(house);
            }
        });
        
        return listItem;
    }

    // 獲取分數等級樣式
    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 80) return 'score-good';
        if (score >= 70) return 'score-fair';
        return 'score-poor';
    }

    // 顯示空狀態
    showEmptyState() {
        this.recommendationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>沒有找到符合條件的房屋</h4>
                <p>請嘗試調整搜尋條件，例如擴大搜尋範圍或放寬篩選條件</p>
                <button class="btn btn-primary" onclick="app.resetSearch()">
                    <i class="fas fa-undo me-1"></i>重新搜尋
                </button>
            </div>
        `;
    }

    // 更新地圖
    updateMap(recommendations, criteria) {
        try {
            // 添加搜尋中心
            if (criteria.district && criteria.searchRadius) {
                const center = housingDataLoader.getDistrictCenter(criteria.district);
                if (center) {
                    mapUtils.addSearchCenter(center.lat, center.lng, parseFloat(criteria.searchRadius));
                }
            }
            
            // 添加房屋標記
            mapUtils.addHouseMarkers(recommendations);
            
        } catch (error) {
            console.error('地圖更新失敗:', error);
        }
    }

    // 更新統計資訊
    updateStats(recommendations) {
        if (!this.statsText) return;
        
        const stats = recommendationEngine.getRecommendationStats(recommendations);
        
        if (stats) {
            this.statsText.textContent = 
                `找到 ${stats.count} 個推薦房屋，平均租金 NT$ ${stats.avgRent.toLocaleString()}，` +
                `平均推薦度 ${stats.avgScore} 分，覆蓋 ${stats.districts} 個區域`;
        } else {
            this.statsText.textContent = '沒有找到符合條件的房屋';
        }
        
        this.searchStats.style.display = 'block';
    }

    // 顯示結果區域
    showResultSections() {
        if (this.recommendationsSection) {
            this.recommendationsSection.style.display = 'block';
        }
        if (this.mapSection) {
            this.mapSection.style.display = 'block';
            
            // 重要：顯示地圖區域後，重新計算地圖大小
            setTimeout(() => {
                if (mapUtils.map) {
                    mapUtils.map.invalidateSize();
                    console.log('地圖大小已重新計算');
                }
            }, 200);
        }
        
        // 滾動到結果區域
        setTimeout(() => {
            this.recommendationsSection?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    // 顯示載入狀態
    showLoading(show) {
        this.isLoading = show;
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = show ? 'block' : 'none';
        }
    }

    // 顯示錯誤訊息
    showError(message) {
        // 創建錯誤提示
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // 插入到頁面頂部
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            
            // 自動消失
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }

    // 選擇房屋
    selectHouse(house) {
        // 高亮選中的房屋
        document.querySelectorAll('.house-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`[data-house-id="${house.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // 在地圖上顯示
        this.viewOnMap(house.id);
    }

    // 在地圖上檢視房屋
    viewOnMap(houseId) {
        const house = this.currentRecommendations.find(h => h.id === houseId);
        if (house && house.lat && house.lng) {
            mapUtils.setMapCenter(house.lat, house.lng, 15);
            this.mapSection?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // 顯示房屋詳情
    showHouseDetails(houseId) {
        const house = this.currentRecommendations.find(h => h.id === houseId);
        if (!house) return;
        
        // 創建詳情模態視窗
        const modal = this.createHouseDetailModal(house);
        document.body.appendChild(modal);
        
        // 顯示模態視窗
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // 關閉後移除
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    // 創建房屋詳情模態視窗
    createHouseDetailModal(house) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'houseDetailModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-home me-2"></i>
                            房屋詳細資訊
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>基本資訊</h6>
                                <table class="table table-sm">
                                    <tr><td>區域</td><td>${house.district}</td></tr>
                                    <tr><td>建物類型</td><td>${house.buildingType}</td></tr>
                                    <tr><td>房型</td><td>${house.rooms}房${house.halls}廳${house.bathrooms}衛</td></tr>
                                    <tr><td>坪數</td><td>${house.area} 坪</td></tr>
                                    <tr><td>屋齡</td><td>${house.age} 年</td></tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>租金資訊</h6>
                                <table class="table table-sm">
                                    <tr><td>月租金</td><td class="text-danger fw-bold">NT$ ${house.rent.toLocaleString()}</td></tr>
                                    <tr><td>每坪租金</td><td>NT$ ${house.pricePerPing}</td></tr>
                                    <tr><td>推薦度</td><td><span class="badge bg-primary">${house.recommendationScore || 0} 分</span></td></tr>
                                    ${house.distance ? `<tr><td>距離</td><td>${house.distance.toFixed(2)} 公里</td></tr>` : ''}
                                </table>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <h6>相似房屋推薦</h6>
                                <div id="similarHouses">載入中...</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                        <button type="button" class="btn btn-primary" onclick="app.viewOnMap('${house.id}')">
                            <i class="fas fa-map-marker-alt me-1"></i>在地圖上檢視
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 載入相似房屋
        setTimeout(() => {
            this.loadSimilarHouses(house, modal.querySelector('#similarHouses'));
        }, 100);
        
        return modal;
    }

    // 載入相似房屋
    loadSimilarHouses(house, container) {
        try {
            const similarHouses = recommendationEngine.getSimilarHouses(house, 5);
            
            if (similarHouses.length === 0) {
                container.innerHTML = '<p class="text-muted">沒有找到相似的房屋</p>';
                return;
            }
            
            const html = similarHouses.map(similar => `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${similar.district}</strong> • ${similar.rooms}房${similar.halls}廳${similar.bathrooms}衛 • ${similar.area}坪
                            </div>
                            <div class="text-end">
                                <div class="text-danger fw-bold">NT$ ${similar.rent.toLocaleString()}</div>
                                <small class="text-muted">${similar.distance.toFixed(2)} 公里</small>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('載入相似房屋失敗:', error);
            container.innerHTML = '<p class="text-danger">載入失敗</p>';
        }
    }

    // 處理房屋選中事件
    handleHouseSelection(house) {
        console.log('房屋被選中:', house);
        this.selectHouse(house);
    }

    // 設定回到頂部按鈕
    setupScrollToTop() {
        const scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.className = 'btn btn-primary scroll-to-top';
        scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollToTopBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: none;
        `;
        
        document.body.appendChild(scrollToTopBtn);
        
        // 監聽滾動事件
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        
        // 點擊回到頂部
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// 全域工具函數
function resetForm() {
    const form = document.getElementById('searchForm');
    if (form) {
        form.reset();
    }
}

function sortResults(sortBy) {
    if (!app.currentRecommendations || app.currentRecommendations.length === 0) return;
    
    let sortedResults = [...app.currentRecommendations];
    
    switch (sortBy) {
        case 'rent':
            sortedResults.sort((a, b) => a.rent - b.rent);
            break;
        case 'distance':
            sortedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            break;
        case 'score':
            sortedResults.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
            break;
    }
    
    app.currentRecommendations = sortedResults;
    app.updateSearchResults(sortedResults);
}

function exportResults() {
    if (!app.currentRecommendations || app.currentRecommendations.length === 0) {
        app.showError('沒有可匯出的資料');
        return;
    }
    
    try {
        const data = app.currentRecommendations.map(house => ({
            '房屋ID': house.id,
            '區域': house.district,
            '租金': house.rent,
            '房型': `${house.rooms}房${house.halls}廳${house.bathrooms}衛`,
            '坪數': house.area,
            '建物類型': house.buildingType,
            '屋齡': house.age,
            '推薦度': house.recommendationScore || 0,
            '距離': house.distance ? `${house.distance.toFixed(2)}公里` : ''
        }));
        
        const csv = convertToCSV(data);
        downloadCSV(csv, 'house_recommendations.csv');
        
    } catch (error) {
        console.error('匯出失敗:', error);
        app.showError('匯出失敗');
    }
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleMapLayer(layer) {
    // 地圖圖層切換邏輯
    console.log('切換地圖圖層:', layer);
}

function fitMapBounds() {
    mapUtils.resetMapBounds();
    // 額外的地圖重新整理
    setTimeout(() => {
        mapUtils.refreshMap();
    }, 100);
}

// 創建全域應用程式實例
const app = new HouseRecommendationApp();
