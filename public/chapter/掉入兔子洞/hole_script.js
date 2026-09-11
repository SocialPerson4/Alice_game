// 主应用管理器
class MainApp {
    constructor() {
        this.currentSection = 'loading'; // loading, opening, hole, ending
        this.sections = {
            loading: document.getElementById('loadingScreen'),
            opening: document.getElementById('openingSection'),
            hole: document.getElementById('holeSection'),
            ending: document.getElementById('endingSection')
        };
        // SoundManager 在DOMContentLoaded中初始化，确保其在需要时可用
        this.soundManager = null; // 初始化为null，在DOMContentLoaded中赋值

        this.init();
    }

    init() {
        // 模拟加载时间
        setTimeout(() => {
            this.showSection('opening');
        }, 2000);
    }

    showSection(sectionName) {
        // 隐藏所有部分
        Object.values(this.sections).forEach(section => {
            if (section) {
                section.style.display = 'none';
            }
        });

        // 显示指定部分
        if (this.sections[sectionName]) {
            this.sections[sectionName].style.display = 'block';
            this.currentSection = sectionName;

            // 根据部分初始化相应的功能
            switch(sectionName) {
                case 'opening':
                    this.initOpening();
                    break;
                case 'hole':
                    this.initHole();
                    break;
                case 'ending':
                    this.initEnding();
                    break;
            }
        }
    }

    initOpening() {
        const openingVideo = document.getElementById('openingVideo');
        const skipButton = document.getElementById('skipButton');

        // 绑定事件
        openingVideo.addEventListener('ended', () => {
            this.showSection('hole');
        });

        skipButton.addEventListener('click', () => {
            this.showSection('hole');
        });

        // 检查视频是否存在
        openingVideo.addEventListener('error', () => {
            console.log('开场视频文件不存在，直接跳转到兔子洞');
            setTimeout(() => {
                this.showSection('hole');
            }, 1000);
        });

        // 尝试播放视频 - 添加用户交互检测
        const tryPlayVideo = () => {
            openingVideo.play().then(() => {
                // 视频播放成功时同时播放追兔子CG音乐
                console.log('开场视频播放成功，准备播放追兔子CG音乐');
                if (this.soundManager) {
                    this.soundManager.playChaseMusic();
                }
            }).catch(error => {
                console.log('无法自动播放视频:', error);
                // 显示点击播放提示
                openingVideo.innerHTML = `
                    <div style="color: #fff; text-align: center; padding: 50px;">
                        <h2>欢迎来到爱丽丝的奇幻世界</h2>
                        <p>点击下方按钮开始冒险</p>
                        <button onclick="mainApp.showSection('hole')"
                                style="background: #fff; color: #000; border: none; padding: 15px 30px; border-radius: 25px; font-size: 18px; cursor: pointer; margin-top: 20px;">
                            开始冒险
                        </button>
                    </div>
                `;
            });
        };

        // 监听用户交互事件来触发视频播放和背景音乐播放
        const userInteractionEvents = ['click', 'touchstart', 'keydown'];
        const handleUserInteraction = () => {
            console.log('检测到用户交互，开始播放视频和音乐');
            tryPlayVideo();
            if (this.soundManager) {
                this.soundManager.playChaseMusic(); // 播放追兔子CG音乐
            }
            userInteractionEvents.forEach(event => {
                document.removeEventListener(event, handleUserInteraction);
            });
        };

        userInteractionEvents.forEach(event => {
            document.addEventListener(event, handleUserInteraction, { once: true });
        });

        // 立即尝试播放音乐（某些浏览器允许）
        if (this.soundManager) {
            setTimeout(() => {
                console.log('尝试立即播放追兔子CG音乐');
                this.soundManager.playChaseMusic();
            }, 500);
        }

        // 如果用户没有交互，3秒后自动尝试播放
        setTimeout(() => {
            console.log('3秒后自动尝试播放');
            tryPlayVideo();
            if (this.soundManager) {
                this.soundManager.playChaseMusic(); // 播放追兔子CG音乐
            }
        }, 3000);
    }

    initHole() {
        // 初始化兔子洞效果
        this.rabbitHoleEffect = new RabbitHoleEffect();
        // 将soundManager传递给兔子洞效果，以便控制音频
        if (this.soundManager) {
            this.rabbitHoleEffect.setSoundManager(this.soundManager);
        }
    }

