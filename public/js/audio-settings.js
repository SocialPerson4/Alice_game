// 通用音频和设置功能模块
class AudioSettingsManager {
    constructor() {
        this.audio = null;
        this.audioToggle = null;
        this.settingsToggle = null;
        this.isAudioMuted = false;
        this.savedVolume = 0.5;
        this.isLoggedIn = false;
        this.userToken = null;
        
        this.init();
    }

    init() {
        // 检查登录状态
        this.checkLoginStatus();
        
        // 创建音频元素
        this.createAudioElement();
        
        // 创建控制按钮
        this.createControlButtons();
        
        // 初始化音频设置
        this.initializeAudio();
        
        // 添加事件监听
        this.addEventListeners();
    }

    createAudioElement() {
        // 检查是否已存在音频元素
        if (!document.getElementById('backgroundMusic')) {
            const audio = document.createElement('audio');
            audio.id = 'backgroundMusic';
            audio.loop = true;
            
            const source = document.createElement('source');
            // 根据页面路径调整音频文件路径
            const pageType = this.getPageType();
            const currentPath = window.location.pathname;
            
            // 更精确的路径判断
            if (currentPath.includes('/chapter/') || currentPath.includes('chapter/')) {
                source.src = '../music/爱丽丝的梦境.mp3';
                console.log('章节页面音频路径:', source.src);
            } else {
                source.src = 'music/爱丽丝的梦境.mp3';
                console.log('主页音频路径:', source.src);
            }
            
            // 添加音频加载错误处理
            audio.addEventListener('error', (e) => {
                console.error('音频加载失败:', e);
                console.log('尝试的音频路径:', source.src);
                console.log('当前页面路径:', currentPath);
                
                // 尝试多个备用路径
                if (source.src.includes('../music/')) {
                    // 如果相对路径失败，尝试绝对路径
                    source.src = '/music/爱丽丝的梦境.mp3';
                    console.log('尝试绝对路径:', source.src);
                    audio.load();
                } else if (source.src.includes('music/')) {
                    // 如果主页路径失败，尝试相对路径
                    source.src = './music/爱丽丝的梦境.mp3';
                    console.log('尝试相对路径:', source.src);
                    audio.load();
                }
            });
            
            // 添加加载成功事件
            audio.addEventListener('canplaythrough', () => {
                console.log('音频加载成功，路径:', source.src);
            });
            
            source.type = 'audio/mpeg';
            
            audio.appendChild(source);
            audio.appendChild(document.createTextNode('您的浏览器不支持音频播放。'));
            
            document.body.insertBefore(audio, document.body.firstChild);
        }
        
        this.audio = document.getElementById('backgroundMusic');
    }

    createControlButtons() {
        // 根据页面类型调整按钮位置
        const pageType = this.getPageType();
        
        // 创建音频控制按钮
        if (!document.getElementById('audioButton')) {
            const audioButton = document.createElement('div');
            audioButton.id = 'audioButton';
            audioButton.className = `audio-button audio-button-${pageType}`;
            audioButton.innerHTML = '<button class="audio-toggle-btn" id="audioToggle">🔊</button>';
            document.body.appendChild(audioButton);
        }

        // 创建设置按钮
        if (!document.getElementById('settingsButton')) {
            const settingsButton = document.createElement('div');
            settingsButton.id = 'settingsButton';
            settingsButton.className = `settings-button settings-button-${pageType}`;
            settingsButton.innerHTML = '<button class="settings-toggle-btn" id="settingsToggle">⚙️</button>';
            document.body.appendChild(settingsButton);
        }

        this.audioToggle = document.getElementById('audioToggle');
        this.settingsToggle = document.getElementById('settingsToggle');
    }

    getPageType() {
        const path = window.location.pathname;
        if (path.includes('login.html')) return 'login';
        if (path.includes('register.html')) return 'register';
        if (path.includes('achievements.html')) return 'achievements';
        if (path.includes('第一章节.html') || path.includes('第二章节.html') || 
            path.includes('/chapter/') || path.includes('chapter/')) return 'chapter';
        return 'default';
    }

    checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            this.isLoggedIn = true;
            this.userToken = token;
        }
    }

    async loadAudioSettingsFromDatabase() {
        if (!this.isLoggedIn) return false;
        
        try {
            const response = await fetch('/api/audio-settings', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.audio.volume = data.settings.volume;
                    this.isAudioMuted = data.settings.is_muted;
                    this.savedVolume = data.settings.volume;
                    return true;
                }
            }
        } catch (error) {
            console.error('从数据库加载音频设置失败:', error);
        }
        return false;
    }

    async saveAudioSettingsToDatabase() {
        if (!this.isLoggedIn) return false;
        
        try {
            const response = await fetch('/api/audio-settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    volume: this.savedVolume,
                    is_muted: this.isAudioMuted
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.success;
            }
        } catch (error) {
            console.error('保存音频设置到数据库失败:', error);
        }
        return false;
    }

    async initializeAudio() {
        // 优先从数据库加载设置，如果失败则从localStorage加载
        let loadedFromDatabase = false;
        if (this.isLoggedIn) {
            loadedFromDatabase = await this.loadAudioSettingsFromDatabase();
        }
        
        if (!loadedFromDatabase) {
            // 从localStorage加载音频设置
            const savedAudioSettings = localStorage.getItem('audioSettings');
            if (savedAudioSettings) {
                const settings = JSON.parse(savedAudioSettings);
                this.audio.volume = settings.volume || 0.5;
                this.isAudioMuted = settings.muted || false;
                this.savedVolume = settings.volume || 0.5;
            } else {
                this.audio.volume = 0.5;
            }
        }

        // 更新音频按钮状态
        this.updateAudioToggleButton();
        
        // 音频事件监听
        this.audio.addEventListener('canplaythrough', () => {
            console.log('音频已加载完成，路径:', this.audio.src);
            if (!this.isAudioMuted) {
                this.audio.play().catch((error) => {
                    console.log('自动播放失败:', error.message);
                });
            }
        });

        this.audio.addEventListener('error', (error) => {
            console.error('音频加载错误:', error);
            console.log('当前音频路径:', this.audio.src);
            this.showMessage('音频文件加载失败，请检查文件路径', 'error');
        });

        this.audio.addEventListener('loadstart', () => {
            console.log('开始加载音频文件，路径:', this.audio.src);
        });

        // 添加用户交互监听，确保音频可以播放
        document.addEventListener('click', () => {
            if (this.audio.paused && !this.isAudioMuted) {
                this.audio.play().catch((error) => {
                    console.log('用户交互后播放失败:', error.message);
                });
            }
        }, { once: true });
        
        // 立即尝试播放（如果未静音）
        if (!this.isAudioMuted) {
            this.audio.play().catch((error) => {
                console.log('初始播放失败:', error.message);
            });
        }
    }

    updateAudioToggleButton() {
        if (this.isAudioMuted || this.audio.paused) {
            this.audioToggle.textContent = '🔇';
            this.audioToggle.classList.add('muted');
        } else {
            this.audioToggle.textContent = '🔊';
            this.audioToggle.classList.remove('muted');
        }
    }

    async toggleAudio() {
        if (this.isAudioMuted) {
            // 取消静音
            this.isAudioMuted = false;
            this.audio.volume = this.savedVolume;
            this.audio.play().catch(() => {
                console.log('播放失败');
            });
        } else if (this.audio.paused) {
            // 播放
            this.audio.play().catch(() => {
                console.log('播放失败');
            });
        } else {
            // 暂停
            this.audio.pause();
        }
        this.updateAudioToggleButton();
        await this.saveAudioSettings();
    }

    async saveAudioSettings() {
        const settings = {
            volume: this.savedVolume,
            muted: this.isAudioMuted
        };
        
        // 保存到localStorage
        localStorage.setItem('audioSettings', JSON.stringify(settings));
        console.log('设置已保存到localStorage:', settings);
        
        // 如果已登录，同时保存到数据库
        if (this.isLoggedIn) {
            const dbResult = await this.saveAudioSettingsToDatabase();
            console.log('数据库保存结果:', dbResult);
        }
        
        // 触发自定义事件，通知其他页面设置已更新
        window.dispatchEvent(new CustomEvent('audioSettingsChanged', {
            detail: settings
        }));
    }

    showSettingsPanel() {
        // 移除现有设置面板
        const existingPanel = document.querySelector('.settings-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // 创建设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'settings-panel';
        
        // 获取当前页面信息
        const pageType = this.getPageType();
        const pageNames = {
            'login': '登录页面',
            'register': '注册页面',
            'achievements': '成就页面',
            'chapter': '章节页面',
            'default': '主页'
        };
        
        settingsPanel.innerHTML = `
            <div class="settings-overlay"></div>
            <div class="settings-content">
                <div class="settings-header">
                    <h2>⚙️ 游戏设置</h2>
                    <button class="settings-close" onclick="audioSettingsManager.closeSettingsPanel()">✕</button>
                </div>
                
                <div class="settings-sections">
                    <div class="settings-section">
                        <h3>🎵 音频设置</h3>
                        <div class="setting-item">
                            <label>背景音乐</label>
                            <div class="setting-controls">
                                <button class="setting-btn" onclick="audioSettingsManager.toggleAudioFromSettings()">
                                    ${this.isAudioMuted || this.audio.paused ? '🔇 开启' : '🔊 关闭'}
                                </button>
                                <span class="setting-value">音量: ${Math.round(this.savedVolume * 100)}%</span>
                            </div>
                        </div>
                        <div class="setting-item">
                            <label>音量调节</label>
                            <input type="range" class="setting-slider" id="settingsVolumeSlider" 
                                   min="0" max="100" value="${Math.round(this.savedVolume * 100)}">
                        </div>
                        <div class="setting-item">
                            <label>当前页面</label>
                            <span class="setting-value">${pageNames[pageType] || '未知页面'}</span>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>💾 数据管理</h3>
                        <div class="setting-item">
                            <label>清除本地数据</label>
                            <button class="setting-btn danger" onclick="audioSettingsManager.clearLocalData()">
                                清除
                            </button>
                        </div>
                        <div class="setting-item">
                            <label>音频状态</label>
                            <span class="setting-value">${this.audio.readyState >= 2 ? '已加载' : '加载中...'}</span>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>🔗 页面导航</h3>
                        <div class="setting-item">
                            <label>返回主页</label>
                            <button class="setting-btn" onclick="window.location.href='/'">
                                主页
                            </button>
                        </div>
                        ${pageType !== 'achievements' ? `
                        <div class="setting-item">
                            <label>成就页面</label>
                            <button class="setting-btn" onclick="window.location.href='/achievements'">
                                成就
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(settingsPanel);
        
        // 添加动画效果
        setTimeout(() => {
            settingsPanel.classList.add('show');
        }, 10);

        // 设置面板事件监听
        settingsPanel.querySelector('.settings-overlay').addEventListener('click', () => {
            this.closeSettingsPanel();
        });
        
        // 设置面板音量滑块
        const settingsVolumeSlider = document.getElementById('settingsVolumeSlider');
        settingsVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.audio.volume = volume;
            this.savedVolume = volume;
            
            if (volume === 0) {
                this.isAudioMuted = true;
            } else {
                this.isAudioMuted = false;
            }
            
            this.updateAudioToggleButton();
            this.saveAudioSettings();
            
            // 更新设置面板显示
            const settingValue = settingsPanel.querySelector('.setting-value');
            if (settingValue) {
                settingValue.textContent = `音量: ${e.target.value}%`;
            }
        });
        
        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeSettingsPanel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    closeSettingsPanel() {
        const panel = document.querySelector('.settings-panel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => panel.remove(), 300);
        }
    }

    async toggleAudioFromSettings() {
        await this.toggleAudio();
        
        // 更新设置面板按钮
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel) {
            const audioBtn = settingsPanel.querySelector('.setting-btn');
            if (audioBtn) {
                audioBtn.textContent = this.isAudioMuted || this.audio.paused ? '🔇 开启' : '🔊 关闭';
            }
        }
    }

    clearLocalData() {
        if (confirm('确定要清除所有本地数据吗？这将包括音频设置等。')) {
            localStorage.clear();
            // 显示清除成功消息
            this.showMessage('🗑️ 本地数据已清除', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    showMessage(message, type) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            border: 2px solid ${type === 'success' ? '#64ff64' : '#add8e6'};
            z-index: 10000;
            font-family: 'Noto Serif SC', serif;
            font-size: 1rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: slideIn 0.5s ease-out;
        `;
        
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.5s ease-in forwards';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 500);
        }, 3000);
    }

    addEventListeners() {
        this.audioToggle.addEventListener('click', async () => {
            await this.toggleAudio();
        });
        
        this.settingsToggle.addEventListener('click', () => {
            this.showSettingsPanel();
        });
        
        // 监听其他页面的设置变化
        window.addEventListener('audioSettingsChanged', (event) => {
            console.log('收到其他页面的设置更新:', event.detail);
            this.loadSettingsFromEvent(event.detail);
        });
        
        // 监听localStorage变化（跨标签页同步）
        window.addEventListener('storage', (event) => {
            if (event.key === 'audioSettings') {
                console.log('localStorage设置已更新:', event.newValue);
                try {
                    const settings = JSON.parse(event.newValue);
                    this.loadSettingsFromEvent(settings);
                } catch (error) {
                    console.error('解析设置失败:', error);
                }
            }
        });
    }
    
    loadSettingsFromEvent(settings) {
        if (settings.volume !== undefined) {
            this.savedVolume = settings.volume;
            if (this.audio) {
                this.audio.volume = settings.volume;
            }
        }
        
        if (settings.muted !== undefined) {
            this.isAudioMuted = settings.muted;
            if (this.audio) {
                if (settings.muted) {
                    this.audio.pause();
                } else if (!this.audio.paused) {
                    this.audio.play().catch(error => {
                        console.log('自动播放失败:', error.message);
                    });
                }
            }
        }
        
        this.updateAudioToggleButton();
    }
}

// 添加音频和设置按钮的CSS样式
function addAudioSettingsStyles() {
    if (document.querySelector('style[data-audio-settings-styles]')) return;
    
    const style = document.createElement('style');
    style.setAttribute('data-audio-settings-styles', 'true');
    style.textContent = `
        /* 音频控制按钮 - 默认位置 */
        .audio-button {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
        }

        /* 登录、注册、成就页面 - 避免遮挡返回按钮 */
        .audio-button-login,
        .audio-button-register,
        .audio-button-achievements {
            position: fixed;
            top: 20px;
            left: 80px; /* 避开返回按钮 */
            z-index: 1000;
        }

        /* 章节页面 - 避免遮挡控制按钮 */
        .audio-button-chapter {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
        }

        .audio-toggle-btn {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(173, 216, 230, 0.6);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-size: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .audio-toggle-btn:hover {
            background: rgba(173, 216, 230, 0.3);
            transform: scale(1.1);
            box-shadow: 0 15px 35px rgba(173, 216, 230, 0.4);
        }

        .audio-toggle-btn.muted {
            background: rgba(255, 100, 100, 0.3);
            border-color: rgba(255, 100, 100, 0.6);
        }

        .audio-toggle-btn.muted:hover {
            background: rgba(255, 100, 100, 0.4);
            box-shadow: 0 15px 35px rgba(255, 100, 100, 0.4);
        }

        /* 设置按钮 - 默认位置 */
        .settings-button {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }

        /* 章节页面 - 避免遮挡其他按钮 */
        .settings-button-chapter {
            position: fixed;
            top: 80px; /* 移到下方避免遮挡 */
            right: 20px;
            z-index: 1000;
        }

        .settings-toggle-btn {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            border: 2px solid rgba(173, 216, 230, 0.6);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-size: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .settings-toggle-btn:hover {
            background: rgba(173, 216, 230, 0.3);
            transform: scale(1.1);
            box-shadow: 0 15px 35px rgba(173, 216, 230, 0.4);
        }

        /* 设置面板 */
        .settings-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .settings-panel.show {
            opacity: 1;
            visibility: visible;
        }

        .settings-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
        }

        .settings-content {
            position: relative;
            background: linear-gradient(135deg, rgba(26, 74, 92, 0.95), rgba(45, 90, 135, 0.95));
            border: 2px solid rgba(173, 216, 230, 0.3);
            border-radius: 20px;
            width: 90%;
            max-width: 600px;
            max-height: 80%;
            margin: 5% auto;
            padding: 30px;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            
            /* 美化滚动条 */
            scrollbar-width: thin;
            scrollbar-color: rgba(173, 216, 230, 0.6) transparent;
        }

        /* Webkit浏览器滚动条样式 */
        .settings-content::-webkit-scrollbar {
            width: 8px;
        }

        .settings-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            margin: 5px;
        }

        .settings-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, rgba(173, 216, 230, 0.8), rgba(135, 206, 235, 0.8));
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        }

        .settings-content::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, rgba(173, 216, 230, 1), rgba(135, 206, 235, 1));
            transform: scale(1.1);
        }

        .settings-content::-webkit-scrollbar-corner {
            background: transparent;
        }

        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(173, 216, 230, 0.3);
        }

        .settings-header h2 {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(45deg, #87ceeb, #add8e6, #b0e0e6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .settings-close {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .settings-close:hover {
            background: rgba(255, 100, 100, 0.3);
            transform: scale(1.1);
        }

        .settings-sections {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }

        .settings-section h3 {
            font-size: 1.3rem;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(173, 216, 230, 0.3);
        }

        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(173, 216, 230, 0.2);
        }

        .setting-item label {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 1rem;
        }

        .setting-controls {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .setting-value {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            min-width: 80px;
            text-align: right;
        }

        .setting-btn {
            background: rgba(173, 216, 230, 0.2);
            border: 2px solid rgba(173, 216, 230, 0.4);
            color: rgba(255, 255, 255, 0.9);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
            font-size: 0.9rem;
        }

        .setting-btn:hover {
            background: rgba(173, 216, 230, 0.3);
            transform: translateY(-2px);
        }

        .setting-btn.danger {
            background: rgba(255, 100, 100, 0.2);
            border-color: rgba(255, 100, 100, 0.4);
        }

        .setting-btn.danger:hover {
            background: rgba(255, 100, 100, 0.3);
        }

        .setting-slider {
            width: 150px;
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            outline: none;
            -webkit-appearance: none;
            appearance: none;
        }

        .setting-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: linear-gradient(135deg, #87ceeb, #add8e6);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .setting-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            background: linear-gradient(135deg, #87ceeb, #add8e6);
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        /* 消息动画 */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            /* 移动端按钮位置调整 */
            .audio-button-login,
            .audio-button-register,
            .audio-button-achievements {
                top: 10px;
                left: 70px;
            }

            .settings-button-chapter {
                top: 70px;
                right: 10px;
            }

            .settings-content {
                width: 95%;
                margin: 2.5% auto;
                padding: 20px;
            }

            .settings-header h2 {
                font-size: 1.5rem;
            }

            .setting-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }

            .setting-controls {
                width: 100%;
                justify-content: space-between;
            }

            .setting-slider {
                width: 100%;
            }

            /* 移动端按钮尺寸调整 */
            .audio-toggle-btn,
            .settings-toggle-btn {
                width: 45px;
                height: 45px;
                font-size: 1.3rem;
            }
        }

        @media (max-width: 480px) {
            /* 小屏幕进一步调整 */
            .audio-button-login,
            .audio-button-register,
            .audio-button-achievements {
                top: 5px;
                left: 60px;
            }

            .settings-button-chapter {
                top: 60px;
                right: 5px;
            }

            .audio-toggle-btn,
            .settings-toggle-btn {
                width: 40px;
                height: 40px;
                font-size: 1.2rem;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 初始化音频设置管理器
let audioSettingsManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    addAudioSettingsStyles();
    audioSettingsManager = new AudioSettingsManager();
}); 