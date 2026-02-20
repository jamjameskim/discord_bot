require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildChannels],
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function loadChannels() {
  const { data, error } = await supabase
    .from("discord_channels")
    .select("channel_id");
  if (error) { console.error("loadChannels error:", error); return []; }
  return data.map(row => row.channel_id);
}

async function addChannel(channelId) {
  const { error } = await supabase
    .from("discord_channels")
    .insert({ channel_id: channelId });
  return !error;
}

async function removeChannel(channelId) {
  const { error } = await supabase
    .from("discord_channels")
    .delete()
    .eq("channel_id", channelId);
  return !error;
}

async function clearChannels() {
  const { error } = await supabase
    .from("discord_channels")
    .delete()
    .neq("channel_id", "");
  return !error;
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 채널 삭제 시 Supabase에서 자동 제거
client.on("channelDelete", async (channel) => {
  await removeChannel(channel.id);
  console.log(`채널 삭제 감지 → Supabase에서 제거: ${channel.id}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "broadcast") return;

  const sub = interaction.options.getSubcommand();
  const channelId = interaction.channelId;

  if (sub === "addchannel") {
    const channelIds = await loadChannels();
    if (channelIds.includes(channelId)) {
      return interaction.reply({ content: "이미 등록된 채널이야.", ephemeral: true });
    }
    await addChannel(channelId);
    return interaction.deferReply({ ephemeral: true }).then(() => interaction.deleteReply());
  }

  if (sub === "removechannel") {
    await removeChannel(channelId);
    return interaction.reply({ content: "🗑️ 이 채널을 전송 대상에서 제거했어.", ephemeral: true });
  }

  if (sub === "list") {
    const channelIds = await loadChannels();
    if (channelIds.length === 0) {
      return interaction.reply({ content: "전송 대상 채널이 아직 없어. `/broadcast addchannel`로 추가해줘.", ephemeral: true });
    }
    const lines = channelIds.map(id => `• <#${id}>`).join("\n");
    return interaction.reply({ content: `📌 전송 대상 채널:\n${lines}`, ephemeral: true });
  }

  if (sub === "clearall") {
    await clearChannels();
    return interaction.reply({ content: "🗑️ 채널 목록을 전체 초기화했어.", ephemeral: true });
  }

  if (sub === "send") {
    const text = interaction.options.getString("text", true);
    const channelIds = await loadChannels();

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
