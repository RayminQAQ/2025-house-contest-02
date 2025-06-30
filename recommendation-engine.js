// 房屋推薦引擎
class RecommendationEngine {
    constructor() {
        this.weightConfig = {
            distance: 0.3,      // 距離權重
            rent: 0.25,         // 租金權重
            roomMatch: 0.2,     // 房型匹配權重
            area: 0.15,         // 坪數權重
            buildingType: 0.1   // 建物類型權重
        };
    }

    // 計算推薦分數
    calculateRecommendationScore(house, searchCriteria, userPreferences = {}) {
        let score = 0;
        let maxScore = 0;

        // 距離分數（越近分數越高）
        if (house.distance !== undefined) {
            const distanceScore = Math.max(0, 1 - (house.distance / 5)); // 5公里內給分
            score += distanceScore * this.weightConfig.distance;
            maxScore += this.weightConfig.distance;
        }

        // 租金分數（越接近預期租金分數越高）
        if (searchCriteria.minRent || searchCriteria.maxRent) {
            const targetRent = searchCriteria.maxRent || house.rent;
            const rentDifference = Math.abs(house.rent - targetRent) / targetRent;
            const rentScore = Math.max(0, 1 - rentDifference);
            score += rentScore * this.weightConfig.rent;
            maxScore += this.weightConfig.rent;
        }

        // 房型匹配分數
        let roomMatchScore = 0;
        let roomMatchCount = 0;

        if (searchCriteria.rooms) {
            roomMatchScore += house.rooms === parseInt(searchCriteria.rooms) ? 1 : 0;
            roomMatchCount++;
        }
        if (searchCriteria.halls) {
            roomMatchScore += house.halls === parseInt(searchCriteria.halls) ? 1 : 0;
            roomMatchCount++;
        }
        if (searchCriteria.bathrooms) {
            roomMatchScore += house.bathrooms === parseInt(searchCriteria.bathrooms) ? 1 : 0;
            roomMatchCount++;
        }

        if (roomMatchCount > 0) {
            score += (roomMatchScore / roomMatchCount) * this.weightConfig.roomMatch;
            maxScore += this.weightConfig.roomMatch;
        }

        // 坪數分數
        if (searchCriteria.area) {
            const [minArea, maxArea] = searchCriteria.area.split('-').map(x => parseInt(x));
            const targetArea = maxArea === 999 ? minArea + 20 : (minArea + maxArea) / 2;
            const areaDifference = Math.abs(house.area - targetArea) / targetArea;
            const areaScore = Math.max(0, 1 - areaDifference);
            score += areaScore * this.weightConfig.area;
            maxScore += this.weightConfig.area;
        }

        // 建物類型分數（完全匹配）
        if (searchCriteria.buildingType) {
            const buildingScore = house.buildingType === searchCriteria.buildingType ? 1 : 0;
            score += buildingScore * this.weightConfig.buildingType;
            maxScore += this.weightConfig.buildingType;
        }

        // 標準化分數 (0-100)
        return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
    }

    // 獲取推薦房屋
    getRecommendations(searchCriteria, maxResults = 20) {
        try {
            let candidates = [];
            
            // 獲取搜尋範圍內的房屋
            if (searchCriteria.district && searchCriteria.searchRadius) {
                const center = housingDataLoader.getDistrictCenter(searchCriteria.district);
                if (center) {
                    candidates = housingDataLoader.getHousesInRadius(
                        center.lat, 
                        center.lng, 
                        parseFloat(searchCriteria.searchRadius)
                    );
                }
            } else {
                // 如果沒有指定區域，使用所有資料
                candidates = housingDataLoader.housingData.map(house => ({
                    ...house,
                    distance: 0
                }));
            }

            // 應用其他篩選條件
            candidates = this.applyFilters(candidates, searchCriteria);

            // 計算推薦分數
            candidates = candidates.map(house => ({
                ...house,
                recommendationScore: this.calculateRecommendationScore(house, searchCriteria)
            }));

            // 依分數排序
            candidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

            // 返回前 N 個結果
            return candidates.slice(0, maxResults);

        } catch (error) {
            console.error('推薦計算錯誤:', error);
            return [];
        }
    }

