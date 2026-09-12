const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 中间件
app.disable('x-powered-by');
if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN }));
}
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// 生产环境必须通过环境变量提供 JWT 密钥。
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-me';

// 数据库连接配置
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alice_wonderland',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10)
};

// 创建数据库连接池
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        await pool.query('SELECT 1');
        console.log('数据库连接成功');

        // 用户表是其他业务表的外键依赖，必须最先创建。
        await createUsersTable();

        // 创建音频设置表
        await createAudioSettingsTable();

        // 创建成就表
        await createAchievementsTable();

        // 创建道具表
        await createItemsTable();
    } catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
}

async function createUsersTable() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            nickname VARCHAR(100) NOT NULL,
            avatar VARCHAR(255) DEFAULT 'default.png',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_users_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createTableSQL);
}

// 创建音频设置表
async function createAudioSettingsTable() {
    try {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS audio_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                volume DECIMAL(3,2) DEFAULT 0.5,
                is_muted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_audio (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.execute(createTableSQL);
        console.log('音频设置表创建成功');
    } catch (error) {
        console.error('创建音频设置表失败:', error);
    }
}

// 初始化用户成就的辅助函数
async function initializeUserAchievements(userId, executor = pool) {
    try {
        // 备用方案：使用 JavaScript 逐一插入
        const achievements = [
            // 基础成就
            { name: 'first_login', title: '初入仙境', description: '首次登录奇幻梦游录', icon: '🌟', rarity: 'common', points: 10 },
            { name: 'register_account', title: '仙境居民', description: '成功注册账号', icon: '🏠', rarity: 'common', points: 10 },
            { name: 'first_visit', title: '好奇的访客', description: '第一次访问主页', icon: '👀', rarity: 'common', points: 10 },
            { name: 'menu_explorer', title: '菜单探索者', description: '打开用户菜单', icon: '🔍', rarity: 'common', points: 10 },
            { name: 'alice_card_visitor', title: '爱丽丝卡片', description: '访问爱丽丝卡片页面', icon: '🃏', rarity: 'uncommon', points: 20 },
            { name: 'mirror_world', title: '镜中世界', description: '进入镜子世界', icon: '🪞', rarity: 'uncommon', points: 20 },

            // 章节特定成就
            { name: 'heart_awakening', title: '心之初醒', description: '爱丽丝第一次主动的自我认知与成长，学会打破困境，不再被动接受', icon: '💖', rarity: 'rare', points: 30 },
            { name: 'wonderland_echo', title: '仙境回响', description: '在隐藏关卡中重组记忆碎片，理解仙境的悲歌与真相', icon: '🎵', rarity: 'epic', points: 50 },
            { name: 'mind_insight', title: '心智洞察', description: '深入理解仙境角色的内心，获得更深层次的共情能力', icon: '🧠', rarity: 'rare', points: 30 },
            { name: 'power_temptation', title: '力量的诱惑', description: '选择运用力量来掌控局面，踏上力量之路', icon: '⚡', rarity: 'rare', points: 30 },
            { name: 'trio_memory', title: '三人记忆', description: '在时间小游戏中获胜，收集三人的珍贵记忆', icon: '⏰', rarity: 'rare', points: 30 },
            { name: 'mirror_domain_insight', title: '镜域洞察', description: '在镜中颠倒屋找到所有隐藏物品，洞察镜域的奥秘', icon: '🔍', rarity: 'rare', points: 30 },

            // 其他成就
            { name: 'game_master', title: '游戏大师', description: '尝试所有小游戏', icon: '🎮', rarity: 'rare', points: 30 },
            { name: 'tea_party', title: '疯帽子茶会', description: '参加疯帽子的茶会', icon: '🎩', rarity: 'rare', points: 30 },
            { name: 'wonderland_understanding', title: '仙境之悟', description: '理解仙境深层的痛苦与悲哀，发现表象下的真实根源', icon: '🔮', rarity: 'epic', points: 50 },
            { name: 'cheshire_smile', title: '柴郡猫的微笑', description: '找到柴郡猫的秘密', icon: '😸', rarity: 'epic', points: 50 },
            { name: 'red_queen_defeat', title: '红桃皇后的败北', description: '在纸牌游戏中击败红桃皇后', icon: '👑', rarity: 'epic', points: 50 },
            { name: 'wonderland_master', title: '仙境主宰', description: '解锁所有其他成就', icon: '🌈', rarity: 'legendary', points: 100 },
            { name: 'time_traveler', title: '时间旅行者', description: '连续七天访问仙境', icon: '⌚', rarity: 'legendary', points: 100 }
        ];

        // 逐一插入成就
        for (const achievement of achievements) {
            try {
                await executor.execute(`
                    INSERT IGNORE INTO achievements (user_id, name, title, description, icon, rarity, points, is_get)
                    VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
                `, [userId, achievement.name, achievement.title, achievement.description, achievement.icon, achievement.rarity, achievement.points]);
            } catch (insertError) {
                console.error(`插入成就 ${achievement.name} 失败:`, insertError.message);
                throw insertError;
            }
        }

        // 自动解锁注册相关成就
        try {
            await executor.execute(`
                UPDATE achievements
                SET is_get = TRUE, get_time = NOW()
                WHERE user_id = ? AND name IN ('register_account', 'first_visit')
            `, [userId]);
        } catch (updateError) {
            console.error('自动解锁注册成就失败:', updateError.message);
            throw updateError;
        }

        console.log(`用户 ${userId} 成就初始化成功`);
    } catch (error) {
        console.error(`用户 ${userId} 成就初始化失败:`, error);
        throw error;
    }
}

// 创建成就表
async function createAchievementsTable() {
    try {
        // 创建成就表
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS achievements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL COMMENT '成就标识符',
                title VARCHAR(200) NOT NULL COMMENT '成就名称',
                description TEXT COMMENT '成就描述',
                icon VARCHAR(10) DEFAULT '🏆' COMMENT '成就图标',
                rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common' COMMENT '稀有度',
                points INT DEFAULT 10 COMMENT '成就分数',
                is_get BOOLEAN DEFAULT FALSE COMMENT '是否已获得',
                get_time TIMESTAMP NULL COMMENT '获得时间',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_achievement (user_id, name),
                INDEX idx_user_achievements (user_id, is_get),
                INDEX idx_achievement_rarity (rarity, points)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户成就表';
        `;

        await pool.execute(createTableSQL);
        console.log('成就表创建成功');

    } catch (error) {
        console.error('创建成就表失败:', error);
    }
}

// 创建道具系统表
async function createItemsTable() {
    try {
        // 创建道具模板表
        const createItemsTableSQL = `
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_key VARCHAR(50) NOT NULL UNIQUE COMMENT '道具唯一标识符',
                name VARCHAR(100) NOT NULL COMMENT '道具名称',
                description TEXT COMMENT '道具描述',
                icon VARCHAR(10) DEFAULT '✨' COMMENT '道具图标',
                type ENUM('consumable', 'permanent', 'key', 'special') DEFAULT 'permanent' COMMENT '道具类型',
                rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common' COMMENT '稀有度',
                chapter INT NOT NULL COMMENT '获得章节',
                source VARCHAR(100) COMMENT '获得来源',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_item_key (item_key),
                INDEX idx_chapter (chapter),
                INDEX idx_rarity (rarity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='道具模板表';
        `;

        await pool.execute(createItemsTableSQL);
        console.log('道具模板表创建成功');

        // 创建用户背包表
        const createUserInventoryTableSQL = `
            CREATE TABLE IF NOT EXISTS user_inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                is_get BOOLEAN DEFAULT FALSE COMMENT '是否已获得',
                obtained_at TIMESTAMP NULL COMMENT '获得时间',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_item (user_id, item_id),
                INDEX idx_user_inventory (user_id),
                INDEX idx_user_obtained (user_id, is_get)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户背包表';
        `;

        await pool.execute(createUserInventoryTableSQL);
        console.log('用户背包表创建成功');

        // 插入第三章道具模板数据
        const insertItemsSQL = `
            INSERT IGNORE INTO items (item_key, name, description, icon, type, rarity, chapter, source) VALUES
            ('heart_mapping', '心之映射', '通过拥抱混乱获得的神秘道具，能够映射内心深处的真实想法，帮助理解仙境角色的内心世界', '💖', 'special', 'rare', 3, '柴郡猫的心灵共鸣游戏'),
            ('twist_force', '扭转之力', '通过掌控获得的强大力量，能够扭转现实中的某些规则，但使用时需要付出相应的代价', '🔮', 'special', 'rare', 3, '柴郡猫的掌控卡牌游戏');
        `;

        await pool.execute(insertItemsSQL);
        console.log('第三章道具模板数据插入成功');

    } catch (error) {
        console.error('创建道具系统表失败:', error);
    }
}

// 初始化用户道具的辅助函数
async function initializeUserItems(userId, executor = pool) {
    try {
        // 获取所有道具模板
        const [itemTemplates] = await executor.execute(`
            SELECT id, item_key FROM items
        `);

        // 为用户在背包中创建所有道具记录（初始状态为未获得）
        for (const item of itemTemplates) {
            try {
                await executor.execute(`
                    INSERT IGNORE INTO user_inventory (user_id, item_id, is_get)
                    VALUES (?, ?, FALSE)
                `, [userId, item.id]);
            } catch (insertError) {
                console.error(`初始化道具 ${item.item_key} 失败:`, insertError.message);
                throw insertError;
            }
        }

        console.log(`用户 ${userId} 背包初始化成功`);
    } catch (error) {
        console.error(`用户 ${userId} 背包初始化失败:`, error);
        throw error;
    }
}

// 用户注册
app.post('/api/register', async (req, res) => {
    let connection;
    try {
        const { username, password, nickname, avatar } = req.body;

        // 验证输入
        if (!username || !password || !nickname) {
            return res.status(400).json({
                success: false,
                message: '用户名、密码和昵称不能为空'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少6位'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 预检查用于返回友好错误；并发冲突仍由唯一索引兜底。
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, nickname, avatar, created_at) VALUES (?, ?, ?, ?, NOW())',
            [username, hashedPassword, nickname, avatar || 'default.png']
        );

        const userId = result.insertId;

        // 初始化用户成就
        await initializeUserAchievements(userId, connection);

        // 初始化用户道具
        await initializeUserItems(userId, connection);

        await connection.commit();

        res.json({
            success: true,
            message: '注册成功',
            userId: userId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('注册错误:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: '用户名已存在'
            });
        }
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    } finally {
        if (connection) connection.release();
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        // 查找用户
        const [users] = await pool.execute(
            'SELECT id, username, password, nickname, avatar FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        const user = users[0];

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                nickname: user.nickname
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 更新最后登录时间
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // 检查并解锁首次登录成就
        const [firstLoginCheck] = await pool.execute(`
            SELECT is_get FROM achievements WHERE user_id = ? AND name = 'first_login'
        `, [user.id]);

        if (firstLoginCheck.length > 0 && !firstLoginCheck[0].is_get) {
            await pool.execute(`
                UPDATE achievements
                SET is_get = TRUE, get_time = NOW()
                WHERE user_id = ? AND name = 'first_login'
            `, [user.id]);
        }

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 验证JWT令牌的中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: '访问令牌缺失'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: '访问令牌无效'
            });
        }
        req.user = user;
        next();
    });
}

// 获取用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, nickname, avatar, created_at, last_login FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 更新用户信息
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { nickname, avatar } = req.body;

        await pool.execute(
            'UPDATE users SET nickname = ?, avatar = ? WHERE id = ?',
            [nickname, avatar, req.user.userId]
        );

        res.json({
            success: true,
            message: '用户信息更新成功'
        });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'register.html'));
});

app.get('/achievements', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'achievements.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, service: 'alice-game-api' });
});

// 获取用户成就列表
app.get('/api/achievements', authenticateToken, async (req, res) => {
    try {
        const [achievements] = await pool.execute(`
            SELECT
                id,
                name,
                title,
                description,
                icon,
                rarity,
                points,
                is_get as unlocked,
                get_time as unlocked_at
            FROM achievements
            WHERE user_id = ?
            ORDER BY is_get DESC, rarity DESC, points DESC
        `, [req.user.userId]);

        res.json({
            success: true,
            achievements
        });

    } catch (error) {
        console.error('获取成就列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 解锁成就
app.post('/api/achievements/unlock', authenticateToken, async (req, res) => {
    try {
        const { achievementId, achievementName } = req.body;

        // 支持新旧两种格式：新格式使用achievementId，旧格式使用achievementName
        const searchValue = achievementId || achievementName;

        if (!searchValue) {
            return res.status(400).json({
                success: false,
                message: '成就标识符不能为空'
            });
        }

        // 检查成就是否已存在
        const [existingAchievements] = await pool.execute(
            'SELECT id, title, name, description, is_get FROM achievements WHERE user_id = ? AND name = ?',
            [req.user.userId, searchValue]
        );

        if (existingAchievements.length === 0) {
            return res.status(404).json({
                success: false,
                message: '成就不存在'
            });
        }

        // 只允许解锁服务器初始化的成就定义，客户端不能创建任意成就。
        const achievement = existingAchievements[0];
        if (achievement.is_get) {
            return res.json({
                success: true,
                message: '成就已解锁',
                newlyUnlocked: false,
                achievement: {
                    name: achievement.name,
                    title: achievement.title
                }
            });
        }

        await pool.execute(
            'UPDATE achievements SET is_get = TRUE, get_time = NOW() WHERE user_id = ? AND name = ?',
            [req.user.userId, searchValue]
        );

        res.json({
            success: true,
            message: `成就 "${achievement.title}" 解锁成功！`,
            newlyUnlocked: true,
            achievement: {
                name: achievement.name,
                title: achievement.title,
                description: achievement.description
            }
        });

    } catch (error) {
        console.error('解锁成就错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取成就统计信息
app.get('/api/achievements/stats', authenticateToken, async (req, res) => {
    try {
        // 获取用户成就统计
        const [statsResult] = await pool.execute(`
            SELECT
                COUNT(*) as totalCount,
                SUM(CASE WHEN is_get = TRUE THEN 1 ELSE 0 END) as unlockedCount,
                SUM(CASE WHEN is_get = TRUE THEN points ELSE 0 END) as totalPoints
            FROM achievements
            WHERE user_id = ?
        `, [req.user.userId]);

        const stats = statsResult[0];
        const completionRate = stats.totalCount > 0 ? Math.round((stats.unlockedCount / stats.totalCount) * 100) : 0;

        res.json({
            success: true,
            stats: {
                totalCount: stats.totalCount,
                unlockedCount: stats.unlockedCount,
                totalPoints: stats.totalPoints || 0,
                completionRate
            }
        });

    } catch (error) {
        console.error('获取成就统计错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 退出登录API
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        // 这里可以添加服务器端的退出逻辑，比如将token加入黑名单
        // 目前我们主要依赖客户端清除token

        res.json({
            success: true,
            message: '退出登录成功'
        });
    } catch (error) {
        console.error('退出登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取音频设置
app.get('/api/audio-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [settings] = await pool.execute(
            'SELECT volume, is_muted FROM audio_settings WHERE user_id = ?',
            [userId]
        );

        if (settings.length === 0) {
            // 如果没有设置记录，创建默认设置
            await pool.execute(
                'INSERT INTO audio_settings (user_id, volume, is_muted) VALUES (?, 0.5, FALSE)',
                [userId]
            );

            res.json({
                success: true,
                settings: {
                    volume: 0.5,
                    is_muted: false
                }
            });
        } else {
            res.json({
                success: true,
                settings: settings[0]
            });
        }
    } catch (error) {
        console.error('获取音频设置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取音频设置失败'
        });
    }
});

// 更新音频设置
app.post('/api/audio-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { volume, is_muted } = req.body;

        // 验证输入
        if (typeof volume !== 'number' || volume < 0 || volume > 1) {
            return res.status(400).json({
                success: false,
                message: '音量值必须在0-1之间'
            });
        }

        if (typeof is_muted !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: '静音状态必须是布尔值'
            });
        }

        // 更新或插入设置
        await pool.execute(
            `INSERT INTO audio_settings (user_id, volume, is_muted)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
             volume = VALUES(volume),
             is_muted = VALUES(is_muted)`,
            [userId, volume, is_muted]
        );

        res.json({
            success: true,
            message: '音频设置更新成功'
        });
    } catch (error) {
        console.error('更新音频设置失败:', error);
        res.status(500).json({
            success: false,
            message: '更新音频设置失败'
        });
    }
});

// ==================== 道具系统 API ====================

// 获取用户道具列表
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [items] = await pool.execute(`
            SELECT
                i.id,
                i.item_key,
                i.name,
                i.description,
                i.icon,
                i.type,
                i.rarity,
                i.chapter,
                i.source,
                ui.is_get,
                ui.obtained_at
            FROM items i
            LEFT JOIN user_inventory ui ON i.id = ui.item_id AND ui.user_id = ?
            ORDER BY i.chapter ASC, ui.is_get DESC, i.rarity DESC
        `, [userId]);

        res.json({
            success: true,
            items: items
        });

    } catch (error) {
        console.error('获取道具列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取道具列表失败'
        });
    }
});

// 获取道具
app.post('/api/items/obtain', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { itemKey } = req.body;

        if (!itemKey) {
            return res.status(400).json({
                success: false,
                message: '道具标识符不能为空'
            });
        }

        // 检查道具是否存在
        const [itemCheck] = await pool.execute(`
            SELECT i.id, i.name, i.description, i.icon, i.rarity, ui.is_get
            FROM items i
            LEFT JOIN user_inventory ui ON i.id = ui.item_id AND ui.user_id = ?
            WHERE i.item_key = ?
        `, [userId, itemKey]);

        if (itemCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: '道具不存在'
            });
        }

        const item = itemCheck[0];

        // 如果用户背包中没有此道具记录，先创建一个
        if (item.is_get === null) {
            await pool.execute(`
                INSERT INTO user_inventory (user_id, item_id, is_get)
                VALUES (?, ?, FALSE)
            `, [userId, item.id]);
        } else if (item.is_get) {
            return res.json({
                success: true,
                message: '道具已获得',
                alreadyObtained: true,
                item: {
                    key: itemKey,
                    name: item.name,
                    description: item.description,
                    icon: item.icon,
                    rarity: item.rarity
                }
            });
        }

        // 更新用户背包中的道具状态为已获得
        await pool.execute(`
            UPDATE user_inventory
            SET is_get = TRUE, obtained_at = NOW()
            WHERE user_id = ? AND item_id = ?
        `, [userId, item.id]);

        res.json({
            success: true,
            message: `成功获得道具：${item.name}`,
            alreadyObtained: false,
            item: {
                key: itemKey,
                name: item.name,
                description: item.description,
                icon: item.icon,
                rarity: item.rarity
            }
        });

    } catch (error) {
        console.error('获取道具失败:', error);
        res.status(500).json({
            success: false,
            message: '获取道具失败'
        });
    }
});

// 获取道具统计信息
app.get('/api/items/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [stats] = await pool.execute(`
            SELECT
                COUNT(i.id) as totalItems,
                COUNT(CASE WHEN ui.is_get = TRUE THEN 1 END) as obtainedItems,
                COUNT(CASE WHEN i.rarity = 'legendary' THEN 1 END) as legendaryItems,
                COUNT(CASE WHEN i.rarity = 'epic' THEN 1 END) as epicItems,
                COUNT(CASE WHEN i.rarity = 'rare' THEN 1 END) as rareItems,
                COUNT(CASE WHEN i.chapter = 3 THEN 1 END) as chapter3Items
            FROM items i
            LEFT JOIN user_inventory ui ON i.id = ui.item_id AND ui.user_id = ?
        `, [userId]);

        const result = stats[0] || {
            totalItems: 0,
            obtainedItems: 0,
            legendaryItems: 0,
            epicItems: 0,
            rareItems: 0,
            chapter3Items: 0
        };

        result.completionRate = result.totalItems > 0 ?
            Math.round((result.obtainedItems / result.totalItems) * 100) : 0;

        res.json({
            success: true,
            stats: result
        });

    } catch (error) {
        console.error('获取道具统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取道具统计失败'
        });
    }
});

// 启动服务器
async function startServer() {
    if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'development-only-change-me') {
        throw new Error('生产环境必须设置 JWT_SECRET');
    }

    await initializeDatabase();
    return app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error('服务器启动失败:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { app, initializeDatabase, startServer };
