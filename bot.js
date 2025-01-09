const { Telegraf } = require('telegraf');
const fs = require('fs');

// Telegram bot tokenini yozing
const bot = new Telegraf('7705302307:AAGDFXVQGS7Yj_DMROzZEH9pthq9Etp7YOE');

// Administrator Telegram ID sini bu yerga yozing
const ADMIN_ID = 5025075321; // Adminning haqiqiy Telegram ID si
const CHANNEL_USERNAME = '@secret_kino1'; // Telegram kanal username

// Kanallarni belgilash (data.json faylidan o'rniga)
const channels = ["@secret_kino1", "@secret_kino1", "@secret_kino1"]; // Telegram kanal ro'yxati

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
        console.error('❌ Ma\'lumotlarni yuklashda xatolik:', error.message);
        const defaultData = { users: {}, movies: [] }; // channels now in bot.js
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

    // Foydalanuvchini bazaga qo'shish
    if (!data.users[userId]) {
        data.users[userId] = { subscribed: false };
        saveData(data);

        // Kanallarning ro'yxatini tugmalar bilan yuborish
        const buttons = channels.map((channel, index) => [
            { text: `${index + 1}-kanal`, url: `https://t.me/${channel.replace('@', '')}` }
        ]);
        buttons.push([{ text: '✅ Obunani tekshirish', callback_data: 'check_subscription' }]);

        ctx.reply(
            `👋 Assalomu alaykum!\nQuyidagi kanallarga obuna bo'ling va "Obunani tekshirish" tugmasini bosing:`,
            { reply_markup: { inline_keyboard: buttons } }
        );
    } else if (data.users[userId].subscribed) {
        // Foydalanuvchi qayta /start bossa
        ctx.reply(
            `🔒 Kinoni yuklash uchun kino kodini kiriting.`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Kino kodini olish', url: `https://t.me/${channels[0].replace('@', '')}` }]]
                }
            }
        );
    }
});

// Obunani tekshirish
bot.action('check_subscription', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    // Obunani tekshirish
    const isSubscribed = await checkSubscriptions(ctx, channels);
    if (isSubscribed) {
        data.users[userId].subscribed = true;
        saveData(data);

        // Obunani muvaffaqiyatli o‘tganda tugmalarni olib tashlash
        await ctx.editMessageText(
            `✅ Siz ro'yxatdan o'tdingiz! Endi kino kodini kiriting.`,
            {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Kino kodini olish', url: `https://t.me/${channels[0].replace('@', '')}` }]]
                }
            }
        );
    } else {
        // Foydalanuvchi hali obuna bo‘lmagan bo‘lsa
        await ctx.reply(`❌ Siz hali hamma kanallarga obuna bo'lmadingiz. Iltimos, obuna bo'lib qayta tekshiring.`);
    }
});

// Kino yuklash (faqat admin uchun)
bot.on('video', async (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    // Faqat admin yuklay oladi
    if (userId !== ADMIN_ID) {
        return ctx.reply('❌ Faqat administrator kinolarni qo\'shishi mumkin.');
    }

    // Kino ID generatsiya qilish
    const movieId = Math.floor(1000 + Math.random() * 9000);
    const video = ctx.message.video;

    // Video fayl ID va nomini tekshirish
    if (!video || !video.file_id) {
        return ctx.reply('❌ Video fayli topilmadi.');
    }

    const movie = {
        id: movieId,
        fileId: video.file_id,
        fileName: video.file_name || 'No name'
    };

    data.movies.push(movie);
    saveData(data);

    try {
        // Adminga kino kodi bilan xabar berish
        await ctx.reply(`✅ Kino muvaffaqiyatli qo'shildi!\n🎥 Kino kodi: ${movieId}`);

        // Kinoni Telegram kanalda ulashish
        await ctx.telegram.sendVideo(
            CHANNEL_USERNAME,
            movie.fileId,
            {
                caption: `🎬 Yangi kino qo'shildi!\n🎥 Kino kodi: ${movieId}\n📂 Kino nomi: ${movie.fileName || 'No name'}`
            }
        );
    } catch (error) {
        console.error('❌ Video yuborishda xatolik:', error.message);
        return ctx.reply('❌ Kinoni kanalda yuborishda xatolik yuz berdi.');
    }
});

// Kino qidirish va yuborish
bot.on('text', (ctx) => {
    const data = loadData();
    const userId = ctx.from.id;

    // Foydalanuvchi ro'yxatdan o'tganini tekshirish
    if (!data.users[userId]?.subscribed) {
        return ctx.reply('❌ Siz ro\'yxatdan o\'tmagansiz. Iltimos, /start buyrug\'ini bosing.');
    }

    const movieId = parseInt(ctx.message.text.trim(), 10);
    const movie = data.movies.find(m => m.id === movieId);

    if (movie) {
        ctx.replyWithVideo(movie.fileId, {
            caption: `🎬 Kino kodi: ${movie.id}\n🎥 ${movie.fileName || 'Noma\'lum nom'}`
        });
    } else {
        ctx.reply('❌ Bunday kino topilmadi. Iltimos, kodni to\'g\'ri kiriting.');
    }
});

// Obunani tekshirish funksiyasi
async function checkSubscriptions(ctx, channels) {
    for (const channel of channels) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (!['creator', 'administrator', 'member'].includes(member.status)) {
                return false;
            }
        } catch (error) {
            console.error(`Kanalni tekshirishda xatolik: ${error.message}`);
            return false;
        }
    }
    return true;
}

// Botni ishga tushirish
bot.launch().then(() => {
    console.log('🚀 Bot ishga tushdi!');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