    // 應用篩選條件
    applyFilters(houses, filters) {
        return houses.filter(house => {
            // 租金範圍
            if (filters.minRent && house.rent < filters.minRent) return false;
            if (filters.maxRent && house.rent > filters.maxRent) return false;

            // 房型
            if (filters.rooms && house.rooms !== parseInt(filters.rooms)) return false;
            if (filters.halls && house.halls !== parseInt(filters.halls)) return false;
            if (filters.bathrooms && house.bathrooms !== parseInt(filters.bathrooms)) return false;

            // 建物類型
            if (filters.buildingType && house.buildingType !== filters.buildingType) return false;

            // 坪數範圍
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

    // 獲取相似房屋
    getSimilarHouses(targetHouse, maxResults = 10) {
        try {
            // 定義相似性標準
            const criteria = {
                rentRange: 0.2,      // 租金相差20%內
                areaRange: 0.3,      // 坪數相差30%內
                distanceRange: 3     // 3公里內
            };

            let candidates = housingDataLoader.housingData.filter(house => {
                if (house.id === targetHouse.id) return false; // 排除自己

                // 租金範圍檢查
                const rentDiff = Math.abs(house.rent - targetHouse.rent) / targetHouse.rent;
                if (rentDiff > criteria.rentRange) return false;

                // 坪數範圍檢查
                const areaDiff = Math.abs(house.area - targetHouse.area) / targetHouse.area;
                if (areaDiff > criteria.areaRange) return false;

                // 距離檢查
                if (targetHouse.lat && targetHouse.lng && house.lat && house.lng) {
                    const distance = housingDataLoader.calculateDistance(
                        targetHouse.lat, targetHouse.lng, house.lat, house.lng
                    );
                    if (distance > criteria.distanceRange) return false;
                }

                return true;
            });

            // 計算相似度分數
            candidates = candidates.map(house => {
                let similarityScore = 0;
                let factors = 0;

                // 租金相似度
                const rentSimilarity = 1 - Math.abs(house.rent - targetHouse.rent) / Math.max(house.rent, targetHouse.rent);
                similarityScore += rentSimilarity;
                factors++;

                // 坪數相似度
                const areaSimilarity = 1 - Math.abs(house.area - targetHouse.area) / Math.max(house.area, targetHouse.area);
                similarityScore += areaSimilarity;
                factors++;

                // 房型相似度
                const roomSimilarity = (house.rooms === targetHouse.rooms ? 1 : 0) +
                                     (house.halls === targetHouse.halls ? 1 : 0) +
                                     (house.bathrooms === targetHouse.bathrooms ? 1 : 0);
                similarityScore += roomSimilarity / 3;
                factors++;

                // 建物類型相似度
                const buildingSimilarity = house.buildingType === targetHouse.buildingType ? 1 : 0;
                similarityScore += buildingSimilarity;
                factors++;

                // 距離計算
                let distance = 0;
                if (targetHouse.lat && targetHouse.lng && house.lat && house.lng) {
                    distance = housingDataLoader.calculateDistance(
                        targetHouse.lat, targetHouse.lng, house.lat, house.lng
                    );
                }

                return {
                    ...house,
                    similarityScore: similarityScore / factors,
                    distance: distance
                };
            });

            // 按相似度排序
            candidates.sort((a, b) => b.similarityScore - a.similarityScore);

            return candidates.slice(0, maxResults);

        } catch (error) {
            console.error('相似房屋計算錯誤:', error);
            return [];
        }
    }

    // 獲取熱門區域
    getPopularDistricts(limit = 5) {
        try {
            const districtCounts = {};
            
            housingDataLoader.housingData.forEach(house => {
                districtCounts[house.district] = (districtCounts[house.district] || 0) + 1;
            });

            const sortedDistricts = Object.entries(districtCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, limit)
                .map(([district, count]) => ({
                    district,
                    count,
                    avgRent: this.getAverageRentByDistrict(district)
                }));

            return sortedDistricts;

        } catch (error) {
            console.error('熱門區域計算錯誤:', error);
            return [];
        }
    }

    // 獲取區域平均租金
    getAverageRentByDistrict(district) {
        const houses = housingDataLoader.housingData.filter(h => h.district === district);
        if (houses.length === 0) return 0;
        
        const totalRent = houses.reduce((sum, house) => sum + house.rent, 0);
        return Math.round(totalRent / houses.length);
    }

    // 獲取價格趨勢分析
    getPriceTrendAnalysis() {
        try {
            const priceRanges = {
                '5000以下': 0,
                '5000-10000': 0,
                '10000-15000': 0,
                '15000-20000': 0,
                '20000-30000': 0,
                '30000以上': 0
            };

            housingDataLoader.housingData.forEach(house => {
                const rent = house.rent;
                if (rent < 5000) priceRanges['5000以下']++;
                else if (rent < 10000) priceRanges['5000-10000']++;
                else if (rent < 15000) priceRanges['10000-15000']++;
                else if (rent < 20000) priceRanges['15000-20000']++;
                else if (rent < 30000) priceRanges['20000-30000']++;
                else priceRanges['30000以上']++;
            });

            return priceRanges;

        } catch (error) {
            console.error('價格趨勢分析錯誤:', error);
            return {};
        }
    }

    // 更新權重配置
    updateWeights(newWeights) {
        this.weightConfig = { ...this.weightConfig, ...newWeights };
    }

    // 獲取推薦統計
    getRecommendationStats(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return null;
        }

        const rents = recommendations.map(r => r.rent);
        const scores = recommendations.map(r => r.recommendationScore);
        const distances = recommendations.map(r => r.distance || 0);

        return {
            count: recommendations.length,
            avgRent: Math.round(rents.reduce((a, b) => a + b, 0) / rents.length),
            minRent: Math.min(...rents),
            maxRent: Math.max(...rents),
            avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            avgDistance: Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 100) / 100,
            districts: [...new Set(recommendations.map(r => r.district))].length
        };
    }
}

// 全域實例
const recommendationEngine = new RecommendationEngine();
