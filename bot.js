const { Telegraf } = require('telegraf');
const fs = require('fs');

// Telegram bot tokenini yozing
const bot = new Telegraf('7705302307:AAGDFXVQGS7Yj_DMROzZEH9pthq9Etp7YOE');

// Administrator Telegram ID sini bu yerga yozing
const ADMIN_ID = 5025075321; // Adminning haqiqiy Telegram ID si

// Kanallarni belgilash
const channels = [
    '@secret_kino1'   // Ochiq kanal
];

// Ma'lumotlar fayli
const DATA_FILE = './data.json';

// Ma'lumotlarni yuklash va saqlash funksiyalari
function loadData() {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        if (!data.users || !data.movies) {
            throw new Error('Invalid data format');
        }
        return data;
    } catch (error) {
        console.error('❌ Malumotlarni yuklashda xatolik:', error.message);
        const defaultData = { users: {}, movies: [] };
        saveData(defaultData);
        return defaultData;
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// /start komandasi
bot.start((ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    // Foydalanuvchini bazaga qo'shish yoki yangilash
    data.users[userId] = { subscribed: false };
    saveData(data);

    // Kanallarning ro'yxatini tugmalar bilan yuborish
    const buttons = channels.map((channel, index) => {
        if (typeof channel === 'string' && channel.startsWith('@')) {
            return [{ text: `${index + 1}-kanalga obuna bo'lish`, url: `https://t.me/${channel.replace('@', '')}` }];
        } else {
            return [{ text: `${index + 1}-kanalga obuna bo'lish`, url: `https://t.me/+...` }]; // Maxfiy kanal uchun havola qo'ying
        }
    });

    buttons.push([{ text: '✅ Obunani tekshirish', callback_data: 'check_subscription' }]);

    ctx.reply(
        `👋 Assalomu alaykum!\nQuyidagi kanallarga obuna bo'ling va "Obunani tekshirish" tugmasini bosing:`,
        { reply_markup: { inline_keyboard: buttons } }
    );
});

// Obunani tekshirish
bot.action('check_subscription', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;
    const userName = ctx.from.first_name; // Foydalanuvchining ismini olish

    // Agar foydalanuvchi avval ro'yxatdan o'tgan bo'lsa
    if (data.users[userId] && data.users[userId].subscribed) {
        await ctx.editMessageText(
            `🖐 𝗦𝗮𝗹𝗼𝗺 ${userName}

🔍 𝗙𝗶𝗹𝗺 𝗸𝗼𝗱𝗶𝗻𝗶 𝗸𝗶𝗿𝗶𝘁𝗶𝗻𝗴:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔍Kodlarni kirish', callback_data: 'enter_code' }
                        ]
                    ]
                }
            }
        );
        return; // Dastur qayta ishlov berishni tugatadi
    }

    // Obuna holatini tekshirish
    const isSubscribed = await checkSubscriptions(ctx);

    if (isSubscribed) {
        // Agar foydalanuvchi obuna bo'lgan bo'lsa
        data.users[userId] = { subscribed: true };
        saveData(data);

        await ctx.editMessageText(
            `🖐 𝗦𝗮𝗹𝗼𝗺 ${userName}

🔍 𝗙𝗶𝗹𝗺 𝗸𝗼𝗱𝗶𝗻𝗶 𝗸𝗶𝗿𝗶𝘁𝗶𝗻𝗴:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔍Kodlarni kirish', callback_data: 'enter_code' }
                        ]
                    ]
                }
            }
        );
    } else {
        // Agar foydalanuvchi hali hamma kanallarga obuna bo'lmasa
        await ctx.reply(
            `❌ Oldin hamma kanalga obuna bo'l keyin kodni kiriting.`
        );
    }
});



// Obuna tekshiruvchi funksiyasi (Maxfiy kanal uchun chat ID bilan ishlaydi)
async function checkSubscriptions(ctx) {
    for (const channel of channels) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);

            // Obuna holatini tekshirish
            if (!['creator', 'administrator', 'member'].includes(member.status)) {
                return false; // Obuna emas
            }
        } catch (error) {
            console.error(`❌ Kanalga ulanishda xatolik: ${error.message}`);
            return false; // Kanalga ulanishda xatolik
        }
    }
    return true; // Hamma kanallarga obuna
}

// Kino yuklash (faqat admin uchun)
bot.on('video', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    if (userId !== ADMIN_ID) {
        return ctx.reply('❌ Faqat administrator kinolarni qoshishi mumkin.');
    }

    const video = ctx.message.video;
    if (!video || !video.file_id) {
        return ctx.reply('❌ Video fayli topilmadi.');
    }

    const movieId = data.movies.length + 1;
    const movie = {
        id: movieId,
        fileId: video.file_id,
        fileName: video.file_name || 'No name',
        uploadDate: new Date().toLocaleDateString()
    };

    data.movies.push(movie);
    saveData(data);

    await ctx.reply(`✅ Kino yuklandi\n🍿 Kino kodi: ${movieId}`);

});

// Kino qidirish va yuborish
bot.on('text', (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    if (!data.users[userId]?.subscribed) {
        return ctx.reply('❌ Siz royxatdan otmagansiz. Iltimos, /start buyrugini bosing.');
    }

    const movieId = parseInt(ctx.message.text.trim(), 10);
    const movie = data.movies.find(m => m.id === movieId);

    if (movie) {
        ctx.replyWithVideo(movie.fileId, {
            caption: `🍿 Kino nomi: Yangi porno\n📆 Yuklangan sana: ${movie.uploadDate}\n🔎 Kinoning kodi: ${movie.id}\n✅ Kanalga obuna bo‘ling: https://t.me/secret_kino1\n👨‍💻 Admin: @secret_adminuzz`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🍿Boshqa film', url: 'https://t.me/secret_kino1' },  // To'g'ri kanal URL
                        { text: '👨‍💻Admin ', url: 'https://t.me/secret_adminuzz' }     // Admin URL
                    ]
                    [
                        { text: 'Filimni ulashish', url: 'https://t.me/share/secret_kino1'}
                    ]
                ]
            }
        });
        
    } else {
        ctx.reply('❌ Bunday kino topilmadi. Iltimos, kodni togri kiriting.');
    }
});

// Botni ishga tushirish
bot.launch().then(() => {
    console.log('🚀 Bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
