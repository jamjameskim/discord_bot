require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const CHANNEL_FILE = path.join(__dirname, "channels.json");

function loadChannels() {
  // 환경변수 우선, 없으면 파일에서 읽기
  if (process.env.CHANNEL_IDS) {
    return process.env.CHANNEL_IDS.split(",").map(id => id.trim()).filter(Boolean);
  }
  try {
    const raw = fs.readFileSync(CHANNEL_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.channelIds) ? data.channelIds : [];
  } catch {
    return [];
  }
}

function saveChannels(channelIds) {
  fs.writeFileSync(CHANNEL_FILE, JSON.stringify({ channelIds }, null, 2), "utf8");
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "broadcast") return;

  const sub = interaction.options.getSubcommand();
  const channelId = interaction.channelId;

  if (sub === "addchannel") {
    const channelIds = loadChannels();
    if (channelIds.includes(channelId)) {
      return interaction.reply({ content: "이미 등록된 채널이야.", ephemeral: true });
    }
    channelIds.push(channelId);
    saveChannels(channelIds);
    return interaction.deferReply({ ephemeral: true }).then(() => interaction.deleteReply());
  }

  if (sub === "removechannel") {
    const channelIds = loadChannels();
    const next = channelIds.filter(id => id !== channelId);
    saveChannels(next);
    return interaction.reply({ content: "🗑️ 이 채널을 전송 대상에서 제거했어.", ephemeral: true });
  }

  if (sub === "list") {
    const channelIds = loadChannels();
    if (channelIds.length === 0) {
      return interaction.reply({ content: "전송 대상 채널이 아직 없어. `/broadcast addchannel`로 추가해줘.", ephemeral: true });
    }
    const lines = channelIds.map(id => `• <#${id}>`).join("\n");
    return interaction.reply({ content: `📌 전송 대상 채널:\n${lines}`, ephemeral: true });
  }

  if (sub === "send") {
    const text = interaction.options.getString("text", true);
    const channelIds = loadChannels();

    if (channelIds.length === 0) {
      return interaction.reply({ content: "전송 대상 채널이 없어. 먼저 `/broadcast addchannel`로 채널을 등록해줘.", ephemeral: true });
    }

    await interaction.reply({ content: `⏳ ${channelIds.length}개 채널로 전송 중...`, ephemeral: true });

    let ok = 0, fail = 0;

    for (const id of channelIds) {
      try {
        const ch = await client.channels.fetch(id);
        if (!ch || !ch.isTextBased()) { fail++; continue; }
        await ch.send(text);
        ok++;
      } catch {
        fail++;
      }
    }

    return interaction.editReply({ content: `✅ 전송 완료! 성공 ${ok} / 실패 ${fail}`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