    initEnding() {
        const endingVideo = document.getElementById('endingVideo');

        // 在结束部分继续播放坠入音乐，不停止
        if (this.soundManager) {
            // 确保坠入音乐继续循环播放
            this.soundManager.ensureFallingMusicPlaying();
        }

        // 添加视频播放结束事件监听器，自动跳转回第一章节的falling场景
        endingVideo.addEventListener('ended', () => {
            console.log('结束视频播放完毕，准备跳转回第一章节的falling场景');
            
            // 停止所有音乐，准备跳转
            if (this.soundManager) {
                console.log('🔇 停止音乐，准备返回主页面');
                this.soundManager.stop();
            }
            
            setTimeout(() => {
                // 设置一个标记，表示从兔子洞返回
                localStorage.setItem('alice_return_from_hole', 'true');
                window.location.href = '../第一章节.html';
            }, 1000); // 延迟1秒跳转，给用户时间看到视频结束
        });

        // 检查视频是否存在
        endingVideo.addEventListener('error', () => {
            console.log('结束视频文件不存在，显示默认内容');
            this.showFallbackContent();
        });

        // 尝试播放视频 - 添加用户交互检测
        const tryPlayVideo = () => {
            endingVideo.play().then(() => {
                // 视频播放成功，但因为视频是无声的，这里不需要取消静音
            }).catch(error => {
                console.log('无法自动播放视频:', error);
                this.showFallbackContent();
            });
        };

        // 监听用户交互事件来触发视频播放
        const userInteractionEvents = ['click', 'touchstart', 'keydown'];
        const handleUserInteraction = () => {
            tryPlayVideo();
            userInteractionEvents.forEach(event => {
                document.removeEventListener(event, handleUserInteraction);
            });
        };

        userInteractionEvents.forEach(event => {
            document.addEventListener(event, handleUserInteraction, { once: true });
        });

        // 如果用户没有交互，2秒后自动尝试播放
        setTimeout(() => {
            tryPlayVideo();
        }, 2000);
    }

    showFallbackContent() {
        // 在显示备用内容时，确保音乐继续播放
        if (this.soundManager) {
            this.soundManager.ensureFallingMusicPlaying();
        }
        
        const endingVideo = document.getElementById('endingVideo');
        endingVideo.innerHTML = `
            <div class="fallback-content">
                <h1>✨ 奇幻冒险结束 ✨</h1>
                <p>恭喜您完成了这次奇妙的旅程！</p>
                <p>爱丽丝的奇幻世界永远为您敞开大门，随时欢迎您的再次光临。</p>
                <p>愿您的想象力如爱丽丝一样，永远充满无限可能。</p>
                <button onclick="
                    if(window.mainApp && window.mainApp.soundManager) {
                        console.log('🔇 停止音乐，准备返回主页面');
                        window.mainApp.soundManager.stop();
                    }
                    localStorage.setItem('alice_return_from_hole', 'true'); 
                    window.location.href='../第一章节.html'
                " 
                        style="background: linear-gradient(135deg, #ff69b4, #8a2be2); 
                               color: white; 
                               border: none; 
                               padding: 15px 30px; 
                               border-radius: 25px; 
                               font-size: 18px; 
                               cursor: pointer; 
                               margin-top: 20px;
                               transition: all 0.3s ease;">
                    返回第一章节
                </button>
            </div>
        `;
    }

    // 从兔子洞跳转到结束动画
    goToEnding() {
        this.showSection('ending');
    }
}

// 兔子洞坠落效果 JavaScript
class RabbitHoleEffect {
    constructor() {
        this.container = document.querySelector('.rabbit-hole-container');
        this.controlsHint = document.querySelector('.controls-hint');
        this.floatingItems = document.querySelectorAll('.floating-item');
        this.particlesContainer = document.querySelector('.dream-particles');
        this.tunnelLayers = document.querySelectorAll('.tunnel-layer');

        this.scrollDepth = 0;
        this.maxScrollDepth = 2000;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.particleCount = 80;
        this.isInTrap = false;
        this.soundManager = null; // 音频管理器
        this.hasStartedFalling = false; // 是否已开始坠落

        this.createGlowLayer();
        this.createTrapLayer();
        this.createTrapWarning();

        this.init();
    }

    init() {
        this.bindEvents();
        this.startFloatingAnimation();
        this.createParticles();
    }

    // 设置音频管理器
    setSoundManager(soundManager) {
        this.soundManager = soundManager;
    }

