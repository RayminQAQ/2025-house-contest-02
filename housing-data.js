// 房屋資料載入與處理模組
class HousingDataLoader {
    constructor() {
        this.housingData = [];
        this.isLoaded = false;
        this.districtCenters = {
            '三民區': { lat: 22.6469, lng: 120.3110 },
            '鳳山區': { lat: 22.6264, lng: 120.3671 },
            '前鎮區': { lat: 22.5957, lng: 120.3204 },
            '新興區': { lat: 22.6248, lng: 120.3022 },
            '楠梓區': { lat: 22.7337, lng: 120.2849 },
            '左營區': { lat: 22.6793, lng: 120.2968 },
            '苓雅區': { lat: 22.6218, lng: 120.3188 },
            '鼓山區': { lat: 22.6564, lng: 120.2735 },
            '小港區': { lat: 22.5644, lng: 120.3397 },
            '大寮區': { lat: 22.5965, lng: 120.3968 },
            '仁武區': { lat: 22.7004, lng: 120.3470 },
            '大社區': { lat: 22.7302, lng: 120.3512 },
            '岡山區': { lat: 22.7967, lng: 120.2951 },
            '路竹區': { lat: 22.8588, lng: 120.2649 },
            '橋頭區': { lat: 22.7583, lng: 120.3063 }
        };
    }

    // 載入房屋資料
    async loadHousingData() {
        if (this.isLoaded) {
            return this.housingData;
        }

        try {
            // 模擬載入 CSV 資料，實際應用中應該從服務器載入
            console.log('開始載入房屋資料...');
            
            // 這裡使用模擬資料，實際應用中應該從 CSV 檔案載入
            await this.loadSimulatedData();
            
            this.isLoaded = true;
            console.log(`載入完成！共 ${this.housingData.length} 筆房屋資料`);
            
            return this.housingData;
        } catch (error) {
            console.error('載入房屋資料失敗:', error);
            throw error;
        }
    }

    // 載入模擬資料（實際應用中應該從 CSV 檔案載入）
    async loadSimulatedData() {
        // 模擬從 CSV 載入的延遲
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 基於真實資料結構生成模擬資料
        const districts = Object.keys(this.districtCenters);
        const buildingTypes = [
            '住宅大樓（十一層(含)以上有電梯）',
            '華廈（十層以下(含)有電梯）',
            '透天厝',
            '公寓(五樓含以下無電梯)'
        ];

        // 生成 500 筆模擬資料
        for (let i = 0; i < 500; i++) {
            const district = districts[Math.floor(Math.random() * districts.length)];
            const center = this.districtCenters[district];
            
            // 在區域中心附近隨機生成座標
            const lat = center.lat + (Math.random() - 0.5) * 0.02;
            const lng = center.lng + (Math.random() - 0.5) * 0.02;
            
            const rooms = Math.floor(Math.random() * 4) + 1;
            const halls = Math.floor(Math.random() * 2) + 1;
            const bathrooms = Math.floor(Math.random() * 2) + 1;
            const area = Math.floor(Math.random() * 50) + 10;
            
            // 基於房型和區域計算合理的租金
            let baseRent = 5000;
            if (district === '新興區' || district === '苓雅區') baseRent = 8000;
            if (district === '三民區' || district === '左營區') baseRent = 7000;
            
            const rent = Math.floor(baseRent + (rooms * 3000) + (area * 200) + Math.random() * 3000);

            const house = {
                id: `CID_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                district: district,
                rent: rent,
                rooms: rooms,
                halls: halls,
                bathrooms: bathrooms,
                area: area,
                buildingType: buildingTypes[Math.floor(Math.random() * buildingTypes.length)],
                age: Math.floor(Math.random() * 40) + 5,
                lat: lat,
                lng: lng,
                // 額外計算的屬性
                pricePerPing: Math.floor(rent / area),
                totalRooms: rooms + halls + bathrooms
            };

            this.housingData.push(house);
        }

        // 按租金排序
        this.housingData.sort((a, b) => a.rent - b.rent);
    }

    // 根據區域篩選房屋
    getHousesByDistrict(district) {
        return this.housingData.filter(house => house.district === district);
    }

    // 根據條件篩選房屋
    filterHouses(filters) {
        return this.housingData.filter(house => {
            // 區域篩選
            if (filters.district && house.district !== filters.district) {
                return false;
            }

            // 租金範圍篩選
            if (filters.minRent && house.rent < filters.minRent) {
                return false;
            }
            if (filters.maxRent && house.rent > filters.maxRent) {
                return false;
            }

            // 房型篩選
            if (filters.rooms && house.rooms !== parseInt(filters.rooms)) {
                return false;
            }
            if (filters.halls && house.halls !== parseInt(filters.halls)) {
                return false;
            }
            if (filters.bathrooms && house.bathrooms !== parseInt(filters.bathrooms)) {
                return false;
            }

            // 建物類型篩選
            if (filters.buildingType && house.buildingType !== filters.buildingType) {
                return false;
            }

            // 坪數篩選
            if (filters.area) {
                const [min, max] = filters.area.split('-').map(x => parseInt(x));
                if (max === 999) { // 50坪以上
                    if (house.area < min) return false;
                } else {
                    if (house.area < min || house.area > max) return false;
                }
            }

            return true;
        });
    }

    // 計算兩點間距離（公里）
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球半徑（公里）
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // 角度轉弧度
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // 根據位置和範圍篩選房屋
    getHousesInRadius(centerLat, centerLng, radiusKm) {
        return this.housingData.filter(house => {
            if (!house.lat || !house.lng) return false;
            const distance = this.calculateDistance(centerLat, centerLng, house.lat, house.lng);
            return distance <= radiusKm;
        }).map(house => ({
            ...house,
            distance: this.calculateDistance(centerLat, centerLng, house.lat, house.lng)
        }));
    }

    // 獲取區域中心座標
    getDistrictCenter(district) {
        return this.districtCenters[district];
    }

    // 獲取所有區域列表
    getAllDistricts() {
        return Object.keys(this.districtCenters);
    }

    // 獲取統計資訊
    getStatistics() {
        if (this.housingData.length === 0) return null;

        const rents = this.housingData.map(h => h.rent);
        const areas = this.housingData.map(h => h.area);

        return {
            total: this.housingData.length,
            avgRent: Math.floor(rents.reduce((a, b) => a + b, 0) / rents.length),
            minRent: Math.min(...rents),
            maxRent: Math.max(...rents),
            avgArea: Math.floor(areas.reduce((a, b) => a + b, 0) / areas.length),
            districts: [...new Set(this.housingData.map(h => h.district))].length,
            buildingTypes: [...new Set(this.housingData.map(h => h.buildingType))].length
        };
    }
}

// 全域實例
const housingDataLoader = new HousingDataLoader();

// 在頁面載入時自動載入資料
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await housingDataLoader.loadHousingData();
        console.log('房屋資料載入完成');
    } catch (error) {
        console.error('無法載入房屋資料:', error);
    }
});
