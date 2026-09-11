const characters = {
    alice: {
        cipher: "“我不知道我是谁了，但我知道我不是以前的我了。”",
        name: "爱丽丝 (Alice)",
        description: "一个好奇心旺盛、充满想象力的女孩，追逐着一只怀表兔子，意外坠入了奇妙的地下世界。她在这里经历了各种荒诞离奇的冒险，逐渐认识到自我与这个世界的不同。",
        mainVisual: "video/alice.mp4",
        mainVisualElementType: "video",
        background: "img/alice.png",
        avatarImg: "img/1.png",
        glowColor: "224, 176, 224",
        bodyGradientStart: "#5a2d7f", // 梦幻淡紫
        bodyGradientEnd: "#6a5acd"   // 天蓝紫
    },
    mad_hatter: {
        cipher: "“没有茶点的日子，真是太糟糕了！”",
        name: "疯帽子 (Mad Hatter)",
        description: "一个总是忙着庆祝“非生日”的古怪帽子制造商。他的言行举止充满了荒谬的逻辑和诗意，是地下世界混乱与乐趣的象征。",
        mainVisual: "video/mad_hatter.mp4",
        mainVisualElementType: "video",
        background: "img/mad_hatter.png",
        avatarImg: "img/2.png",
        glowColor: "166, 94, 45", // A65E2D 的 RGB 值
        bodyGradientStart: "#c96c1d", // 橙色
        bodyGradientEnd: "#4e7d4e"   // 森林绿
    },
    queen_of_hearts: {
        cipher: "“砍掉他们的头！”",
        name: "红心王后 (Queen of Hearts)",
        description: "一个专横跋扈、脾气暴躁的统治者，她的口头禅是“砍掉他们的头！”。她代表着地下世界的暴政与无理，但她的权威常常被她的臣民所忽视。",
        mainVisual: "video/red_queen.mp4",
        mainVisualElementType: "video",
        background: "img/red_queen.png",
        avatarImg: "img/3.png",
        glowColor: "159, 10, 32", // 9F0A20 的 RGB 值
        bodyGradientStart: "#8b0000", // 深红
        bodyGradientEnd: "#2c0203"   // 接近黑的深红
    },
    cheshire_cat: {
        cipher: "“我们都疯了，我疯了，你也是。”",
        name: "柴郡猫 (Cheshire Cat)",
        description: "一只神秘而诡异的猫，总是带着狡黠的笑容。它拥有隐身的能力，常常给出模棱两可的建议，引导着爱丽丝在地下世界中探索。",
        mainVisual: "video/cat.mp4",
        mainVisualElementType: "video",
        background: "img/cat.png",
        avatarImg: "img/4.png",
        glowColor: "95, 158, 160", // 5F9EA0 的 RGB 值
        bodyGradientStart: "#4b0082", // 深紫
        bodyGradientEnd: "#2e8b57"   // 青绿色
    },
    march_hare: {
        cipher: "“现在是茶点时间，永远是茶点时间！”",
        name: "三月兔 (March Hare)",
        description: "疯帽匠的伙伴，总是参与到永无止境的茶话会中。它和疯帽匠一样古怪且逻辑清奇，是地下世界荒诞茶会的常客。",
        mainVisual: "video/march_hare.mp4",
        mainVisualElementType: "video",
        background: "img/march_hare.png",
        avatarImg: "img/5.png",
        glowColor: "106, 13, 173", // 6A0DAD 的 RGB 值
        bodyGradientStart: "#9acd32", // 亮绿黄
        bodyGradientEnd: "#8b4513"   // 土黄棕
    }
};

const charAvatars = document.querySelectorAll('.char-avatar');
const characterCipher = document.getElementById('characterCipher');
const characterName = document.getElementById('characterName');
const characterDescription = document.getElementById('characterDescription');
const mainVisualContainer = document.querySelector('.main-content-area');
const cardBackground = document.getElementById('cardBackground');
const rightPanelWrapper = document.querySelector('.right-panel-wrapper');