    createGlowLayer() {
        this.glowLayer = document.createElement('div');
        this.glowLayer.className = 'glow-layer';
        this.container.appendChild(this.glowLayer);
    }

    createTrapLayer() {
        this.trapLayer = document.createElement('div');
        this.trapLayer.className = 'trap-layer';
        this.container.appendChild(this.trapLayer);
    }

    createTrapWarning() {
        // 删除陷阱警告，不再显示"即将进入视频"字样
    }

    bindEvents() {
        window.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            this.scrollDepth += deltaY * 0.8;
            this.updateScrollDepth();
            touchStartY = touchY;
        });

        window.addEventListener('keydown', this.handleKeydown.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    handleWheel(e) {
        e.preventDefault();
        this.scrollDepth += e.deltaY * 0.8;
        this.updateScrollDepth();
    }

    handleKeydown(e) {
        switch(e.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                this.scrollDepth += 80;
                this.updateScrollDepth();
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                this.scrollDepth -= 80;
                this.updateScrollDepth();
                break;
            case 'Home':
                e.preventDefault();
                this.scrollDepth = 0;
                this.updateScrollDepth();
                break;
            case 'End':
                e.preventDefault();
                this.scrollDepth = this.maxScrollDepth;
                this.updateScrollDepth();
                break;
        }
    }

    updateScrollDepth() {
        this.scrollDepth = Math.max(0, Math.min(this.scrollDepth, this.maxScrollDepth));

        // 检查是否刚开始坠落，播放坠入CG音乐
        if (!this.hasStartedFalling && this.scrollDepth > 50 && this.soundManager) {
            this.hasStartedFalling = true;
            this.soundManager.playFallingMusic();
            console.log('开始坠入兔子洞，播放坠入CG音乐');
        }

        this.apply3DTransform();
        this.updateFloatingElements();
        this.updateHints();
        this.updateGlowEffect();
        this.checkTrapZone();
        this.setScrollingState();
    }

    apply3DTransform() {
        const progress = this.scrollDepth / this.maxScrollDepth;

        const translateZ = this.scrollDepth * 0.3;
        const rotateX = progress * 15;
        const scale = 1 + (progress * 0.2);

        this.container.style.transform = `
            perspective(1200px)
            translateZ(${translateZ}px)
            rotateX(${rotateX}deg)
            scale(${scale})
        `;

        this.tunnelLayers.forEach((layer, index) => {
            const baseZ = -(index + 1) * 120;
            const zOffset = this.scrollDepth * 0.6;
            const scaleFactor = 1 + (index * 0.15) + (progress * 0.8);
            const opacity = 1 - (progress * 0.2) - (index * 0.03);

            layer.style.transform = `
                translate(-50%, -50%)
                translateZ(${baseZ + zOffset}px)
                scale(${scaleFactor})
            `;
            layer.style.opacity = Math.max(0.2, opacity);
        });

        const darkColor = [0, 0, 0];
        const glowColor = [60, 60, 80];
        const r = darkColor[0] + (glowColor[0] - darkColor[0]) * progress;
        const g = darkColor[1] + (glowColor[1] - darkColor[1]) * progress;
        const b = darkColor[2] + (glowColor[2] - darkColor[2]) * progress;

        document.body.style.background = `
            radial-gradient(
                ellipse at center,
                rgb(${r}, ${g}, ${b}) 0%,
                rgb(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)}) 40%,
                rgb(0, 0, 0) ${70 + progress * 30}%
            )
        `;
    }

    updateFloatingElements() {
        const progress = this.scrollDepth / this.maxScrollDepth;

        this.floatingItems.forEach((item, index) => {
            const speed = parseFloat(item.dataset.speed) || 0.5;
            const baseZ = -200 - (index * 80);
            const zOffset = progress * 600 * speed;
            const scale = 1 - (progress * 0.4);
            const opacity = 1 - (progress * 0.6);

            item.style.transform = `
                translateZ(${baseZ + zOffset}px)
                scale(${scale})
                rotateY(${progress * 720}deg)
            `;
            item.style.opacity = opacity;
        });
    }

    updateGlowEffect() {
        const progress = this.scrollDepth / this.maxScrollDepth;

        if (progress > 0.4) {
            const glowIntensity = (progress - 0.4) * 1.67;
            this.glowLayer.style.opacity = Math.min(1, glowIntensity);
            this.glowLayer.style.background = `
                radial-gradient(
                    circle,
                    rgba(255, 255, 255, ${0.15 + glowIntensity * 0.3}) 0%,
                    rgba(255, 255, 255, ${0.08 + glowIntensity * 0.15}) 40%,
                    rgba(255, 255, 255, ${0.03 + glowIntensity * 0.08}) 60%,
                    transparent 80%
                )
            `;
        } else {
            this.glowLayer.style.opacity = 0;
        }
    }

    checkTrapZone() {
        const progress = this.scrollDepth / this.maxScrollDepth;

        if (progress > 0.9 && !this.isInTrap) {
            this.isInTrap = true;
            this.activateTrap();
        } else if (progress <= 0.9 && this.isInTrap) {
            this.isInTrap = false;
            this.deactivateTrap();
        }

        if (progress > 0.95) {
            this.redirectToEnding();
        }
    }

    activateTrap() {
        this.trapLayer.style.opacity = 1;

        document.body.style.animation = 'gentleGlow 2s ease-in-out infinite';

        if (!document.querySelector('#gentleGlow')) {
            const style = document.createElement('style');
            style.id = 'gentleGlow';
            style.textContent = `
                @keyframes gentleGlow {
                    0%, 100% { filter: brightness(1); }
                    50% { filter: brightness(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    deactivateTrap() {
        this.trapLayer.style.opacity = 0;
        document.body.style.animation = '';
    }

    redirectToEnding() {
        document.body.style.transition = 'all 1s ease-out';
        document.body.style.filter = 'brightness(2) blur(10px)';

        setTimeout(() => {
            mainApp.goToEnding();
        }, 1000);
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 5}s`;
            particle.style.animationDuration = `${3 + Math.random() * 4}s`;
            this.particlesContainer.appendChild(particle);
        }
    }

    updateHints() {
        const progress = this.scrollDepth / this.maxScrollDepth;
        this.controlsHint.style.opacity = Math.max(0, 1 - progress * 3);
    }

    setScrollingState() {
        this.isScrolling = true;
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
        }, 200);
    }

    startFloatingAnimation() {
        this.floatingItems.forEach((item, index) => {
            const delay = index * 0.8;
            const duration = 8 + Math.random() * 4;
            item.style.animationDelay = `${delay}s`;
            item.style.animationDuration = `${duration}s`;
        });
    }

    handleResize() {
        const aspectRatio = window.innerWidth / window.innerHeight;
        if (aspectRatio < 1) {
            this.container.style.perspective = '800px';
        } else {
            this.container.style.perspective = '1200px';
        }
    }
}

