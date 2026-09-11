// 成就系统 - 爱丽丝梦游仙境
class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.isInitialized = false;
        this.popupQueue = [];
        this.isShowingPopup = false;
        
        // 成就配置映射
        this.achievementConfig = {
            'heart_awakening': {
                name: 'heart_awakening',
                title: '心之初醒',
                description: '爱丽丝第一次主动的自我认知与成长，学会打破困境，不再被动接受',
                icon: '💖',
                rarity: 'rare',
                points: 30
            },
            'wonderland_echo': {
                name: 'wonderland_echo',
                title: '仙境回响',
                description: '在隐藏关卡中重组记忆碎片，理解仙境的悲歌与真相',
                icon: '🎵',
                rarity: 'epic',
                points: 50
            },
            'mind_insight': {
                name: 'mind_insight',
                title: '心智洞察',
                description: '深入理解仙境角色的内心，获得更深层次的共情能力',
                icon: '🧠',
                rarity: 'rare',
                points: 30
            },
            'power_temptation': {
                name: 'power_temptation',
                title: '力量的诱惑',
                description: '选择运用力量来掌控局面，踏上力量之路',
                icon: '⚡',
                rarity: 'rare',
                points: 30
            },
            'trio_memory': {
                name: 'trio_memory',
                title: '三人记忆',
                description: '在时间小游戏中获胜，收集三人的珍贵记忆',
                icon: '⏰',
                rarity: 'rare',
                points: 30
            },
            'mirror_domain_insight': {
                name: 'mirror_domain_insight',
                title: '镜域洞察',
                description: '在镜中颠倒屋找到所有隐藏物品，洞察镜域的奥秘',
                icon: '🔍',
                rarity: 'rare',
                points: 30
            },
            'wonderland_understanding': {
                name: 'wonderland_understanding',
                title: '仙境之悟',
                description: '理解仙境深层的痛苦与悲哀，发现表象下的真实根源',
                icon: '🔮',
                rarity: 'epic',
                points: 50
            }
        };
    }

    // 初始化成就系统
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadUserAchievements();
            this.createPopupHTML();
            this.isInitialized = true;
            console.log('成就系统初始化成功');
        } catch (error) {
            console.error('成就系统初始化失败:', error);
        }
    }

    // 加载用户成就数据
    async loadUserAchievements() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/achievements', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    data.achievements.forEach(achievement => {
                        this.achievements.set(achievement.name, achievement);
                        if (achievement.unlocked) {
                            this.unlockedAchievements.add(achievement.name);
                        }
                    });
                    console.log('用户成就数据加载成功');
                }
            }
        } catch (error) {
            console.error('加载成就数据失败:', error);
        }
    }

    // 创建弹框HTML
    createPopupHTML() {
        if (document.getElementById('achievement-popup')) return;

        const popupHTML = `
            <div id="achievement-popup" class="achievement-popup">
                <div class="achievement-popup-content">
                    <div class="achievement-popup-header">
                        <div class="achievement-popup-icon">🏆</div>
                        <div class="achievement-popup-title">成就解锁！</div>
                    </div>
                    <div class="achievement-popup-body">
                        <div class="achievement-popup-name"></div>
                        <div class="achievement-popup-description"></div>
                        <div class="achievement-popup-points"></div>
                    </div>
                    <div class="achievement-popup-close">×</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);
        this.addPopupStyles();
        this.bindPopupEvents();
    }

    // 添加弹框样式
    addPopupStyles() {
        if (document.getElementById('achievement-popup-styles')) return;

        const styles = `
            <style id="achievement-popup-styles">
                .achievement-popup {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 350px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 15px;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    transform: translateX(400px);
                    transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    opacity: 0;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    font-family: 'Noto Serif SC', serif;
                }

                .achievement-popup.show {
                    transform: translateX(0);
                    opacity: 1;
                }

                .achievement-popup-content {
                    padding: 20px;
                    color: white;
                    position: relative;
                }

                .achievement-popup-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .achievement-popup-icon {
                    font-size: 2rem;
                    margin-right: 10px;
                    animation: bounce 2s infinite;
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }

                .achievement-popup-title {
                    font-size: 1.4rem;
                    font-weight: bold;
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                }

                .achievement-popup-name {
                    font-size: 1.2rem;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: #FFD700;
                    text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
                }

                .achievement-popup-description {
                    font-size: 0.95rem;
                    line-height: 1.4;
                    margin-bottom: 10px;
                    opacity: 0.9;
                }

                .achievement-popup-points {
                    font-size: 0.9rem;
                    opacity: 0.8;
                    text-align: right;
                }

                .achievement-popup-close {
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    font-size: 1.5rem;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.3s ease;
                }

                .achievement-popup-close:hover {
                    opacity: 1;
                }

                .achievement-popup.common {
                    background: linear-gradient(135deg, #74b9ff, #0984e3);
                }

                .achievement-popup.uncommon {
                    background: linear-gradient(135deg, #00b894, #00a085);
                }

                .achievement-popup.rare {
                    background: linear-gradient(135deg, #a29bfe, #6c5ce7);
                }

                .achievement-popup.epic {
                    background: linear-gradient(135deg, #fd79a8, #e84393);
                }

                .achievement-popup.legendary {
                    background: linear-gradient(135deg, #fdcb6e, #e17055);
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(253, 203, 110, 0.3);
                }

                @media (max-width: 768px) {
                    .achievement-popup {
                        width: 300px;
                        right: 10px;
                        top: 10px;
                    }
                    
                    .achievement-popup-content {
                        padding: 15px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // 绑定弹框事件
    bindPopupEvents() {
        const popup = document.getElementById('achievement-popup');
        const closeBtn = popup.querySelector('.achievement-popup-close');

        closeBtn.addEventListener('click', () => {
            this.hidePopup();
        });

        // 点击弹框外部关闭
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.hidePopup();
            }
        });
    }

    // 解锁成就
    async unlockAchievement(achievementName, showPopup = true) {
        try {
            // 检查是否已解锁
            if (this.unlockedAchievements.has(achievementName)) {
                console.log(`成就 ${achievementName} 已解锁`);
                return false;
            }

            const config = this.achievementConfig[achievementName];
            if (!config) {
                console.error(`未找到成就配置: ${achievementName}`);
                return false;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                console.log('用户未登录，跳过成就解锁');
                return false;
            }

            const response = await fetch('/api/achievements/unlock', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    achievementId: config.name,
                    achievementName: config.title,
                    achievementDescription: config.description
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.newlyUnlocked) {
                    this.unlockedAchievements.add(achievementName);
                    
                    // 更新本地成就数据
                    this.achievements.set(achievementName, {
                        ...config,
                        unlocked: true,
                        unlocked_at: new Date().toISOString()
                    });

                    console.log(`成就解锁成功: ${config.title}`);
                    
                    if (showPopup) {
                        this.showAchievementPopup(config);
                    }
                    
                    return true;
                }
            }
        } catch (error) {
            console.error('解锁成就失败:', error);
        }
        
        return false;
    }

    // 显示成就弹框
    showAchievementPopup(achievement) {
        this.popupQueue.push(achievement);
        if (!this.isShowingPopup) {
            this.processPopupQueue();
        }
    }

    // 处理弹框队列
    processPopupQueue() {
        if (this.popupQueue.length === 0) {
            this.isShowingPopup = false;
            return;
        }

        this.isShowingPopup = true;
        const achievement = this.popupQueue.shift();
        this.displayPopup(achievement);
    }

    // 显示弹框
    displayPopup(achievement) {
        const popup = document.getElementById('achievement-popup');
        const icon = popup.querySelector('.achievement-popup-icon');
        const name = popup.querySelector('.achievement-popup-name');
        const description = popup.querySelector('.achievement-popup-description');
        const points = popup.querySelector('.achievement-popup-points');

        // 设置内容
        icon.textContent = achievement.icon || '🏆';
        name.textContent = achievement.title;
        description.textContent = achievement.description;
        points.textContent = `+${achievement.points || 10} 分`;

        // 设置稀有度样式
        popup.className = `achievement-popup ${achievement.rarity || 'common'}`;

        // 显示弹框
        popup.classList.add('show');

        // 播放解锁音效（如果有）
        this.playUnlockSound();

        // 自动隐藏
        setTimeout(() => {
            this.hidePopup();
        }, 5000);
    }

    // 隐藏弹框
    hidePopup() {
        const popup = document.getElementById('achievement-popup');
        popup.classList.remove('show');
        
        // 延迟处理下一个弹框
        setTimeout(() => {
            this.processPopupQueue();
        }, 600);
    }

    // 播放解锁音效
    playUnlockSound() {
        try {
            // 创建音效（简单的提示音）
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('音效播放失败:', error);
        }
    }

    // 检查成就是否已解锁
    isUnlocked(achievementName) {
        return this.unlockedAchievements.has(achievementName);
    }

    // 获取用户成就统计
    getAchievementStats() {
        const total = Object.keys(this.achievementConfig).length;
        const unlocked = this.unlockedAchievements.size;
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100)
        };
    }
}

// 创建全局成就系统实例
window.achievementSystem = new AchievementSystem();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.achievementSystem.init();
});

// 导出成就系统（如果支持模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementSystem;
} 