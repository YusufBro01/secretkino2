const { Telegraf } = require('telegraf');
const fs = require('fs');

// Telegram bot tokenini yozing
const bot = new Telegraf('8077949445:AAF4jou6ZQMpudlbtp5DUm-wFD5SJlVI_NI');

// Administrator Telegram ID larini bu yerga yozing
const ADMIN_IDS = [5025075321, 5831400344]; // Bir nechta admin ID qo'shing

// Kanallarni belgilash
const channels = ['@skv_s07', '@goldkinolar_hd',];

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
        console.error("❌ Ma'lumotlarni yuklashda xatolik:", error.message);
        const defaultData = { users: {}, movies: [] };
        saveData(defaultData);
        return defaultData;
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log("✅ Ma'lumotlar muvaffaqiyatli saqlandi.");
    } catch (error) {
        console.error("❌ Ma'lumotlarni saqlashda xatolik:", error.message);
    }
}

// /start komandasi
bot.start((ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    if (!data.users[userId]) {
        data.users[userId] = { subscribed: false };
        saveData(data);
    }

    const buttons = channels.map((channel, index) => {
        return [{ text: `${index + 1}-kanalga obuna bo'lish`, url: `https://t.me/${channel.replace('@', '')}` }];
    });

    buttons.push([{ text: '✅ Obunani tekshirish', callback_data: 'check_subscription' }]);

    ctx.reply(
        "⛔️ Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:",
        { reply_markup: { inline_keyboard: buttons } }
    );
});

// Obunani tekshirish
bot.action('check_subscription', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    const isSubscribed = await checkSubscriptions(ctx);

    if (isSubscribed) {
        data.users[userId].subscribed = true;
        saveData(data);
        await ctx.editMessageText(
            "✅ Obuna muvaffaqiyatli tasdiqlandi! Endi kino kodini kiriting.",
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔍 Kodlarni kirish', url: 'https://t.me/goldkinolar_hd' }]
                    ]
                }
            }
        );
    } else {
        await ctx.editMessageText(
            "❌ Hali hamma kanallarga obuna bo'lmadingiz. Iltimos, obuna bo'ling va yana tekshiring.",
            {
                reply_markup: {
                    inline_keyboard: channels.map((channel, index) => {
                        return [{ text: `${index + 1}-kanalga obuna bo'lish`, url: `https://t.me/${channel.replace('@', '')}` }];
                    }).concat([[{ text: '✅ Obunani qayta tekshirish', callback_data: 'check_subscription' }]])
                }
            }
        );
    }
});

// Obuna tekshiruvchi funksiyasi
async function checkSubscriptions(ctx) {
    for (const channel of channels) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (!['creator', 'administrator', 'member'].includes(member.status)) {
                return false;
            }
        } catch (error) {
            console.error(`❌ Kanalga ulanishda xatolik: ${error.message}`);
            return false;
        }
    }
    return true;
}

// Admin tomonidan kino yuklash
bot.on('video', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    if (!ADMIN_IDS.includes(userId)) {
        return ctx.reply("❌ Faqat administrator kinolarni qo'shishi mumkin.");
    }

    const video = ctx.message.video;
    if (!video || !video.file_id) {
        return ctx.reply("❌ Video fayli topilmadi yoki noto'g'ri format.");
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
    console.log(`📹 Kino ma'lumotlari saqlandi: ${JSON.stringify(movie)}`);
});

// Kino yuborish
bot.on('text', (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    if (!data.users[userId] || !data.users[userId].subscribed) {
        return ctx.reply("⛔️ Iltimos, avval kanallarga obuna bo'ling va qayta tekshiring!");
    }

    const movieId = parseInt(ctx.message.text.trim(), 10);
    const movie = data.movies.find(m => m.id === movieId);

    if (movie) {
        ctx.replyWithVideo(movie.fileId, {
            caption: `🍿 Kino nomi: ${movie.fileName}\n📆 Yuklangan sana: ${movie.uploadDate}\n\n🔎 Kinoning kodi: ${movie.id}\n\n ✅Kanalga obuna bo'ling:@secret_kino1\n👑Admin:@secret_adminuzz`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Boshqa film...', url: 'https://t.me/goldkinolar_hd' }]
                ]
            }
        });
    } else {
        ctx.reply("❌ Bunday kino topilmadi. Iltimos, kodni to'g'ri kiriting.");
    }
});

// Botni ishga tushirish
bot.launch().then(() => {
    console.log('🚀 Bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
