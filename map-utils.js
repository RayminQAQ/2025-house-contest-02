// 地圖工具類
class MapUtils {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markerCluster = null;
        this.currentBounds = null;
        this.searchCenter = null;
        this.searchCircle = null;
        
        // 地圖圖層
        this.baseLayers = {};
        this.overlayLayers = {};
        
        // 圖標設定
        this.icons = {
            default: L.divIcon({
                className: 'custom-marker default-marker',
                html: '<div class="marker-pin"><i class="fas fa-home"></i></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            }),
            recommended: L.divIcon({
                className: 'custom-marker recommended-marker',
                html: '<div class="marker-pin recommended"><i class="fas fa-star"></i></div>',
                iconSize: [35, 35],
                iconAnchor: [17, 35]
            }),
            selected: L.divIcon({
                className: 'custom-marker selected-marker',
                html: '<div class="marker-pin selected"><i class="fas fa-map-marker-alt"></i></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            }),
            center: L.divIcon({
                className: 'custom-marker center-marker',
                html: '<div class="marker-pin center"><i class="fas fa-crosshairs"></i></div>',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            })
        };
    }

    // 初始化地圖
    initMap(containerId) {
        try {
            // 初始化地圖（以高雄市中心為中心）
            this.map = L.map(containerId, {
                center: [22.6273, 120.3014], // 高雄市中心
                zoom: 11,
                zoomControl: true,
                attributionControl: true
            });

            // 添加基礎圖層
            this.baseLayers = {
                '街道地圖': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }),
                '衛星地圖': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles © Esri',
                    maxZoom: 18
                }),
                '地形地圖': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenTopoMap contributors',
                    maxZoom: 17
                })
            };

            // 設定預設圖層
            this.baseLayers['街道地圖'].addTo(this.map);

            // 添加圖層控制
            L.control.layers(this.baseLayers, this.overlayLayers, {
                position: 'topright',
                collapsed: false
            }).addTo(this.map);

            // 添加比例尺
            L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: false
            }).addTo(this.map);

            // 添加自定義樣式
            this.addCustomMapStyles();

            console.log('地圖初始化完成');
            return this.map;

        } catch (error) {
            console.error('地圖初始化失敗:', error);
            throw error;
        }
    }

    // 添加自定義地圖樣式
    addCustomMapStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .custom-marker {
                background: transparent;
                border: none;
            }
            
            .marker-pin {
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                background: #007bff;
                position: absolute;
                transform: rotate(-45deg);
                left: 50%;
                top: 50%;
                margin: -15px 0 0 -15px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }
            
            .marker-pin i {
                transform: rotate(45deg);
                color: white;
                font-size: 14px;
            }
            
            .marker-pin.recommended {
                background: #ffc107;
                width: 35px;
                height: 35px;
                margin: -17px 0 0 -17px;
            }
            
            .marker-pin.selected {
                background: #dc3545;
                width: 40px;
                height: 40px;
                margin: -20px 0 0 -20px;
                animation: pulse 2s infinite;
            }
            
            .marker-pin.center {
                background: #28a745;
                width: 25px;
                height: 25px;
                margin: -12px 0 0 -12px;
            }
            
            @keyframes pulse {
                0% { transform: rotate(-45deg) scale(1); }
                50% { transform: rotate(-45deg) scale(1.1); }
                100% { transform: rotate(-45deg) scale(1); }
            }
            
            .leaflet-popup-content {
                margin: 8px 12px;
                line-height: 1.4;
            }
            
            .popup-title {
                font-weight: 600;
                color: #007bff;
                margin-bottom: 5px;
                font-size: 14px;
            }
            
            .popup-price {
                color: #dc3545;
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 3px;
            }
            
            .popup-details {
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 3px;
            }
            
            .popup-distance {
                background: #17a2b8;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                display: inline-block;
                margin-top: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    // 清除所有標記
    clearMarkers() {
        if (this.markerCluster) {
            this.map.removeLayer(this.markerCluster);
            this.markerCluster = null;
        }
        
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        
        // 清除搜尋中心和範圍圓圈
        if (this.searchCenter) {
            this.map.removeLayer(this.searchCenter);
            this.searchCenter = null;
        }
        if (this.searchCircle) {
            this.map.removeLayer(this.searchCircle);
            this.searchCircle = null;
        }
    }

    // 添加房屋標記
    addHouseMarkers(houses, options = {}) {
        try {
            this.clearMarkers();
            
            if (!houses || houses.length === 0) {
                console.log('沒有房屋資料可顯示');
                return;
            }

            const markers = [];
            
            houses.forEach((house, index) => {
                if (!house.lat || !house.lng) return;
                
                // 判斷標記類型
                let icon = this.icons.default;
                if (house.recommendationScore && house.recommendationScore >= 80) {
                    icon = this.icons.recommended;
                } else if (options.selectedHouseId && house.id === options.selectedHouseId) {
                    icon = this.icons.selected;
                }
                
                // 創建標記
                const marker = L.marker([house.lat, house.lng], { icon })
                    .bindPopup(this.createPopupContent(house));
                
                // 添加點擊事件
                marker.on('click', () => {
                    this.onMarkerClick(house);
                });
                
                markers.push(marker);
            });

            // 使用標記聚合（如果房屋數量較多）
            if (markers.length > 50) {
                this.markerCluster = L.markerClusterGroup({
                    maxClusterRadius: 50,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true
                });
                
                this.markerCluster.addLayers(markers);
                this.map.addLayer(this.markerCluster);
            } else {
                // 直接添加標記
                markers.forEach(marker => {
                    marker.addTo(this.map);
                    this.markers.push(marker);
                });
            }

            // 調整地圖範圍
            this.fitMapToMarkers();
            
            console.log(`已添加 ${markers.length} 個房屋標記`);

        } catch (error) {
            console.error('添加房屋標記失敗:', error);
        }
    }

    // 創建彈出視窗內容
    createPopupContent(house) {
        const distance = house.distance ? `${house.distance.toFixed(2)} 公里` : '';
        const score = house.recommendationScore ? `${house.recommendationScore} 分` : '';
        
        return `
            <div class="popup-content">
                <div class="popup-title">${house.district} • ${house.buildingType}</div>
                <div class="popup-price">NT$ ${house.rent.toLocaleString()} / 月</div>
                <div class="popup-details">
                    ${house.rooms}房${house.halls}廳${house.bathrooms}衛 • ${house.area} 坪
                </div>
                <div class="popup-details">
                    屋齡: ${house.age} 年 • 每坪: NT$ ${house.pricePerPing}
                </div>
                ${distance ? `<div class="popup-distance">${distance}</div>` : ''}
                ${score ? `<div class="popup-distance" style="background: #28a745; margin-left: 5px;">推薦度 ${score}</div>` : ''}
            </div>
        `;
    }

    // 標記點擊事件
    onMarkerClick(house) {
        console.log('選中房屋:', house);
        
        // 觸發自定義事件
        const event = new CustomEvent('houseSelected', {
            detail: house
        });
        document.dispatchEvent(event);
        
        // 顯示房屋詳細資訊（可以在這裡添加額外邏輯）
        this.showHouseDetails(house);
    }

    // 顯示房屋詳細資訊
    showHouseDetails(house) {
        // 這裡可以顯示更詳細的房屋資訊
        // 或者與主應用程式的其他部分進行互動
    }

    // 添加搜尋中心標記
    addSearchCenter(lat, lng, radius) {
        try {
            // 清除之前的搜尋中心
            if (this.searchCenter) {
                this.map.removeLayer(this.searchCenter);
            }
            if (this.searchCircle) {
                this.map.removeLayer(this.searchCircle);
            }

            // 添加中心標記
            this.searchCenter = L.marker([lat, lng], { 
                icon: this.icons.center 
            }).bindPopup(`搜尋中心<br>範圍: ${radius} 公里`);
            
            this.searchCenter.addTo(this.map);

            // 添加搜尋範圍圓圈
            this.searchCircle = L.circle([lat, lng], {
                radius: radius * 1000, // 轉換為公尺
                fillColor: '#007bff',
                fillOpacity: 0.1,
                color: '#007bff',
                weight: 2,
                opacity: 0.6
            });
            
            this.searchCircle.addTo(this.map);

        } catch (error) {
            console.error('添加搜尋中心失敗:', error);
        }
    }

    // 調整地圖範圍以顯示所有標記
    fitMapToMarkers() {
        try {
            let bounds = null;
            
            if (this.markerCluster) {
                bounds = this.markerCluster.getBounds();
            } else if (this.markers.length > 0) {
                const group = new L.featureGroup(this.markers);
                bounds = group.getBounds();
            }
            
            // 包含搜尋中心
            if (this.searchCenter && bounds) {
                bounds.extend(this.searchCenter.getLatLng());
            } else if (this.searchCenter) {
                bounds = L.latLngBounds([this.searchCenter.getLatLng()]);
            }
            
            if (bounds && bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
                this.currentBounds = bounds;
            }

        } catch (error) {
            console.error('調整地圖範圍失敗:', error);
        }
    }

    // 重設地圖範圍
    resetMapBounds() {
        if (this.currentBounds) {
            this.map.fitBounds(this.currentBounds, { padding: [20, 20] });
        }
    }

    // 獲取地圖中心
    getMapCenter() {
        return this.map ? this.map.getCenter() : null;
    }

    // 設定地圖中心
    setMapCenter(lat, lng, zoom = 13) {
        if (this.map) {
            this.map.setView([lat, lng], zoom);
        }
    }

    // 切換圖層顯示
    toggleLayer(layerName, show) {
        const layer = this.overlayLayers[layerName];
        if (layer) {
            if (show) {
                this.map.addLayer(layer);
            } else {
                this.map.removeLayer(layer);
            }
        }
    }

    // 銷毀地圖
    destroy() {
        if (this.map) {
            this.clearMarkers();
            this.map.remove();
            this.map = null;
        }
    }

    // 截圖功能（需要額外的插件支援）
    captureMap() {
        // 這裡可以實現地圖截圖功能
        console.log('地圖截圖功能待實現');
    }

    // 匯出地圖資料
    exportMapData(houses) {
        try {
            const data = houses.map(house => ({
                id: house.id,
                district: house.district,
                lat: house.lat,
                lng: house.lng,
                rent: house.rent,
                area: house.area,
                rooms: house.rooms,
                recommendationScore: house.recommendationScore || 0,
                distance: house.distance || 0
            }));

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `house_map_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('地圖資料匯出完成');

        } catch (error) {
            console.error('匯出地圖資料失敗:', error);
        }
    }
}

// 全域實例
const mapUtils = new MapUtils();