// 音效管理器
class SoundManager {
    constructor() {
        this.currentAudio = null;
        this.audioElements = {};
        this.volume = 0.7;
        this.init();
    }

    init() {
        // 获取音频元素
        this.audioElements = {
            chase: document.getElementById('chaseAudio'),
            falling: document.getElementById('fallingAudio')
        };

        console.log('音频元素获取结果:', {
            chase: this.audioElements.chase ? '找到' : '未找到',
            falling: this.audioElements.falling ? '找到' : '未找到'
        });

        // 设置音频属性
        Object.entries(this.audioElements).forEach(([key, audio]) => {
            if (audio) {
                audio.volume = this.volume;
                console.log(`设置${key}音频音量为:`, this.volume);
                
                // 错误处理
                audio.addEventListener('error', (e) => {
                    console.error(`${key}音频加载失败:`, audio.src, e);
                });
                
                // 加载完成事件
                audio.addEventListener('loadeddata', () => {
                    console.log(`${key}音频加载完成:`, audio.src);
                });

                // 能够播放事件
                audio.addEventListener('canplay', () => {
                    console.log(`${key}音频可以播放:`, audio.src);
                });
            } else {
                console.warn(`${key}音频元素未找到`);
            }
        });
    }

    playChaseMusic() {
        console.log('尝试播放追兔子CG音乐...');
        this.stop(); // 停止当前音频
        
        if (this.audioElements.chase) {
            console.log('追兔子CG音频元素存在，开始播放...');
            this.audioElements.chase.currentTime = 0;
            this.audioElements.chase.loop = true; // 循环播放
            
            const playPromise = this.audioElements.chase.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.currentAudio = this.audioElements.chase;
                    console.log('✅ 追兔子CG音乐播放成功！');
                }).catch(error => {
                    console.warn('❌ 追兔子CG音乐播放失败，可能需要用户交互:', error.message);
                    // 尝试在用户交互后播放
                    this.waitForUserInteraction('chase');
                });
            } else {
                console.warn('play()方法返回undefined');
            }
        } else {
            console.error('❌ 追兔子CG音频元素不存在！');
        }
    }

    playFallingMusic() {
        console.log('尝试播放坠入CG音乐...');
        this.stop(); // 停止当前音频
        
        if (this.audioElements.falling) {
            console.log('坠入CG音频元素存在，开始循环播放...');
            this.audioElements.falling.currentTime = 0;
            this.audioElements.falling.loop = true; // 循环播放直到返回主页面
            
            const playPromise = this.audioElements.falling.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.currentAudio = this.audioElements.falling;
                    console.log('✅ 坠入CG音乐循环播放成功！');
                }).catch(error => {
                    console.warn('❌ 坠入CG音乐播放失败，可能需要用户交互:', error.message);
                    // 尝试在用户交互后播放
                    this.waitForUserInteraction('falling');
                });
            } else {
                console.warn('play()方法返回undefined');
            }
        } else {
            console.error('❌ 坠入CG音频元素不存在！');
        }
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    fadeOut(duration = 1000) {
        if (!this.currentAudio) return;
        
        const audio = this.currentAudio;
        const startVolume = audio.volume;
        const fadeStep = startVolume / (duration / 50);
        
        const fadeInterval = setInterval(() => {
            if (audio.volume > fadeStep) {
                audio.volume -= fadeStep;
            } else {
                audio.volume = 0;
                audio.pause();
                audio.currentTime = 0;
                audio.volume = this.volume; // 恢复音量为下次播放
                clearInterval(fadeInterval);
                this.currentAudio = null;
            }
        }, 50);
    }

    // 确保坠入音乐继续播放（用于结束部分）
    ensureFallingMusicPlaying() {
        console.log('确保坠入音乐在结束部分继续播放...');
        
        // 如果当前正在播放坠入音乐，就继续播放
        if (this.currentAudio === this.audioElements.falling && !this.audioElements.falling.paused) {
            console.log('✅ 坠入音乐已在播放，继续保持');
            return;
        }
        
        // 否则重新播放坠入音乐
        this.playFallingMusic();
    }

    // 等待用户交互后播放音频
    waitForUserInteraction(audioType) {
        const playAudio = () => {
            if (audioType === 'chase' && this.audioElements.chase) {
                this.audioElements.chase.loop = true; // 确保循环播放
                this.audioElements.chase.play().then(() => {
                    this.currentAudio = this.audioElements.chase;
                    console.log('用户交互后成功播放追兔子CG音乐（循环）');
                }).catch(err => console.warn('用户交互后仍无法播放音乐:', err));
            } else if (audioType === 'falling' && this.audioElements.falling) {
                this.audioElements.falling.loop = true; // 确保循环播放
                this.audioElements.falling.play().then(() => {
                    this.currentAudio = this.audioElements.falling;
                    console.log('用户交互后成功播放坠入CG音乐（循环）');
                }).catch(err => console.warn('用户交互后仍无法播放音乐:', err));
            }
            
            // 移除事件监听器
            document.removeEventListener('click', playAudio, { once: true });
            document.removeEventListener('touchstart', playAudio, { once: true });
            document.removeEventListener('keydown', playAudio, { once: true });
        };
        
        // 监听用户交互
        document.addEventListener('click', playAudio, { once: true });
        document.addEventListener('touchstart', playAudio, { once: true });
        document.addEventListener('keydown', playAudio, { once: true });
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.audioElements).forEach(audio => {
            if (audio) {
                audio.volume = this.volume;
            }
        });
    }

    // 兼容旧接口
    playBackgroundMusic() {
        // 在开场时播放追兔子CG音乐
        this.playChaseMusic();
    }

    pauseBackgroundMusic() {
        this.stop();
    }
}

// 文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 文档加载完成，开始初始化...');
    window.mainApp = new MainApp();
    // 确保 SoundManager 提前初始化，这样背景音乐功能在 MainApp 中就可以被访问到
    window.mainApp.soundManager = new SoundManager();
    console.log('🎵 音频管理器已初始化');

    // 点击波纹效果
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.controls-hint') && !e.target.closest('.depth-indicator')) {
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                width: 0;
                height: 0;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: ripple 1.2s ease-out;
                pointer-events: none;
                z-index: 9999;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes ripple {
                    0% { width: 0; height: 0; opacity: 1; }
                    100% { width: 300px; height: 300px; opacity: 0; }
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
                style.remove();
            }, 1200);
        }
    });


});