/**
 * Dynamically creates and sets the main visual element (img or video).
 * Handles replacing existing elements if the type changes.
 * @param {Object} charData - The character data object.
 */
function setMainVisual(charData) {
    let currentMainVisual = document.getElementById('characterMainVisual');

    // Check if the current element type matches the required type
    const requiredElementType = charData.mainVisualElementType;
    const currentElementType = currentMainVisual ? currentMainVisual.tagName.toLowerCase() : '';

    if (currentElementType !== requiredElementType) {
        // Remove the old element if it exists and is of the wrong type
        if (currentMainVisual) {
            currentMainVisual.remove();
        }
        // Create the new element
        if (requiredElementType === "video") {
            currentMainVisual = document.createElement('video');
            currentMainVisual.autoplay = true;
            currentMainVisual.loop = true;
            currentMainVisual.muted = true; // Required for autoplay in most browsers
            currentMainVisual.playsinline = true; // Recommended for iOS
        } else { // Default to img if not video
            currentMainVisual = document.createElement('img');
        }
        currentMainVisual.id = 'characterMainVisual';
        currentMainVisual.classList.add('character-main-visual');
        // Append the new element to the main visual container, before the right panel
        mainVisualContainer.insertBefore(currentMainVisual, rightPanelWrapper);
    }

    // Set the source and alt attributes
    if (requiredElementType === "video") {
        currentMainVisual.src = charData.mainVisual;
        currentMainVisual.alt = `${charData.name} 主视觉视频`;
        currentMainVisual.load(); // Ensure the video is loaded
        currentMainVisual.play(); // Attempt to play (might be blocked if not muted/user interaction)
    } else {
        currentMainVisual.src = charData.mainVisual;
        currentMainVisual.alt = `${charData.name} 主视觉图片`;
    }
}

/**
 * Updates the main character card with the given character's data.
 * @param {string} charId - The ID of the character to display.
 */
function updateCharacterCard(charId) {
    const charData = characters[charId];
    const characterMainVisual = document.getElementById('characterMainVisual');
    const root = document.documentElement; // 获取 :root 元素

    // Add animation class to fade/slide out current content and character visual
    if (characterMainVisual) {
        characterMainVisual.classList.add('hidden');
    }
    rightPanelWrapper.classList.add('hidden');

    setTimeout(() => {
        // Update textual content
        characterCipher.textContent = charData.cipher;
        characterName.textContent = charData.name;
        characterDescription.textContent = charData.description;
        cardBackground.style.backgroundImage = `url('${charData.background}')`;

        // 更新底层背景的CSS变量
        root.style.setProperty('--background-gradient-start', charData.bodyGradientStart);
        root.style.setProperty('--background-gradient-end', charData.bodyGradientEnd);
        // 更新卡片边缘发光的颜色变量
        root.style.setProperty('--current-character-glow-color', charData.glowColor);


        // Set the appropriate main visual element (img or video)
        setMainVisual(charData);

        // Update avatar images
        charAvatars.forEach(avatar => {
            const avatarCharId = avatar.dataset.char;
            const imgElement = avatar.querySelector('img');
            if (imgElement && characters[avatarCharId] && characters[avatarCharId].avatarImg) {
                imgElement.src = characters[avatarCharId].avatarImg;
            }
        });


        // Remove animation classes to fade/slide in new content and character visual
        const newMainVisual = document.getElementById('characterMainVisual');
        if (newMainVisual) {
            newMainVisual.classList.remove('hidden');
        }
        rightPanelWrapper.classList.remove('hidden');
    }, 400); // Delay slightly longer than CSS transition for smooth animation
}


// Add click event listeners to avatars
charAvatars.forEach(avatar => {
    avatar.addEventListener('click', () => {
        charAvatars.forEach(a => a.classList.remove('active'));
        avatar.classList.add('active');
        const charId = avatar.dataset.char;
        updateCharacterCard(charId);
    });
});

// Initialize with Alice's card on page load
updateCharacterCard('alice');