require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("여러 채널에 동시 전송")
    .addSubcommand(sub =>
      sub.setName("send")
        .setDescription("등록된 채널들에 메시지 전송")
        .addStringOption(opt =>
          opt.setName("text")
            .setDescription("보낼 메시지")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("addchannel")
        .setDescription("현재 채널을 전송 대상에 추가")
    )
    .addSubcommand(sub =>
      sub.setName("removechannel")
        .setDescription("현재 채널을 전송 대상에서 제거")
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("전송 대상 채널 목록 보기")
    )
    .addSubcommand(sub =>
      sub.setName("clearall")
        .setDescription("전송 대상 채널 목록 전체 초기화")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Done.");
  } catch (e) {
    console.error(e);
  }
})();
